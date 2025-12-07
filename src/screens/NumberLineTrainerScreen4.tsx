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
    TouchableWithoutFeedback
} from 'react-native';
import Svg, { Path, Line, Text as SvgText, G } from 'react-native-svg';

import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { awardXpAndCoins } from '../services/xpService';

const EXERCISE_ID = "numberLineTrainer";
const TASKS_LIMIT = 50;
const screenWidth = Dimensions.get('window').width;

// --- FUNKCJE POMOCNICZE ---
const rnd = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

// --- DANE ZADANIA ---
type NumberLineTask = {
    start: number;
    step: number;
    hiddenIndex: number;
    answer: number;
    ticksCount: number;
    hint: string;
};

// --- GENERATOR ZADAŃ ---
const generateTask = (): NumberLineTask => {
    let step = 1;
    let start = 0;
    const ticksCount = 5;

    const type = rnd(1, 6);

    switch (type) {
        case 1: step = 1; start = rnd(0, 900); break;
        case 2: step = [2, 3, 4, 5][rnd(0, 3)]; start = rnd(0, 200) * step; break;
        case 3: step = rnd(1, 2) === 1 ? 10 : 20; start = rnd(0, 80) * 10; break;
        case 4: step = rnd(1, 2) === 1 ? 25 : 50; start = rnd(0, 15) * step; break;
        case 5: step = rnd(1, 2) === 1 ? 100 : 200; start = rnd(0, 8) * 100; break;
        case 6: step = 500; start = rnd(0, 2) * 500; break;
        default: step = 10; start = 0;
    }

    if (start + (ticksCount * step) > 1000) {
        start = 1000 - (ticksCount * step);
        if (start < 0) start = 0;
    }

    const hiddenIndex = rnd(1, ticksCount - 2);
    const answer = start + (hiddenIndex * step);
    const prevVal = start + (hiddenIndex - 1) * step;
    const nextVal = start + (hiddenIndex + 1) * step;
    const hint = `Spójrz na sąsiadów. Krok na tej osi wynosi ${step}. Poprzednia liczba to ${prevVal}, a następna to ${nextVal}.`;

    return { start, step, hiddenIndex, answer, ticksCount, hint };
};

// --- RYSOWANIE OSI ---
const NumberLineRenderer = ({ task }: { task: NumberLineTask }) => {
    const canvasWidth = 350;
    const canvasHeight = 140;
    const paddingX = 30;
    const lineY = 60;
    const tickHeight = 20;
    const effectiveWidth = canvasWidth - (paddingX * 2);
    const spacing = effectiveWidth / (task.ticksCount - 1);

    const ticks = [];
    for (let i = 0; i < task.ticksCount; i++) {
        const x = paddingX + (i * spacing);
        const value = task.start + (i * task.step);
        const isHidden = i === task.hiddenIndex;

        ticks.push(
            <G key={i}>
                <Line x1={x} y1={lineY - tickHeight/2} x2={x} y2={lineY + tickHeight/2} stroke="#333" strokeWidth="2" />
                <SvgText x={x} y={lineY + 35} fill={isHidden ? "#E63946" : "#333"} fontSize={isHidden ? "28" : "18"} fontWeight={isHidden ? "bold" : "500"} textAnchor="middle">
                    {isHidden ? "?" : value}
                </SvgText>
            </G>
        );
    }

    const lineStartX = task.start > 0 ? 5 : paddingX;
    const lineEndX = canvasWidth - 15;

    return (
        <View style={styles.svgContainer}>
            <Svg width="100%" height="100%" viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}>
                <Line x1={lineStartX} y1={lineY} x2={lineEndX} y2={lineY} stroke="#333" strokeWidth="3" />
                <Path d={`M ${lineEndX - 10} ${lineY - 7} L ${lineEndX + 5} ${lineY} L ${lineEndX - 10} ${lineY + 7}`} stroke="#333" strokeWidth="3" fill="none" />
                {task.start > 0 && <Path d={`M ${lineStartX} ${lineY} L ${lineStartX + 10} ${lineY}`} stroke="#333" strokeWidth="3" strokeDasharray="4, 4" />}
                {ticks}
            </Svg>
        </View>
    );
};

