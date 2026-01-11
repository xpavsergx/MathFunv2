import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TextInput, Button, Keyboard, ImageBackground,
    Animated, StatusBar, Image, Dimensions, TouchableOpacity, Modal,
    Platform, KeyboardAvoidingView, TouchableWithoutFeedback, ScrollView, InteractionManager,
    useColorScheme // Добавлено
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { awardXpAndCoins } from '../../../services/xpService';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

const EXERCISE_ID = "lengthUnitsTrainer_Full_v17";
const TASKS_LIMIT = 40;
const { width: screenWidth } = Dimensions.get('window');
const combinedIconSize = screenWidth * 0.25;

// --- KOMPONENT BRUDNOPISU ---
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
                        <Text style={styles.problemPreviewTextSmall}>{problemText}</Text>
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

const LengthUnitsTrainer = () => {
    const navigation = useNavigation();
    const isDarkMode = useColorScheme() === 'dark';

    const theme = {
        bgOverlay: isDarkMode ? 'rgba(0, 0, 0, 0.7)' : 'transparent',
        topBtnText: isDarkMode ? '#FFFFFF' : '#007AFF',
        textMain: isDarkMode ? '#FFFFFF' : '#333',
        textSub: isDarkMode ? '#CBD5E1' : '#555',
        cardOverlay: isDarkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255,255,255,0.85)',
        modalContent: isDarkMode ? '#1E293B' : '#fff',
        statsRow: isDarkMode ? '#0F172A' : '#f8f9fa',
        inputBg: isDarkMode ? '#334155' : '#fafafa',
        inputBorder: isDarkMode ? '#475569' : '#ccc',
        inputText: isDarkMode ? '#FFFFFF' : '#333',
        correctBg: isDarkMode ? 'rgba(21, 87, 36, 0.5)' : '#d4edda',
        errorBg: isDarkMode ? 'rgba(114, 28, 36, 0.5)' : '#f8d7da',
    };

    const [questionText, setQuestionText] = useState('');
    const [subQuestionText, setSubQuestionText] = useState('');
    const [correctAnswer, setCorrectAnswer] = useState('');
    const [correctAnswer2, setCorrectAnswer2] = useState('');
    const [options, setOptions] = useState<string[]>([]);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [userInput, setUserInput] = useState('');
    const [userInput2, setUserInput2] = useState('');
    const [readyForNext, setReadyForNext] = useState<boolean>(false);
    const [correctCount, setCorrectCount] = useState<number>(0);
    const [wrongCount, setWrongCount] = useState<number>(0);
    const [taskCount, setTaskCount] = useState<number>(0);
    const [firstAttempt, setFirstAttempt] = useState<boolean>(true);
    const [message, setMessage] = useState('');
    const [showScratchpad, setShowScratchpad] = useState(false);
    const [showHint, setShowHint] = useState(false);
    const [hintText, setHintText] = useState('');
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);

    const [isInput1Correct, setIsInput1Correct] = useState<boolean | null>(null);
    const [isInput2Correct, setIsInput2Correct] = useState<boolean | null>(null);

    const [showMilestone, setShowMilestone] = useState(false);
    const [isFinished, setIsFinished] = useState(false);
    const [sessionCorrect, setSessionCorrect] = useState(0);

    const [usedTasks, setUsedTasks] = useState<Set<string>>(new Set());
    const backgroundColor = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const k1 = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
        const k2 = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
        nextTask();
        return () => { k1.remove(); k2.remove(); };
    }, []);

    const generateProblem = () => {
        let finalData: any = {};
        let id = "";
        while (true) {
            const type = Math.random();
            let q = 'Przelicz jednostki:';
            let sub = ''; let ans1 = ''; let ans2 = ''; let hint = ''; let opts: string[] = [];

            if (type < 0.4) {
                const pairs = [{f:'dm', t:'cm', m:10}, {f:'m', t:'cm', m:100}, {f:'cm', t:'mm', m:10}];
                const p = pairs[Math.floor(Math.random() * pairs.length)];
                const val = Math.floor(Math.random() * 80) + 11;
                ans1 = (val * p.m).toString();
                q = 'Wybierz poprawną odpowiedź:';
                sub = `${val} ${p.f} = ... ${p.t}`;
                opts = [ans1, `${val}`, `${val * p.m * 10}`, `${val}0${val % 10}`].sort(() => Math.random() - 0.5);
                hint = `1 ${p.f} = ${p.m} ${p.t}.`;
                id = `opt-${val}-${p.f}`;
            } else if (type < 0.7) {
                const pairs = [{f:'mm', t:'cm', d:10}, {f:'cm', t:'m', d:100}, {f:'dm', t:'m', d:10}];
                const p = pairs[Math.floor(Math.random() * pairs.length)];
                const val = (Math.floor(Math.random() * 50) + 1) * p.d;
                sub = `${val} ${p.f} = ... ${p.t}`;
                ans1 = (val / p.d).toString();
                hint = `1 ${p.t} = ${p.d} ${p.f}.`;
                id = `div-${val}-${p.f}`;
            } else {
                const val = Math.floor(Math.random() * 9000) + 110;
                sub = `${val} cm = ... m ... cm`;
                ans1 = Math.floor(val / 100).toString();
                ans2 = (val % 100).toString();
                hint = "100 cm = 1 m.";
                id = `rem-${val}`;
            }

            if (!usedTasks.has(id)) {
                finalData = { q, sub, ans1, ans2, hint, opts };
                setUsedTasks(prev => new Set(prev).add(id));
                break;
            }
        }
        setQuestionText(finalData.q); setSubQuestionText(finalData.sub);
        setCorrectAnswer(finalData.ans1); setCorrectAnswer2(finalData.ans2);
        setHintText(finalData.hint); setOptions(finalData.opts);
        setSelectedOption(null); setIsInput1Correct(null); setIsInput2Correct(null);
        setUserInput(''); setUserInput2('');
    };

    const handleCheck = (selectedVal?: string) => {
        const val1 = (selectedVal || userInput).trim();
        const val2 = userInput2.trim();
        if (selectedVal) setSelectedOption(selectedVal);

        if (!val1 && (correctAnswer2 === '' || !val2)) {
            setMessage('Wpisz wynik!');
            return;
        }

        const check1 = val1 === correctAnswer;
        const check2 = correctAnswer2 === '' || val2 === correctAnswer2;

        if (check1 && check2) {
            setIsInput1Correct(true);
            setIsInput2Correct(true);
            Animated.timing(backgroundColor, { toValue: 1, duration: 500, useNativeDriver: false }).start();
            setCorrectCount(prev => prev + 1);
            setSessionCorrect(prev => prev + 1);
            setMessage('Świetnie! ✅'); setReadyForNext(true);
            InteractionManager.runAfterInteractions(() => { awardXpAndCoins(5, 1);
                const currentUser = auth().currentUser;
                if (currentUser) {
                    firestore().collection('users').doc(currentUser.uid).collection('exerciseStats').doc(EXERCISE_ID)
                        .set({ totalCorrect: firestore.FieldValue.increment(1) }, { merge: true }).catch(console.error);
                }});
        } else {
            setIsInput1Correct(check1);
            setIsInput2Correct(check2);
            Animated.sequence([
                Animated.timing(backgroundColor, { toValue: -1, duration: 400, useNativeDriver: false }),
                Animated.timing(backgroundColor, { toValue: 0, duration: 400, useNativeDriver: false }),
            ]).start();

            if (firstAttempt) {
                setMessage('Błąd! Spróbuj jeszcze raz ✍️');
                setFirstAttempt(false);
                if (!check1 && !selectedVal) setUserInput('');
                if (!check2) setUserInput2('');
            } else {
                const res = correctAnswer2 !== '' ? `${correctAnswer} i ${correctAnswer2}` : correctAnswer;
                setMessage(`Błąd! Prawidłowy wynik: ${res}`);
                if (!selectedVal) setUserInput(correctAnswer);
                if (correctAnswer2 !== '') setUserInput2(correctAnswer2);
                setReadyForNext(true);
                setWrongCount(prev => prev + 1);
                InteractionManager.runAfterInteractions(() => {
                    const currentUser = auth().currentUser;
                    if (currentUser) {
                        firestore().collection('users').doc(currentUser.uid).collection('exerciseStats').doc(EXERCISE_ID)
                            .set({ totalWrong: firestore.FieldValue.increment(1) }, { merge: true }).catch(console.error);
                    }
                });
            }
        }
    };

    const nextTask = () => {
        if (taskCount >= TASKS_LIMIT) {
            setIsFinished(true);
            return;
        }
        if (taskCount > 0 && taskCount % 10 === 0 && !showMilestone && taskCount < TASKS_LIMIT) {
            setShowMilestone(true);
            return;
        }
        generateProblem();
        setReadyForNext(false); setFirstAttempt(true); setShowHint(false); setTaskCount(prev => prev + 1);
        backgroundColor.setValue(0);
        setIsInput1Correct(null); setIsInput2Correct(null);
    };

    const handleRestart = () => {
        setIsFinished(false);
        setTaskCount(0);
        setCorrectCount(0);
        setWrongCount(0);
        setSessionCorrect(0);
        setUsedTasks(new Set());
        nextTask();
    };

    const bgInterpolation = backgroundColor.interpolate({ inputRange: [-1, 0, 1], outputRange: ['rgba(255,0,0,0.2)', 'rgba(255,255,255,0)', 'rgba(0,255,0,0.2)'] });

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ flex: 1 }}>
                <StatusBar translucent backgroundColor="transparent" barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

                <ImageBackground source={require('../../../assets/background.jpg')} style={StyleSheet.absoluteFillObject} resizeMode="cover">
                    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.bgOverlay }]} pointerEvents="none" />
                </ImageBackground>

                <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: bgInterpolation }]} pointerEvents="none" />

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

                    {showHint && !isKeyboardVisible && (
                        <View style={[styles.hintBox, { backgroundColor: theme.modalContent, borderColor: '#007AFF' }]}>
                            <Text style={styles.hintTitle}>Podpowiedź:</Text>
                            <Text style={[styles.hintText, { color: theme.textMain }]}>{hintText}</Text>
                        </View>
                    )}

                    <DrawingModal visible={showScratchpad} onClose={() => setShowScratchpad(false)} problemText={subQuestionText} />

                    {/* MODAL MILESTONE */}
                    <Modal visible={showMilestone} transparent={true} animationType="slide">
                        <View style={styles.modalOverlay}>
                            <View style={[styles.milestoneCard, { backgroundColor: theme.modalContent }]}>
                                <Text style={[styles.milestoneTitle, { color: theme.textMain }]}>Podsumowanie serii 📊</Text>
                                <View style={[styles.statsRow, { backgroundColor: theme.statsRow }]}>
                                    <Text style={[styles.statsText, { color: theme.textMain }]}>Poprawne: {sessionCorrect} / 10</Text>
                                    <Text style={[styles.statsText, { color: '#28a745', marginTop: 5 }]}>Skuteczność: {(sessionCorrect / 10 * 100).toFixed(0)}%</Text>
                                </View>
                                <View style={styles.milestoneButtons}>
                                    <TouchableOpacity style={[styles.mButton, { backgroundColor: '#28a745' }]} onPress={() => { setShowMilestone(false); setSessionCorrect(0); nextTask(); }}><Text style={styles.mButtonText}>Kontynuuj</Text></TouchableOpacity>
                                    <TouchableOpacity style={[styles.mButton, { backgroundColor: '#007AFF' }]} onPress={() => { setShowMilestone(false); navigation.goBack(); }}><Text style={styles.mButtonText}>Wyjdź</Text></TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>

                    {/* MODAL FINALNY */}
                    <Modal visible={isFinished} transparent={true} animationType="fade">
                        <View style={styles.modalOverlay}>
                            <View style={[styles.milestoneCard, { backgroundColor: theme.modalContent }]}>
                                <Text style={[styles.milestoneTitle, { color: theme.textMain }]}>Gratulacje! 🏆</Text>
                                <Text style={[styles.suggestionText, { color: theme.textSub }]}>Ukończyłeś wszystkie zadania!</Text>
                                <View style={[styles.statsRow, { backgroundColor: theme.statsRow }]}>
                                    <Text style={[styles.statsText, { color: theme.textMain }]}>Wynik końcowy: {correctCount} / {TASKS_LIMIT}</Text>
                                </View>
                                <View style={styles.milestoneButtons}>
                                    <TouchableOpacity style={[styles.mButton, { backgroundColor: '#28a745' }]} onPress={handleRestart}><Text style={styles.mButtonText}>Od nowa</Text></TouchableOpacity>
                                    <TouchableOpacity style={[styles.mButton, { backgroundColor: '#dc3545' }]} onPress={() => { setIsFinished(false); navigation.goBack(); }}><Text style={styles.mButtonText}>Wyjdź</Text></TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>

                    <ScrollView contentContainerStyle={styles.centerContent} keyboardShouldPersistTaps="handled">
                        <View style={styles.card}>
                            <View style={[styles.overlayBackground, { backgroundColor: theme.cardOverlay }]} />
                            <Text style={[styles.questionMain, { color: theme.textMain }]}>{questionText}</Text>
                            <Text style={styles.subQuestion}>{subQuestionText}</Text>

                            {options.length > 0 ? (
                                <View style={styles.testContainer}>
                                    {options.map((opt, index) => {
                                        const isThisSelected = selectedOption === opt;
                                        const isCorrectOpt = opt === correctAnswer;
                                        const showGreen = (readyForNext && isCorrectOpt) || (isInput1Correct && isThisSelected && isCorrectOpt);
                                        const showRed = isInput1Correct === false && isThisSelected;
                                        return (
                                            <TouchableOpacity key={index} style={[styles.testOption, { backgroundColor: isDarkMode ? '#1E293B' : '#fff' }, showGreen && styles.testCorrect, showRed && styles.testError]} onPress={() => !readyForNext && handleCheck(opt)}>
                                                <Text style={[styles.testOptionText, (showGreen || showRed) ? {color: '#fff'} : {color: '#007AFF'}]}>{opt}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            ) : (
                                <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
                                    <TextInput
                                        style={[styles.finalInput, {backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.inputText}, isInput1Correct === true && {backgroundColor: theme.correctBg, borderColor: '#28a745'}, isInput1Correct === false && {backgroundColor: theme.errorBg, borderColor: '#dc3545'}, correctAnswer2 !== '' && {width:125}]}
                                        keyboardType="numeric" value={userInput} onChangeText={(t) => {setUserInput(t); if(isInput1Correct === false) setIsInput1Correct(null);}} editable={!readyForNext} placeholder="?" placeholderTextColor={isDarkMode ? '#94A3B8' : '#aaa'}
                                    />
                                    {correctAnswer2 !== '' && (
                                        <TextInput
                                            style={[styles.finalInput, {marginLeft:10, width:125, backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.inputText}, isInput2Correct === true && {backgroundColor: theme.correctBg, borderColor: '#28a745'}, isInput2Correct === false && {backgroundColor: theme.errorBg, borderColor: '#dc3545'}]}
                                            keyboardType="numeric" value={userInput2} onChangeText={(t) => {setUserInput2(t); if(isInput2Correct === false) setIsInput2Correct(null);}} editable={!readyForNext} placeholder="?" placeholderTextColor={isDarkMode ? '#94A3B8' : '#aaa'}
                                        />
                                    )}
                                </View>
                            )}

                            <View style={styles.buttonContainer}>
                                <Button title={readyForNext ? 'Dalej' : 'Sprawdź'} onPress={readyForNext ? nextTask : () => handleCheck()} color={readyForNext ? "#28a745" : "#007AFF"} />
                            </View>

                            <Text style={[styles.counterTextSmall, { color: theme.textSub }]}>Zadanie: {taskCount} / {TASKS_LIMIT}</Text>
                            {message ? <Text style={[styles.result, message.includes('Świetnie') ? { color: '#28a745' } : { color: '#dc3545' }]}>{message}</Text> : null}
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

const styles = StyleSheet.create({
    keyboardContainer: { flex: 1, justifyContent: 'center' },
    centerContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 20 },
    topButtons: { position: 'absolute', top: 40, right: 20, flexDirection: 'row', alignItems: 'center', zIndex: 10 },
    topBtnItem: { alignItems: 'center', marginLeft: 15 },
    iconTop: { width: 70, height: 70, resizeMode: 'contain' },
    buttonLabel: { fontSize: 14, fontWeight: 'bold', marginTop: 2 },
    hintBox: { position: 'absolute', top: 120, right: 20, padding: 15, borderRadius: 15, maxWidth: 260, zIndex: 11, elevation: 5, borderWidth: 1 },
    hintTitle: { fontSize: 16, fontWeight: 'bold', color: '#007AFF', marginBottom: 5, textAlign: 'center' },
    hintText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
    card: { width: '95%', maxWidth: 480, borderRadius: 20, padding: 20, marginTop: 20, alignItems: 'center', alignSelf: 'center' },
    overlayBackground: { ...StyleSheet.absoluteFillObject, borderRadius: 20 },
    questionMain: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
    subQuestion: { fontSize: 24, color: '#0056b3', textAlign: 'center', marginBottom: 20, fontWeight: '600', lineHeight: 32 },
    testContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', width: '100%' },
    testOption: { width: '42%', margin: '2%', padding: 15, borderRadius: 15, borderWidth: 2, borderColor: '#007AFF', alignItems: 'center' },
    testCorrect: { borderColor: '#28a745', backgroundColor: '#28a745' },
    testError: { borderColor: '#dc3545', backgroundColor: '#dc3545' },
    testOptionText: { fontSize: 20, fontWeight: 'bold' },
    finalInput: { width: 260, height: 60, borderWidth: 2, borderRadius: 15, textAlign: 'center', fontSize: 24, marginTop: 10, fontWeight: 'bold' },
    buttonContainer: { marginTop: 25, width: '80%', borderRadius: 10, overflow: 'hidden' },
    result: { fontSize: 18, fontWeight: '700', marginTop: 15, textAlign: 'center' },
    counterTextSmall: { fontSize: 14, textAlign: 'center', marginTop: 10 },
    iconsBottom: { position: 'absolute', bottom: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' },
    iconSame: { width: combinedIconSize, height: combinedIconSize, resizeMode: 'contain', marginHorizontal: 10 },
    counterTextIcons: { fontSize: 22, marginHorizontal: 8, fontWeight: 'bold' },
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
    milestoneCard: { width: '90%', borderRadius: 20, padding: 25, alignItems: 'center' },
    milestoneTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 15 },
    statsRow: { marginVertical: 10, alignItems: 'center', padding: 15, borderRadius: 15, width: '100%' },
    statsText: { fontSize: 18, fontWeight: 'bold' },
    suggestionText: { fontSize: 15, textAlign: 'center', marginVertical: 20 },
    milestoneButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
    mButton: { paddingVertical: 12, borderRadius: 12, width: '48%', alignItems: 'center' },
    mButtonText: { color: '#fff', fontWeight: 'bold' }
});

export default LengthUnitsTrainer;