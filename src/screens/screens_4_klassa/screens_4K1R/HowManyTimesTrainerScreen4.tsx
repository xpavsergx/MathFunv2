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

const EXERCISE_ID = "howManyTimesTrainer";
const TASKS_LIMIT = 50;

const { width: screenWidth } = Dimensions.get('window');
const isSmallDevice = screenWidth < 380;

// --- КОМПОНЕНТ РИСОВАЛКИ ---
const DrawingModal = ({ visible, onClose, problemText }: { visible: boolean; onClose: () => void, problemText: string }) => {
    const [paths, setPaths] = useState<string[]>([]);
    const [currentPath, setCurrentPath] = useState('');

    const handleClear = () => { setPaths([]); setCurrentPath(''); };

    const onTouchMove = (evt: any) => {
        const { locationX, locationY } = evt.nativeEvent;
        if (!currentPath) setCurrentPath(`M${locationX},${locationY}`);
        else setCurrentPath(`${currentPath} L${locationX},${locationY}`);
    };

    const onTouchEnd = () => {
        if (currentPath) { setPaths([...paths, currentPath]); setCurrentPath(''); }
    };

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

const HowManyTimesTrainerScreen4 = () => {
    // --- STATE LOGIC ---
    // baseNumber - это всегда МЕНЬШЕЕ число в паре.
    // Если задача "умножить": вопрос про baseNumber.
    // Если задача "разделить": вопрос про (baseNumber * multiplier).
    const [baseNumber, setBaseNumber] = useState<number>(0);
    const [multiplier, setMultiplier] = useState<number>(0);

    // Тип операции: "во сколько раз больше" или "во сколько раз меньше" (для текста)
    const [type, setType] = useState<'więcej' | 'mniej'>('więcej');
    // Тип задачи: "найди число" или "узнай во сколько раз" (хотя в этом тренажере чаще ищут число)
    const [taskType, setTaskType] = useState<'znajdz' | 'ile_razy'>('znajdz');

    const [answer, setAnswer] = useState<string>('');

    // --- STATE UI ---
    const [correctInput, setCorrectInput] = useState<boolean | null>(null);
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

    // --- ГЕНЕРАЦИЯ ЗАДАНИЙ (4 КЛАСС) ---
    const nextTask = () => {
        if (taskCount >= TASKS_LIMIT) {
            setMessage(`Gratulacje! 🎉 Ukończyłeś ${TASKS_LIMIT} zadań.`);
            setReadyForNext(false);
            return;
        }

        const modeRandom = Math.random();
        let newMultiplier: number;
        let newSmallBase: number; // Это меньшее число (основа)

        if (modeRandom < 0.5) {
            // РЕЖИМ 1: Таблица умножения (50% шанса)
            // Результат строго до 100.
            newMultiplier = Math.floor(Math.random() * 8) + 2; // 2..9
            const maxBase = Math.floor(100 / newMultiplier);
            newSmallBase = Math.floor(Math.random() * (maxBase - 1)) + 2;
        }
        else if (modeRandom < 0.8) {
            // РЕЖИМ 2: Устный счет с десятками (30% шанса)
            // Результат до 150. (Например: 40 * 3, 12 * 4, 25 * 4, 50 * 3)
            newMultiplier = Math.floor(Math.random() * 3) + 2; // 2, 3 или 4 (чтобы было легко)

            // Генерируем "круглые" или "полукруглые" числа (10, 12, 15, 20, 25, 30, 40, 50)
            const easyBases = [10, 12, 15, 20, 25, 30, 40, 50, 60, 70];
            // Фильтруем, чтобы результат не превышал 150
            const validBases = easyBases.filter(b => b * newMultiplier <= 150);

            newSmallBase = validBases[Math.floor(Math.random() * validBases.length)];
        }
        else {
            // РЕЖИМ 3: Простые большие числа (20% шанса)
            // Сотни: 100, 200, 300, 400. Множитель: 2 или 3 (только если просто).
            newMultiplier = 2; // В основном умножаем/делим на 2, это база для 4 класса
            const bigRoundBases = [100, 200, 300, 400];
            newSmallBase = bigRoundBases[Math.floor(Math.random() * bigRoundBases.length)];

            // Редкий кейс: 100 * 3 или 100 * 4
            if (newSmallBase === 100 && Math.random() > 0.5) {
                newMultiplier = Math.floor(Math.random() * 3) + 3; // 3, 4, 5
            }
        }

        setBaseNumber(newSmallBase);
        setMultiplier(newMultiplier);

        // Случайные типы вопроса
        const newType: 'więcej' | 'mniej' = Math.random() > 0.5 ? 'więcej' : 'mniej';
        const newTaskType: 'znajdz' | 'ile_razy' = Math.random() > 0.5 ? 'znajdz' : 'ile_razy';

        setType(newType);
        setTaskType(newTaskType);

        // --- ПОДСКАЗКА ---
        const bigVal = newSmallBase * newMultiplier;
        const smallVal = newSmallBase;

        let hint = "";
        if (newTaskType === 'znajdz') {
            // Задача: найти число
            if (newType === 'więcej') {
                // "В 2 раза больше чем 200" -> 200 * 2
                hint = `Pomnóż ${smallVal} przez ${newMultiplier}.`;
            } else {
                // "В 2 раза меньше чем 400" -> 400 / 2
                hint = `Podziel ${bigVal} przez ${newMultiplier}.`;
            }
        } else {
            // Задача: во сколько раз?
            hint = `Podziel liczbę większą (${bigVal}) przez mniejszą (${smallVal}).`;
        }
        setHintText(hint);

        setAnswer('');
        setMessage('');
        setReadyForNext(false);
        setFirstAttempt(true);
        setCorrectInput(null);
        setShowHint(false);
        setTaskCount(prev => prev + 1);
        backgroundColor.setValue(0);
    };

    const toggleScratchpad = () => setShowScratchpad(prev => !prev);
    const toggleHint = () => setShowHint(prev => !prev);

    const handleCheck = () => {
        Keyboard.dismiss();

        requestAnimationFrame(() => {
            if (!answer) {
                setMessage('Wpisz odpowiedź!');
                return;
            }

            const numAnswer = Number(answer.replace(',', '.'));
            let correctResult: number;

            // --- РАСЧЕТ ПРАВИЛЬНОГО ОТВЕТА ---
            // baseNumber - это маленькое число (S)
            // multiplier - это множитель (M)
            // Большое число (B) = S * M

            if (taskType === 'znajdz') {
                if (type === 'więcej') {
                    // "Найди число в M раз больше, чем S" -> Ответ: B
                    correctResult = baseNumber * multiplier;
                } else {
                    // "Найди число в M раз меньше, чем B" -> Ответ: S
                    // Но в тексте задачи мы показываем B.
                    // Текст задачи: "Znajdź liczbę M razy mniejszą niż (baseNumber * multiplier)"
                    correctResult = baseNumber;
                }
            } else {
                // "Во сколько раз..." -> Ответ всегда multiplier
                correctResult = multiplier;
            }

            const isCorrect = Math.abs(numAnswer - correctResult) < 1e-9;
            setCorrectInput(isCorrect);

            if (isCorrect) {
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
                Animated.sequence([
                    Animated.timing(backgroundColor, { toValue: -1, duration: 700, useNativeDriver: false }),
                    Animated.timing(backgroundColor, { toValue: 0, duration: 500, useNativeDriver: false }),
                ]).start();

                if (firstAttempt) {
                    setMessage('Błąd! Spróbuj ponownie.');
                    setAnswer('');
                    setFirstAttempt(false);
                } else {
                    setMessage(`Błąd! Poprawnie: ${correctResult}`);
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
        });
    };

    const getValidationStyle = () => {
        if (correctInput === null) return styles.input;
        return correctInput ? styles.correctFinal : styles.errorFinal;
    };

    const bgInterpolation = backgroundColor.interpolate({
        inputRange: [-1, 0, 1],
        outputRange: ['rgba(255, 0, 0, 0.2)', 'rgba(255, 255, 255, 0)', 'rgba(0, 255, 0, 0.2)']
    });

    // --- ФОРМИРОВАНИЕ ТЕКСТА ЗАДАЧИ ---
    const getTaskText = () => {
        const small = baseNumber;
        const big = baseNumber * multiplier;

        if (taskType === 'znajdz') {
            // "Найди число..."
            return type === 'więcej'
                ? `Znajdź liczbę ${multiplier} razy większą niż ${small}`
                : `Znajdź liczbę ${multiplier} razy mniejszą niż ${big}`;
        } else {
            // "Во сколько раз..."
            if (type === 'więcej') {
                return `Ile razy liczba ${big} jest większa niż ${small}?`;
            } else {
                return `Ile razy liczba ${small} jest mniejsza niż ${big}?`;
            }
        }
    };

    const problemString = getTaskText();

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

                    <DrawingModal visible={showScratchpad} onClose={toggleScratchpad} problemText={problemString} />

                    <ScrollView contentContainerStyle={styles.centerContent} keyboardShouldPersistTaps="handled">
                        <View style={styles.card}>
                            <View style={styles.overlayBackground} />

                            <Text style={styles.taskLabel}>TRENER: Ile razy...</Text>

                            <Text style={styles.taskTextMain}>{problemString}</Text>

                            <Text style={styles.subTitle}>Wpisz odpowiedź</Text>

                            <TextInput
                                style={getValidationStyle()}
                                keyboardType="numeric"
                                value={answer}
                                onChangeText={setAnswer}
                                placeholder="wynik"
                                placeholderTextColor="#aaa"
                                editable={!readyForNext}
                            />

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

// Styles
const iconSize = screenWidth * 0.25;
const inputWidth = isSmallDevice ? screenWidth * 0.5 : 220;
const inputFontSize = 22;

const styles = StyleSheet.create({
    keyboardContainer: { flex: 1, justifyContent: 'center' },
    centerContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 20 },

    // Top Buttons
    topButtons: { position: 'absolute', top: 40, right: 20, flexDirection: 'row', alignItems: 'center', zIndex: 10 },
    topBtnItem: { alignItems: 'center', marginLeft: 15 },
    iconTop: { width: 70, height: 70, resizeMode: 'contain', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3 },
    buttonLabel: { fontSize: 14, fontWeight: 'bold', color: '#007AFF', marginTop: 2, textShadowColor: 'rgba(255, 255, 255, 0.8)', textShadowRadius: 3 },

    // Hint Box
    hintBox: {
        position: 'absolute', top: 120, right: 20, padding: 15, backgroundColor: 'rgba(255,255,255,0.98)', borderRadius: 15, maxWidth: 260, zIndex: 11, elevation: 5, borderWidth: 1, borderColor: '#007AFF'
    },
    hintTitle: { fontSize: 16, fontWeight: 'bold', color: '#007AFF', marginBottom: 5, textAlign: 'center' },
    hintText: { fontSize: 16, color: '#333', lineHeight: 22, textAlign: 'center' },

    // Card
    card: { width: '95%', maxWidth: 480, borderRadius: 20, padding: 20, alignItems: 'center', marginTop: 20, alignSelf: 'center' },
    overlayBackground: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 20 },

    // Headings
    taskLabel: { fontSize: 18, fontWeight: '700', marginBottom: 15, color: '#007AFF', textAlign: 'center', textTransform: 'uppercase' },
    taskTextMain: { fontSize: isSmallDevice ? 24 : 32, fontWeight: 'bold', marginBottom: 20, color: '#333', textAlign: 'center', lineHeight: 36 },
    subTitle: { fontSize: 16, marginBottom: 20, color: '#555', textAlign: 'center' },

    // Inputs
    input: { width: inputWidth, height: 56, borderWidth: 2, borderColor: '#ccc', borderRadius: 10, textAlign: 'center', fontSize: inputFontSize, backgroundColor: '#fafafa', marginBottom: 15, color: '#333' },
    correctFinal: { width: inputWidth, height: 56, borderWidth: 2, borderColor: '#28a745', borderRadius: 10, textAlign: 'center', fontSize: inputFontSize, backgroundColor: '#d4edda', marginBottom: 15, color: '#155724' },
    errorFinal: { width: inputWidth, height: 56, borderWidth: 2, borderColor: '#dc3545', borderRadius: 10, textAlign: 'center', fontSize: inputFontSize, backgroundColor: '#f8d7da', marginBottom: 15, color: '#721c24' },

    buttonContainer: { marginTop: 10, width: '80%', borderRadius: 10, overflow: 'hidden' },
    result: { fontSize: 18, fontWeight: '700', marginTop: 20, textAlign: 'center' },
    correctText: { color: '#28a745' },
    errorText: { color: '#dc3545' },

    // Counter
    counterTextSmall: { fontSize: Math.max(12, screenWidth * 0.035), fontWeight: '400', color: '#555', textAlign: 'center', marginTop: 10 },

    // Bottom Icons
    iconsBottom: { position: 'absolute', bottom: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' },
    iconSame: { width: iconSize, height: iconSize, resizeMode: 'contain', marginHorizontal: 10 },
    counterTextIcons: { fontSize: Math.max(14, iconSize * 0.28), marginHorizontal: 8, textAlign: 'center', color: '#333' },

    // Modal
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
});

export default HowManyTimesTrainerScreen4;