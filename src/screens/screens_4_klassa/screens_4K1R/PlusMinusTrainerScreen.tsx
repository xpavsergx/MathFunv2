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
    InteractionManager,
    useColorScheme // Dodano import
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';

import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { awardXpAndCoins } from '../../../services/xpService';

const EXERCISE_ID = "addSubtractTrainer";
const TASKS_LIMIT = 50;

const { width: screenWidth } = Dimensions.get('window');
const isSmallDevice = screenWidth < 380;

// --- KOMPONENT BRUDNOPISU (Zaktualizowany o Dark Mode) ---
const DrawingModal = ({ visible, onClose, problemText }: { visible: boolean; onClose: () => void, problemText: string }) => {
    const [paths, setPaths] = useState<string[]>([]);
    const [currentPath, setCurrentPath] = useState('');

    // Obsługa Dark Mode w brudnopisie
    const isDarkMode = useColorScheme() === 'dark';
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
                        <TouchableOpacity onPress={handleClear} style={styles.headerButton}>
                            <Text style={styles.headerButtonText}>🗑️ Wyczyść</Text>
                        </TouchableOpacity>
                        <Text style={[styles.drawingTitle, { color: theme.text }]}>Brudnopis</Text>
                        <TouchableOpacity onPress={onClose} style={styles.headerButton}>
                            <Text style={styles.headerButtonText}>❌ Zamknij</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={[styles.problemPreviewContainer, { backgroundColor: theme.previewBg, borderBottomColor: theme.border }]}>
                        <Text style={styles.problemPreviewLabel}>Zadanie:</Text>
                        <Text style={styles.problemPreviewTextSmall}>{problemText}</Text>
                    </View>
                    <View style={[styles.canvas, { backgroundColor: theme.canvas }]}
                          onStartShouldSetResponder={() => true}
                          onMoveShouldSetResponder={() => true}
                          onResponderGrant={(evt) => { const { locationX, locationY } = evt.nativeEvent; setCurrentPath(`M${locationX},${locationY}`); }}
                          onResponderMove={onTouchMove}
                          onResponderRelease={onTouchEnd}>
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

const AdditionSubtractionTrainerScreen = () => {
    const navigation = useNavigation();
    const isDarkMode = useColorScheme() === 'dark';

    // --- DEFINICJA MOTYWU (THEME) ---
    const theme = {
        bgImage: require('../../../assets/background.jpg'),
        bgOverlay: isDarkMode ? 'rgba(0, 0, 0, 0.7)' : 'transparent',

        topBtnText: isDarkMode ? '#FFFFFF' : '#007AFF',

        textMain: isDarkMode ? '#FFFFFF' : '#333333',
        textSub: isDarkMode ? '#CBD5E1' : '#555555',
        labelColor: isDarkMode ? '#94A3B8' : '#888888',
        operatorColor: isDarkMode ? '#60A5FA' : '#007AFF', // Niebieski operator
        highlight: isDarkMode ? '#60A5FA' : '#007AFF',

        cardOverlay: isDarkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255,255,255,0.85)',
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

    // --- STATE ---
    const [numberA, setNumberA] = useState<number>(0);
    const [numberB, setNumberB] = useState<number>(0);
    const [isAddition, setIsAddition] = useState<boolean>(true);

    const [tensInput, setTensInput] = useState<string>('');
    const [partialResult, setPartialResult] = useState<string>('');
    const [onesInput, setOnesInput] = useState<string>('');
    const [finalResult, setFinalResult] = useState<string>('');

    const [showValidation, setShowValidation] = useState<boolean>(false);
    const [validationState, setValidationState] = useState({ tensInput: true, partialResult: true, onesInput: true, finalResult: true });

    const [readyForNext, setReadyForNext] = useState<boolean>(false);
    const [firstAttempt, setFirstAttempt] = useState<boolean>(true);
    const [isFinished, setIsFinished] = useState(false);

    const [correctCount, setCorrectCount] = useState<number>(0);
    const [wrongCount, setWrongCount] = useState<number>(0);
    const [taskCount, setTaskCount] = useState<number>(0);

    const [showMilestone, setShowMilestone] = useState(false);
    const [sessionCorrect, setSessionCorrect] = useState(0);

    const [message, setMessage] = useState('');
    const [showScratchpad, setShowScratchpad] = useState(false);
    const [showHint, setShowHint] = useState(false);
    const [hintText, setHintText] = useState('');
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);

    const backgroundColor = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const k1 = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
        const k2 = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
        nextTask();
        return () => { k1.remove(); k2.remove(); };
    }, []);

    const nextTask = () => {
        if (taskCount >= TASKS_LIMIT) {
            setIsFinished(true);
            return;
        }

        if (taskCount > 0 && taskCount % 10 === 0 && !showMilestone) {
            setShowMilestone(true);
            return;
        }

        let a = Math.floor(Math.random() * 90) + 10;
        let b = Math.floor(Math.random() * 90) + 10;
        const addition = Math.random() > 0.5;
        if (!addition) { if (b > a) [a, b] = [b, a]; }

        setNumberA(a);
        setNumberB(b);
        setIsAddition(addition);

        const tens = Math.floor(b / 10) * 10;
        const ones = b % 10;
        const opWord = addition ? 'dodaj' : 'odejmij';
        setHintText(`Rozłóż ${b} na ${tens} i ${ones}.\nNajpierw ${opWord} ${tens}, potem ${opWord} ${ones}.`);

        setTensInput('');
        setPartialResult('');
        setOnesInput('');
        setFinalResult('');
        setShowValidation(false);
        setFirstAttempt(true);
        setValidationState({ tensInput: true, partialResult: true, onesInput: true, finalResult: true });
        setMessage('');
        setReadyForNext(false);
        setShowHint(false);
        setTaskCount(prevCount => prevCount + 1);
        backgroundColor.setValue(0);
    };

    const handleRestart = () => {
        setIsFinished(false);
        setTaskCount(0);
        setCorrectCount(0);
        setWrongCount(0);
        setSessionCorrect(0);
        nextTask();
    };

    const handleCheck = () => {
        if (!finalResult.trim()) {
            setMessage('Wpisz wynik końcowy!');
            return;
        }

        Keyboard.dismiss();
        requestAnimationFrame(() => {
            const correctTens = Math.floor(numberB / 10) * 10;
            const correctPartial = isAddition ? numberA + correctTens : numberA - correctTens;
            const correctOnes = numberB % 10;
            const correctFinal = isAddition ? numberA + numberB : numberA - numberB;

            const vState = {
                tensInput: Number(tensInput) === correctTens,
                partialResult: Number(partialResult) === correctPartial,
                onesInput: Number(onesInput) === correctOnes,
                finalResult: Number(finalResult) === correctFinal,
            };

            const isEverythingCorrect = vState.tensInput && vState.partialResult && vState.onesInput && vState.finalResult;

            if (isEverythingCorrect) {
                setValidationState(vState);
                setShowValidation(true);
                Animated.timing(backgroundColor, { toValue: 1, duration: 500, useNativeDriver: false }).start();
                setCorrectCount(prev => prev + 1);
                setSessionCorrect(prev => prev + 1);
                setMessage('Świetnie! ✅');
                setReadyForNext(true);

                InteractionManager.runAfterInteractions(() => {
                    awardXpAndCoins(5, 1);
                    const currentUser = auth().currentUser;
                    if (currentUser) {
                        firestore().collection('users').doc(currentUser.uid).collection('exerciseStats').doc(EXERCISE_ID)
                            .set({ totalCorrect: firestore.FieldValue.increment(1) }, { merge: true }).catch(console.error);
                    }
                });
            } else {
                if (firstAttempt) {
                    setValidationState(vState);
                    setShowValidation(true);
                    setFirstAttempt(false);
                    setMessage('Błąd! Spróbuj poprawić puste pola ✍️');

                    if (!vState.tensInput) setTensInput('');
                    if (!vState.partialResult) setPartialResult('');
                    if (!vState.onesInput) setOnesInput('');
                    if (!vState.finalResult) setFinalResult('');

                    Animated.sequence([
                        Animated.timing(backgroundColor, { toValue: -1, duration: 400, useNativeDriver: false }),
                        Animated.timing(backgroundColor, { toValue: 0, duration: 400, useNativeDriver: false }),
                    ]).start();
                } else {
                    setValidationState(vState);
                    setShowValidation(true);
                    setWrongCount(prev => prev + 1);
                    setMessage(`Błąd! Poprawne wyniki zostały wpisane.`);

                    setTensInput(correctTens.toString());
                    setPartialResult(correctPartial.toString());
                    setOnesInput(correctOnes.toString());
                    setFinalResult(correctFinal.toString());
                    setReadyForNext(true);

                    InteractionManager.runAfterInteractions(() => {
                        const currentUser = auth().currentUser;
                        if (currentUser) {
                            firestore().collection('users').doc(currentUser.uid).collection('exerciseStats').doc(EXERCISE_ID)
                                .set({ totalWrong: firestore.FieldValue.increment(1) }, { merge: true }).catch(console.error);
                        }
                    });
                }
            }
        });
    };

    const toggleScratchpad = () => setShowScratchpad(prev => !prev);
    const toggleHint = () => setShowHint(prev => !prev);

    // Dynamiczny styl dla inputów (kolory z motywu)
    const getStyle = (field: keyof typeof validationState) => {
        // Style bazowe
        let baseStyle: any = {
            backgroundColor: theme.inputBg,
            borderColor: theme.inputBorder,
            color: theme.inputText
        };

        if (field === 'finalResult') {
            baseStyle = { ...baseStyle, ...styles.baseFinalInput }; // fontSize: 20
        } else {
            baseStyle = { ...baseStyle, ...styles.baseInput }; // fontSize standard
        }

        if (!showValidation) return baseStyle;

        const isOk = validationState[field];
        if (isOk) {
            return {
                ...baseStyle,
                backgroundColor: theme.correctBg,
                borderColor: theme.correctBorder,
                color: theme.correctText
            };
        } else {
            return {
                ...baseStyle,
                backgroundColor: theme.errorBg,
                borderColor: theme.errorBorder,
                color: theme.errorText
            };
        }
    };

    const bgInterpolation = backgroundColor.interpolate({
        inputRange: [-1, 0, 1],
        outputRange: ['rgba(255, 0, 0, 0.2)', 'rgba(255, 255, 255, 0)', 'rgba(0, 255, 0, 0.2)']
    });

    const operationSymbol = isAddition ? '+' : '−';
    const problemString = `${numberA} ${operationSymbol} ${numberB}`;

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
                            <TouchableOpacity onPress={toggleScratchpad} style={styles.topBtnItem}>
                                <Image source={require('../../../assets/pencil.png')} style={styles.iconTop} />
                                <Text style={[styles.buttonLabel, { color: theme.topBtnText }]}>Brudnopis</Text>
                            </TouchableOpacity>
                            <View style={styles.topBtnItem}>
                                <TouchableOpacity onPress={toggleHint}>
                                    <Image source={require('../../../assets/question.png')} style={styles.iconTop} />
                                </TouchableOpacity>
                                <Text style={[styles.buttonLabel, { color: theme.topBtnText }]}>Pomoc</Text>
                            </View>
                        </View>
                    )}

                    {showHint && !isKeyboardVisible && (
                        <View style={[styles.hintBox, { backgroundColor: theme.modalContent, borderColor: '#007AFF' }]}>
                            <Text style={styles.hintTitle}>Podpowiedź:</Text>
                            <Text style={[styles.hintText, { color: theme.textMain }]}>{hintText}</Text>
                        </View>
                    )}

                    <DrawingModal visible={showScratchpad} onClose={toggleScratchpad} problemText={problemString} />

                    {/* MODAL MILESTONE (CO 10 ZADAŃ) */}
                    <Modal visible={showMilestone} transparent={true} animationType="slide">
                        <View style={styles.modalOverlay}>
                            <View style={[styles.milestoneCard, { backgroundColor: theme.modalContent }]}>
                                <Text style={[styles.milestoneTitle, { color: theme.textMain }]}>Podsumowanie serii 📊</Text>
                                <View style={[styles.statsRow, { backgroundColor: theme.statsRow }]}>
                                    <Text style={[styles.statsText, { color: theme.textMain }]}>Poprawne: {sessionCorrect} / 10</Text>
                                </View>
                                <View style={styles.milestoneButtons}>
                                    <TouchableOpacity style={[styles.mButton, { backgroundColor: '#28a745' }]} onPress={() => { setShowMilestone(false); setSessionCorrect(0); nextTask(); }}>
                                        <Text style={styles.mButtonText}>Kontynuuj</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.mButton, { backgroundColor: '#007AFF' }]} onPress={() => { setShowMilestone(false); navigation.goBack(); }}>
                                        <Text style={styles.mButtonText}>Wyjdź</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>

                    {/* MODAL FINALNY (PO 50 ZADANIACH) */}
                    <Modal visible={isFinished} transparent={true} animationType="fade">
                        <View style={styles.modalOverlay}>
                            <View style={[styles.milestoneCard, { backgroundColor: theme.modalContent }]}>
                                <Text style={[styles.milestoneTitle, { color: theme.textMain }]}>Trening ukończony! 🏆</Text>
                                <Text style={[styles.suggestionText, { color: theme.textSub }]}>Świetna robota! Rozwiązałeś wszystkie {TASKS_LIMIT} zadań.</Text>
                                <View style={[styles.statsRow, { backgroundColor: theme.statsRow }]}>
                                    <Text style={[styles.statsText, { color: theme.textMain }]}>Wynik: {correctCount} / {TASKS_LIMIT}</Text>
                                </View>
                                <View style={styles.milestoneButtons}>
                                    <TouchableOpacity style={[styles.mButton, { backgroundColor: '#28a745' }]} onPress={handleRestart}>
                                        <Text style={styles.mButtonText}>Jeszcze raz</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.mButton, { backgroundColor: '#dc3545' }]} onPress={() => { setIsFinished(false); navigation.goBack(); }}>
                                        <Text style={styles.mButtonText}>Wyjdź</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>

                    <ScrollView contentContainerStyle={styles.centerContent} keyboardShouldPersistTaps="handled">
                        <View style={styles.card}>
                            <View style={[styles.overlayBackground, { backgroundColor: theme.cardOverlay }]} />
                            <Text style={styles.taskLabel}>Trener {isAddition ? "Dodawania" : "Odejmowania"}</Text>
                            <Text style={[styles.taskTextMain, { color: theme.textMain }]}>{problemString}</Text>
                            <Text style={[styles.subTitle, { color: theme.textSub }]}>Rozłóż liczbę <Text style={[styles.highlight, { color: theme.highlight }]}>{numberB}</Text></Text>

                            <View style={styles.mathContainer}>
                                <View style={styles.row}>
                                    <Text style={[styles.number, { color: theme.textMain }]}>{numberA}</Text>
                                    <Text style={[styles.operator, { color: theme.operatorColor }]}> {operationSymbol} </Text>
                                    <TextInput
                                        style={getStyle('tensInput')}
                                        keyboardType="numeric"
                                        value={tensInput}
                                        onChangeText={(t) => {setTensInput(t); setShowValidation(false);}}
                                        placeholder="dziesiątki"
                                        placeholderTextColor={theme.inputPlaceholder}
                                        editable={!readyForNext}
                                    />
                                    <Text style={[styles.operator, { color: theme.operatorColor }]}> = </Text>
                                    <TextInput
                                        style={getStyle('partialResult')}
                                        keyboardType="numeric"
                                        value={partialResult}
                                        onChangeText={(t) => {setPartialResult(t); setShowValidation(false);}}
                                        placeholder="wynik"
                                        placeholderTextColor={theme.inputPlaceholder}
                                        editable={!readyForNext}
                                    />
                                </View>
                                <View style={styles.row}>
                                    <Text style={[styles.operator, { color: theme.operatorColor }]}>{isAddition ? '+' : '−'}</Text>
                                    <TextInput
                                        style={getStyle('onesInput')}
                                        keyboardType="numeric"
                                        value={onesInput}
                                        onChangeText={(t) => {setOnesInput(t); setShowValidation(false);}}
                                        placeholder="jedności"
                                        placeholderTextColor={theme.inputPlaceholder}
                                        editable={!readyForNext}
                                    />
                                    <Text style={[styles.operator, { color: theme.operatorColor }]}> = </Text>
                                    <TextInput
                                        style={[getStyle('finalResult'), { width: isSmallDevice ? screenWidth * 0.35 : 140 }]}
                                        keyboardType="numeric"
                                        value={finalResult}
                                        onChangeText={(t) => {setFinalResult(t); setShowValidation(false);}}
                                        placeholder="koniec"
                                        placeholderTextColor={theme.inputPlaceholder}
                                        editable={!readyForNext}
                                    />
                                </View>
                            </View>

                            <View style={styles.buttonContainer}>
                                <Button title={readyForNext ? 'Dalej' : 'Sprawdź'} onPress={readyForNext ? nextTask : handleCheck} color={readyForNext ? "#28a745" : "#007AFF"} />
                            </View>
                            <Text style={[styles.counterTextSmall, { color: theme.textSub }]}>Zadanie: {taskCount > TASKS_LIMIT ? TASKS_LIMIT : taskCount} / {TASKS_LIMIT}</Text>
                            {message ? (
                                <Text style={[
                                    styles.result,
                                    message.includes('Świetnie') ? { color: theme.correctText } : { color: theme.errorText }
                                ]}>
                                    {message}
                                </Text>
                            ) : null}
                        </View>
                    </ScrollView>

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
const inputWidth = isSmallDevice ? screenWidth * 0.22 : 100;
const inputFontSize = isSmallDevice ? 16 : 18;

