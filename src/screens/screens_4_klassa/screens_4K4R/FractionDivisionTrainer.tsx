import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TextInput, Keyboard, ImageBackground,
    Animated, StatusBar, Image, Dimensions, TouchableOpacity, Modal,
    Platform, KeyboardAvoidingView, TouchableWithoutFeedback, ScrollView, InteractionManager
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { awardXpAndCoins } from '../../../services/xpService';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

const EXERCISE_ID = "FractionDivisionTrainer_cl4";
const { width: screenWidth } = Dimensions.get('window');

// LIMIT ZADAŃ
const TASKS_LIMIT = 30;
// TWOJE ORYGINALNE WYMIARY
const combinedIconSize = screenWidth * 0.25;

// --- MODAL BRUDNOPISU ---
const DrawingModal = ({ visible, onClose, problemText }: { visible: boolean; onClose: () => void, problemText: string }) => {
    const [paths, setPaths] = useState<string[]>([]);
    const [currentPath, setCurrentPath] = useState('');
    const handleClear = () => { setPaths([]); setCurrentPath(''); };
    const onTouchMove = (evt: any) => {
        const { locationX, locationY } = evt.nativeEvent;
        if (!currentPath) setCurrentPath(`M${locationX},${locationY}`);
        else setCurrentPath(`${currentPath} L${locationX},${locationY}`);
    };
    const onTouchEnd = () => { if (currentPath) { setPaths([...paths, currentPath]); setCurrentPath(''); } };
    return (
        <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={styles.drawingContainer}>
                    <View style={styles.drawingHeader}>
                        <TouchableOpacity onPress={handleClear} style={styles.headerButton}><Text style={styles.headerButtonText}>🗑️ Wyczyść</Text></TouchableOpacity>
                        <Text style={styles.drawingTitle}>Brudnopis</Text>
                        <TouchableOpacity onPress={onClose} style={styles.headerButton}><Text style={styles.headerButtonText}>❌ Zamknij</Text></TouchableOpacity>
                    </View>
                    <View style={styles.problemPreviewContainer}>
                        <Text style={styles.problemPreviewLabel}>Zadanie:</Text>
                        <Text numberOfLines={2} style={styles.problemPreviewTextSmall}>{problemText}</Text>
                    </View>
                    <View style={styles.canvas} onStartShouldSetResponder={() => true} onMoveShouldSetResponder={() => true} onResponderGrant={(evt) => { const { locationX, locationY } = evt.nativeEvent; setCurrentPath(`M${locationX},${locationY}`); }} onResponderMove={onTouchMove} onResponderRelease={onTouchEnd}>
                        <Svg height="100%" width="100%">
                            {paths.map((d, index) => (<Path key={index} d={d} stroke="#000" strokeWidth={3} fill="none" />))}
                            <Path d={currentPath} stroke="#000" strokeWidth={3} fill="none" />
                        </Svg>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

// --- GŁÓWNY KOMPONENT ---
const FractionDivisionTrainer = () => {
    const navigation = useNavigation();

    const [task, setTask] = useState({
        type: 0, q: '', h: '', val1: 0, val2: 0,
        targetWhole: null as number | null, target1: 0, target2: 0,
    });

    const [inpWhole, setInpWhole] = useState('');
    const [inp1, setInp1] = useState('');
    const [inp2, setInp2] = useState('');

    const [status, setStatus] = useState<'neutral' | 'correct' | 'wrong'>('neutral');
    const [msg, setMsg] = useState('');
    const [attempts, setAttempts] = useState(0);
    const [ready, setReady] = useState(false);

    const [stats, setStats] = useState({ correct: 0, wrong: 0, count: 0 });
    const [showMilestone, setShowMilestone] = useState(false);
    const [isFinished, setIsFinished] = useState(false);
    const [sessionCorrect, setSessionCorrect] = useState(0);

    const [showScratchpad, setShowScratchpad] = useState(false);
    const [showHint, setShowHint] = useState(false);
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);

    const historyRef = useRef<Set<string>>(new Set());
    const wholeRef = useRef<TextInput>(null);
    const inp1Ref = useRef<TextInput>(null);
    const inp2Ref = useRef<TextInput>(null);

    const bgAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const k1 = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
        const k2 = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
        nextTask();
        return () => { k1.remove(); k2.remove(); };
    }, []);

    const rnd = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

    const generateProblem = () => {
        setMsg(''); setStatus('neutral'); setReady(false);
        setInpWhole(''); setInp1(''); setInp2('');
        setAttempts(0); setShowHint(false);
        bgAnim.setValue(0);

        let newTask: any = {};
        let uniqueKey = "";
        let attemptCount = 0;

        do {
            const type = rnd(0, 2);
            if (type === 0) {
                const a = rnd(1, 15); const b = rnd(a + 1, 20);
                newTask = { type: 0, q: `Zapisz iloraz w postaci ułamka.`, h: `Kreska ułamkowa zastępuje znak dzielenia (:).`, val1: a, val2: b, targetWhole: null, target1: a, target2: b };
                uniqueKey = `div2frac-${a}-${b}`;
            } else if (type === 1) {
                const a = rnd(1, 15); const b = rnd(2, 20);
                newTask = { type: 1, q: `Zapisz ułamek jako dzielenie.`, h: `Licznik to dzielna, mianownik to dzielnik.`, val1: a, val2: b, targetWhole: null, target1: a, target2: b };
                uniqueKey = `frac2div-${a}-${b}`;
            } else {
                const den = rnd(2, 9); const whole = rnd(1, 5); const rem = rnd(1, den - 1);
                const num = whole * den + rem;
                newTask = { type: 2, q: 'Wyłącz całości.', h: `Podziel licznik przez mianownik. Reszta to nowy licznik.`, val1: num, val2: den, targetWhole: whole, target1: rem, target2: den };
                uniqueKey = `improper-${num}-${den}`;
            }
            attemptCount++;
        } while (historyRef.current.has(uniqueKey) && attemptCount < 20);

        historyRef.current.add(uniqueKey);
        setTask(newTask);

        setTimeout(() => {
            if (newTask.type === 2) wholeRef.current?.focus();
            else inp1Ref.current?.focus();
        }, 400);
    };

    const handleCheck = () => {
        // PUNKT 2: Blokada pustych pól
        if (task.type === 2) {
            if (!inpWhole || !inp1 || !inp2) { setMsg('Wypełnij wszystkie pola!'); return; }
        } else {
            if (!inp1 || !inp2) { setMsg('Wypełnij oba pola!'); return; }
        }

        const isWOk = task.targetWhole === null || parseInt(inpWhole) === task.targetWhole;
        const is1Ok = parseInt(inp1) === task.target1;
        const is2Ok = parseInt(inp2) === task.target2;
        const isEverythingCorrect = isWOk && is1Ok && is2Ok;

        if (isEverythingCorrect) {
            setStatus('correct'); setMsg('Doskonale! ✅');
            Animated.timing(bgAnim, { toValue: 1, duration: 500, useNativeDriver: false }).start();
            setStats(s => ({ ...s, correct: s.correct + 1 }));
            setSessionCorrect(prev => prev + 1);
            setReady(true);
            InteractionManager.runAfterInteractions(() => awardXpAndCoins(10, 2));
            const currentUser = auth().currentUser;
            if (currentUser) {
                firestore().collection('users').doc(currentUser.uid).collection('exerciseStats').doc(EXERCISE_ID)
                    .set({ totalCorrect: firestore.FieldValue.increment(1) }, { merge: true }).catch(e => console.error(e));
            }
        } else {
            setStatus('wrong');
            if (attempts === 0) {
                // PUNKT 1: Pierwsza pomyłka
                setMsg('Błąd! Spróbuj jeszcze raz ✍️');
                setAttempts(1);
                if (!isWOk) setInpWhole('');
                if (!is1Ok) setInp1('');
                if (!is2Ok) setInp2('');
                Animated.sequence([
                    Animated.timing(bgAnim, { toValue: -1, duration: 200, useNativeDriver: false }),
                    Animated.timing(bgAnim, { toValue: 0, duration: 200, useNativeDriver: false })
                ]).start();
                // PUNKT 5: Reset statusu
                setTimeout(() => setStatus('neutral'), 1500);
            } else {
                // PUNKT 1: Druga pomyłka
                let correctStr = task.type === 2 ? `${task.targetWhole} i ${task.target1}/${task.target2}` : (task.type === 0 ? `${task.target1}/${task.target2}` : `${task.target1} : ${task.target2}`);
                setMsg(`Niestety błąd. Wynik: ${correctStr}`);
                setReady(true);
                setStats(s => ({ ...s, wrong: s.wrong + 1 }));
                Animated.timing(bgAnim, { toValue: -1, duration: 500, useNativeDriver: false }).start();
                const currentUser = auth().currentUser;
                if (currentUser) {
                    firestore().collection('users').doc(currentUser.uid).collection('exerciseStats').doc(EXERCISE_ID)
                        .set({ totalWrong: firestore.FieldValue.increment(1) }, { merge: true }).catch(e => console.error(e));
                }
            }
        }
    };

    const nextTask = () => {
        // PUNKT 3 i 4: Logika Milestone i Finish
        if (stats.count >= TASKS_LIMIT) {
            setIsFinished(true);
            return;
        }
        if (stats.count > 0 && stats.count % 10 === 0 && !showMilestone) {
            setShowMilestone(true);
            return;
        }
        setStats(s => ({ ...s, count: s.count + 1 }));
        generateProblem();
    };

    const handleRestart = () => {
        setIsFinished(false);
        setStats({ correct: 0, wrong: 0, count: 1 });
        setSessionCorrect(0);
        historyRef.current.clear();
        generateProblem();
    };

    const getInputStyle = (currentVal: string, targetVal: number | null) => {
        if (status === 'neutral') return styles.inputNeutral;
        if (status === 'correct') return styles.inputCorrect;
        return (currentVal && parseInt(currentVal) === targetVal) ? styles.inputCorrect : styles.inputError;
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.container}>
                <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
                <ImageBackground source={require('../../../assets/background.jpg')} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: bgAnim.interpolate({ inputRange: [-1, 0, 1], outputRange: ['rgba(255,0,0,0.15)', 'transparent', 'rgba(0,255,0,0.15)'] }) }]} pointerEvents="none" />

                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardContainer}>
                    {!isKeyboardVisible && (
                        <View style={styles.topButtons}>
                            <TouchableOpacity onPress={() => setShowScratchpad(true)} style={styles.topBtnItem}>
                                <Image source={require('../../../assets/pencil.png')} style={styles.iconTop} />
                                <Text style={styles.buttonLabel}>Brudnopis</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setShowHint(!showHint)} style={styles.topBtnItem}>
                                <Image source={require('../../../assets/question.png')} style={styles.iconTop} />
                                <Text style={styles.buttonLabel}>Pomoc</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    <Modal visible={showMilestone} transparent={true} animationType="slide">
                        <View style={styles.modalOverlay}>
                            <View style={styles.milestoneCard}>
                                <Text style={styles.milestoneTitle}>Podsumowanie serii 📊</Text>
                                <View style={styles.statsRowMilestone}>
                                    <Text style={styles.statsTextMilestone}>Poprawne: {sessionCorrect} / 10</Text>
                                </View>
                                <TouchableOpacity style={styles.mButton} onPress={() => { setShowMilestone(false); setSessionCorrect(0); setStats(s => ({ ...s, count: s.count + 1 })); generateProblem(); }}>
                                    <Text style={styles.mButtonText}>Kontynuuj</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Modal>

                    <Modal visible={isFinished} transparent={true} animationType="fade">
                        <View style={styles.modalOverlay}>
                            <View style={styles.milestoneCard}>
                                <Text style={styles.milestoneTitle}>Gratulacje! 🏆</Text>
                                <View style={styles.statsRowMilestone}>
                                    <Text style={styles.statsTextMilestone}>Wynik końcowy: {stats.correct} / {TASKS_LIMIT}</Text>
                                </View>
                                <View style={styles.milestoneButtons}>
                                    <TouchableOpacity style={styles.mButton} onPress={handleRestart}><Text style={styles.mButtonText}>Od nowa</Text></TouchableOpacity>
                                    <TouchableOpacity style={[styles.mButton, {backgroundColor: '#dc3545'}]} onPress={() => navigation.goBack()}><Text style={styles.mButtonText}>Wyjdź</Text></TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>

                    {showHint && !isKeyboardVisible && (
                        <View style={styles.hintBox}><Text style={styles.hintTitle}>Podpowiedź:</Text><Text style={styles.hintText}>{task.h}</Text></View>
                    )}

                    <DrawingModal visible={showScratchpad} onClose={() => setShowScratchpad(false)} problemText={task.q} />

                    <ScrollView contentContainerStyle={styles.centerContent} keyboardShouldPersistTaps="handled">
                        <View style={styles.card}>
                            <View style={styles.overlayBackground} />
                            <Text style={styles.headerTitle}>Ułamki i dzielenie</Text>
                            <Text style={styles.questionText}>{task.q}</Text>

                            <View style={styles.taskContent}>
                                <View style={styles.equationRow}>
                                    {task.type === 0 ? (
                                        <View style={styles.rowCenter}>
                                            <Text style={styles.bigNumber}>{task.val1}</Text>
                                            <Text style={styles.symbol}>:</Text>
                                            <Text style={styles.bigNumber}>{task.val2}</Text>
                                        </View>
                                    ) : (
                                        <View style={styles.fractionStatic}>
                                            <Text style={styles.staticNum}>{task.val1}</Text>
                                            <View style={styles.staticLine} />
                                            <Text style={styles.staticDen}>{task.val2}</Text>
                                        </View>
                                    )}

                                    <Text style={styles.equalSign}>=</Text>

                                    {task.type === 0 ? (
                                        <View style={styles.fractionInputContainer}>
                                            <TextInput ref={inp1Ref} style={[styles.fractionInput, getInputStyle(inp1, task.target1)]} keyboardType="numeric" value={inp1} onChangeText={(t) => {setInp1(t); setStatus('neutral');}} onSubmitEditing={() => inp2Ref.current?.focus()} blurOnSubmit={false} editable={!ready} placeholder="?" />
                                            <View style={styles.fractionLineLarge} />
                                            <TextInput ref={inp2Ref} style={[styles.fractionInput, getInputStyle(inp2, task.target2)]} keyboardType="numeric" value={inp2} onChangeText={(t) => {setInp2(t); setStatus('neutral');}} editable={!ready} placeholder="?" />
                                        </View>
                                    ) : task.type === 1 ? (
                                        <View style={styles.rowCenter}>
                                            <TextInput ref={inp1Ref} style={[styles.fractionInput, getInputStyle(inp1, task.target1)]} keyboardType="numeric" value={inp1} onChangeText={(t) => {setInp1(t); setStatus('neutral');}} onSubmitEditing={() => inp2Ref.current?.focus()} blurOnSubmit={false} editable={!ready} placeholder="?" />
                                            <Text style={styles.symbol}>:</Text>
                                            <TextInput ref={inp2Ref} style={[styles.fractionInput, getInputStyle(inp2, task.target2)]} keyboardType="numeric" value={inp2} onChangeText={(t) => {setInp2(t); setStatus('neutral');}} editable={!ready} placeholder="?" />
                                        </View>
                                    ) : (
                                        <View style={styles.mixedContainer}>
                                            <TextInput ref={wholeRef} style={[styles.wholeInput, getInputStyle(inpWhole, task.targetWhole)]} keyboardType="numeric" value={inpWhole} onChangeText={(t) => {setInpWhole(t); setStatus('neutral');}} onSubmitEditing={() => inp1Ref.current?.focus()} blurOnSubmit={false} editable={!ready} placeholder="?" />
                                            <View style={styles.fractionInputContainer}>
                                                <TextInput ref={inp1Ref} style={[styles.fractionInputSmall, getInputStyle(inp1, task.target1)]} keyboardType="numeric" value={inp1} onChangeText={(t) => {setInp1(t); setStatus('neutral');}} onSubmitEditing={() => inp2Ref.current?.focus()} blurOnSubmit={false} editable={!ready} placeholder="?" />
                                                <View style={styles.fractionLineSmall} />
                                                <TextInput ref={inp2Ref} style={[styles.fractionInputSmall, getInputStyle(inp2, task.target2)]} keyboardType="numeric" value={inp2} onChangeText={(t) => {setInp2(t); setStatus('neutral');}} editable={!ready} placeholder="?" />
                                            </View>
                                        </View>
                                    )}
                                </View>
                            </View>

                            <TouchableOpacity style={[styles.mainBtn, {backgroundColor: ready ? '#28a745' : '#007AFF'}]} onPress={ready ? nextTask : handleCheck}>
                                <Text style={styles.mainBtnText}>{ready ? 'Następne' : 'Sprawdź'}</Text>
                            </TouchableOpacity>

                            <Text style={styles.counterTextSmall}>Zadanie: {stats.count}/{TASKS_LIMIT}</Text>
                            <View style={{height: 30, marginTop: 15, justifyContent: 'center'}}>
                                {msg ? <Text style={[styles.msg, status === 'correct' ? styles.correctText : styles.errorText]}>{msg}</Text> : null}
                            </View>
                        </View>
                    </ScrollView>

                    {!isKeyboardVisible && (
                        <View style={styles.iconsBottom}>
                            <Image source={require('../../../assets/happy.png')} style={styles.iconSame} />
                            <Text style={styles.counterTextIcons}>{stats.correct}</Text>
                            <Image source={require('../../../assets/sad.png')} style={styles.iconSame} />
                            <Text style={styles.counterTextIcons}>{stats.wrong}</Text>
                        </View>
                    )}
                </KeyboardAvoidingView>
            </View>
        </TouchableWithoutFeedback>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    keyboardContainer: { flex: 1, justifyContent: 'center' },
    centerContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 20 },
    topButtons: { position: 'absolute', top: 17, right: 20, flexDirection: 'row', zIndex: 10 },
    topBtnItem: { alignItems: 'center', marginLeft: 15 },
    iconTop: { width: 70, height: 70, resizeMode: 'contain' },
    buttonLabel: { fontSize: 14, fontWeight: 'bold', color: '#007AFF', marginTop: 2 },
    hintBox: { position: 'absolute', top: 110, right: 20, padding: 15, backgroundColor: '#fff', borderRadius: 15, width: 260, zIndex: 11, elevation: 5, borderWidth: 1, borderColor: '#007AFF' },
    hintTitle: { fontWeight: 'bold', color: '#007AFF', marginBottom: 5 },
    hintText: { fontSize: 14, color: '#333' },
    card: { width: '92%', maxWidth: 450, borderRadius: 25, padding: 25, alignItems: 'center', alignSelf: 'center', elevation: 4 },
    overlayBackground: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: 25 },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#007AFF', marginBottom: 10, textTransform: 'uppercase' },
    questionText: { fontSize: 18, color: '#2c3e50', textAlign: 'center', fontWeight: '500', lineHeight: 26, marginBottom: 20 },
    taskContent: { alignItems: 'center', width: '100%', marginBottom: 10 },
    equationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    rowCenter: { flexDirection: 'row', alignItems: 'center' },
    mixedContainer: { flexDirection: 'row', alignItems: 'center' },
    fractionStatic: { alignItems: 'center' },
    staticNum: { fontSize: 26, fontWeight: 'bold', color: '#2c3e50' },
    staticLine: { width: 35, height: 3, backgroundColor: '#2c3e50', marginVertical: 2 },
    staticDen: { fontSize: 26, fontWeight: 'bold', color: '#2c3e50' },
    bigNumber: { fontSize: 32, fontWeight: 'bold', color: '#2c3e50' },
    symbol: { fontSize: 32, fontWeight: 'bold', color: '#2c3e50', marginHorizontal: 5 },
    equalSign: { fontSize: 36, fontWeight: 'bold', color: '#2c3e50', marginHorizontal: 10 },
    fractionInputContainer: { alignItems: 'center' },
    fractionInput: { width: 65, height: 55, borderWidth: 2, borderRadius: 12, fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
    inputNeutral: { borderColor: '#ccc', backgroundColor: '#fff', color: '#333' },
    inputCorrect: { borderColor: '#28a745', backgroundColor: '#e8f5e9', color: '#28a745' },
    inputError: { borderColor: '#dc3545', backgroundColor: '#fbe9eb', color: '#dc3545' },
    fractionLineLarge: { width: 75, height: 3, backgroundColor: '#333', marginVertical: 5 },
    wholeInput: { width: 55, height: 75, borderWidth: 2, borderRadius: 12, fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginRight: 8 },
    fractionInputSmall: { width: 50, height: 45, borderWidth: 2, borderRadius: 10, fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
    fractionLineSmall: { width: 60, height: 2, backgroundColor: '#333', marginVertical: 3 },
    mainBtn: { marginTop: 20, paddingHorizontal: 40, paddingVertical: 14, borderRadius: 15 },
    mainBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    counterTextSmall: { fontSize: 13, color: '#555', textAlign: 'center', marginTop: 15 },
    msg: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
    correctText: { color: '#28a745' },
    errorText: { color: '#dc3545' },
    iconsBottom: { position: 'absolute', bottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' },
    iconSame: { width: combinedIconSize, height: combinedIconSize, resizeMode: 'contain', marginHorizontal: 10 },
    counterTextIcons: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    milestoneCard: { width: '90%', backgroundColor: '#fff', borderRadius: 20, padding: 25, alignItems: 'center' },
    milestoneTitle: { fontSize: 22, fontWeight: 'bold', color: '#333' },
    statsRowMilestone: { marginVertical: 15, alignItems: 'center' },
    statsTextMilestone: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    milestoneButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 10 },
    mButton: { paddingVertical: 12, borderRadius: 12, width: '48%', alignItems: 'center', backgroundColor: '#28a745' },
    mButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
    drawingContainer: { width: '95%', height: '85%', backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden' },
    drawingHeader: { height: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, backgroundColor: '#f0f0f0' },
    drawingTitle: { fontSize: 18, fontWeight: 'bold' },
    headerButton: { padding: 5 },
    headerButtonText: { fontSize: 16, color: '#007AFF' },
    problemPreviewContainer: { backgroundColor: '#f9f9f9', padding: 10, alignItems: 'center' },
    problemPreviewLabel: { fontSize: 12, color: '#777' },
    problemPreviewTextSmall: { fontSize: 16, fontWeight: '600' },
    canvas: { flex: 1, backgroundColor: '#ffffff' }
});

export default FractionDivisionTrainer;