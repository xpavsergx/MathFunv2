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
    InteractionManager,
    useColorScheme
} from 'react-native';
import Svg, { Path, Line, Text as SvgText, G } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';

import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { awardXpAndCoins } from '../../../services/xpService';

const EXERCISE_ID = "numberLineTrainer";
const TASKS_LIMIT = 30;
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
const generateTaskLogic = (): NumberLineTask => {
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

// --- RYSOWANIE OSI (ZAKTUALIZOWANE O KOLORY) ---
const NumberLineRenderer = ({ task, isDarkMode }: { task: NumberLineTask, isDarkMode: boolean }) => {
    const canvasWidth = 350;
    const canvasHeight = 140;
    const paddingX = 30;
    const lineY = 60;
    const tickHeight = 20;
    const effectiveWidth = canvasWidth - (paddingX * 2);
    const spacing = effectiveWidth / (task.ticksCount - 1);

    const strokeColor = isDarkMode ? '#FFFFFF' : '#333333';
    const textColor = isDarkMode ? '#FFFFFF' : '#333333';
    const questionColor = '#E63946'; // Czerwony zawsze widoczny

    const ticks = [];
    for (let i = 0; i < task.ticksCount; i++) {
        const x = paddingX + (i * spacing);
        const value = task.start + (i * task.step);
        const isHidden = i === task.hiddenIndex;

        ticks.push(
            <G key={i}>
                <Line x1={x} y1={lineY - tickHeight/2} x2={x} y2={lineY + tickHeight/2} stroke={strokeColor} strokeWidth="2" />
                <SvgText
                    x={x}
                    y={lineY + 35}
                    fill={isHidden ? questionColor : textColor}
                    fontSize={isHidden ? "28" : "18"}
                    fontWeight={isHidden ? "bold" : "500"}
                    textAnchor="middle"
                >
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
                <Line x1={lineStartX} y1={lineY} x2={lineEndX} y2={lineY} stroke={strokeColor} strokeWidth="3" />
                <Path d={`M ${lineEndX - 10} ${lineY - 7} L ${lineEndX + 5} ${lineY} L ${lineEndX - 10} ${lineY + 7}`} stroke={strokeColor} strokeWidth="3" fill="none" />
                {task.start > 0 && <Path d={`M ${lineStartX} ${lineY} L ${lineStartX + 10} ${lineY}`} stroke={strokeColor} strokeWidth="3" strokeDasharray="4, 4" />}
                {ticks}
            </Svg>
        </View>
    );
};

// --- BRUDNOPIS (ZAKTUALIZOWANY THEME) ---
const DrawingModal = ({ visible, onClose }: { visible: boolean; onClose: () => void }) => {
    const [paths, setPaths] = useState<string[]>([]);
    const [currentPath, setCurrentPath] = useState('');

    const isDarkMode = useColorScheme() === 'dark';
    const theme = {
        bg: isDarkMode ? '#1E293B' : '#fff',
        text: isDarkMode ? '#FFF' : '#333',
        canvas: isDarkMode ? '#0F172A' : '#ffffff',
        stroke: isDarkMode ? '#FFF' : '#000',
        headerBg: isDarkMode ? '#334155' : '#f0f0f0',
        border: isDarkMode ? '#475569' : '#ccc',
    };

    const handleClear = () => { setPaths([]); setCurrentPath(''); };
    const onTouchMove = (evt: any) => {
        const { locationX, locationY } = evt.nativeEvent;
        if (!currentPath) setCurrentPath(`M${locationX},${locationY}`); else setCurrentPath(`${currentPath} L${locationX},${locationY}`);
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
                    <View style={[styles.canvas, { backgroundColor: theme.canvas }]} onStartShouldSetResponder={() => true} onMoveShouldSetResponder={() => true} onResponderGrant={(evt) => { const { locationX, locationY } = evt.nativeEvent; setCurrentPath(`M${locationX},${locationY}`); }} onResponderMove={onTouchMove} onResponderRelease={onTouchEnd}>
                        <Svg height="100%" width="100%">{paths.map((d, index) => (<Path key={index} d={d} stroke={theme.stroke} strokeWidth={3} fill="none" />))}<Path d={currentPath} stroke={theme.stroke} strokeWidth={3} fill="none" /></Svg>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

// --- GŁÓWNY EKRAN ---
const NumberLineTrainerScreen4 = () => {
    const navigation = useNavigation();
    const isDarkMode = useColorScheme() === 'dark';

    // --- KONFIGURACJA MOTYWU ---
    const theme = {
        bgImage: require('../../../assets/background.jpg'),
        bgOverlay: isDarkMode ? 'rgba(0, 0, 0, 0.7)' : 'transparent',

        topBtnText: isDarkMode ? '#FFFFFF' : '#007AFF',

        textMain: isDarkMode ? '#FFFFFF' : '#333333',
        textSub: isDarkMode ? '#CBD5E1' : '#555555',
        labelColor: isDarkMode ? '#94A3B8' : '#888888',

        cardOverlay: isDarkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255,255,255,0.90)',
        modalContent: isDarkMode ? '#1E293B' : '#fff',
        statsRow: isDarkMode ? '#0F172A' : '#f8f9fa',

        inputBg: isDarkMode ? '#334155' : '#fafafa',
        inputBorder: isDarkMode ? '#475569' : '#ccc',
        inputText: isDarkMode ? '#FFFFFF' : '#333',
        inputPlaceholder: isDarkMode ? '#94A3B8' : '#aaa',

        correctBg: isDarkMode ? 'rgba(21, 87, 36, 0.5)' : '#d4edda',
        correctBorder: isDarkMode ? '#4ADE80' : '#28a745',
        correctText: isDarkMode ? '#86EFAC' : '#155724',

        errorBg: isDarkMode ? 'rgba(114, 28, 36, 0.5)' : '#f8d7da',
        errorBorder: isDarkMode ? '#F87171' : '#dc3545',
        errorText: isDarkMode ? '#FCA5A5' : '#721c24',
    };

    const [taskData, setTaskData] = useState<NumberLineTask | null>(null);
    const [userAnswer, setUserAnswer] = useState('');
    const [attemptsUsed, setAttemptsUsed] = useState(0);
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
    const [isFinished, setIsFinished] = useState(false);
    const [sessionCorrect, setSessionCorrect] = useState(0);

    const backgroundColor = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const k1 = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
        const k2 = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
        generateNewTask();
        return () => { k1.remove(); k2.remove(); };
    }, []);

    const generateNewTask = () => {
        const t = generateTaskLogic();
        setTaskData(t);
        setUserAnswer('');
        setAttemptsUsed(0);
        setCorrectInput(null);
        setReadyForNext(false);
        setMessage('');
        setShowHint(false);
        setCounter(prev => prev + 1);
        backgroundColor.setValue(0);
    };

    const nextTask = () => {
        if (counter >= TASKS_LIMIT) {
            setIsFinished(true);
            return;
        }
        if (counter > 0 && counter % 10 === 0 && !showMilestone) {
            setShowMilestone(true);
            return;
        }
        generateNewTask();
    };

    const handleContinueMilestone = () => {
        setShowMilestone(false);
        setSessionCorrect(0);
        generateNewTask();
    };

    const handleRestart = () => {
        setIsFinished(false);
        setShowMilestone(false);
        setCorrectCount(0);
        setWrongCount(0);
        setSessionCorrect(0);
        setCounter(0);
        generateNewTask();
    };

    const toggleHint = () => setShowHint(prev => !prev);
    const toggleScratchpad = () => setShowScratchpad(prev => !prev);

    const handleCheck = () => {
        Keyboard.dismiss();
        if (!taskData) return;

        if (!userAnswer || userAnswer.trim() === '') {
            setMessage('Wpisz odpowiedź!');
            return;
        }

        requestAnimationFrame(() => {
            const numAnswer = Number(userAnswer.replace(',', '.'));
            const isCorrect = Math.abs(numAnswer - taskData.answer) < 0.01;
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
                Animated.sequence([
                    Animated.timing(backgroundColor, { toValue: -1, duration: 700, useNativeDriver: false }),
                    Animated.timing(backgroundColor, { toValue: 0, duration: 500, useNativeDriver: false }),
                ]).start();

                if (attemptsUsed === 0) {
                    setAttemptsUsed(1);
                    setMessage('Błąd! Spróbuj jeszcze raz.');
                    setCorrectInput(false);
                    setUserAnswer('');
                } else {
                    setWrongCount(prev => prev + 1);
                    statsDocRef?.set({ totalWrong: firestore.FieldValue.increment(1) }, { merge: true }).catch(console.error);
                    setMessage(`Błąd! Poprawna odpowiedź: ${taskData.answer}`);
                    setCorrectInput(false);
                    setReadyForNext(true);
                }
            }
        });
    };

    const getValidationStyle = () => {
        const baseStyle = {
            backgroundColor: theme.inputBg,
            borderColor: theme.inputBorder,
            color: theme.inputText
        };

        if (correctInput === true) return [styles.correctFinal, { backgroundColor: theme.correctBg, borderColor: theme.correctBorder, color: theme.correctText }];
        if (correctInput === false) return [styles.errorFinal, { backgroundColor: theme.errorBg, borderColor: theme.errorBorder, color: theme.errorText }];
        return [styles.input, baseStyle];
    };

    const bgInterpolation = backgroundColor.interpolate({ inputRange: [-1, 0, 1], outputRange: ['rgba(255, 0, 0, 0.2)', 'rgba(255, 255, 255, 0)', 'rgba(0, 255, 0, 0.2)'] });

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ flex: 1 }}>
                <StatusBar translucent backgroundColor="transparent" barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
                <ImageBackground source={theme.bgImage} style={StyleSheet.absoluteFillObject} resizeMode="cover">
                    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.bgOverlay }]} pointerEvents="none" />
                </ImageBackground>
                <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: bgInterpolation }]} pointerEvents="none" />

                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardContainer}>
                    {!isKeyboardVisible && (
                        <View style={styles.topButtons}>
                            <TouchableOpacity onPress={toggleScratchpad} style={{ marginRight: 20, alignItems: 'center' }}>
                                <Image source={require('../../../assets/pencil.png')} style={styles.iconTop} />
                                <Text style={[styles.buttonLabel, { color: theme.topBtnText }]}>Brudnopis</Text>
                            </TouchableOpacity>
                            <View style={{ alignItems: 'center' }}>
                                <TouchableOpacity onPress={toggleHint}>
                                    <Image source={require('../../../assets/question.png')} style={styles.iconTop} />
                                </TouchableOpacity>
                                <Text style={[styles.buttonLabel, { color: theme.topBtnText }]}>Pomoc</Text>
                            </View>
                        </View>
                    )}
                    {showHint && taskData && !isKeyboardVisible && (
                        <View style={[styles.hintBox, { backgroundColor: theme.modalContent, borderColor: '#007AFF' }]}>
                            <Text style={styles.hintTitle}>Podpowiedź:</Text>
                            <Text style={[styles.hintText, { color: theme.textMain }]}>{taskData.hint}</Text>
                        </View>
                    )}
                    <DrawingModal visible={showScratchpad} onClose={toggleScratchpad} />

                    {/* MODAL 1: MILESTONE */}
                    <Modal visible={showMilestone} transparent={true} animationType="slide">
                        <View style={styles.modalOverlay}>
                            <View style={[styles.milestoneCard, { backgroundColor: theme.modalContent }]}>
                                <Text style={[styles.milestoneTitle, { color: theme.textMain }]}>Podsumowanie serii 📊</Text>
                                <View style={[styles.statsRow, { backgroundColor: theme.statsRow }]}>
                                    <Text style={[styles.statsText, { color: theme.textMain }]}>Poprawne: {sessionCorrect} / 10</Text>
                                    <Text style={[styles.statsText, { color: '#28a745', marginTop: 5 }]}>
                                        Skuteczność: {(sessionCorrect / 10 * 100).toFixed(0)}%
                                    </Text>
                                </View>
                                <Text style={[styles.suggestionText, { color: theme.textSub }]}>
                                    {sessionCorrect >= 8
                                        ? "Rewelacyjnie! Jesteś mistrzem!"
                                        : "Trenuj dalej, aby być jeszcze lepszym."}
                                </Text>
                                <View style={styles.milestoneButtons}>
                                    <TouchableOpacity style={[styles.mButton, { backgroundColor: '#28a745' }]} onPress={handleContinueMilestone}>
                                        <Text style={styles.mButtonText}>Kontynuuj</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.mButton, { backgroundColor: '#007AFF' }]} onPress={() => { setShowMilestone(false); navigation.goBack(); }}>
                                        <Text style={styles.mButtonText}>Inny temat</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>

                    {/* MODAL 2: KONIEC GRY */}
                    <Modal visible={isFinished} transparent={true} animationType="fade">
                        <View style={styles.modalOverlay}>
                            <View style={[styles.milestoneCard, { backgroundColor: theme.modalContent }]}>
                                <Text style={[styles.milestoneTitle, { color: theme.textMain }]}>Gratulacje! 🏆</Text>
                                <Text style={[styles.suggestionText, { color: theme.textSub }]}>Ukończyłeś wszystkie zadania!</Text>
                                <View style={[styles.statsRow, { backgroundColor: theme.statsRow }]}>
                                    <Text style={[styles.statsText, { color: theme.textMain }]}>Wynik końcowy:</Text>
                                    <Text style={[styles.statsText, { fontSize: 24, color: '#28a745', marginTop: 5 }]}>
                                        {correctCount} / {TASKS_LIMIT}
                                    </Text>
                                </View>
                                <View style={styles.milestoneButtons}>
                                    <TouchableOpacity style={[styles.mButton, { backgroundColor: '#28a745' }]} onPress={handleRestart}>
                                        <Text style={styles.mButtonText}>Zagraj jeszcze raz</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.mButton, { backgroundColor: '#dc3545' }]} onPress={() => { setIsFinished(false); navigation.goBack(); }}>
                                        <Text style={styles.mButtonText}>Wyjdź</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>

                    <View style={styles.centerContent}>
                        <Animated.View style={[styles.card, { backgroundColor: 'transparent' }]}>
                            <View style={[styles.overlayBackground, { backgroundColor: theme.cardOverlay }]} />
                            <Text style={[styles.title, { color: theme.textMain }]}>Oś Liczbowa</Text>
                            <Text style={styles.taskLabel}>Jaką liczbę ukryto pod znakiem zapytania?</Text>

                            {taskData && <NumberLineRenderer task={taskData} isDarkMode={isDarkMode} />}

                            <TextInput
                                style={[getValidationStyle(), styles.finalInput]}
                                keyboardType="numeric"
                                value={userAnswer}
                                onChangeText={setUserAnswer}
                                placeholder="?"
                                placeholderTextColor={theme.inputPlaceholder}
                                editable={!readyForNext}
                                returnKeyType="done"
                                onSubmitEditing={readyForNext ? nextTask : handleCheck}
                            />

                            <View style={styles.buttonContainer}>
                                <Button title={readyForNext ? 'Dalej' : 'Sprawdź'} onPress={readyForNext ? nextTask : handleCheck} color="#007AFF" />
                            </View>
                            <Text style={[styles.counterTextSmall, { color: theme.textSub }]}>Zadanie: {counter > TASKS_LIMIT ? TASKS_LIMIT : counter} / {TASKS_LIMIT}</Text>
                            {message ? (
                                <Text style={[
                                    styles.result,
                                    message.includes('Świetnie') ? { color: theme.correctText } : { color: theme.errorText }
                                ]}>
                                    {message}
                                </Text>
                            ) : null}
                        </Animated.View>
                    </View>

                    {!isKeyboardVisible && (
                        <View style={styles.iconsBottom}>
                            <Image source={require('../../../assets/happy.png')} style={styles.iconSame} />
                            <Text style={[styles.counterTextIcons, { color: theme.textMain }]}>{correctCount}</Text>
                            <Image source={require('../../../assets/sad.png')} style={styles.iconSame} />
                            <Text style={[styles.counterTextIcons, { color: theme.textMain }]}>{wrongCount}</Text>
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
    buttonLabel: { fontSize: 14, fontWeight: 'bold', marginTop: 2 },
    hintBox: { position: 'absolute', top: 130, right: 20, padding: 15, borderRadius: 15, maxWidth: 280, zIndex: 11, elevation: 5, borderWidth: 1 },
    hintTitle: { fontSize: 16, fontWeight: 'bold', color: '#007AFF', marginBottom: 5, textAlign: 'center' },
    hintText: { fontSize: 16, lineHeight: 22 },
    card: { width: '100%', maxWidth: 450, borderRadius: 20, padding: 20, alignItems: 'center' },
    overlayBackground: { ...StyleSheet.absoluteFillObject, borderRadius: 20 },
    title: { fontSize: 24, fontWeight: '700', marginBottom: 5, textAlign: 'center' },
    taskLabel: { fontSize: 18, fontWeight: '600', marginBottom: 10, color: '#007AFF', textAlign: 'center' },
    svgContainer: { width: '100%', height: 140, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    input: { width: 120, height: 50, borderWidth: 2, borderRadius: 10, textAlign: 'center', fontSize: 24, marginBottom: 15 },
    finalInput: { width: 120 },
    buttonContainer: { marginTop: 10, width: '80%', borderRadius: 10, overflow: 'hidden' },
    result: { fontSize: 18, fontWeight: '700', marginTop: 20, textAlign: 'center' },
    counterTextSmall: { fontSize: Math.max(12, screenWidth * 0.035), fontWeight: '400', textAlign: 'center', marginTop: 10 },
    iconsBottom: { position: 'absolute', bottom: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' },
    iconSame: { width: iconSize, height: iconSize, resizeMode: 'contain', marginHorizontal: 10 },
    counterTextIcons: { fontSize: Math.max(14, iconSize * 0.28), marginHorizontal: 8, textAlign: 'center' },
    correctFinal: { width: 120, height: 50, borderWidth: 2, borderRadius: 10, textAlign: 'center', fontSize: 24, marginBottom: 15 },
    errorFinal: { width: 120, height: 50, borderWidth: 2, borderRadius: 10, textAlign: 'center', fontSize: 24, marginBottom: 15 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    drawingContainer: { width: '95%', height: '85%', borderRadius: 20, overflow: 'hidden' },
    drawingHeader: { height: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, borderBottomWidth: 1 },
    drawingTitle: { fontSize: 18, fontWeight: 'bold' },
    headerButton: { padding: 5 },
    headerButtonText: { fontSize: 16, color: '#007AFF' },
    canvas: { flex: 1 },

    // MILESTONE STYLES
    milestoneCard: { width: '90%', borderRadius: 20, padding: 25, alignItems: 'center', elevation: 10 },
    milestoneTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 15 },
    statsRow: { marginVertical: 10, alignItems: 'center', padding: 15, borderRadius: 15, width: '100%' },
    statsText: { fontSize: 18, fontWeight: 'bold' },
    suggestionText: { fontSize: 15, textAlign: 'center', marginVertical: 20, lineHeight: 22 },
    milestoneButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
    mButton: { paddingVertical: 12, paddingHorizontal: 15, borderRadius: 12, width: '48%', alignItems: 'center' },
    mButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 }
});

export default NumberLineTrainerScreen4;