const styles = StyleSheet.create({
    keyboardContainer: { flex: 1, justifyContent: 'center' },
    centerContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 20 },
    topButtons: { position: 'absolute', top: 40, right: 20, flexDirection: 'row', alignItems: 'center', zIndex: 10 },
    topBtnItem: { alignItems: 'center', marginLeft: 15 },
    iconTop: { width: 70, height: 70, resizeMode: 'contain', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3 },
    buttonLabel: { fontSize: 14, fontWeight: 'bold', marginTop: 2 },

    hintBox: { position: 'absolute', top: 120, right: 20, padding: 15, borderRadius: 15, maxWidth: 260, zIndex: 11, elevation: 5, borderWidth: 1 },
    hintTitle: { fontSize: 16, fontWeight: 'bold', color: '#007AFF', marginBottom: 5, textAlign: 'center' },
    hintText: { fontSize: 16, lineHeight: 22, textAlign: 'center' },

    card: { width: '95%', maxWidth: 480, borderRadius: 20, padding: 20, alignItems: 'center', marginTop: 20, alignSelf: 'center' },
    overlayBackground: { ...StyleSheet.absoluteFillObject, borderRadius: 20 },

    taskLabel: { fontSize: 18, fontWeight: '700', marginBottom: 5, color: '#007AFF', textAlign: 'center', textTransform: 'uppercase' },
    taskTextMain: { fontSize: isSmallDevice ? 32 : 40, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
    subTitle: { fontSize: 16, marginBottom: 15, textAlign: 'center' },
    highlight: { fontWeight: 'bold' },

    mathContainer: { marginBottom: 20, width: '100%' },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 8, flexWrap: 'wrap' },
    number: { fontSize: 24, fontWeight: '600', marginHorizontal: 2 },
    operator: { fontSize: 24, fontWeight: 'bold', marginHorizontal: 2 },

    // Style bazowe dla inputów (kolory nadpisywane dynamicznie)
    baseInput: { width: inputWidth, height: 50, borderWidth: 2, borderRadius: 10, textAlign: 'center', fontSize: inputFontSize, marginHorizontal: 4 },
    baseFinalInput: { height: 50, borderWidth: 2, borderRadius: 10, textAlign: 'center', fontSize: 20, marginHorizontal: 4 },

    buttonContainer: { marginTop: 10, width: '80%', borderRadius: 10, overflow: 'hidden' },
    result: { fontSize: 18, fontWeight: '700', marginTop: 20, textAlign: 'center' },

    counterTextSmall: { fontSize: Math.max(12, screenWidth * 0.035), fontWeight: '400', textAlign: 'center', marginTop: 10 },
    iconsBottom: { position: 'absolute', bottom: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' },
    iconSame: { width: iconSize, height: iconSize, resizeMode: 'contain', marginHorizontal: 10 },
    counterTextIcons: { fontSize: Math.max(14, iconSize * 0.28), marginHorizontal: 8, textAlign: 'center' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    drawingContainer: { width: '95%', height: '85%', borderRadius: 20, overflow: 'hidden' },
    drawingHeader: { height: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, borderBottomWidth: 1 },
    drawingTitle: { fontSize: 18, fontWeight: 'bold' },
    headerButton: { padding: 5 },
    headerButtonText: { fontSize: 16, color: '#007AFF' },
    problemPreviewContainer: { padding: 10, alignItems: 'center', borderBottomWidth: 1, width: '100%' },
    problemPreviewLabel: { fontSize: 12, color: '#777', textTransform: 'uppercase', marginBottom: 4 },
    problemPreviewTextSmall: { fontSize: 16, fontWeight: '600', color: '#007AFF', textAlign: 'center' },
    canvas: { flex: 1 },

    milestoneCard: { width: '90%', borderRadius: 20, padding: 25, alignItems: 'center', elevation: 10 },
    milestoneTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 15 },
    statsRow: { marginVertical: 10, alignItems: 'center', padding: 15, borderRadius: 15, width: '100%' },
    statsText: { fontSize: 18, fontWeight: 'bold' },
    suggestionText: { fontSize: 15, textAlign: 'center', marginVertical: 20, lineHeight: 22 },
    milestoneButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
    mButton: { paddingVertical: 12, paddingHorizontal: 15, borderRadius: 12, width: '48%', alignItems: 'center' },
    mButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 }
});

export default AdditionSubtractionTrainerScreen;