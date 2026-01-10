import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    Button,
    Keyboard,
    ImageBackground,
    Animated,
    StatusBar,
    Image,
    Dimensions,
    TouchableOpacity,
    Modal,
    Platform,
    KeyboardAvoidingView,
    TouchableWithoutFeedback,
    ScrollView,
    InteractionManager
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';

import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { awardXpAndCoins } from '../../../services/xpService';

const EXERCISE_ID = "orderOperationsTrainer";
const TASKS_LIMIT = 100;
const screenWidth = Dimensions.get('window').width;

const rnd = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const getDivisiblePair = (maxDivisor = 9) => {
    const b = rnd(2, maxDivisor);
    const a = b * rnd(2, 12);
    return { a, b };
};

const generateTask = () => {
    const type = rnd(1, 18);
    switch (type) {
        case 1: {
            const b = rnd(5, 20);
            const a = b + rnd(1, 30);
            const c = rnd(5, 20);
            return { text: `${a} - ${b} + ${c}`, steps: [`1. ${a} - ${b}`, `2. Wynik + ${c}`] };
        }
        case 2: {
            const b = rnd(10, 30);
            const a = b + rnd(5, 40);
            const c = rnd(2, 10);
            return { text: `${a} - ${b} + ${c}`, steps: [`1. ${a} - ${b}`, `2. Wynik + ${c}`] };
        }
        case 3: {
            const c = rnd(1, 9);
            const b = c + rnd(1, 10);
            const mult = rnd(2, 8);
            return { text: `${mult} · (${b} - ${c})`, steps: [`1. ${b} - ${c}`, `2. ${mult} · Wynik nawiasu`] };
        }
        case 4: {
            const b = rnd(5, 12), c = rnd(2, 6);
            const a = rnd(5, 20);
            return { text: `${a} + ${b} · ${c}`, steps: [`1. ${b} · ${c}`, `2. ${a} + Wynik mnożenia`] };
        }
        case 5: {
            const a = rnd(2, 6);
            const b = rnd(4, 10);
            const prod = a * b;
            const c = rnd(1, prod - 1);
            return { text: `${a} · ${b} - ${c}`, steps: [`1. ${a} · ${b}`, `2. Wynik mnożenia - ${c}`] };
        }
        case 6: {
            const div = rnd(2, 5);
            const total = div * rnd(5, 20);
            const p1 = rnd(1, total - 1);
            const p2 = total - p1;
            return { text: `(${p1} + ${p2}) : ${div}`, steps: [`1. ${p1} + ${p2}`, `2. Wynik nawiasu : ${div}`] };
        }
        case 7: {
            const pair1 = getDivisiblePair(6);
            const c = rnd(2, 5);
            return { text: `${pair1.a} : ${pair1.b} · ${c}`, steps: [`1. ${pair1.a} : ${pair1.b}`, `2. Wynik dzielenia · ${c}`] };
        }
        case 8: {
            const pair2 = getDivisiblePair(6);
            const quotient = pair2.a / pair2.b;
            const a = quotient + rnd(1, 20);
            return { text: `${a} - ${pair2.a} : ${pair2.b}`, steps: [`1. ${pair2.a} : ${pair2.b}`, `2. ${a} - Wynik dzielenia`] };
        }
        case 9: {
            const b = rnd(2, 8);
            const c = rnd(2, 8);
            const prod = b * c;
            const a = prod + rnd(1, 30);
            const d = rnd(1, 10);
            return { text: `${a} - ${b} · ${c} + ${d}`, steps: [`1. ${b} · ${c}`, `2. ${a} - Wynik mnożenia`, `3. Wynik odejmowania + ${d}`] };
        }
        case 10: {
            const d2 = rnd(2, 8);
            const m2 = rnd(2, 5);
            const baseVal = d2 * rnd(2, 10);
            const s1 = rnd(1, baseVal - 1);
            const s2 = baseVal - s1;
            return { text: `(${s1} + ${s2}) : ${d2} · ${m2}`, steps: [`1. ${s1} + ${s2}`, `2. Wynik nawiasu : ${d2}`, `3. Wynik dzielenia · ${m2}`] };
        }
        case 11: {
            const a = rnd(3, 8), b = rnd(3, 8);
            const prod1 = a * b;
            const c = rnd(2, 5);
            const maxD = Math.floor(prod1 / c);
            const d = rnd(1, maxD);
            return { text: `${a} · ${b} - ${c} · ${d}`, steps: [`1. ${a} · ${b}`, `2. ${c} · ${d}`, `3. Wynik pierwszego - Wynik drugiego`] };
        }
        case 12: {
            const pair3 = getDivisiblePair(9);
            const quotient = pair3.a / pair3.b;
            const bracketRes = rnd(1, quotient);
            const d = rnd(1, 10);
            const c = d + bracketRes;
            return { text: `${pair3.a} : ${pair3.b} - (${c} - ${d})`, steps: [`1. ${c} - ${d}`, `2. ${pair3.a} : ${pair3.b}`, `3. Wynik dzielenia - Wynik nawiasu`] };
        }
        case 13: {
            const b = rnd(2, 3);
            const c = rnd(2, 3);
            const innerProd = b * c;
            const factorOuter = rnd(1, 4);
            const a = innerProd * factorOuter;
            const d = rnd(2, 5);
            return { text: `${a} : (${b} · ${c}) · ${d}`, steps: [`1. ${b} · ${c}`, `2. ${a} : Wynik nawiasu`, `3. Wynik dzielenia · ${d}`] };
        }
        case 14: {
            const c = rnd(2, 4);
            const d = rnd(2, 4);
            const prod = c * d;
            const b = prod + rnd(1, 10);
            const a = rnd(2, 5);
            return { text: `${a} · (${b} - ${c} · ${d})`, steps: [`1. ${c} · ${d}`, `2. ${b} - Wynik mnożenia`, `3. ${a} · Wynik nawiasu`] };
        }
        case 15: {
            const b = rnd(1, 15);
            const a = b + rnd(2, 10);
            const c = rnd(2, 10);
            const d = rnd(2, 10);
            return { text: `(${a} - ${b}) · (${c} + ${d})`, steps: [`1. ${a} - ${b}`, `2. ${c} + ${d}`, `3. Wynik pierwszego · Wynik drugiego`] };
        }
        case 16: {
            const a = rnd(2,10), b = rnd(2,10), c = rnd(2,4), d = rnd(2,5), e = rnd(2,6);
            return { text: `(${a} + ${b}) · ${c} + ${d} · ${e}`, steps: [`1. ${a} + ${b}`, `2. Wynik nawiasu · ${c}`, `3. ${d} · ${e}`, `4. Dodaj oba wyniki`] };
        }
        case 17: {
            const a = rnd(2, 3), b = rnd(2, 4), c = rnd(2, 4);
            return { text: `${a}³ + ${b}² + ${c}²`, steps: [`1. ${a}³`, `2. ${b}²`, `3. ${c}²`, `4. Dodaj wszystkie wyniki`] };
        }
        case 18: {
            const baseA = rnd(3, 5), multA = rnd(2, 4);
            const valA = (baseA ** 2) * multA;
            const baseB = rnd(2, 3), multB = rnd(2, 3);
            const valB = (baseB ** 2) * multB;
            if (valB > valA) {
                return { text: `${baseB}² · ${multB} - ${baseA}² · ${multA}`, steps: [`1. ${baseB}² i ${baseA}²`, `2. Potęgi razy liczby`, `3. Odejmij mniejszy od większego`] };
            } else {
                return { text: `${baseA}² · ${multA} - ${baseB}² · ${multB}`, steps: [`1. ${baseA}² i ${baseB}²`, `2. Potęgi razy liczby`, `3. Odejmij wyniki`] };
            }
        }
        default: return { text: '10 + 2 · 5', steps: ['1. 2 · 5', '2. 10 + 10'] };
    }
};

