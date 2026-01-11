import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TextInput, Keyboard, ImageBackground,
    Animated, StatusBar, Image, Dimensions, TouchableOpacity, Modal,
    Platform, KeyboardAvoidingView, TouchableWithoutFeedback, ScrollView, InteractionManager,
    useColorScheme
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { awardXpAndCoins } from '../../../services/xpService';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

const EXERCISE_ID = "FractionDivisionTrainer_cl4";
const { width: screenWidth } = Dimensions.get('window');
const TASKS_LIMIT = 30;
const combinedIconSize = screenWidth * 0.25;

// --- MODAL BRUDNOPISU ---
const DrawingModal = ({ visible, onClose, problemText }: { visible: boolean; onClose: () => void, problemText: string }) => {
    const isDarkMode = useColorScheme() === 'dark';
    const [paths, setPaths] = useState<string[]>([]);
    const [currentPath, setCurrentPath] = useState('');

    const theme = {
        bg: isDarkMode ? '#1E293B' : '#fff',
        text: isDarkMode ? '#FFF' : '#333',
        canvas: isDarkMode ? '#0F172A' : '#ffffff',
        stroke: isDarkMode ? '#FFF' : '#000',
        headerBg: isDarkMode ? '#334155' : '#f0f0f0',
        border: isDarkMode ? '#475569' : '#ccc',
        previewBg: isDarkMode ? '#1E293B' : '#f9f9f9',
    };

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
                <View style={[styles.drawingContainer, { backgroundColor: theme.bg }]}>
                    <View style={[styles.drawingHeader, { backgroundColor: theme.headerBg, borderBottomColor: theme.border }]}>
                        <TouchableOpacity onPress={handleClear} style={styles.headerButton}><Text style={styles.headerButtonText}>🗑️ Wyczyść</Text></TouchableOpacity>
                        <Text style={[styles.drawingTitle, { color: theme.text }]}>Brudnopis</Text>
                        <TouchableOpacity onPress={onClose} style={styles.headerButton}><Text style={styles.headerButtonText}>❌ Zamknij</Text></TouchableOpacity>
                    </View>
                    <View style={[styles.problemPreviewContainer, { backgroundColor: theme.previewBg, borderBottomColor: theme.border }]}>
                        <Text style={styles.problemPreviewLabel}>Zadanie:</Text>
                        <Text numberOfLines={2} style={[styles.problemPreviewTextSmall, { color: '#007AFF' }]}>{problemText}</Text>
                    </View>
                    <View style={[styles.canvas, { backgroundColor: theme.canvas }]} onStartShouldSetResponder={() => true} onMoveShouldSetResponder={() => true} onResponderGrant={(evt) => { const { locationX, locationY } = evt.nativeEvent; setCurrentPath(`M${locationX},${locationY}`); }} onResponderMove={onTouchMove} onResponderRelease={onTouchEnd}>
                        <Svg height="100%" width="100%">
                            {paths.map((d, index) => (<Path key={index} d={d} stroke={theme.stroke} strokeWidth={3} fill="none" />))}
                            <Path d={currentPath} stroke={theme.stroke} strokeWidth={3} fill="none" />
                        </Svg>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const FractionDivisionTrainer = () => {
    const navigation = useNavigation();
    const isDarkMode = useColorScheme() === 'dark';

    const theme = {
        bgImage: require('../../../assets/background.jpg'),
        bgOverlay: isDarkMode ? 'rgba(0, 0, 0, 0.75)' : 'transparent',
        topBtnText: isDarkMode ? '#FFFFFF' : '#007AFF',
        textMain: isDarkMode ? '#FFFFFF' : '#333333',
        textSub: isDarkMode ? '#CBD5E1' : '#555555',
        cardOverlay: isDarkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255,255,255,0.94)',
        modalContent: isDarkMode ? '#1E293B' : '#fff',
        statsRow: isDarkMode ? '#0F172A' : '#f8f9fa',
        inputBg: isDarkMode ? '#334155' : '#ffffff',
        inputBorder: isDarkMode ? '#475569' : '#ccc',
        inputText: isDarkMode ? '#FFFFFF' : '#333',
        inputPlaceholder: isDarkMode ? '#94A3B8' : '#aaa',
        correctBg: isDarkMode ? 'rgba(21, 87, 36, 0.5)' : '#e8f5e9',
        correctBorder: isDarkMode ? '#4ADE80' : '#28a745',
        errorBg: isDarkMode ? 'rgba(114, 28, 36, 0.5)' : '#fbe9eb',
        errorBorder: isDarkMode ? '#F87171' : '#dc3545',
    };

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
        } else {
            setStatus('wrong');
            if (attempts === 0) {
                setMsg('Błąd! Spróbuj jeszcze raz ✍️');
                setAttempts(1);
                if (!isWOk) setInpWhole('');
                if (!is1Ok) setInp1('');
                if (!is2Ok) setInp2('');
                Animated.sequence([
                    Animated.timing(bgAnim, { toValue: -1, duration: 200, useNativeDriver: false }),
                    Animated.timing(bgAnim, { toValue: 0, duration: 200, useNativeDriver: false })
                ]).start();
                setTimeout(() => setStatus('neutral'), 1500);
            } else {
                let correctStr = task.type === 2 ? `${task.targetWhole} i ${task.target1}/${task.target2}` : (task.type === 0 ? `${task.target1}/${task.target2}` : `${task.target1} : ${task.target2}`);
                setMsg(`Niestety błąd. Wynik: ${correctStr}`);
                setReady(true);
                setStats(s => ({ ...s, wrong: s.wrong + 1 }));
                Animated.timing(bgAnim, { toValue: -1, duration: 500, useNativeDriver: false }).start();
            }
        }
    };

    const nextTask = () => {
        if (stats.count >= TASKS_LIMIT) { setIsFinished(true); return; }
        if (stats.count > 0 && stats.count % 10 === 0 && !showMilestone) { setShowMilestone(true); return; }
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

    const getValidationStyle = (currentVal: string, targetVal: number | null) => {
        const baseStyle = { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.inputText };
        if (status === 'neutral') return [styles.inputBox, baseStyle];
        const isFieldCorrect = currentVal && parseInt(currentVal) === targetVal;
        if (status === 'correct' || isFieldCorrect) return [styles.inputBox, { backgroundColor: theme.correctBg, borderColor: theme.correctBorder, color: isDarkMode ? '#86EFAC' : '#28a745' }];
        return [styles.inputBox, { backgroundColor: theme.errorBg, borderColor: theme.errorBorder, color: isDarkMode ? '#FCA5A5' : '#dc3545' }];
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.container}>
                <StatusBar translucent backgroundColor="transparent" barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
                <ImageBackground source={theme.bgImage} style={StyleSheet.absoluteFillObject} resizeMode="cover">
                    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.bgOverlay }]} />
                </ImageBackground>
                <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: bgAnim.interpolate({ inputRange: [-1, 0, 1], outputRange: ['rgba(255,0,0,0.15)', 'transparent', 'rgba(0,255,0,0.15)'] }) }]} pointerEvents="none" />

                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardContainer}>
                    {!isKeyboardVisible && (
                        <View style={styles.topButtons}>
                            <TouchableOpacity onPress={() => setShowScratchpad(true)} style={styles.topBtnItem}>
                                <Image source={require('../../../assets/pencil.png')} style={styles.iconTop} />
                                <Text style={[styles.buttonLabel, { color: theme.topBtnText }]}>Brudnopis</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setShowHint(!showHint)} style={styles.topBtnItem}>
                                <Image source={require('../../../assets/question.png')} style={styles.iconTop} />
                                <Text style={[styles.buttonLabel, { color: theme.topBtnText }]}>Pomoc</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* MODALE (MILESTONE, FINISH, HINT) */}
                    <Modal visible={showMilestone} transparent={true} animationType="slide">
                        <View style={styles.modalOverlay}>
                            <View style={[styles.milestoneCard, { backgroundColor: theme.modalContent }]}>
                                <Text style={[styles.milestoneTitle, { color: theme.textMain }]}>Podsumowanie serii 📊</Text>
                                <View style={[styles.statsRowMilestone, { backgroundColor: theme.statsRow }]}>
                                    <Text style={[styles.statsTextMilestone, { color: theme.textMain }]}>Poprawne: {sessionCorrect} / 10</Text>
                                </View>
                                <TouchableOpacity style={styles.mButton} onPress={() => { setShowMilestone(false); setSessionCorrect(0); setStats(s => ({ ...s, count: s.count + 1 })); generateProblem(); }}>
                                    <Text style={styles.mButtonText}>Kontynuuj</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Modal>

                    <Modal visible={isFinished} transparent={true} animationType="fade">
                        <View style={styles.modalOverlay}>
                            <View style={[styles.milestoneCard, { backgroundColor: theme.modalContent }]}>
                                <Text style={[styles.milestoneTitle, { color: theme.textMain }]}>Gratulacje! 🏆</Text>
                                <View style={[styles.statsRowMilestone, { backgroundColor: theme.statsRow }]}>
                                    <Text style={[styles.statsTextMilestone, { color: theme.textMain }]}>Wynik końcowy: {stats.correct} / {TASKS_LIMIT}</Text>
                                </View>
                                <View style={styles.milestoneButtons}>
                                    <TouchableOpacity style={styles.mButton} onPress={handleRestart}><Text style={styles.mButtonText}>Od nowa</Text></TouchableOpacity>
                                    <TouchableOpacity style={[styles.mButton, {backgroundColor: '#dc3545'}]} onPress={() => navigation.goBack()}><Text style={styles.mButtonText}>Wyjdź</Text></TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>

                    {showHint && !isKeyboardVisible && (
                        <View style={[styles.hintBox, { backgroundColor: theme.modalContent, borderColor: '#007AFF' }]}>
                            <Text style={styles.hintTitle}>Podpowiedź:</Text>
                            <Text style={[styles.hintText, { color: theme.textMain }]}>{task.h}</Text>
                        </View>
                    )}

                    <DrawingModal visible={showScratchpad} onClose={() => setShowScratchpad(false)} problemText={task.q} />

                    <ScrollView contentContainerStyle={styles.centerContent} keyboardShouldPersistTaps="handled">
                        <View style={styles.card}>
                            <View style={[styles.overlayBackground, { backgroundColor: theme.cardOverlay }]} />
                            <Text style={styles.headerTitle}>Ułamki i dzielenie</Text>
                            <Text style={[styles.questionText, { color: theme.textMain }]}>{task.q}</Text>

                            <View style={styles.taskContent}>
                                <View style={styles.equationRow}>
                                    {task.type === 0 ? (
                                        <View style={styles.rowCenter}>
                                            <Text style={[styles.bigNumber, { color: theme.textMain }]}>{task.val1}</Text>
                                            <Text style={[styles.symbol, { color: theme.textMain }]}>:</Text>
                                            <Text style={[styles.bigNumber, { color: theme.textMain }]}>{task.val2}</Text>
                                        </View>
                                    ) : (
                                        <View style={styles.fractionStatic}>
                                            <Text style={[styles.staticNum, { color: theme.textMain }]}>{task.val1}</Text>
                                            <View style={[styles.staticLine, { backgroundColor: theme.textMain }]} />
                                            <Text style={[styles.staticDen, { color: theme.textMain }]}>{task.val2}</Text>
                                        </View>
                                    )}

                                    <Text style={[styles.equalSign, { color: theme.textMain }]}>=</Text>

                                    {task.type === 0 ? (
                                        <View style={styles.fractionInputContainer}>
                                            <TextInput ref={inp1Ref} style={getValidationStyle(inp1, task.target1)} keyboardType="numeric" value={inp1} onChangeText={setInp1} onSubmitEditing={() => inp2Ref.current?.focus()} blurOnSubmit={false} editable={!ready} placeholder="?" placeholderTextColor={theme.inputPlaceholder} />
                                            <View style={[styles.fractionLineLarge, { backgroundColor: theme.textMain }]} />
                                            <TextInput ref={inp2Ref} style={getValidationStyle(inp2, task.target2)} keyboardType="numeric" value={inp2} onChangeText={setInp2} editable={!ready} placeholder="?" placeholderTextColor={theme.inputPlaceholder} />
                                        </View>
                                    ) : task.type === 1 ? (
                                        <View style={styles.rowCenter}>
                                            <TextInput ref={inp1Ref} style={getValidationStyle(inp1, task.target1)} keyboardType="numeric" value={inp1} onChangeText={setInp1} onSubmitEditing={() => inp2Ref.current?.focus()} blurOnSubmit={false} editable={!ready} placeholder="?" placeholderTextColor={theme.inputPlaceholder} />
                                            <Text style={[styles.symbol, { color: theme.textMain }]}>:</Text>
                                            <TextInput ref={inp2Ref} style={getValidationStyle(inp2, task.target2)} keyboardType="numeric" value={inp2} onChangeText={setInp2} editable={!ready} placeholder="?" placeholderTextColor={theme.inputPlaceholder} />
                                        </View>
                                    ) : (
                                        <View style={styles.mixedContainer}>
                                            <TextInput ref={wholeRef} style={[getValidationStyle(inpWhole, task.targetWhole), {width: 55, height: 75, fontSize: 28, marginRight: 8}]} keyboardType="numeric" value={inpWhole} onChangeText={setInpWhole} onSubmitEditing={() => inp1Ref.current?.focus()} blurOnSubmit={false} editable={!ready} placeholder="?" placeholderTextColor={theme.inputPlaceholder} />
                                            <View style={styles.fractionInputContainer}>
                                                <TextInput ref={inp1Ref} style={[getValidationStyle(inp1, task.target1), {width: 50, height: 45, fontSize: 20}]} keyboardType="numeric" value={inp1} onChangeText={setInp1} onSubmitEditing={() => inp2Ref.current?.focus()} blurOnSubmit={false} editable={!ready} placeholder="?" placeholderTextColor={theme.inputPlaceholder} />
                                                <View style={[styles.fractionLineSmall, { backgroundColor: theme.textMain }]} />
                                                <TextInput ref={inp2Ref} style={[getValidationStyle(inp2, task.target2), {width: 50, height: 45, fontSize: 20}]} keyboardType="numeric" value={inp2} onChangeText={setInp2} editable={!ready} placeholder="?" placeholderTextColor={theme.inputPlaceholder} />
                                            </View>
                                        </View>
                                    )}
                                </View>
                            </View>

                            <TouchableOpacity style={[styles.mainBtn, {backgroundColor: ready ? '#28a745' : '#007AFF'}]} onPress={ready ? nextTask : handleCheck}>
                                <Text style={styles.mainBtnText}>{ready ? 'Następne' : 'Sprawdź'}</Text>
                            </TouchableOpacity>

                            <Text style={[styles.counterTextSmall, { color: theme.textSub }]}>Zadanie: {stats.count}/{TASKS_LIMIT}</Text>
                            <View style={{height: 30, marginTop: 15, justifyContent: 'center'}}>
                                {msg ? <Text style={[styles.msg, status === 'correct' ? {color: '#28a745'} : {color: '#dc3545'}]}>{msg}</Text> : null}
                            </View>
                        </View>
                    </ScrollView>

                    {!isKeyboardVisible && (
                        <View style={styles.iconsBottom}>
                            <Image source={require('../../../assets/happy.png')} style={styles.iconSame} />
                            <Text style={[styles.counterTextIcons, { color: theme.textMain }]}>{stats.correct}</Text>
                            <Image source={require('../../../assets/sad.png')} style={styles.iconSame} />
                            <Text style={[styles.counterTextIcons, { color: theme.textMain }]}>{stats.wrong}</Text>
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
    buttonLabel: { fontSize: 14, fontWeight: 'bold', marginTop: 2 },
    hintBox: { position: 'absolute', top: 110, right: 20, padding: 15, borderRadius: 15, width: 260, zIndex: 11, elevation: 5, borderWidth: 1 },
    hintTitle: { fontWeight: 'bold', color: '#007AFF', marginBottom: 5 },
    hintText: { fontSize: 14 },
    card: { width: '92%', maxWidth: 450, borderRadius: 25, padding: 25, alignItems: 'center', alignSelf: 'center', elevation: 4 },
    overlayBackground: { ...StyleSheet.absoluteFillObject, borderRadius: 25 },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#007AFF', marginBottom: 10, textTransform: 'uppercase' },
    questionText: { fontSize: 18, textAlign: 'center', fontWeight: '500', lineHeight: 26, marginBottom: 20 },
    taskContent: { alignItems: 'center', width: '100%', marginBottom: 10 },
    equationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    rowCenter: { flexDirection: 'row', alignItems: 'center' },
    mixedContainer: { flexDirection: 'row', alignItems: 'center' },
    fractionStatic: { alignItems: 'center' },
    staticNum: { fontSize: 26, fontWeight: 'bold' },
    staticLine: { width: 35, height: 3, marginVertical: 2 },
    staticDen: { fontSize: 26, fontWeight: 'bold' },
    bigNumber: { fontSize: 32, fontWeight: 'bold' },
    symbol: { fontSize: 32, fontWeight: 'bold', marginHorizontal: 5 },
    equalSign: { fontSize: 36, fontWeight: 'bold', marginHorizontal: 10 },
    fractionInputContainer: { alignItems: 'center' },
    inputBox: { width: 65, height: 55, borderWidth: 2, borderRadius: 12, fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
    fractionLineLarge: { width: 75, height: 3, marginVertical: 5 },
    fractionLineSmall: { width: 60, height: 2, marginVertical: 3 },
    mainBtn: { marginTop: 20, paddingHorizontal: 40, paddingVertical: 14, borderRadius: 15 },
    mainBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    counterTextSmall: { fontSize: 13, textAlign: 'center', marginTop: 15 },
    msg: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
    iconsBottom: { position: 'absolute', bottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' },
    iconSame: { width: combinedIconSize, height: combinedIconSize, resizeMode: 'contain', marginHorizontal: 10 },
    counterTextIcons: { fontSize: 18, fontWeight: 'bold' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    milestoneCard: { width: '90%', borderRadius: 20, padding: 25, alignItems: 'center' },
    milestoneTitle: { fontSize: 22, fontWeight: 'bold' },
    statsRowMilestone: { marginVertical: 15, alignItems: 'center', padding: 15, borderRadius: 15, width: '100%' },
    statsTextMilestone: { fontSize: 18, fontWeight: 'bold' },
    milestoneButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 10 },
    mButton: { paddingVertical: 12, borderRadius: 12, width: '48%', alignItems: 'center', backgroundColor: '#28a745' },
    mButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
    drawingContainer: { width: '95%', height: '85%', borderRadius: 20, overflow: 'hidden' },
    drawingHeader: { height: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
    drawingTitle: { fontSize: 18, fontWeight: 'bold' },
    headerButton: { padding: 5 },
    headerButtonText: { fontSize: 16, color: '#007AFF' },
    problemPreviewContainer: { padding: 10, alignItems: 'center', borderBottomWidth: 1 },
    problemPreviewLabel: { fontSize: 12, color: '#777' },
    problemPreviewTextSmall: { fontSize: 16, fontWeight: '600' },
    canvas: { flex: 1 }
});

export default FractionDivisionTrainer;