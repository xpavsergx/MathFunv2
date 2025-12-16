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

import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
// Upewnij się, że ścieżka do xpService jest poprawna
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

// Definicja nazw rzędów (globalna, aby uniknąć błędów przy renderowaniu)
const PLACE_NAMES_PL = [
    "Jedności",            // 10^0
    "Dziesiątki",          // 10^1
    "Setki",               // 10^2
    "Tysiące",             // 10^3
    "Dziesiątki tys.",     // 10^4
    "Setki tys.",          // 10^5
    "Miliony",             // 10^6
    "Dziesiątki mln",      // 10^7
    "Setki mln",           // 10^8
    "Miliardy",            // 10^9
    "Dziesiątki mld",      // 10^10
    "Setki mld",           // 10^11
    "Biliony"              // 10^12 (na wszelki wypadek)
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

// --- DRAWING COMPONENT ---
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
    // --- STATE ---
    const [taskType, setTaskType] = useState('wordsToDigits');

    const [questionText, setQuestionText] = useState('');
    const [subQuestionText, setSubQuestionText] = useState('');
    const [displayNumber, setDisplayNumber] = useState<string | null>(null);
    const [highlightIndex, setHighlightIndex] = useState<number | null>(null);
    const [correctAnswer, setCorrectAnswer] = useState('');

    // Opcje dla zadań wyboru
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

    const backgroundColor = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const k1 = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
        const k2 = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
        nextTask();
        return () => { k1.remove(); k2.remove(); };
    }, []);

    // --- GENERATOR LICZB (MIESZANY) ---
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
        if (r2 < 0.2) {
            return (Math.floor(Math.random() * 900) + 1) * 1000 + getChunk();
        } else if (r2 < 0.7) {
            const millions = Math.floor(Math.random() * 100) + 1;
            const thousands = Math.random() > 0.4 ? getChunk() : 0;
            const rest = getChunk();
            return millions * 1000000 + thousands * 1000 + rest;
        } else {
            const billions = Math.floor(Math.random() * 9) + 1;
            const millions = Math.random() > 0.3 ? getChunk() : 0;
            const thousands = Math.random() > 0.3 ? getChunk() : 0;
            const rest = getChunk();
            return billions * 1000000000 + millions * 1000000 + thousands * 1000 + rest;
        }
    };

    const nextTask = () => {
        if (taskCount >= TASKS_LIMIT) {
            setMessage(`Gratulacje! 🎉 Ukończyłeś ${TASKS_LIMIT} zadań.`);
            setReadyForNext(false);
            return;
        }

        const rand = Math.random();
        let type = 'wordsToDigits';

        // Rozkład typów zadań
        if (rand < 0.25) type = 'wordsToDigits';
        else if (rand < 0.45) type = 'valueCheck';
        else if (rand < 0.70) type = 'placeNameCheck';
        else if (rand < 0.85) type = 'construction';
        else type = 'logicPuzzle';

        setTaskType(type);
        generateProblem(type); // Generuje problem i ustawia opcje

        setUserInput('');
        setIsCorrect(null);
        setMessage('');
        setReadyForNext(false);
        setFirstAttempt(true);
        setShowHint(false);
        setTaskCount(prev => prev + 1);
        backgroundColor.setValue(0);
    };

    const generateProblem = (type: string) => {
        let qText = '';
        let sText = '';
        let ans = '';
        let hint = '';
        let dNum: string | null = null;
        let hIdx: number | null = null;
        let currentOptions: string[] = []; // Domyślnie pusta tablica

        const num = generateMixedNumber();

        if (type === 'wordsToDigits') {
            const words = numberToWordsPL(num);
            qText = "Zapisz cyframi liczbę:";
            sText = words;
            ans = num.toString().replace(/\s/g, '');
            hint = "Pamiętaj o zerach. Np. 'dwa tysiące pięć' to 2005.";

        } else if (type === 'valueCheck') {
            const numStr = num.toString();
            let indices = [];
            for(let i=0; i<numStr.length; i++) if(numStr[i] !== '0') indices.push(i);
            if(indices.length === 0) indices.push(numStr.length-1);

            const idx = indices[Math.floor(Math.random() * indices.length)];
            const digit = parseInt(numStr[idx]);
            const power = numStr.length - 1 - idx;
            const value = digit * Math.pow(10, power);

            dNum = numStr;
            hIdx = idx;

            qText = "Ile warta jest wyróżniona cyfra?";
            sText = "Zapisz pełną wartość (np. 5000)";
            ans = value.toString();
            hint = `Dopisz do cyfry ${digit} tyle zer, ile cyfr stoi za nią.`;

        } else if (type === 'placeNameCheck') {
            // --- ZADANIE Z PRZYCISKAMI ---
            const numStr = num.toString();
            const idx = Math.floor(Math.random() * numStr.length);

            dNum = numStr;
            hIdx = idx;
            const power = numStr.length - 1 - idx;

            // Zabezpieczenie przed undefined
            const correctName = PLACE_NAMES_PL[power] || "Bardzo duża liczba";
            ans = correctName;

            qText = "W jakim rzędzie stoi wyróżniona cyfra?";
            sText = "Wybierz poprawną odpowiedź.";

            // Filtrujemy, żeby nie było duplikatów
            const distractors = PLACE_NAMES_PL.filter(n => n !== correctName && n !== undefined);
            const shuffledDistractors = distractors.sort(() => 0.5 - Math.random()).slice(0, 3);
            const allOpts = [...shuffledDistractors, correctName].sort(() => 0.5 - Math.random());

            currentOptions = allOpts;
            hint = "Policz miejsca od końca: Jedności, Dziesiątki, Setki, Tysiące...";

        } else if (type === 'construction') {
            const chunks = [
                { val: Math.floor(num / 1000000000), name: "mld" },
                { val: Math.floor((num % 1000000000) / 1000000), name: "mln" },
                { val: Math.floor((num % 1000000) / 1000), name: "tys" },
                { val: num % 1000, name: "jedności" }
            ];
            let puzzleParts = [];
            for (let chunk of chunks) {
                if (chunk.val > 0) puzzleParts.push(`${chunk.val} ${chunk.name}`);
            }
            qText = "Jaka to liczba?";
            sText = puzzleParts.join(", \n") + ".";
            ans = num.toString();
            hint = "Sklej liczbę pamiętając o zerach.";

        } else if (type === 'logicPuzzle') {
            const puzzleType = Math.random();
            if (puzzleType < 0.4) {
                const totalDigits = Math.floor(Math.random() * 3) + 4;
                const digit1 = Math.floor(Math.random() * 9) + 1;
                const digit2 = Math.floor(Math.random() * 9) + 1;
                const pos1 = 0;
                const pos2 = Math.floor(Math.random() * (totalDigits - 1)) + 1;
                let resultArray = Array(totalDigits).fill(0);
                resultArray[pos1] = digit1;
                resultArray[pos2] = digit2;
                const placeNames = ["jedności", "dziesiątek", "setek", "tysięcy", "dziesiątek tys.", "setek tys.", "milionów"];
                const getPlaceName = (idxFromRight: number) => placeNames[idxFromRight] || "...";
                const pos1Name = getPlaceName(totalDigits - 1 - pos1);
                const pos2Name = getPlaceName(totalDigits - 1 - pos2);
                qText = `Zapisz liczbę ${totalDigits}-cyfrową:`;
                sText = `Cyfra ${pos1Name} to ${digit1}, cyfra ${pos2Name} to ${digit2}, a pozostałe cyfry są zerami.`;
                ans = resultArray.join("");
                hint = `Kolejność rzędów od końca: Jedności, Dziesiątki, Setki, Tysiące... Wstaw ${digit1} i ${digit2} w dobre miejsca.`;
            } else if (puzzleType < 0.7) {
                const digits = Math.floor(Math.random() * 3) + 4;
                const isMax = Math.random() > 0.5;
                const distinct = Math.random() > 0.5;
                if (isMax) {
                    if (distinct) {
                        qText = `Jaka jest największa liczba ${digits}-cyfrowa`;
                        sText = "o różnych cyfrach?";
                        let res = "";
                        for(let i=0; i<digits; i++) res += (9-i);
                        ans = res;
                        hint = "Zacznij od największej cyfry (9) i wypisuj kolejne coraz mniejsze.";
                    } else {
                        qText = `Jaka jest największa liczba ${digits}-cyfrowa?`;
                        sText = "";
                        ans = "9".repeat(digits);
                        hint = "Same dziewiątki.";
                    }
                } else {
                    if (distinct) {
                        qText = `Jaka jest najmniejsza liczba ${digits}-cyfrowa`;
                        sText = "o różnych cyfrach?";
                        let res = "10";
                        for(let i=2; i<digits; i++) res += i;
                        ans = res;
                        hint = "Na początku 1, potem 0, potem 2, 3...";
                    } else {
                        qText = `Jaka jest najmniejsza liczba ${digits}-cyfrowa?`;
                        sText = "";
                        ans = "1" + "0".repeat(digits - 1);
                        hint = "Jedynka i same zera.";
                    }
                }
            } else {
                const n = Math.floor(Math.random() * 9000) + 100;
                const sum = n.toString().split('').reduce((a, b) => a + parseInt(b), 0);
                qText = `Ile wynosi suma cyfr liczby`;
                sText = `${formatNumberWithSpaces(n.toString())}?`;
                ans = sum.toString();
                hint = `Dodaj do siebie wszystkie cyfry tej liczby.`;
            }
        }

        setQuestionText(qText);
        setSubQuestionText(sText);
        setCorrectAnswer(ans);
        setHintText(hint);
        setDisplayNumber(dNum);
        setHighlightIndex(hIdx);
        // Ważne: Zaktualizuj opcje (będą pełne dla placeNameCheck, puste dla innych)
        setOptions(currentOptions);
    };

    const formatNumberWithSpaces = (str: string) => {
        return str.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    };

    const toggleScratchpad = () => setShowScratchpad(prev => !prev);
    const toggleHint = () => setShowHint(prev => !prev);

    const handleCheck = () => {
        Keyboard.dismiss();

        if (!userInput.trim()) {
            setMessage('Wybierz lub wpisz odpowiedź!');
            return;
        }

        const normalizedUser = userInput.trim().replace(/\s/g, '');
        const correct = correctAnswer.trim().replace(/\s/g, '');

        const isOk = normalizedUser === correct;

        setIsCorrect(isOk);

        if (isOk) {
            Animated.timing(backgroundColor, { toValue: 1, duration: 500, useNativeDriver: false }).start();
            setCorrectCount(prev => prev + 1);
            setMessage('Świetnie! ✅');
            setReadyForNext(true);
            setShowHint(false);

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

            if (firstAttempt) {
                setMessage('Błąd. Spróbuj jeszcze raz.');
                // Nie czyścimy inputu jeśli to zadanie na wybór (żeby było widać co się zaznaczyło)
                if (taskType !== 'placeNameCheck') {
                    setUserInput('');
                }
                setFirstAttempt(false);
            } else {
                const formattedAns = formatNumberWithSpaces(correct);
                setMessage(`Prawidłowa odpowiedź: ${formattedAns}`);
                setReadyForNext(true);
            }

            setWrongCount(prev => prev + 1);
            InteractionManager.runAfterInteractions(() => {
                const currentUser = auth().currentUser;
                if (currentUser) {
                    firestore().collection('users').doc(currentUser.uid).collection('exerciseStats').doc(EXERCISE_ID)
                        .set({ totalWrong: firestore.FieldValue.increment(1) }, { merge: true }).catch(console.error);
                }
            });
        }
    };

    const getFieldStyle = () => {
        if (isCorrect === null) return styles.finalInput;
        return isCorrect ? styles.correctFinal : styles.errorFinal;
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
                        <Text key={index} style={[
                            styles.numberDigit,
                            addSpace ? { marginLeft: 10 } : { marginLeft: 2 },
                            index === highlightIndex ? styles.highlightedDigit : null
                        ]}>
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
                            <TouchableOpacity onPress={toggleScratchpad} style={styles.topBtnItem}>
                                <Image source={require('../../../assets/pencil.png')} style={styles.iconTop} />
                                <Text style={styles.buttonLabel}>Brudnopis</Text>
                            </TouchableOpacity>
                            <View style={styles.topBtnItem}>
                                <TouchableOpacity onPress={toggleHint}>
                                    <Image source={require('../../../assets/question.png')} style={styles.iconTop} />
                                </TouchableOpacity>
                                <Text style={styles.buttonLabel}>Pomoc</Text>
                            </View>
                        </View>
                    )}

                    {showHint && !isKeyboardVisible && (
                        <View style={styles.hintBox}>
                            <Text style={styles.hintTitle}>Podpowiedź:</Text>
                            <Text style={styles.hintText}>{hintText}</Text>
                        </View>
                    )}

                    <DrawingModal visible={showScratchpad} onClose={toggleScratchpad} problemText={questionText + " " + subQuestionText} />

                    <ScrollView contentContainerStyle={styles.centerContent} keyboardShouldPersistTaps="handled">
                        <View style={styles.card}>
                            <View style={styles.overlayBackground} />



                            <Text style={styles.questionMain}>{questionText}</Text>

                            {(taskType === 'valueCheck' || taskType === 'placeNameCheck') ? (
                                renderHighlightedNumber()
                            ) : (
                                <Text style={styles.subQuestion}>{subQuestionText}</Text>
                            )}

                            {taskType === 'valueCheck' && (
                                <Text style={styles.helperText}>{subQuestionText}</Text>
                            )}

                            {taskType === 'construction' && (
                                <View style={styles.placeValueHint}><Text style={styles.pvText}>Mld .. Mln .. Tys .. Jed</Text></View>
                            )}

                            {/* --- WARUNEK RENDEROWANIA PÓL --- */}
                            {taskType === 'placeNameCheck' ? (
                                <View key={'options-' + taskCount} style={styles.optionsContainer}>
                                    {options.length > 0 ? options.map((opt, idx) => {
                                        const isSelected = userInput === opt;
                                        return (
                                            <TouchableOpacity
                                                key={idx}
                                                onPress={() => !readyForNext && setUserInput(opt)}
                                                style={[
                                                    styles.optionButton,
                                                    isSelected && styles.optionButtonSelected,
                                                    readyForNext && opt === correctAnswer && styles.optionButtonCorrect,
                                                    readyForNext && isSelected && opt !== correctAnswer && styles.optionButtonWrong
                                                ]}
                                                disabled={readyForNext}
                                            >
                                                <Text style={[styles.optionText, isSelected && { color: '#fff' }]}>{opt}</Text>
                                            </TouchableOpacity>
                                        );
                                    }) : (
                                        // Fallback na wypadek błędu ładowania (chociaż nie powinien wystąpić)
                                        <Text>Ładowanie opcji...</Text>
                                    )}
                                </View>
                            ) : (
                                <TextInput
                                    key={'input-' + taskCount} // KLUCZOWE: Wymusza odświeżenie inputu przy zmianie zadania
                                    style={getFieldStyle()}
                                    keyboardType="numeric"
                                    value={userInput}
                                    onChangeText={setUserInput}
                                    placeholder="Wpisz wynik"
                                    placeholderTextColor="#aaa"
                                    editable={!readyForNext}
                                />
                            )}

                            <View style={styles.buttonContainer}>
                                <Button title={readyForNext ? 'Dalej' : 'Sprawdź'} onPress={readyForNext ? nextTask : handleCheck} color="#007AFF" />
                            </View>

                            <Text style={styles.counterTextSmall}>
                                Zadanie: {taskCount > TASKS_LIMIT ? TASKS_LIMIT : taskCount} / {TASKS_LIMIT}
                            </Text>

                            {message ? <Text style={[styles.result, message.includes('Świetnie') ? styles.correctText : styles.errorText]}>{message}</Text> : null}
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

