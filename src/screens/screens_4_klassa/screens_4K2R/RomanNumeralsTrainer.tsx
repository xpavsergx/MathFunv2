import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TextInput, Button, Keyboard, ImageBackground,
    Animated, StatusBar, Image, Dimensions, TouchableOpacity, Modal,
    Platform, KeyboardAvoidingView, TouchableWithoutFeedback, ScrollView, InteractionManager
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { awardXpAndCoins } from '../../../services/xpService';

const EXERCISE_ID = "romanNumeralsTrainer_v5";
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

const RomanNumeralsTrainer = () => {
    const [questionText, setQuestionText] = useState('');
    const [subQuestionText, setSubQuestionText] = useState('');
    const [correctAnswer, setCorrectAnswer] = useState('');
    const [options, setOptions] = useState<string[]>([]);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [userInput, setUserInput] = useState('');
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
    const [isInputWrong, setIsInputWrong] = useState<boolean | null>(null);

    const [usedTasks, setUsedTasks] = useState<Set<string>>(new Set());
    const backgroundColor = useRef(new Animated.Value(0)).current;

    const romanMap = [
        { v: 1000, r: "M" }, { v: 900, r: "CM" }, { v: 500, r: "D" }, { v: 400, r: "CD" },
        { v: 100, r: "C" }, { v: 90, r: "XC" }, { v: 50, r: "L" }, { v: 40, r: "XL" },
        { v: 10, r: "X" }, { v: 9, r: "IX" }, { v: 5, r: "V" }, { v: 4, r: "IV" }, { v: 1, r: "I" }
    ];

    const toRoman = (num: number) => {
        let res = "";
        let temp = num;
        for (let i = 0; i < romanMap.length; i++) {
            while (temp >= romanMap[i].v) {
                res += romanMap[i].r;
                temp -= romanMap[i].v;
            }
        }
        return res;
    };

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
            // ИСПРАВЛЕННАЯ ЛОГИКА ВЕСОВ:
            const rangeRoll = Math.random();
            let val;
            if (rangeRoll < 0.6) {
                // 60% — Маленькие числа (1-100)
                val = Math.floor(Math.random() * 99) + 1;
            } else if (rangeRoll < 0.9) {
                // 30% — Трехзначные числа (100-1000)
                val = Math.floor(Math.random() * 900) + 100;
            } else {
                // 10% — Четырехзначные числа (1000-3000)
                val = Math.floor(Math.random() * 2000) + 1000;
            }

            const type = Math.random();
            let q = ''; let sub = ''; let ans = ''; let hint = ''; let opts: string[] = [];

            if (type < 0.5) { // ROMAN -> ARABIC
                const roman = toRoman(val);
                ans = val.toString();
                q = 'Zapisz liczbę w systemie dziesiątkowym:';
                sub = `${roman} = ...`;

                let specials = [];
                if (roman.includes('CM')) specials.push('CM (900)');
                if (roman.includes('CD')) specials.push('CD (400)');
                if (roman.includes('XC')) specials.push('XC (90)');
                if (roman.includes('XL')) specials.push('XL (40)');
                if (roman.includes('IX')) specials.push('IX (9)');
                if (roman.includes('IV')) specials.push('IV (4)');

                hint = specials.length > 0
                    ? `Pamiętaj о tych parach: ${specials.join(', ')}.`
                    : `Wartości znaków: I(1), V(5), X(10), L(50), C(100), D(500), M(1000).`;

                if (Math.random() < 0.4) {
                    q = 'Wybierz poprawną liczbę:';
                    const s = new Set<string>();
                    s.add(ans);
                    while (s.size < 4) {
                        const fake = (val + (Math.random() > 0.5 ? 1 : 10) * (Math.floor(Math.random() * 3) + 1)).toString();
                        if (parseInt(fake) > 0) s.add(fake);
                    }
                    opts = Array.from(s).sort(() => Math.random() - 0.5);
                }
                id = `r2a-${val}`;
            } else { // ARABIC -> ROMAN
                ans = toRoman(val);
                q = 'Zapisz liczbę w systemie rzymskim:';
                sub = `${val} = ...`;
                hint = "I (1), V (5), X (10), L (50)\nC (100), D (500), M (1000)\n\nXL (40), XC (90), CD (400), CM (900)";

                if (Math.random() < 0.4) {
                    q = 'Wybierz poprawny zapis rzymski:';
                    const s = new Set<string>();
                    s.add(ans);
                    while (s.size < 4) {
                        s.add(toRoman(val + (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * 2) + 1)));
                    }
                    opts = Array.from(s).sort(() => Math.random() - 0.5);
                }
                id = `a2r-${val}`;
            }

            if (!usedTasks.has(id)) {
                finalData = { q, sub, ans, hint, opts };
                setUsedTasks(prev => new Set(prev).add(id));
                break;
            }
        }
        setQuestionText(finalData.q); setSubQuestionText(finalData.sub);
        setCorrectAnswer(finalData.ans); setHintText(finalData.hint);
        setOptions(finalData.opts); setSelectedOption(null); setIsInputWrong(null);
    };

    const handleCheck = (selectedVal?: string) => {
        const val = (selectedVal || userInput).trim().toUpperCase();
        if (selectedVal) setSelectedOption(selectedVal);
        if (!val) { setMessage('Wpisz odpowiedź!'); return; }

        const isOk = val === correctAnswer.toUpperCase();
        setIsInputWrong(!isOk);

        if (isOk) {
            Animated.timing(backgroundColor, { toValue: 1, duration: 500, useNativeDriver: false }).start();
            setCorrectCount(prev => prev + 1); setMessage('Świetnie! ✅'); setReadyForNext(true);
            setIsCorrect(true);
            InteractionManager.runAfterInteractions(() => { awardXpAndCoins(5, 1); });
        } else {
            Animated.timing(backgroundColor, { toValue: -1, duration: 500, useNativeDriver: false }).start();
            setIsCorrect(false);
            if (!selectedVal) setUserInput('');
            if (firstAttempt) { setMessage('Błąd. Spróbuj jeszcze raz.'); setFirstAttempt(false); }
            else { setMessage(`Poprawny wynik: ${correctAnswer}`); setReadyForNext(true); }
            setWrongCount(prev => prev + 1);
        }
    };

    const nextTask = () => {
        if (taskCount >= TASKS_LIMIT) { setMessage('Koniec! 🏆'); return; }
        generateProblem();
        setUserInput(''); setIsCorrect(null); setMessage('');
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
                                        const showGreen = (readyForNext && isCorrectOpt) || (isCorrect && isThisSelected && isCorrectOpt);
                                        const showRed = isInputWrong && isThisSelected;
                                        return (
                                            <TouchableOpacity key={index} style={[styles.testOption, showGreen && styles.testCorrect, showRed && styles.testError]} onPress={() => !readyForNext && handleCheck(opt)}>
                                                <Text style={[styles.testOptionText, (showGreen || showRed) && {color: '#fff'}]}>{opt}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            ) : (
                                <View style={{ width: '100%', alignItems: 'center' }}>
                                    <TextInput
                                        style={[styles.finalInput, isCorrect === true && styles.correctFinal, isInputWrong && styles.errorFinal]}
                                        autoCapitalize="characters" value={userInput} onChangeText={setUserInput} editable={!readyForNext} placeholder="?"
                                    />
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
    hintText: { fontSize: 14, color: '#333', textAlign: 'center', lineHeight: 20 },
    card: { width: '95%', maxWidth: 480, borderRadius: 20, padding: 20, marginTop: 20, alignItems: 'center', alignSelf: 'center' },
    overlayBackground: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 20 },
    questionMain: { fontSize: 20, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 10 },
    subQuestion: { fontSize: 28, color: '#0056b3', textAlign: 'center', marginBottom: 20, fontWeight: 'bold', letterSpacing: 2 },
    testContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', width: '100%' },
    testOption: { width: '42%', margin: '2%', padding: 15, backgroundColor: '#fff', borderRadius: 15, borderWidth: 2, borderColor: '#007AFF', alignItems: 'center' },
    testCorrect: { borderColor: '#28a745', backgroundColor: '#28a745' },
    testError: { borderColor: '#dc3545', backgroundColor: '#dc3545' },
    testOptionText: { fontSize: 20, fontWeight: 'bold', color: '#007AFF' },
    finalInput: { width: '80%', height: 60, borderWidth: 2, borderColor: '#ccc', borderRadius: 15, textAlign: 'center', fontSize: 26, backgroundColor: '#fafafa', marginTop: 10, color: '#333', fontWeight: 'bold' },
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

export default RomanNumeralsTrainer;