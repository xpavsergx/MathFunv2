import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TextInput, Button, Keyboard, ImageBackground,
    Animated, StatusBar, Image, Dimensions, TouchableOpacity, Modal,
    Platform, KeyboardAvoidingView, TouchableWithoutFeedback, ScrollView, InteractionManager
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { awardXpAndCoins } from '../../../services/xpService';

const EXERCISE_ID = "lengthUnitsTrainer_Full_v17";
const TASKS_LIMIT = 40;
const { width: screenWidth } = Dimensions.get('window');
const combinedIconSize = screenWidth * 0.25;

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
                    <View style={styles.problemPreviewContainer}><Text style={styles.problemPreviewLabel}>Zadanie:</Text><Text style={styles.problemPreviewTextSmall}>{problemText}</Text></View>
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

const LengthUnitsTrainer = () => {
    const [questionText, setQuestionText] = useState('');
    const [subQuestionText, setSubQuestionText] = useState('');
    const [correctAnswer, setCorrectAnswer] = useState('');
    const [correctAnswer2, setCorrectAnswer2] = useState('');
    const [options, setOptions] = useState<string[]>([]);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [userInput, setUserInput] = useState('');
    const [userInput2, setUserInput2] = useState('');
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
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
    };

    const handleCheck = (selectedVal?: string) => {
        const val1 = (selectedVal || userInput).trim();
        const val2 = userInput2.trim();
        if (selectedVal) setSelectedOption(selectedVal);

        const check1 = val1 === correctAnswer;
        const check2 = correctAnswer2 === '' || val2 === correctAnswer2;

        setIsInput1Correct(check1);
        setIsInput2Correct(check2);

        if (check1 && check2) {
            Animated.timing(backgroundColor, { toValue: 1, duration: 500, useNativeDriver: false }).start();
            setCorrectCount(prev => prev + 1); setMessage('Świetnie! ✅'); setReadyForNext(true);
            setIsCorrect(true);
            InteractionManager.runAfterInteractions(() => { awardXpAndCoins(5, 1); });
        } else {
            Animated.timing(backgroundColor, { toValue: -1, duration: 500, useNativeDriver: false }).start();
            setIsCorrect(false);
            if (!check1 && !selectedVal) setUserInput('');
            if (!check2) setUserInput2('');

            if (firstAttempt) { setMessage('Błąd. Spróbuj еще raz.'); setFirstAttempt(false); }
            else {
                const res = correctAnswer2 !== '' ? `${correctAnswer} i ${correctAnswer2}` : correctAnswer;
                setMessage(`Prawidłowy wynik: ${res}`); setReadyForNext(true);
            }
            setWrongCount(prev => prev + 1);
        }
    };

    const nextTask = () => {
        if (taskCount >= TASKS_LIMIT) { setMessage('Koniec! 🏆'); return; }
        generateProblem();
        setUserInput(''); setUserInput2(''); setIsCorrect(null); setMessage('');
        setReadyForNext(false); setFirstAttempt(true); setShowHint(false); setTaskCount(prev => prev + 1);
        backgroundColor.setValue(0);
    };

    const bgInterpolation = backgroundColor.interpolate({ inputRange: [-1, 0, 1], outputRange: ['rgba(255,0,0,0.2)', 'rgba(255,255,255,0)', 'rgba(0,255,0,0.2)'] });

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ flex: 1 }}>
                <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
                <ImageBackground source={require('../../../assets/background.jpg')} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: bgInterpolation }]} pointerEvents="none" />
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardContainer}>
                    {!isKeyboardVisible && (
                        <View style={styles.topButtons}>
                            <TouchableOpacity onPress={() => setShowScratchpad(true)} style={styles.topBtnItem}><Image source={require('../../../assets/pencil.png')} style={styles.iconTop} /><Text style={styles.buttonLabel}>Brudnopis</Text></TouchableOpacity>
                            <TouchableOpacity onPress={() => setShowHint(!showHint)} style={styles.topBtnItem}><Image source={require('../../../assets/question.png')} style={styles.iconTop} /><Text style={styles.buttonLabel}>Pomoc</Text></TouchableOpacity>
                        </View>
                    )}
                    {showHint && !isKeyboardVisible && (
                        <View style={styles.hintBox}><Text style={styles.hintTitle}>Podpowiedź:</Text><Text style={styles.hintText}>{hintText}</Text></View>
                    )}
                    <DrawingModal visible={showScratchpad} onClose={() => setShowScratchpad(false)} problemText={subQuestionText} />
                    <ScrollView contentContainerStyle={styles.centerContent} keyboardShouldPersistTaps="handled">
                        <View style={styles.card}>
                            <View style={styles.overlayBackground} />
                            <Text style={styles.questionMain}>{questionText}</Text>
                            <Text style={styles.subQuestion}>{subQuestionText}</Text>

                            {options.length > 0 ? (
                                <View style={styles.testContainer}>
                                    {options.map((opt, index) => {
                                        const isThisSelected = selectedOption === opt;
                                        const isCorrectOpt = opt === correctAnswer;
                                        const showGreen = (readyForNext && isCorrectOpt) || (isInput1Correct && isThisSelected);
                                        const showRed = isInput1Correct === false && isThisSelected;
                                        return (
                                            <TouchableOpacity
                                                key={index}
                                                style={[styles.testOption, showGreen && styles.testCorrect, showRed && styles.testError]}
                                                onPress={() => !readyForNext && handleCheck(opt)}
                                            >
                                                <Text style={[styles.testOptionText, (showGreen || showRed) && {color: '#fff'}]}>{opt}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            ) : (
                                <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
                                    <TextInput
                                        style={[styles.finalInput, isInput1Correct === true && styles.correctFinal, isInput1Correct === false && styles.errorFinal, correctAnswer2 !== '' && {width:125}]}
                                        keyboardType="numeric" value={userInput} onChangeText={setUserInput} editable={!readyForNext} placeholder="?"
                                    />
                                    {correctAnswer2 !== '' && (
                                        <TextInput
                                            style={[styles.finalInput, {marginLeft:10, width:125}, isInput2Correct === true && styles.correctFinal, isInput2Correct === false && styles.errorFinal]}
                                            keyboardType="numeric" value={userInput2} onChangeText={setUserInput2} editable={!readyForNext} placeholder="?"
                                        />
                                    )}
                                </View>
                            )}

                            {(options.length === 0 || readyForNext) && (
                                <View style={styles.buttonContainer}><Button title={readyForNext ? 'Dalej' : 'Sprawdź'} onPress={readyForNext ? nextTask : () => handleCheck()} color="#007AFF" /></View>
                            )}

                            <Text style={styles.counterTextSmall}>Zadanie: {taskCount} / {TASKS_LIMIT}</Text>
                            {message ? <Text style={[styles.result, message.includes('Świetnie') ? styles.correctText : styles.errorText]}>{message}</Text> : null}
                        </View>
                    </ScrollView>
                    {!isKeyboardVisible && (
                        <View style={styles.iconsBottom}><Image source={require('../../../assets/happy.png')} style={styles.iconSame} /><Text style={styles.counterTextIcons}>{correctCount}</Text><Image source={require('../../../assets/sad.png')} style={styles.iconSame} /><Text style={styles.counterTextIcons}>{wrongCount}</Text></View>
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
    iconTop: { width: 70, height: 70, resizeMode: 'contain', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3 },
    buttonLabel: { fontSize: 14, fontWeight: 'bold', color: '#007AFF', marginTop: 2 },
    hintBox: { position: 'absolute', top: 120, right: 20, padding: 15, backgroundColor: 'rgba(255,255,255,0.98)', borderRadius: 15, maxWidth: 260, zIndex: 11, elevation: 5, borderWidth: 1, borderColor: '#007AFF' },
    hintTitle: { fontSize: 16, fontWeight: 'bold', color: '#007AFF', marginBottom: 5, textAlign: 'center' },
    hintText: { fontSize: 14, color: '#333', textAlign: 'center' },
    card: { width: '95%', maxWidth: 480, borderRadius: 20, padding: 20, marginTop: 20, alignItems: 'center', alignSelf: 'center' },
    overlayBackground: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 20 },
    questionMain: { fontSize: 22, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 10 },
    subQuestion: { fontSize: 24, color: '#0056b3', textAlign: 'center', marginBottom: 20, fontWeight: '600', lineHeight: 32 },
    testContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', width: '100%' },
    testOption: { width: '42%', margin: '2%', padding: 15, backgroundColor: '#fff', borderRadius: 15, borderWidth: 2, borderColor: '#007AFF', alignItems: 'center' },
    testCorrect: { borderColor: '#28a745', backgroundColor: '#28a745' },
    testError: { borderColor: '#dc3545', backgroundColor: '#dc3545' },
    testOptionText: { fontSize: 20, fontWeight: 'bold', color: '#007AFF' },
    finalInput: { width: 260, height: 60, borderWidth: 2, borderColor: '#ccc', borderRadius: 15, textAlign: 'center', fontSize: 24, backgroundColor: '#fafafa', marginTop: 10, color: '#333' },
    correctFinal: { borderColor: '#28a745', backgroundColor: '#d4edda' },
    errorFinal: { borderColor: '#dc3545', backgroundColor: '#f8d7da' },
    buttonContainer: { marginTop: 25, width: '80%', borderRadius: 10, overflow: 'hidden' },
    result: { fontSize: 18, fontWeight: '700', marginTop: 15, textAlign: 'center' },
    correctText: { color: '#28a745' },
    errorText: { color: '#dc3545' },
    counterTextSmall: { fontSize: Math.max(12, screenWidth * 0.035), fontWeight: '400', color: '#555', textAlign: 'center', marginTop: 10 },
    iconsBottom: { position: 'absolute', bottom: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' },
    iconSame: { width: combinedIconSize, height: combinedIconSize, resizeMode: 'contain', marginHorizontal: 10 },
    counterTextIcons: { fontSize: Math.max(14, combinedIconSize * 0.28), marginHorizontal: 8, textAlign: 'center', color: '#333' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    drawingContainer: { width: '95%', height: '85%', backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden' },
    drawingHeader: { height: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, backgroundColor: '#f0f0f0', borderBottomWidth: 1, borderBottomColor: '#ccc' },
    drawingTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    headerButton: { padding: 5, justifyContent: 'center', alignItems: 'center' },
    headerButtonText: { fontSize: 16, color: '#007AFF' },
    problemPreviewContainer: { backgroundColor: '#f9f9f9', padding: 10, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee', width: '100%' },
    problemPreviewLabel: { fontSize: 12, color: '#777', textTransform: 'uppercase', marginBottom: 4 },
    problemPreviewTextSmall: { fontSize: 16, fontWeight: '600', color: '#007AFF', textAlign: 'center' },
    canvas: { flex: 1, backgroundColor: '#ffffff' },
});

export default LengthUnitsTrainer;