const evaluateExpression = (expr: string) => {
    const safe = expr.replace(/·/g, '*').replace(/:/g, '/').replace(/²/g, '**2').replace(/³/g, '**3');
    try { return Function(`return (${safe})`)(); } catch (e) { return 0; }
};

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
                        <TouchableOpacity onPress={handleClear} style={styles.headerButton}>
                            <Text style={styles.headerButtonText}>🗑️ Wyczyść</Text>
                        </TouchableOpacity>
                        <Text style={styles.drawingTitle}>Brudnopis</Text>
                        <TouchableOpacity onPress={onClose} style={styles.headerButton}>
                            <Text style={styles.headerButtonText}>❌ Zamknij</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.problemPreviewContainer}>
                        <Text style={styles.problemPreviewLabel}>Zadanie:</Text>
                        <Text style={styles.problemPreviewText}>{problemText}</Text>
                    </View>
                    <View style={styles.canvas} onStartShouldSetResponder={() => true} onMoveShouldSetResponder={() => true} onResponderGrant={(evt) => {
                        const { locationX, locationY } = evt.nativeEvent;
                        setCurrentPath(`M${locationX},${locationY}`);
                    }} onResponderMove={onTouchMove} onResponderRelease={onTouchEnd}>
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

const OrderOperationsTrainerScreen4 = () => {
    const navigation = useNavigation();
    const [taskData, setTaskData] = useState<{text: string, steps: string[]}>({ text: '', steps: [] });
    const [answer, setAnswer] = useState('');
    const [firstAttempt, setFirstAttempt] = useState(true);
    const [correctInput, setCorrectInput] = useState<boolean | null>(null);
    const [readyForNext, setReadyForNext] = useState(false);
    const [counter, setCounter] = useState(0);
    const [correctCount, setCorrectCount] = useState(0);
    const [wrongCount, setWrongCount] = useState(0);
    const [message, setMessage] = useState('');
    const [showHint, setShowHint] = useState(false);
    const [showScratchpad, setShowScratchpad] = useState(false);
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);
    const [showMilestone, setShowMilestone] = useState(false);
    const [sessionCorrect, setSessionCorrect] = useState(0);

    const backgroundColor = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const kShow = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
        const kHide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
        return () => { kShow.remove(); kHide.remove(); };
    }, []);

    // --- TUTAJ SĄ BRAKUJĄCE FUNKCJE (toggleHint i toggleScratchpad) ---
    const toggleHint = () => setShowHint(prev => !prev);
    const toggleScratchpad = () => setShowScratchpad(prev => !prev);

    const nextTask = () => {
        if (counter > 0 && counter % 10 === 0 && !showMilestone) {
            setShowMilestone(true);
            return;
        }
        if (counter >= TASKS_LIMIT) {
            setMessage(`Gratulacje! 🎉 Ukończono ${TASKS_LIMIT} zadań!`);
            setReadyForNext(false);
            return;
        }
        const t = generateTask();
        setTaskData(t);
        setAnswer('');
        setFirstAttempt(true);
        setCorrectInput(null);
        setReadyForNext(false);
        setMessage('');
        setShowHint(false);
        setCounter(prev => prev + 1);
        backgroundColor.setValue(0);
    };

    useEffect(() => { nextTask(); }, []);

    const handleCheck = () => {
        Keyboard.dismiss();
        requestAnimationFrame(() => {
            if (!answer) { setMessage('Wpisz odpowiedź!'); return; }
            const numAnswer = Number(answer);
            const correctResult = evaluateExpression(taskData.text);
            const isCorrect = Math.abs(numAnswer - correctResult) < 0.01;

            const currentUser = auth().currentUser;
            const statsDocRef = currentUser ? firestore().collection('users').doc(currentUser.uid).collection('exerciseStats').doc(EXERCISE_ID) : null;

            if (isCorrect) {
                setCorrectInput(true);
                setCorrectCount(prev => prev + 1);
                setSessionCorrect(prev => prev + 1);
                statsDocRef?.set({ totalCorrect: firestore.FieldValue.increment(1) }, { merge: true }).catch(console.error);
                Animated.timing(backgroundColor, { toValue: 1, duration: 500, useNativeDriver: false }).start();
                setMessage('Świetnie! ✅');
                awardXpAndCoins(5, 1);
                setReadyForNext(true);
            } else {
                setWrongCount(prev => prev + 1);
                statsDocRef?.set({ totalWrong: firestore.FieldValue.increment(1) }, { merge: true }).catch(console.error);
                Animated.sequence([
                    Animated.timing(backgroundColor, { toValue: -1, duration: 700, useNativeDriver: false }),
                    Animated.timing(backgroundColor, { toValue: 0, duration: 500, useNativeDriver: false }),
                ]).start();
                if (firstAttempt) {
                    setMessage('Błąd! Spróbuj ponownie!');
                    setAnswer('');
                    setFirstAttempt(false);
                } else {
                    setMessage(`Błąd! Poprawny wynik: ${correctResult}`);
                    setReadyForNext(true);
                }
                setCorrectInput(false);
            }
        });
    };

    const getValidationStyle = () => correctInput === null ? styles.input : correctInput ? styles.correctFinal : styles.errorFinal;
    const bgInterpolation = backgroundColor.interpolate({ inputRange: [-1, 0, 1], outputRange: ['rgba(255, 0, 0, 0.2)', 'rgba(255, 255, 255, 0)', 'rgba(0, 255, 0, 0.2)'] });

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ flex: 1 }}>
                <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
                <ImageBackground source={require('../../../assets/background.jpg')} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: bgInterpolation }]} pointerEvents="none" />

                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardContainer}>
                    {!isKeyboardVisible && (
                        <View style={styles.topButtons}>
                            <TouchableOpacity onPress={toggleScratchpad} style={{ marginRight: 20, alignItems: 'center' }}>
                                <Image source={require('../../../assets/pencil.png')} style={styles.iconTop} />
                                <Text style={styles.buttonLabel}>Brudnopis</Text>
                            </TouchableOpacity>
                            <View style={{ alignItems: 'center' }}>
                                <TouchableOpacity onPress={toggleHint}>
                                    <Image source={require('../../../assets/question.png')} style={styles.iconTop} />
                                </TouchableOpacity>
                                <Text style={styles.buttonLabel}>Pomoc</Text>
                            </View>
                        </View>
                    )}

                    {showHint && !isKeyboardVisible && (
                        <View style={styles.hintBox}>
                            <Text style={styles.hintTitle}>Kolejność działań:</Text>
                            {taskData.steps.map((step, index) => (<Text key={index} style={styles.hintStep}>{step}</Text>))}
                        </View>
                    )}

                    <DrawingModal visible={showScratchpad} onClose={toggleScratchpad} problemText={taskData.text} />

                    <Modal visible={showMilestone} transparent={true} animationType="slide">
                        <View style={styles.modalOverlay}>
                            <View style={styles.milestoneCard}>
                                <Text style={styles.milestoneTitle}>Podsumowanie serii 📊</Text>
                                <View style={styles.statsRow}>
                                    <Text style={styles.statsText}>Poprawne: {sessionCorrect} / 10</Text>
                                    <Text style={[styles.statsText, { color: '#28a745', marginTop: 5 }]}>Skuteczność: {(sessionCorrect / 10 * 100).toFixed(0)}%</Text>
                                </View>
                                <Text style={styles.suggestionText}>{sessionCorrect >= 8 ? "Rewelacyjnie! Jesteś mistrzem!" : "Trenuj dalej, aby być jeszcze lepszym."}</Text>
                                <View style={styles.milestoneButtons}>
                                    <TouchableOpacity style={[styles.mButton, { backgroundColor: '#28a745' }]} onPress={() => { setShowMilestone(false); setSessionCorrect(0); nextTask(); }}>
                                        <Text style={styles.mButtonText}>Kontynuuj</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.mButton, { backgroundColor: '#007AFF' }]} onPress={() => { setShowMilestone(false); navigation.goBack(); }}>
                                        <Text style={styles.mButtonText}>Inny temat</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>

                    <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                        <View style={styles.centerContent}>
                            <Animated.View style={[styles.card, { backgroundColor: 'transparent' }]}>
                                <View style={styles.overlayBackground} />
                                <Text style={styles.title}>Kolejność działań</Text>
                                <Text style={styles.task}>Oblicz:</Text>
                                <Text style={styles.example}>{taskData.text}</Text>
                                <TextInput style={[getValidationStyle(), styles.finalInput]} keyboardType="numeric" value={answer} onChangeText={setAnswer} placeholder="Wynik" placeholderTextColor="#aaa" editable={!readyForNext} />
                                <View style={styles.buttonContainer}>
                                    <Button title={readyForNext ? 'Dalej' : 'Sprawdź'} onPress={readyForNext ? nextTask : handleCheck} color="#007AFF" />
                                </View>
                                <Text style={styles.counterTextSmall}>Zadanie: {counter > TASKS_LIMIT ? TASKS_LIMIT : counter} / {TASKS_LIMIT}</Text>
                                {message ? <Text style={[styles.result, correctInput ? styles.correctText : styles.errorText]}>{message}</Text> : null}
                            </Animated.View>
                        </View>
                    </ScrollView>

                    {!isKeyboardVisible && (
                        <View style={styles.iconsBottom}>
                            <Image source={require('../../../assets/happy.png')} style={styles.iconSame} />
                            <Text style={styles.counterTextIcons}>{correctCount}</Text>
                            <Image source={require('../../../assets/sad.png')} style={styles.iconSame} />
                            <Text style={styles.counterTextIcons}>{wrongCount}</Text>
                        </View>
                    )}
                </KeyboardAvoidingView>
            </View>
        </TouchableWithoutFeedback>
    );
};

