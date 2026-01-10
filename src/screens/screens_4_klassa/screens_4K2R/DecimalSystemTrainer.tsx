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
import { useNavigation } from '@react-navigation/native'; // Dodane dla nawigacji

import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { awardXpAndCoins } from '../../../services/xpService';

const EXERCISE_ID = "decimalSystemTrainer_cl4";
const TASKS_LIMIT = 40;

const { width: screenWidth } = Dimensions.get('window');
const isSmallDevice = screenWidth < 380;
const combinedIconSize = screenWidth * 0.25;

// --- LOGIKA POLSKICH LICZEBNIKÓW ---
const units = ["", "jeden", "dwa", "trzy", "cztery", "pięć", "sześć", "siedem", "osiem", "dziewięć"];
const teens = ["dziesięć", "jedenaście", "dwanaście", "trzynaście", "czternaście", "piętnaście", "szesnaście", "siedemnaście", "osiemnaście", "dziewiętnaście"];
const tens = ["", "dziesięć", "dwadzieścia", "trzydzieści", "czterdzieści", "pięćdziesiąt", "sześćdziesiąt", "siedemdziesiąt", "osiemdziesiąt", "dziewięćdziesiąt"];
const hundreds = ["", "sto", "dwieście", "trzysta", "czterysta", "pięćset", "sześćset", "siedemset", "osiemset", "dziewięćset"];

const PLACE_NAMES_PL = [
    "Jedności", "Dziesiątki", "Setki", "Tysiące", "Dziesiątki tys.", "Setki tys.",
    "Miliony", "Dziesiątki mln", "Setki mln", "Miliardy", "Dziesiątki mld", "Setki mld", "Biliony"
];

const convertThreeDigits = (n: number) => {
    if (n === 0) return "";
    let w = [];
    const h = Math.floor(n / 100);
    const te = Math.floor((n % 100) / 10);
    const u = n % 10;
    if (h > 0) w.push(hundreds[h]);
    if (te === 1) { w.push(teens[u]); }
    else { if (te > 0) w.push(tens[te]); if (u > 0) w.push(units[u]); }
    return w.join(" ");
};

const getInflection = (n: number, forms: string[]) => {
    if (n === 1) return forms[0];
    const tens = n % 100;
    const units = n % 10;
    if (tens >= 12 && tens <= 14) return forms[2];
    if (units >= 2 && units <= 4) return forms[1];
    return forms[2];
};