// --- CZERNOWIK ---
const DrawingModal = ({ visible, onClose }: { visible: boolean; onClose: () => void }) => {
    const [paths, setPaths] = useState<string[]>([]);
    const [currentPath, setCurrentPath] = useState('');
    const handleClear = () => { setPaths([]); setCurrentPath(''); };
    const onTouchMove = (evt: any) => {
        const { locationX, locationY } = evt.nativeEvent;
        if (!currentPath) setCurrentPath(`M${locationX},${locationY}`); else setCurrentPath(`${currentPath} L${locationX},${locationY}`);
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
                    <View style={styles.canvas} onStartShouldSetResponder={() => true} onMoveShouldSetResponder={() => true} onResponderGrant={(evt) => { const { locationX, locationY } = evt.nativeEvent; setCurrentPath(`M${locationX},${locationY}`); }} onResponderMove={onTouchMove} onResponderRelease={onTouchEnd}>
                        <Svg height="100%" width="100%">{paths.map((d, index) => (<Path key={index} d={d} stroke="#000" strokeWidth={3} fill="none" />))}<Path d={currentPath} stroke="#000" strokeWidth={3} fill="none" /></Svg>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

// --- GŁÓWNY EKRAN ---
const NumberLineTrainerScreen4 = () => {
    const [taskData, setTaskData] = useState<NumberLineTask | null>(null);
    const [userAnswer, setUserAnswer] = useState('');
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
    const backgroundColor = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const k1 = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
        const k2 = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
        return () => { k1.remove(); k2.remove(); };
    }, []);

    const nextTask = () => {
        if (counter >= TASKS_LIMIT) {
            setMessage(`Gratulacje! 🎉 Ukończono ${TASKS_LIMIT} zadań!`);
            setReadyForNext(false);
            return;
        }
        const t = generateTask();
        setTaskData(t);
        setUserAnswer('');
        setFirstAttempt(true);
        setCorrectInput(null);
        setReadyForNext(false);
        setMessage('');
        setShowHint(false);
        setCounter(prev => prev + 1);
        backgroundColor.setValue(0);
    };

    useEffect(() => { nextTask(); }, []);
    const toggleHint = () => setShowHint(prev => !prev);
    const toggleScratchpad = () => setShowScratchpad(prev => !prev);

    const handleCheck = () => {
        Keyboard.dismiss();
        if (!taskData) return;
        requestAnimationFrame(() => {
            if (!userAnswer) { setMessage('Wpisz odpowiedź!'); return; }
            const numAnswer = Number(userAnswer);
            const isCorrect = Math.abs(numAnswer - taskData.answer) < 0.01;
            const currentUser = auth().currentUser;
            const statsDocRef = currentUser ? firestore().collection('users').doc(currentUser.uid).collection('exerciseStats').doc(EXERCISE_ID) : null;

            if (isCorrect) {
                setCorrectInput(true);
                setCorrectCount(prev => prev + 1);
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
                    setMessage('Błąd! Spróbuj jeszcze raz.');
                    setUserAnswer('');
                    setFirstAttempt(false);
                } else {
                    setMessage(`Błąd! Poprawna odpowiedź: ${taskData.answer}`);
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
                <ImageBackground source={require('../assets/background.jpg')} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: bgInterpolation }]} pointerEvents="none" />

                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardContainer}>
                    {!isKeyboardVisible && (
                        <View style={styles.topButtons}>
                            <TouchableOpacity onPress={toggleScratchpad} style={{ marginRight: 20, alignItems: 'center' }}>
                                <Image source={require('../assets/pencil.png')} style={styles.iconTop} />
                                <Text style={styles.buttonLabel}>Brudnopis</Text>
                            </TouchableOpacity>
                            <View style={{ alignItems: 'center' }}>
                                <TouchableOpacity onPress={toggleHint}>
                                    <Image source={require('../assets/question.png')} style={styles.iconTop} />
                                </TouchableOpacity>
                                <Text style={styles.buttonLabel}>Pomoc</Text>
                            </View>
                        </View>
                    )}
                    {showHint && taskData && !isKeyboardVisible && (
                        <View style={styles.hintBox}>
                            <Text style={styles.hintTitle}>Podpowiedź:</Text>
                            <Text style={styles.hintText}>{taskData.hint}</Text>
                        </View>
                    )}
                    <DrawingModal visible={showScratchpad} onClose={toggleScratchpad} />

                    <View style={styles.centerContent}>
                        <Animated.View style={[styles.card, { backgroundColor: 'transparent' }]}>
                            <View style={styles.overlayBackground} />
                            <Text style={styles.title}>Trener</Text>
                            <Text style={styles.title}>Oś Liczbowa</Text>
                            <Text style={styles.taskLabel}>Jaką liczbę ukryto pod znakiem zapytania?</Text>
                            {taskData && <NumberLineRenderer task={taskData} />}
                            <TextInput
                                style={[getValidationStyle(), styles.finalInput]}
                                keyboardType="numeric"
                                value={userAnswer}
                                onChangeText={setUserAnswer}
                                placeholder="?"
                                placeholderTextColor="#aaa"
                                editable={!readyForNext}
                            />
                            <View style={styles.buttonContainer}>
                                <Button title={readyForNext ? 'Dalej' : 'Sprawdź'} onPress={readyForNext ? nextTask : handleCheck} color="#007AFF" />
                            </View>
                            <Text style={styles.counterTextSmall}>Zadanie: {counter > TASKS_LIMIT ? TASKS_LIMIT : counter} / {TASKS_LIMIT}</Text>
                            {message ? <Text style={[styles.result, correctInput ? styles.correctText : styles.errorText]}>{message}</Text> : null}
                        </Animated.View>
                    </View>

                    {!isKeyboardVisible && (
                        <View style={styles.iconsBottom}>
                            <Image source={require('../assets/happy.png')} style={styles.iconSame} />
                            <Text style={styles.counterTextIcons}>{correctCount}</Text>
                            <Image source={require('../assets/sad.png')} style={styles.iconSame} />
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
    centerContent: { alignItems: 'center', paddingHorizontal: 10, width: '100%' },
    topButtons: { position: 'absolute', top: 40, right: 20, flexDirection: 'row', alignItems: 'center', zIndex: 10 },
    iconTop: { width: 80, height: 80, resizeMode: 'contain', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3 },
    buttonLabel: { fontSize: 14, fontWeight: 'bold', color: '#007AFF', marginTop: 2, textShadowColor: 'rgba(255, 255, 255, 0.8)', textShadowRadius: 3 },
    hintBox: { position: 'absolute', top: 130, right: 20, padding: 15, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 15, maxWidth: 280, zIndex: 11, elevation: 5, borderWidth: 1, borderColor: '#007AFF' },
    hintTitle: { fontSize: 16, fontWeight: 'bold', color: '#007AFF', marginBottom: 5, textAlign: 'center' },
    hintText: { fontSize: 16, color: '#333', lineHeight: 22 },
    card: { width: '100%', maxWidth: 450, borderRadius: 20, padding: 20, alignItems: 'center' },
    overlayBackground: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.90)', borderRadius: 20 },
    title: { fontSize: 24, fontWeight: '700', marginBottom: 5, color: '#333', textAlign: 'center' },
    taskLabel: { fontSize: 18, fontWeight: '600', marginBottom: 10, color: '#007AFF', textAlign: 'center' },
    svgContainer: { width: '100%', height: 140, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    input: { width: 120, height: 50, borderWidth: 2, borderColor: '#ccc', borderRadius: 10, textAlign: 'center', fontSize: 24, backgroundColor: '#fafafa', marginBottom: 15, color: '#333' },
    finalInput: { width: 120 },
    buttonContainer: { marginTop: 10, width: '80%', borderRadius: 10, overflow: 'hidden' },
    result: { fontSize: 18, fontWeight: '700', marginTop: 20, textAlign: 'center' },

    // --- SKOPIOWANE STYLE DLA ZGODNOŚCI ---
    counterTextSmall: { fontSize: Math.max(12, screenWidth * 0.035), fontWeight: '400', color: '#555', textAlign: 'center', marginTop: 10 },

    iconsBottom: { position: 'absolute', bottom: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' },
    iconSame: { width: iconSize, height: iconSize, resizeMode: 'contain', marginHorizontal: 10 },
    counterTextIcons: { fontSize: Math.max(14, iconSize * 0.28), marginHorizontal: 8, textAlign: 'center', color: '#333' },
    // -------------------------------------

    correctFinal: { width: 120, height: 50, borderWidth: 2, borderRadius: 10, textAlign: 'center', fontSize: 24, backgroundColor: '#d4edda', borderColor: '#28a745', color: '#155724', marginBottom: 15 },
    errorFinal: { width: 120, height: 50, borderWidth: 2, borderRadius: 10, textAlign: 'center', fontSize: 24, backgroundColor: '#f8d7da', borderColor: '#dc3545', color: '#721c24', marginBottom: 15 },
    correctText: { color: '#28a745' },
    errorText: { color: '#dc3545' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    drawingContainer: { width: '95%', height: '85%', backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden' },
    drawingHeader: { height: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, backgroundColor: '#f0f0f0', borderBottomWidth: 1, borderBottomColor: '#ccc' },
    drawingTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    headerButton: { padding: 5 },
    headerButtonText: { fontSize: 16, color: '#007AFF' },
    canvas: { flex: 1, backgroundColor: '#ffffff' },
});

export default NumberLineTrainerScreen4;