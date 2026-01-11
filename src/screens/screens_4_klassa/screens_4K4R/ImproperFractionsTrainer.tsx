import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TextInput, Keyboard, ImageBackground,
    Animated, StatusBar, Image, Dimensions, TouchableOpacity, Modal,
    Platform, KeyboardAvoidingView, TouchableWithoutFeedback, ScrollView, InteractionManager
} from 'react-native';
import Svg, { Path, Rect, G } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { awardXpAndCoins } from '../../../services/xpService';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

const EXERCISE_ID = "ImproperFractionsTrainer_cl4";
const { width: screenWidth } = Dimensions.get('window');
const TASKS_LIMIT = 35;
// TWOJE ORYGINALNE WYMIARY IKON
const combinedIconSize = screenWidth * 0.22;

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

// --- WIZUALIZACJA ---
const ImproperVisuals = ({ num, den, type }: { num: number, den: number, type: 'circle' | 'rect' }) => {
    const shapeSize = 70;
    const margin = 10;
    const totalShapes = Math.ceil(num / den);

    const shapes = Array.from({ length: totalShapes }, (_, shapeIndex) => {
        const partsPaintedSoFar = shapeIndex * den;
        const remainingToPaint = num - partsPaintedSoFar;
        const paintInThisShape = Math.min(den, Math.max(0, remainingToPaint));
        return { index: shapeIndex, painted: paintInThisShape };
    });

    const renderShape = (painted: number, key: number) => {
        if (type === 'circle') {
            const radius = 32; const center = 35;
            return (
                <Svg key={key} height={shapeSize} width={shapeSize} viewBox={`0 0 ${shapeSize} ${shapeSize}`} style={{margin: margin}}>
                    {[...Array(den)].map((_, i) => {
                        const startAngle = (i * 360) / den - 90;
                        const endAngle = ((i + 1) * 360) / den - 90;
                        const x1 = center + radius * Math.cos((Math.PI * startAngle) / 180);
                        const y1 = center + radius * Math.sin((Math.PI * startAngle) / 180);
                        const x2 = center + radius * Math.cos((Math.PI * endAngle) / 180);
                        const y2 = center + radius * Math.sin((Math.PI * endAngle) / 180);
                        const d = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`;
                        return <Path key={i} d={d} fill={i < painted ? "#4A90E2" : "#FFF"} stroke="#2c3e50" strokeWidth="1.5" />;
                    })}
                </Svg>
            );
        } else {
            const w = 60; const h = 60;
            const rows = den > 4 ? 2 : 1;
            const cols = Math.ceil(den / rows);
            const cellW = w / cols;
            const cellH = h / rows;
            return (
                <Svg key={key} height={h+4} width={w+4} style={{margin: margin}}>
                    <G x="2" y="2">
                        {[...Array(den)].map((_, i) => {
                            const r = Math.floor(i / cols);
                            const c = i % cols;
                            return <Rect key={i} x={c * cellW} y={r * cellH} width={cellW} height={cellH} fill={i < painted ? "#4A90E2" : "#FFF"} stroke="#2c3e50" strokeWidth="1.5" />;
                        })}
                    </G>
                </Svg>
            );
        }
    };

    return (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginVertical: 10 }}>
            {shapes.map(s => renderShape(s.painted, s.index))}
        </View>
    );
};

// --- GŁÓWNY KOMPONENT ---
const ImproperFractionsTrainer = () => {
    const navigation = useNavigation();
    const [task, setTask] = useState({
        type: 'visual', q: '', h: '', correctNum: 0, correctDen: 1,
        visType: 'circle' as 'circle' | 'rect', mixedWhole: 0, mixedNum: 0, mixedDen: 0
    });

    const [userNum, setUserNum] = useState('');
    const [userDen, setUserDen] = useState('');
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
    const numInputRef = useRef<TextInput>(null);
    const denInputRef = useRef<TextInput>(null);
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
        setUserNum(''); setUserDen(''); setAttempts(0); setShowHint(false);
        bgAnim.setValue(0);

        let newTask: any = {};
        let uniqueKey = "";
        let attemptCount = 0;

        do {
            const typeRoll = Math.random();
            if (typeRoll < 0.40) {
                const den = [3, 4, 5, 6, 8][rnd(0, 4)];
                const whole = rnd(1, 2);
                const extra = rnd(1, den - 1);
                const num = whole * den + extra;
                const visType = Math.random() > 0.5 ? 'circle' : 'rect';
                newTask = { type: 'visual', q: 'Zapisz zamalowaną część jako ułamek niewłaściwy.', h: `Licznik to wszystkie zamalowane kawałki. Mianownik to liczba części w jednej figurze.`, correctNum: num, correctDen: den, visType: visType };
                uniqueKey = `visual-${num}-${den}-${visType}`;
            } else if (typeRoll < 0.80) {
                const den = rnd(2, 9);
                const whole = rnd(1, 5);
                const extra = rnd(1, den - 1);
                const correctNum = whole * den + extra;
                newTask = { type: 'mixed_to_improper', q: 'Zamień na ułamek niewłaściwy.', h: `Pomnóż całość (${whole}) przez mianownik (${den}) i dodaj licznik (${extra}).`, correctNum: correctNum, correctDen: den, mixedWhole: whole, mixedNum: extra, mixedDen: den };
                uniqueKey = `mixed-${whole}-${extra}-${den}`;
            } else {
                const whole = rnd(2, 8);
                const den = rnd(2, 6);
                const correctNum = whole * den;
                newTask = { type: 'integer_to_improper', q: `Przedstaw liczbę ${whole} jako ułamek o mianowniku ${den}.`, h: `Pomnóż liczbę ${whole} przez mianownik ${den}, aby obliczyć licznik.`, correctNum: correctNum, correctDen: den, mixedWhole: whole };
                uniqueKey = `int-${whole}-${den}`;
            }
            attemptCount++;
        } while (historyRef.current.has(uniqueKey) && attemptCount < 20);

        historyRef.current.add(uniqueKey);
        setTask(newTask);
        setTimeout(() => numInputRef.current?.focus(), 400);
    };

    const handleCheck = () => {
        // PUNKT 2: Blokada pustych pól
        if (!userNum || !userDen) { setMsg('Wypełnij puste pola!'); return; }

        const n = parseInt(userNum);
        const d = parseInt(userDen);
        const isNCorrect = n === task.correctNum;
        const isDCorrect = d === task.correctDen;

        if (isNCorrect && isDCorrect) {
            setStatus('correct');
            setMsg('Doskonale! ✅');
            Animated.timing(bgAnim, { toValue: 1, duration: 500, useNativeDriver: false }).start();
            setStats(s => ({ ...s, correct: s.correct + 1 }));
            setSessionCorrect(prev => prev + 1);
            setReady(true);
            InteractionManager.runAfterInteractions(() => awardXpAndCoins(10, 2));
            const currentUser = auth().currentUser;
            if (currentUser) {
                firestore().collection('users').doc(currentUser.uid).collection('exerciseStats').doc(EXERCISE_ID)
                    .set({ totalCorrect: firestore.FieldValue.increment(1) }, { merge: true }).catch(console.error);
            }
        } else {
            setStatus('wrong');
            if (attempts === 0) {
                // PUNKT 1: Pierwsza pomyłka - czyszczenie tylko błędnych
                setMsg('Błąd! Spróbuj poprawić ✍️');
                setAttempts(1);
                if (!isNCorrect) setUserNum('');
                if (!isDCorrect) setUserDen('');

                Animated.sequence([
                    Animated.timing(bgAnim, { toValue: -1, duration: 200, useNativeDriver: false }),
                    Animated.timing(bgAnim, { toValue: 0, duration: 200, useNativeDriver: false })
                ]).start();

                // PUNKT 5: Reset statusu po chwili
                setTimeout(() => setStatus('neutral'), 1500);
            } else {
                // PUNKT 1: Druga pomyłka - wynik
                setMsg(`Wynik: ${task.correctNum}/${task.correctDen}`);
                setReady(true);
                setStats(s => ({ ...s, wrong: s.wrong + 1 }));
                Animated.timing(bgAnim, { toValue: -1, duration: 500, useNativeDriver: false }).start();
                const currentUser = auth().currentUser;
                if (currentUser) {
                    firestore().collection('users').doc(currentUser.uid).collection('exerciseStats').doc(EXERCISE_ID)
                        .set({ totalWrong: firestore.FieldValue.increment(1) }, { merge: true }).catch(console.error);
                }
            }
        }
    };

    const nextTask = () => {
        // PUNKT 3 i 4: Milestone i Finish logic
        if (stats.count >= TASKS_LIMIT) { setIsFinished(true); return; }
        if (stats.count > 0 && stats.count % 10 === 0 && !showMilestone) {
            setShowMilestone(true); return;
        }
        setStats(s => ({ ...s, count: s.count + 1 }));
        generateProblem();
    };

    const handleRestart = () => {
        setIsFinished(false); setStats({ correct: 0, wrong: 0, count: 1 });
        setSessionCorrect(0); historyRef.current.clear(); generateProblem();
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
                            <TouchableOpacity onPress={() => setShowScratchpad(true)} style={styles.topBtnItem}><Image source={require('../../../assets/pencil.png')} style={styles.iconTop} /><Text style={styles.buttonLabel}>Brudnopis</Text></TouchableOpacity>
                            <TouchableOpacity onPress={() => setShowHint(!showHint)} style={styles.topBtnItem}><Image source={require('../../../assets/question.png')} style={styles.iconTop} /><Text style={styles.buttonLabel}>Pomoc</Text></TouchableOpacity>
                        </View>
                    )}

                    <Modal visible={showMilestone} transparent={true} animationType="slide">
                        <View style={styles.modalOverlay}>
                            <View style={styles.milestoneCard}>
                                <Text style={styles.milestoneTitle}>Podsumowanie serii 📊</Text>
                                <View style={styles.statsRowMilestone}><Text style={styles.statsTextMilestone}>Poprawne: {sessionCorrect} / 10</Text></View>
                                <TouchableOpacity style={[styles.mButton, { backgroundColor: '#28a745', width: '80%' }]} onPress={() => { setShowMilestone(false); setSessionCorrect(0); nextTask(); }}><Text style={styles.mButtonText}>Kontynuuj</Text></TouchableOpacity>
                            </View>
                        </View>
                    </Modal>

                    <Modal visible={isFinished} transparent={true} animationType="fade">
                        <View style={styles.modalOverlay}>
                            <View style={styles.milestoneCard}>
                                <Text style={styles.milestoneTitle}>Gratulacje! 🏆</Text>
                                <View style={styles.statsRowMilestone}><Text style={styles.statsTextMilestone}>Wynik: {stats.correct} / {TASKS_LIMIT}</Text></View>
                                <View style={styles.milestoneButtons}>
                                    <TouchableOpacity style={[styles.mButton, { backgroundColor: '#28a745' }]} onPress={handleRestart}><Text style={styles.mButtonText}>Od nowa</Text></TouchableOpacity>
                                    <TouchableOpacity style={[styles.mButton, { backgroundColor: '#dc3545' }]} onPress={() => navigation.goBack()}><Text style={styles.mButtonText}>Wyjdź</Text></TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>

                    {showHint && !isKeyboardVisible && (
                        <View style={styles.hintBox}><Text style={styles.hintTitle}>Wskazówka:</Text><Text style={styles.hintText}>{task.h}</Text></View>
                    )}

                    <DrawingModal visible={showScratchpad} onClose={() => setShowScratchpad(false)} problemText={task.q} />

                    <ScrollView contentContainerStyle={styles.centerContent} keyboardShouldPersistTaps="handled">
                        <View style={styles.card}>
                            <View style={styles.overlayBackground} />
                            <Text style={styles.headerTitle}>Ułamki niewłaściwe</Text>
                            <Text style={styles.questionText}>{task.q}</Text>

                            <View style={styles.taskContent}>
                                {task.type === 'visual' && <ImproperVisuals num={task.correctNum} den={task.correctDen} type={task.visType} />}
                                {task.type === 'mixed_to_improper' && (
                                    <View style={styles.mixedContainer}>
                                        <Text style={styles.mixedWhole}>{task.mixedWhole}</Text>
                                        <View style={styles.mixedFraction}>
                                            <Text style={styles.mixedNum}>{task.mixedNum}</Text>
                                            <View style={styles.mixedLine} />
                                            <Text style={styles.mixedDen}>{task.mixedDen}</Text>
                                        </View>
                                        <Text style={styles.equalSign}>=</Text>
                                    </View>
                                )}
                                {task.type === 'integer_to_improper' && (
                                    <View style={styles.mixedContainer}>
                                        <Text style={styles.mixedWhole}>{task.mixedWhole}</Text>
                                        <Text style={styles.equalSign}>=</Text>
                                    </View>
                                )}

                                <View style={styles.inputFractionContainer}>
                                    <TextInput ref={numInputRef} style={[styles.fractionInput, status === 'correct' ? styles.inputCorrect : status === 'wrong' ? styles.inputError : {}]} keyboardType="numeric" placeholder="?" value={userNum} onChangeText={(v) => { setUserNum(v); setStatus('neutral'); if(v.length >= (task.correctNum.toString().length)) denInputRef.current?.focus(); }} editable={!ready} />
                                    <View style={styles.fractionLineLarge} />
                                    <TextInput ref={denInputRef} style={[styles.fractionInput, status === 'correct' ? styles.inputCorrect : status === 'wrong' ? styles.inputError : {}]} keyboardType="numeric" placeholder="?" value={userDen} onChangeText={(v) => { setUserDen(v); setStatus('neutral'); }} editable={!ready} />
                                </View>
                            </View>

                            <TouchableOpacity style={[styles.mainBtn, {backgroundColor: ready ? '#28a745' : '#007AFF'}]} onPress={ready ? nextTask : handleCheck}><Text style={styles.mainBtnText}>{ready ? 'Następne' : 'Sprawdź'}</Text></TouchableOpacity>
                            <Text style={styles.counterTextSmall}>Zadanie: {stats.count} / {TASKS_LIMIT}</Text>
                            <View style={{height: 30, marginTop: 15, justifyContent: 'center'}}>
                                {msg ? <Text style={[styles.msg, status === 'correct' ? styles.correctText : styles.errorText]}>{msg}</Text> : null}
                            </View>
                        </View>
                    </ScrollView>

                    {!isKeyboardVisible && (
                        <View style={styles.iconsBottom}>
                            <Image source={require('../../../assets/happy.png')} style={styles.iconSame} /><Text style={styles.counterTextIcons}>{stats.correct}</Text>
                            <Image source={require('../../../assets/sad.png')} style={styles.iconSame} /><Text style={styles.counterTextIcons}>{stats.wrong}</Text>
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
    topButtons: { position: 'absolute', top: 0, right: 20, flexDirection: 'row', zIndex: 10 },
    topBtnItem: { alignItems: 'center', marginLeft: 15 },
    iconTop: { width: 70, height: 70, resizeMode: 'contain' },
    buttonLabel: { fontSize: 14, fontWeight: 'bold', color: '#007AFF', marginTop: 2 },
    hintBox: { position: 'absolute', top: 110, right: 20, padding: 15, backgroundColor: '#fff', borderRadius: 15, width: 260, zIndex: 11, elevation: 5, borderWidth: 1, borderColor: '#007AFF' },
    hintTitle: { fontWeight: 'bold', color: '#007AFF', marginBottom: 5 },
    hintText: { fontSize: 14, color: '#333' },
    card: { width: '92%', maxWidth: 450, borderRadius: 25, padding: 25, alignItems: 'center', alignSelf: 'center', elevation: 4 },
    overlayBackground: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: 25 },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#007AFF', marginBottom: 15, textTransform: 'uppercase' },
    questionText: { fontSize: 18, color: '#2c3e50', textAlign: 'center', fontWeight: '500', lineHeight: 26, marginBottom: 20 },
    taskContent: { alignItems: 'center', width: '100%', marginBottom: 10 },
    mixedContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    mixedWhole: { fontSize: 50, fontWeight: 'bold', color: '#2c3e50', marginRight: 8 },
    mixedFraction: { alignItems: 'center', justifyContent: 'center' },
    mixedNum: { fontSize: 28, fontWeight: 'bold', color: '#2c3e50' },
    mixedLine: { width: 30, height: 3, backgroundColor: '#2c3e50', marginVertical: 4 },
    mixedDen: { fontSize: 28, fontWeight: 'bold', color: '#2c3e50' },
    equalSign: { fontSize: 40, fontWeight: 'bold', color: '#2c3e50', marginHorizontal: 15 },
    inputFractionContainer: { alignItems: 'center' },
    fractionInput: { width: 75, height: 60, borderWidth: 2, borderColor: '#ccc', borderRadius: 12, backgroundColor: '#fff', fontSize: 24, fontWeight: 'bold', textAlign: 'center', color: '#007AFF' },
    fractionLineLarge: { width: 90, height: 4, backgroundColor: '#333', marginVertical: 8, borderRadius: 2 },
    inputCorrect: { borderColor: '#28a745', backgroundColor: '#e8f5e9' },
    inputError: { borderColor: '#dc3545', backgroundColor: '#fbe9eb' },
    mainBtn: { marginTop: 25, paddingHorizontal: 40, paddingVertical: 14, borderRadius: 15, backgroundColor: '#007AFF' },
    mainBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    result: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
    msg: { // To naprawi błąd TS2339
        fontSize: 18,
        fontWeight: '700',
        textAlign: 'center',
        marginTop: 15,
        minHeight: 30, // Rezerwuje miejsce na komunikat
    },
    correctText: { color: '#28a745' },
    errorText: { color: '#dc3545' },
    counterTextSmall: { fontSize: 13, color: '#555', textAlign: 'center', marginTop: 15 },
    iconsBottom: { position: 'absolute', bottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' },
    iconSame: { width: combinedIconSize, height: combinedIconSize, resizeMode: 'contain', marginHorizontal: 10 },
    counterTextIcons: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    milestoneCard: { width: '90%', backgroundColor: '#fff', borderRadius: 20, padding: 25, alignItems: 'center' },
    milestoneTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 15 },
    statsRowMilestone: { marginVertical: 15, alignItems: 'center' },
    statsTextMilestone: { fontSize: 18, fontWeight: 'bold' },
    milestoneButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
    mButton: { paddingVertical: 12, borderRadius: 12, width: '48%', alignItems: 'center' },
    mButtonText: { color: '#fff', fontWeight: 'bold' },
    headerButton: { padding: 10 },
    headerButtonText: { fontSize: 16, color: '#007AFF', fontWeight: '600' },
    drawingContainer: { width: '95%', height: '85%', backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden' },
    drawingHeader: { height: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, backgroundColor: '#f0f0f0' },
    drawingTitle: { fontSize: 18, fontWeight: 'bold' },
    problemPreviewContainer: { backgroundColor: '#f9f9f9', padding: 10, alignItems: 'center' },
    problemPreviewLabel: { fontSize: 12, color: '#777' },
    problemPreviewTextSmall: { fontSize: 16, fontWeight: '600' },
    canvas: { flex: 1, backgroundColor: '#ffffff' }
});

export default ImproperFractionsTrainer;