const numberToWordsPL = (num: number): string => {
    if (num === 0) return "zero";
    let temp = num;
    const scales = [
        { val: 1000000000, forms: ["miliard", "miliardy", "miliardów"] },
        { val: 1000000, forms: ["milion", "miliony", "milionów"] },
        { val: 1000, forms: ["tysiąc", "tysiące", "tysięcy"] },
        { val: 1, forms: ["", "", ""] }
    ];
    let words = [];
    for (let scale of scales) {
        if (temp >= scale.val) {
            const currentChunk = Math.floor(temp / scale.val);
            temp %= scale.val;
            if (currentChunk > 0) {
                const chunkText = convertThreeDigits(currentChunk);
                if (scale.val > 1) {
                    if (currentChunk === 1) words.push(scale.forms[0]);
                    else { words.push(chunkText); words.push(getInflection(currentChunk, scale.forms)); }
                } else { words.push(chunkText); }
            }
        }
    }
    return words.join(" ").trim().replace(/\s+/g, ' ');
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

const DecimalSystemTrainer = () => {
    const navigation = useNavigation(); // Dodane
    const [taskType, setTaskType] = useState('wordsToDigits');
    const [questionText, setQuestionText] = useState('');
    const [subQuestionText, setSubQuestionText] = useState('');
    const [displayNumber, setDisplayNumber] = useState<string | null>(null);
    const [highlightIndex, setHighlightIndex] = useState<number | null>(null);
    const [correctAnswer, setCorrectAnswer] = useState('');
    const [options, setOptions] = useState<string[]>([]);
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

    // Nowe stany raportu
    const [showMilestone, setShowMilestone] = useState(false);
    const [sessionCorrect, setSessionCorrect] = useState(0);

    const backgroundColor = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const k1 = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
        const k2 = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
        nextTask();
        return () => { k1.remove(); k2.remove(); };
    }, []);

    const generateMixedNumber = (): number => {
        const r = Math.random();
        if (r < 0.3) return Math.floor(Math.random() * 99000) + 1000;
        const getChunk = () => {
            const rnd = Math.random();
            if (rnd < 0.3) return Math.floor(Math.random() * 10);
            if (rnd < 0.6) return Math.floor(Math.random() * 100);
            return Math.floor(Math.random() * 1000);
        };
        const r2 = Math.random();
        if (r2 < 0.2) return (Math.floor(Math.random() * 900) + 1) * 1000 + getChunk();
        else if (r2 < 0.7) {
            const millions = Math.floor(Math.random() * 100) + 1;
            return millions * 1000000 + getChunk() * 1000 + getChunk();
        } else {
            const billions = Math.floor(Math.random() * 9) + 1;
            return billions * 1000000000 + getChunk() * 1000000 + getChunk() * 1000 + getChunk();
        }
    };

    const nextTask = () => {
        // Blokada co 10 zadań
        if (taskCount > 0 && taskCount % 10 === 0 && !showMilestone) {
            setShowMilestone(true);
            return;
        }

        if (taskCount >= TASKS_LIMIT) {
            setMessage(`Gratulacje! 🎉 Ukończyłeś ${TASKS_LIMIT} zadań.`);
            setReadyForNext(false);
            return;
        }

        const rand = Math.random();
        let type = 'wordsToDigits';
        if (rand < 0.25) type = 'wordsToDigits';
        else if (rand < 0.45) type = 'valueCheck';
        else if (rand < 0.70) type = 'placeNameCheck';
        else if (rand < 0.85) type = 'construction';
        else type = 'logicPuzzle';

        setTaskType(type);
        generateProblem(type);
        setUserInput(''); setIsCorrect(null); setMessage(''); setReadyForNext(false);
        setFirstAttempt(true); setShowHint(false); setTaskCount(prev => prev + 1);
        backgroundColor.setValue(0);
    };

    const generateProblem = (type: string) => {
        let qText = ''; let sText = ''; let ans = ''; let hint = '';
        let dNum: string | null = null; let hIdx: number | null = null;
        let currentOptions: string[] = [];
        const num = generateMixedNumber();

        if (type === 'wordsToDigits') {
            const words = numberToWordsPL(num);
            qText = "Zapisz cyframi liczbę:"; sText = words; ans = num.toString();
            hint = "Pamiętaj o zerach. Np. 'dwa tysiące pięć' to 2005.";
        } else if (type === 'valueCheck') {
            const numStr = num.toString();
            let indices = [];
            for(let i=0; i<numStr.length; i++) if(numStr[i] !== '0') indices.push(i);
            const idx = indices[Math.floor(Math.random() * indices.length)];
            const digit = parseInt(numStr[idx]);
            const power = numStr.length - 1 - idx;
            dNum = numStr; hIdx = idx; qText = "Ile warta jest wyróżniona cyfra?";
            sText = "Zapisz pełną wartość"; ans = (digit * Math.pow(10, power)).toString();
            hint = `Dopisz do cyfry ${digit} tyle zer, ile cyfr stoi za nią.`;
        } else if (type === 'placeNameCheck') {
            const numStr = num.toString();
            const idx = Math.floor(Math.random() * numStr.length);
            dNum = numStr; hIdx = idx; const power = numStr.length - 1 - idx;
            const correctName = PLACE_NAMES_PL[power]; ans = correctName;
            qText = "W jakim rzędzie stoi wyróżniona cyfra?"; sText = "Wybierz poprawną odpowiedź.";
            const distractors = PLACE_NAMES_PL.filter(n => n !== correctName).sort(() => 0.5 - Math.random()).slice(0, 3);
            currentOptions = [...distractors, correctName].sort(() => 0.5 - Math.random());
            hint = "Policz miejsca od końca: Jedności, Dziesiątki, Setki, Tysiące...";
        } else if (type === 'construction') {
            const chunks = [
                { val: Math.floor(num / 1000000000), name: "mld" },
                { val: Math.floor((num % 1000000000) / 1000000), name: "mln" },
                { val: Math.floor((num % 1000000) / 1000), name: "tys" },
                { val: num % 1000, name: "jedności" }
            ];
            let puzzleParts = chunks.filter(c => c.val > 0).map(c => `${c.val} ${c.name}`);
            qText = "Jaka to liczba?"; sText = puzzleParts.join(", \n") + "."; ans = num.toString();
            hint = "Sklej liczbę pamiętając o odpowiedniej liczbie zer w rzędach.";
        } else if (type === 'logicPuzzle') {
            const n = Math.floor(Math.random() * 9000) + 100;
            const sum = n.toString().split('').reduce((a, b) => a + parseInt(b), 0);
            qText = `Ile wynosi suma cyfr liczby`; sText = `${n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")}?`; ans = sum.toString();
            hint = `Dodaj do siebie wszystkie cyfry tej liczby.`;
        }

        setQuestionText(qText); setSubQuestionText(sText); setCorrectAnswer(ans);
        setHintText(hint); setDisplayNumber(dNum); setHighlightIndex(hIdx); setOptions(currentOptions);
    };

    const handleCheck = () => {
        Keyboard.dismiss();
        if (!userInput.trim()) { setMessage('Wybierz lub wpisz odpowiedź!'); return; }
        const isOk = userInput.trim().replace(/\s/g, '') === correctAnswer.trim().replace(/\s/g, '');
        setIsCorrect(isOk);

        if (isOk) {
            Animated.timing(backgroundColor, { toValue: 1, duration: 500, useNativeDriver: false }).start();
            setCorrectCount(prev => prev + 1);
            setSessionCorrect(prev => prev + 1);
            setMessage('Świetnie! ✅'); setReadyForNext(true); setShowHint(false);
            InteractionManager.runAfterInteractions(() => {
                awardXpAndCoins(5, 1);
                const currentUser = auth().currentUser;
                if (currentUser) {
                    firestore().collection('users').doc(currentUser.uid).collection('exerciseStats').doc(EXERCISE_ID)
                        .set({ totalCorrect: firestore.FieldValue.increment(1) }, { merge: true }).catch(console.error);
                }
            });
        } else {
            Animated.timing(backgroundColor, { toValue: -1, duration: 500, useNativeDriver: false }).start();
            if (firstAttempt) { setMessage('Błąd. Spróbuj jeszcze raz.'); setFirstAttempt(false); }
            else { setMessage(`Prawidłowa odpowiedź: ${correctAnswer}`); setReadyForNext(true); }
            setWrongCount(prev => prev + 1);
        }
    };

    const bgInterpolation = backgroundColor.interpolate({
        inputRange: [-1, 0, 1],
        outputRange: ['rgba(255, 0, 0, 0.2)', 'rgba(255, 255, 255, 0)', 'rgba(0, 255, 0, 0.2)']
    });

    const renderHighlightedNumber = () => {
        if (!displayNumber || highlightIndex === null) return null;
        return (
            <View style={styles.numberDisplayRow}>
                {displayNumber.split('').map((digit, index) => {
                    const posFromEnd = displayNumber.length - index;
                    const addSpace = (posFromEnd % 3 === 0) && (posFromEnd !== displayNumber.length);
                    return (
                        <Text key={index} style={[styles.numberDigit, addSpace ? { marginLeft: 10 } : { marginLeft: 2 }, index === highlightIndex ? styles.highlightedDigit : null]}>
                            {digit}
                        </Text>
                    );
                })}
            </View>
        );
    };

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

                    <DrawingModal visible={showScratchpad} onClose={() => setShowScratchpad(false)} problemText={questionText + " " + subQuestionText} />

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
                                    <TouchableOpacity style={[styles.mButton, { backgroundColor: '#28a745' }]} onPress={() => { setShowMilestone(false); setSessionCorrect(0); nextTask(); }}><Text style={styles.mButtonText}>Kontynuuj</Text></TouchableOpacity>
                                    <TouchableOpacity style={[styles.mButton, { backgroundColor: '#007AFF' }]} onPress={() => { setShowMilestone(false); navigation.goBack(); }}><Text style={styles.mButtonText}>Inny temat</Text></TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>

                    <ScrollView contentContainerStyle={styles.centerContent} keyboardShouldPersistTaps="handled">
                        <View style={styles.card}>
                            <View style={styles.overlayBackground} />
                            <Text style={styles.questionMain}>{questionText}</Text>
                            {(taskType === 'valueCheck' || taskType === 'placeNameCheck') ? renderHighlightedNumber() : <Text style={styles.subQuestion}>{subQuestionText}</Text>}

                            {taskType === 'placeNameCheck' ? (
                                <View style={styles.optionsContainer}>
                                    {options.map((opt, idx) => (
                                        <TouchableOpacity key={idx} onPress={() => !readyForNext && setUserInput(opt)} style={[styles.optionButton, userInput === opt && styles.optionButtonSelected, readyForNext && opt === correctAnswer && styles.optionButtonCorrect]}>
                                            <Text style={[styles.optionText, userInput === opt && { color: '#fff' }]}>{opt}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            ) : (
                                <TextInput style={[styles.finalInput, isCorrect === true && styles.correctFinal, isCorrect === false && styles.errorFinal]} keyboardType="numeric" value={userInput} onChangeText={setUserInput} placeholder="Wpisz wynik" editable={!readyForNext} />
                            )}

                            <View style={styles.buttonContainer}><Button title={readyForNext ? 'Dalej' : 'Sprawdź'} onPress={readyForNext ? nextTask : handleCheck} color="#007AFF" /></View>
                            <Text style={styles.counterTextSmall}>Zadanie: {taskCount} / {TASKS_LIMIT}</Text>
                            {message ? <Text style={[styles.result, message.includes('Świetnie') ? styles.correctText : styles.errorText]}>{message}</Text> : null}
                        </View>
                    </ScrollView>

                    {!isKeyboardVisible && (
                        <View style={styles.iconsBottom}>
                            <Image source={require('../../../assets/happy.png')} style={styles.iconSame} /><Text style={styles.counterTextIcons}>{correctCount}</Text>
                            <Image source={require('../../../assets/sad.png')} style={styles.iconSame} /><Text style={styles.counterTextIcons}>{wrongCount}</Text>
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
    buttonLabel: { fontSize: 14, fontWeight: 'bold', color: '#007AFF', marginTop: 2 },
    hintBox: { position: 'absolute', top: 120, right: 20, padding: 15, backgroundColor: 'rgba(255,255,255,0.98)', borderRadius: 15, maxWidth: 260, zIndex: 11, elevation: 5, borderWidth: 1, borderColor: '#007AFF' },
    hintTitle: { fontSize: 16, fontWeight: 'bold', color: '#007AFF', marginBottom: 5, textAlign: 'center' },
    hintText: { fontSize: 14, color: '#333', textAlign: 'center' },
    card: { width: '95%', maxWidth: 480, borderRadius: 20, padding: 20, alignItems: 'center', marginTop: 20, alignSelf: 'center' },
    overlayBackground: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 20 },
    questionMain: { fontSize: 22, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 10 },
    subQuestion: { fontSize: 24, color: '#0056b3', textAlign: 'center', marginBottom: 20, fontWeight: '600' },
    numberDisplayRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20 },
    numberDigit: { fontSize: 32, fontWeight: 'bold', color: '#333' },
    highlightedDigit: { color: '#FF3B30' },
    finalInput: { width: 260, height: 60, borderWidth: 2, borderColor: '#ccc', borderRadius: 15, textAlign: 'center', fontSize: 24, backgroundColor: '#fafafa', marginTop: 10, color: '#333' },
    correctFinal: { borderColor: '#28a745', backgroundColor: '#d4edda' },
    errorFinal: { borderColor: '#dc3545', backgroundColor: '#f8d7da' },
    buttonContainer: { marginTop: 25, width: '80%', borderRadius: 10, overflow: 'hidden' },
    result: { fontSize: 18, fontWeight: '700', marginTop: 15, textAlign: 'center' },
    correctText: { color: '#28a745' },
    errorText: { color: '#dc3545' },
    counterTextSmall: { fontSize: 14, color: '#555', textAlign: 'center', marginTop: 10 },
    iconsBottom: { position: 'absolute', bottom: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' },
    iconSame: { width: combinedIconSize, height: combinedIconSize, resizeMode: 'contain' },
    counterTextIcons: { fontSize: 20, marginHorizontal: 8, color: '#333' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    drawingContainer: { width: '95%', height: '85%', backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden' },
    drawingHeader: { height: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, backgroundColor: '#f0f0f0' },
    drawingTitle: { fontSize: 18, fontWeight: 'bold' },
    headerButton: { padding: 5 },
    headerButtonText: { fontSize: 16, color: '#007AFF' },
    problemPreviewContainer: { backgroundColor: '#f9f9f9', padding: 10, alignItems: 'center' },
    problemPreviewLabel: { fontSize: 12, color: '#777' },
    problemPreviewTextSmall: { fontSize: 16, color: '#007AFF' },
    canvas: { flex: 1, backgroundColor: '#ffffff' },
    optionsContainer: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', marginVertical: 10 },
    optionButton: { width: '45%', paddingVertical: 12, marginVertical: 6, backgroundColor: '#fff', borderWidth: 2, borderColor: '#007AFF', borderRadius: 12, alignItems: 'center' },
    optionButtonSelected: { backgroundColor: '#007AFF' },
    optionButtonCorrect: { backgroundColor: '#28a745', borderColor: '#28a745' },
    optionText: { fontSize: 16, fontWeight: '600' },
    milestoneCard: { width: '90%', backgroundColor: '#fff', borderRadius: 20, padding: 25, alignItems: 'center', elevation: 10 },
    milestoneTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 15 },
    statsRow: { marginVertical: 10, alignItems: 'center', backgroundColor: '#f8f9fa', padding: 15, borderRadius: 15, width: '100%' },
    statsText: { fontSize: 18, color: '#333', fontWeight: 'bold' },
    suggestionText: { fontSize: 15, color: '#666', textAlign: 'center', marginVertical: 20 },
    milestoneButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
    mButton: { paddingVertical: 12, paddingHorizontal: 15, borderRadius: 12, width: '48%', alignItems: 'center' },
    mButtonText: { color: '#fff', fontWeight: 'bold' }
});

export default DecimalSystemTrainer;