const iconSize = screenWidth * 0.25;

const styles = StyleSheet.create({
    keyboardContainer: { flex: 1, justifyContent: 'center' },
    scrollContent: { flexGrow: 1, justifyContent: 'center' },
    centerContent: { alignItems: 'center', paddingHorizontal: 20 },
    topButtons: { position: 'absolute', top: 40, right: 20, flexDirection: 'row', alignItems: 'center', zIndex: 10 },
    iconTop: { width: 80, height: 80, resizeMode: 'contain', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3 },
    buttonLabel: { fontSize: 14, fontWeight: 'bold', color: '#007AFF', marginTop: 2, textShadowColor: 'rgba(255, 255, 255, 0.8)', textShadowRadius: 3 },
    hintBox: { position: 'absolute', top: 130, right: 20, padding: 15, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 15, maxWidth: 280, zIndex: 11, elevation: 5, borderWidth: 1, borderColor: '#007AFF' },
    hintTitle: { fontSize: 16, fontWeight: 'bold', color: '#007AFF', marginBottom: 5, textAlign: 'center' },
    hintStep: { fontSize: 16, color: '#333', marginBottom: 2, fontWeight: '500' },
    card: { width: '100%', maxWidth: 450, borderRadius: 20, padding: 30, alignItems: 'center' },
    overlayBackground: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 20 },
    title: { fontSize: 24, fontWeight: '700', marginBottom: 10, color: '#333', textAlign: 'center' },
    task: { fontSize: 22, fontWeight: '700', marginBottom: 5, color: '#007AFF', textAlign: 'center' },
    example: { fontSize: 32, fontWeight: '700', marginBottom: 25, color: '#007AFF', textAlign: 'center', letterSpacing: 1 },
    input: { width: 220, height: 56, borderWidth: 2, borderColor: '#ccc', borderRadius: 10, textAlign: 'center', fontSize: 22, backgroundColor: '#fafafa', marginBottom: 15, color: '#333' },
    finalInput: { width: 220 },
    buttonContainer: { marginTop: 20, width: '80%', borderRadius: 10, overflow: 'hidden' },
    result: { fontSize: 18, fontWeight: '700', marginTop: 20, textAlign: 'center' },
    counterTextSmall: { fontSize: Math.max(12, screenWidth * 0.035), fontWeight: '400', color: '#555', textAlign: 'center', marginTop: 10 },
    iconsBottom: { position: 'absolute', bottom: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' },
    iconSame: { width: iconSize, height: iconSize, resizeMode: 'contain', marginHorizontal: 10 },
    counterTextIcons: { fontSize: Math.max(14, iconSize * 0.28), marginHorizontal: 8, textAlign: 'center', color: '#333' },
    correctFinal: { width: 220, height: 56, borderWidth: 2, borderRadius: 10, textAlign: 'center', fontSize: 22, backgroundColor: '#d4edda', borderColor: '#28a745', color: '#155724', marginBottom: 15 },
    errorFinal: { width: 220, height: 56, borderWidth: 2, borderRadius: 10, textAlign: 'center', fontSize: 22, backgroundColor: '#f8d7da', borderColor: '#dc3545', color: '#721c24', marginBottom: 15 },
    correctText: { color: '#28a745' },
    errorText: { color: '#dc3545' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    drawingContainer: { width: '95%', height: '85%', backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden' },
    drawingHeader: { height: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, backgroundColor: '#f0f0f0', borderBottomWidth: 1, borderBottomColor: '#ccc' },
    drawingTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    headerButton: { padding: 5 },
    headerButtonText: { fontSize: 16, color: '#007AFF' },
    problemPreviewContainer: { backgroundColor: '#f9f9f9', padding: 10, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee' },
    problemPreviewLabel: { fontSize: 12, color: '#777', textTransform: 'uppercase', marginBottom: 4 },
    problemPreviewText: { fontSize: 24, fontWeight: 'bold', color: '#007AFF', letterSpacing: 1 },
    canvas: { flex: 1, backgroundColor: '#ffffff' },
    milestoneCard: { width: '90%', backgroundColor: '#fff', borderRadius: 20, padding: 25, alignItems: 'center', elevation: 10 },
    milestoneTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 15 },
    statsRow: { marginVertical: 10, alignItems: 'center', backgroundColor: '#f8f9fa', padding: 15, borderRadius: 15, width: '100%' },
    statsText: { fontSize: 18, color: '#333', fontWeight: 'bold' },
    suggestionText: { fontSize: 15, color: '#666', textAlign: 'center', marginVertical: 20, lineHeight: 22 },
    milestoneButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
    mButton: { paddingVertical: 12, paddingHorizontal: 15, borderRadius: 12, width: '48%', alignItems: 'center' },
    mButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 }
});

export default OrderOperationsTrainerScreen4;