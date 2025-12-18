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
import { awardXpAndCoins } from '../../../services/xpService';

const EXERCISE_ID = "mentalMathLargeNumbers_cl4";
const TASKS_LIMIT = 50;

const { width: screenWidth } = Dimensions.get('window');
const combinedIconSize = screenWidth * 0.25;

const formatNumber = (num: number | string) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

// --- BRUDNOPIS COMPONENT ---
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
                        <Text style={styles.problemPreviewTextSmall}>{problemText}</Text>
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

const MentalMathLargeNumbers = () => {
    const [questionText, setQuestionText] = useState('');
    const [mainDisplay, setMainDisplay] = useState<React.ReactNode>(null);
    const [options, setOptions] = useState<string[]>([]);
    const [correctAnswer, setCorrectAnswer] = useState<string>('');
    const [hintText, setHintText] = useState('');
    const [userInput, setUserInput] = useState('');
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const [readyForNext, setReadyForNext] = useState(false);
    const [correctCount, setCorrectCount] = useState(0);
    const [wrongCount, setWrongCount] = useState(0);
    const [taskCount, setTaskCount] = useState(0);
    const [firstAttempt, setFirstAttempt] = useState(true);
    const [message, setMessage] = useState('');
    const [showScratchpad, setShowScratchpad] = useState(false);
    const [showHint, setShowHint] = useState(false);
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
            setMessage(`Gratulacje! 🎉 Ukończyłeś ${TASKS_LIMIT} zadań.`);
            setReadyForNext(false);
            return;
        }
        generateProblem();
        setUserInput('');
        setIsCorrect(null);
        setMessage('');
        setReadyForNext(false);
        setFirstAttempt(true);
        setShowHint(false);
        setTaskCount(prev => prev + 1);
        backgroundColor.setValue(0);
    };

    const generateProblem = () => {
        const typeRand = Math.random();
        let qText = '';
        let hint = '';
        let ans = '';
        let currentOptions: string[] = [];
        let display: React.ReactNode = null;

        // 1. Умножение и деление на 10, 100 (на основе упр. 9 и 6)
        if (typeRand < 0.20) {
            const units = ["tys.", "mln", "mld"];
            const selectedUnit = units[Math.floor(Math.random() * units.length)];
            const baseValue = [1, 10, 100, 150][Math.floor(Math.random() * 4)];
            const isMultiply = Math.random() > 0.5;
            const factor = isMultiply ? 10 : 100;

            qText = isMultiply ? `Zapisz cyframi liczbę ${factor} razy większą niż:` : `Zapisz cyframi liczbę ${factor} razy mniejszą niż:`;
            display = <Text style={styles.rangeText}>{baseValue} {selectedUnit}</Text>;

            let numericValue = baseValue;
            if (selectedUnit === "tys.") numericValue *= 1000;
            if (selectedUnit === "mln") numericValue *= 1000000;
            if (selectedUnit === "mld") numericValue *= 1000000000;

            ans = (isMultiply ? numericValue * factor : numericValue / factor).toString();
            hint = isMultiply ? "Dopisz odpowiednią liczbę zer." : "Skreśl odpowiednią liczbę zer.";

            // 2. Сложное умножение круглых чисел (на основе упр. 10 и 5)
        } else if (typeRand < 0.40) {
            const a = [11, 12, 13, 15, 21, 25, 80][Math.floor(Math.random() * 7)];
            const b = [2, 3, 4, 5, 9][Math.floor(Math.random() * 5)];
            const zerosA = [10, 100, 1000][Math.floor(Math.random() * 3)];
            const zerosB = [1, 10, 100][Math.floor(Math.random() * 3)];
            const valA = a * zerosA;
            const valB = b * zerosB;

            qText = "Oblicz iloczyn (pomnóż cyfry i dopisz zera):";
            display = <Text style={styles.rangeText}>{formatNumber(valA)} · {formatNumber(valB)}</Text>;
            ans = (valA * valB).toString();
            hint = `Pomnóż ${a} · ${b}, a potem dopisz wszystkie zera z obu liczb.`;

            // 3. Деление со "сокращением" нулей (на основе упр. 11 и 7)
        } else if (typeRand < 0.60) {
            const divisors = [20, 30, 40, 50, 700, 800, 4000];
            const div = divisors[Math.floor(Math.random() * divisors.length)];
            const baseRes = [12, 15, 20, 30, 40, 60][Math.floor(Math.random() * 6)];
            const num = div * baseRes;

            qText = "Oblicz iloraz (możesz skreślić zera):";
            display = <Text style={styles.rangeText}>{formatNumber(num)} : {formatNumber(div)}</Text>;
            ans = baseRes.toString();
            hint = "Skreśl taką samą liczbę zer w obu liczbach przed dzieleniem.";

            // 4. Сравнение без вычислений (на основе упр. 12)
        } else if (typeRand < 0.80) {
            const base = Math.floor(Math.random() * 500) + 300;
            const mod1 = Math.floor(Math.random() * 50) + 10;
            const mod2 = mod1 + (Math.random() > 0.5 ? 10 : -10);
            const isAddition = Math.random() > 0.5;

            qText = "Wstaw znak bez obliczania:";
            display = (
                <View style={styles.comparisonRow}>
                    <Text style={styles.bigNumberSmall}>{base} {isAddition ? '+' : '-'} {mod1}</Text>
                    <View style={styles.placeholderBox}><Text style={styles.placeholderText}>?</Text></View>
                    <Text style={styles.bigNumberSmall}>{base} {isAddition ? '+' : '-'} {mod2}</Text>
                </View>
            );

            if (isAddition) ans = mod1 > mod2 ? '>' : '<';
            else ans = mod1 > mod2 ? '<' : '>';

            currentOptions = ['<', '>', '='];
            hint = isAddition ? "Większy składnik daje większą sumę." : "Większa odejmowana liczba daje mniejszy wynik.";

            // 5. Изменение на 200 (на основе упр. 1)
        } else {
            const num = [570, 900, 1350, 2100, 10481][Math.floor(Math.random() * 5)];
            const diff = 200;
            const isMore = Math.random() > 0.5;

            qText = isMore ? `Liczba o ${diff} większa to:` : `Liczba o ${diff} mniejsza to:`;
            display = <Text style={styles.rangeText}>{formatNumber(num)}</Text>;
            ans = (isMore ? num + diff : num - diff).toString();
            hint = `Wykonaj ${isMore ? 'dodawanie' : 'odejmowanie'}: ${num} ${isMore ? '+' : '-'} ${diff}.`;
        }

        setQuestionText(qText);
        setMainDisplay(display);
        setCorrectAnswer(ans);
        setOptions(currentOptions);
        setHintText(hint);
    };

    const handleCheck = () => {
        Keyboard.dismiss();
        if (!userInput.trim()) {
            setMessage('Wybierz lub wpisz odpowiedź!');
            return;
        }

        const isOk = userInput.trim() === correctAnswer.trim();
        setIsCorrect(isOk);

        if (isOk) {
            Animated.timing(backgroundColor, { toValue: 1, duration: 500, useNativeDriver: false }).start();
            setCorrectCount(prev => prev + 1);
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
            Animated.timing(backgroundColor, { toValue: -1, duration: 500, useNativeDriver: false }).start();
            if (firstAttempt) {
                setMessage('Błąd. Spróbuj jeszcze raz.');
                if (options.length === 0) setUserInput('');
                setFirstAttempt(false);
            } else {
                setMessage(`Prawidłowa odpowiedź: ${formatNumber(correctAnswer)}`);
                setReadyForNext(true);
            }
            setWrongCount(prev => prev + 1);
        }
    };

    const bgInterpolation = backgroundColor.interpolate({
        inputRange: [-1, 0, 1],
        outputRange: ['rgba(255, 0, 0, 0.2)', 'rgba(255, 255, 255, 0)', 'rgba(0, 255, 0, 0.2)']
    });

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ flex: 1 }}>
                <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
                <ImageBackground source={require('../../../assets/background.jpg')} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: bgInterpolation }]} pointerEvents="none" />

                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardContainer}>
                    {!isKeyboardVisible && (
                        <View style={styles.topButtons}>
                            <TouchableOpacity onPress={() => setShowScratchpad(true)} style={styles.topBtnItem}>
                                <Image source={require('../../../assets/pencil.png')} style={styles.iconTop} />
                                <Text style={styles.buttonLabel}>Brudnopis</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setShowHint(!showHint)} style={styles.topBtnItem}>
                                <Image source={require('../../../assets/question.png')} style={styles.iconTop} />
                                <Text style={styles.buttonLabel}>Pomoc</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {showHint && !isKeyboardVisible && (
                        <View style={styles.hintBox}>
                            <Text style={styles.hintTitle}>Podpowiedź:</Text>
                            <Text style={styles.hintText}>{hintText}</Text>
                        </View>
                    )}

                    <DrawingModal visible={showScratchpad} onClose={() => setShowScratchpad(false)} problemText={questionText} />

                    <ScrollView contentContainerStyle={styles.centerContent} keyboardShouldPersistTaps="handled">
                        <View style={styles.card}>
                            <View style={styles.overlayBackground} />
                            <Text style={styles.taskLabel}>RACHUNKI PAMIĘCIOWE</Text>
                            <Text style={styles.questionMain}>{questionText}</Text>

                            <View style={styles.mainDisplayContainer}>{mainDisplay}</View>

                            {options.length > 0 ? (
                                <View style={styles.optionsContainer}>
                                    {options.map((opt, idx) => {
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
                                    })}
                                </View>
                            ) : (
                                <TextInput
                                    style={isCorrect === null ? styles.finalInput : (isCorrect ? styles.correctFinal : styles.errorFinal)}
                                    keyboardType="numeric"
                                    value={userInput}
                                    onChangeText={setUserInput}
                                    placeholder="Wynik"
                                    placeholderTextColor="#aaa"
                                    editable={!readyForNext}
                                />
                            )}

                            <View style={styles.buttonContainer}>
                                <Button title={readyForNext ? 'Dalej' : 'Sprawdź'} onPress={readyForNext ? nextTask : handleCheck} color="#007AFF" />
                            </View>

                            <Text style={styles.counterTextSmall}>Zadanie: {taskCount} / {TASKS_LIMIT}</Text>
                            {message ? <Text style={[styles.result, isCorrect ? styles.correctText : styles.errorText]}>{message}</Text> : null}
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
    topButtons: { position: 'absolute', top: 40, right: 20, flexDirection: 'row', zIndex: 10 },
    topBtnItem: { alignItems: 'center', marginLeft: 15 },
    iconTop: { width: 70, height: 70, resizeMode: 'contain', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3 },
    buttonLabel: { fontSize: 14, fontWeight: 'bold', color: '#007AFF', marginTop: 2 },
    hintBox: { position: 'absolute', top: 120, right: 20, padding: 15, backgroundColor: 'rgba(255,255,255,0.98)', borderRadius: 15, maxWidth: 260, zIndex: 11, elevation: 5, borderWidth: 1, borderColor: '#007AFF' },
    hintTitle: { fontSize: 16, fontWeight: 'bold', color: '#007AFF', marginBottom: 5, textAlign: 'center' },
    hintText: { fontSize: 14, color: '#333', textAlign: 'center' },
    card: { width: '95%', maxWidth: 480, borderRadius: 20, padding: 20, alignItems: 'center', alignSelf: 'center' },
    overlayBackground: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 20 },
    taskLabel: { fontSize: 18, fontWeight: '700', marginBottom: 15, color: '#007AFF', textAlign: 'center', textTransform: 'uppercase' },
    questionMain: { fontSize: 22, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 15 },
    mainDisplayContainer: { marginBottom: 20, alignItems: 'center' },
    rangeText: { fontSize: 32, fontWeight: 'bold', color: '#333', textAlign: 'center' },
    comparisonRow: { flexDirection: 'row', alignItems: 'center' },
    bigNumberSmall: { fontSize: 22, fontWeight: 'bold', color: '#333' },
    placeholderBox: { width: 45, height: 45, borderWidth: 2, borderColor: '#007AFF', marginHorizontal: 10, justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
    placeholderText: { fontSize: 24, color: '#007AFF', fontWeight: 'bold' },
    finalInput: { width: 240, height: 60, borderWidth: 2, borderColor: '#ccc', borderRadius: 15, textAlign: 'center', fontSize: 24, backgroundColor: '#fafafa', color: '#333' },
    correctFinal: { width: 240, height: 60, borderWidth: 2, borderColor: '#28a745', borderRadius: 15, textAlign: 'center', fontSize: 24, backgroundColor: '#d4edda', color: '#155724' },
    errorFinal: { width: 240, height: 60, borderWidth: 2, borderColor: '#dc3545', borderRadius: 15, textAlign: 'center', fontSize: 24, backgroundColor: '#f8d7da', color: '#721c24' },
    optionsContainer: { width: '100%', flexDirection: 'row', justifyContent: 'center', marginVertical: 10 },
    optionButton: { width: 70, height: 70, marginHorizontal: 10, backgroundColor: '#fff', borderWidth: 2, borderColor: '#007AFF', borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
    optionButtonSelected: { backgroundColor: '#007AFF' },
    optionButtonCorrect: { backgroundColor: '#28a745', borderColor: '#28a745' },
    optionButtonWrong: { backgroundColor: '#dc3545', borderColor: '#dc3545' },
    optionText: { fontSize: 28, fontWeight: 'bold', color: '#007AFF' },
    buttonContainer: { marginTop: 25, width: '80%', borderRadius: 10, overflow: 'hidden' },
    result: { fontSize: 18, fontWeight: '700', marginTop: 15, textAlign: 'center' },
    correctText: { color: '#28a745' },
    errorText: { color: '#dc3545' },
    counterTextSmall: { fontSize: 14, color: '#555', marginTop: 10 },
    iconsBottom: { position: 'absolute', bottom: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' },
    iconSame: { width: combinedIconSize, height: combinedIconSize, resizeMode: 'contain', marginHorizontal: 10 },
    counterTextIcons: { fontSize: Math.max(14, combinedIconSize * 0.28), color: '#333', fontWeight: 'bold' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    drawingContainer: { width: '95%', height: '85%', backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden' },
    drawingHeader: { height: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, backgroundColor: '#f0f0f0' },
    drawingTitle: { fontSize: 18, fontWeight: 'bold' },
    headerButton: { padding: 5 },
    headerButtonText: { fontSize: 16, color: '#007AFF' },
    problemPreviewContainer: { backgroundColor: '#f9f9f9', padding: 10, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee' },
    problemPreviewLabel: { fontSize: 12, color: '#777', textTransform: 'uppercase' },
    problemPreviewTextSmall: { fontSize: 18, fontWeight: '600', color: '#007AFF' },
    canvas: { flex: 1, backgroundColor: '#fff' },
});

export default MentalMathLargeNumbers;