const styles = StyleSheet.create({
    keyboardContainer: { flex: 1, justifyContent: 'center' },
    centerContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 20 },
    topButtons: { position: 'absolute', top: 40, right: 20, flexDirection: 'row', alignItems: 'center', zIndex: 10 },
    topBtnItem: { alignItems: 'center', marginLeft: 15 },
    iconTop: { width: 70, height: 70, resizeMode: 'contain', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3 },
    buttonLabel: { fontSize: 14, fontWeight: 'bold', color: '#007AFF', marginTop: 2, textShadowColor: 'rgba(255, 255, 255, 0.8)', textShadowRadius: 3 },
    hintBox: { position: 'absolute', top: 120, right: 20, padding: 15, backgroundColor: 'rgba(255,255,255,0.98)', borderRadius: 15, maxWidth: 260, zIndex: 11, elevation: 5, borderWidth: 1, borderColor: '#007AFF' },
    hintTitle: { fontSize: 16, fontWeight: 'bold', color: '#007AFF', marginBottom: 5, textAlign: 'center' },
    hintText: { fontSize: 14, color: '#333', lineHeight: 20, textAlign: 'center' },
    card: { width: '95%', maxWidth: 480, borderRadius: 20, padding: 20, alignItems: 'center', marginTop: 20, alignSelf: 'center' },
    overlayBackground: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 20 },
    taskLabel: { fontSize: 18, fontWeight: '700', marginBottom: 15, color: '#007AFF', textAlign: 'center', textTransform: 'uppercase' },
    questionMain: { fontSize: 22, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 10 },
    subQuestion: { fontSize: 24, color: '#0056b3', textAlign: 'center', marginBottom: 20, fontWeight: '600', lineHeight: 32 },
    helperText: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 10 },
    numberDisplayRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20, flexWrap: 'wrap' },
    numberDigit: { fontSize: 32, fontWeight: 'bold', color: '#333' },
    highlightedDigit: { color: '#FF3B30', transform: [{ scale: 1.3 }] },
    placeValueHint: { flexDirection: 'row', justifyContent: 'center', width: '100%', marginBottom: 15, opacity: 0.6 },
    pvText: { fontSize: 16, fontWeight: 'bold', color: '#777', letterSpacing: 2 },
    finalInput: { width: 260, height: 60, borderWidth: 2, borderColor: '#ccc', borderRadius: 15, textAlign: 'center', fontSize: 24, backgroundColor: '#fafafa', marginTop: 10, color: '#333' },
    correctFinal: { width: 260, height: 60, borderWidth: 2, borderColor: '#28a745', borderRadius: 15, textAlign: 'center', fontSize: 24, backgroundColor: '#d4edda', marginTop: 10, color: '#155724' },
    errorFinal: { width: 260, height: 60, borderWidth: 2, borderColor: '#dc3545', borderRadius: 15, textAlign: 'center', fontSize: 24, backgroundColor: '#f8d7da', marginTop: 10, color: '#721c24' },
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
    headerButton: { padding: 5 },
    headerButtonText: { fontSize: 16, color: '#007AFF' },
    problemPreviewContainer: { backgroundColor: '#f9f9f9', padding: 10, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee', width: '100%' },
    problemPreviewLabel: { fontSize: 12, color: '#777', textTransform: 'uppercase', marginBottom: 4 },
    problemPreviewTextSmall: { fontSize: 16, fontWeight: '600', color: '#007AFF', textAlign: 'center' },
    canvas: { flex: 1, backgroundColor: '#ffffff' },

    // --- STYLES FOR OPTIONS ---
    optionsContainer: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', marginVertical: 10 },
    optionButton: { width: '45%', paddingVertical: 12, paddingHorizontal: 5, marginVertical: 6, backgroundColor: '#fff', borderWidth: 2, borderColor: '#007AFF', borderRadius: 12, alignItems: 'center' },
    optionButtonSelected: { backgroundColor: '#007AFF' },
    optionButtonCorrect: { backgroundColor: '#28a745', borderColor: '#28a745' },
    optionButtonWrong: { backgroundColor: '#dc3545', borderColor: '#dc3545' },
    optionText: { fontSize: 16, fontWeight: '600', color: '#333', textAlign: 'center' }
});

export default DecimalSystemTrainer;