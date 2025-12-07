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
    PanResponder,
    SafeAreaView
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Svg, { Path } from 'react-native-svg'; // НУЖНО УСТАНОВИТЬ ЭТУ БИБЛИОТЕКУ

import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { awardXpAndCoins } from '../services/xpService';

const EXERCISE_ID = "orderOperationsTrainer";
const TASKS_LIMIT = 100;
const screenWidth = Dimensions.get('window').width;
const screenHeight = Dimensions.get('window').height;

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---

const rnd = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const getDivisiblePair = (maxDivisor = 9) => {
    const b = rnd(2, maxDivisor);
    const a = b * rnd(2, 12);
    return { a, b };
};

// --- ГЕНЕРАЦИЯ ЗАДАНИЙ ---
const generateTask = () => {
    const type = rnd(1, 18);

    switch (type) {
        case 1: return `${rnd(20, 50)} - ${rnd(5, 15)} + ${rnd(10, 25)}`;
        case 2: return `${rnd(30, 60)} - ${rnd(10, 30)} + ${rnd(2, 10)}`;
        case 3:
            const subRes = rnd(2, 9);
            const subB = rnd(1, subRes - 1);
            const subA = subRes + subB;
            return `${rnd(2, 8)} · (${subA} - ${subB})`;
        case 4: return `${rnd(5, 20)} + ${rnd(5, 12)} · ${rnd(2, 6)}`;
        case 5: return `${rnd(2, 5)} · ${rnd(10, 20)} - ${rnd(2, 10)}`;
        case 6:
            const div = rnd(2, 5);
            const total = div * rnd(5, 20);
            const p1 = rnd(1, total - 1);
            const p2 = total - p1;
            return `(${p1} + ${p2}) : ${div}`;
        case 7:
            const pair1 = getDivisiblePair(6);
            return `${pair1.a} : ${pair1.b} · ${rnd(2, 5)}`;
        case 8:
            const pair2 = getDivisiblePair(5);
            const minStart = (pair2.a / pair2.b) + rnd(1, 10);
            return `${rnd(minStart, minStart + 20)} - ${pair2.a} : ${pair2.b}`;
        case 9: return `${rnd(30, 80)} - ${rnd(2, 8)} · ${rnd(2, 8)} + ${rnd(1, 10)}`;
        case 10:
            const d2 = rnd(2, 8);
            const m2 = rnd(2, 5);
            const baseVal = d2 * rnd(2, 10);
            const s1 = rnd(5, baseVal - 1);
            const s2 = baseVal - s1;
            return `(${s1} + ${s2}) : ${d2} · ${m2}`;
        case 11: return `${rnd(3, 9)} · ${rnd(3, 9)} - ${rnd(2, 8)} · ${rnd(2, 8)}`;
        case 12:
            const pair3 = getDivisiblePair(9);
            const brackRes = rnd(1, (pair3.a / pair3.b) - 1);
            if (brackRes < 1) return `10 + ${pair3.a} : ${pair3.b}`;
            const b2 = rnd(1, 10);
            const b1 = b2 + brackRes;
            return `${pair3.a} : ${pair3.b} - (${b1} - ${b2})`;
        case 13:
            const mInner1 = rnd(2, 4);
            const mInner2 = rnd(2, 3);
            const innerProd = mInner1 * mInner2;
            const factorOuter = rnd(1, 4);
            const mainNum = innerProd * factorOuter;
            return `${mainNum} : (${mInner1} · ${mInner2}) · ${rnd(2, 5)}`;
        case 14:
            const subM1 = rnd(2, 5);
            const subM2 = rnd(2, 5);
            const subProd = subM1 * subM2;
            const subStart = subProd + rnd(2, 10);
            return `${rnd(2, 6)} · (${subStart} - ${subM1} · ${subM2})`;
        case 15:
            const br1_res = rnd(2, 9);
            const br1_b = rnd(1, 20);
            const br1_a = br1_b + br1_res;
            const br2_a = rnd(2, 10);
            const br2_b = rnd(2, 10);
            return `(${br1_a} - ${br1_b}) · (${br2_a} + ${br2_b})`;
        case 16: return `(${rnd(2,10)} + ${rnd(2,10)}) · ${rnd(2,4)} + ${rnd(2,5)} · ${rnd(2,6)}`;
        case 17: return `${rnd(2, 4)}³ + ${rnd(2, 5)}² + ${rnd(2, 4)}²`;
        case 18:
            const baseA = rnd(3, 5);
            const multA = rnd(3, 5);
            const valA = (baseA ** 2) * multA;
            const baseB = rnd(2, 3);
            const multB = rnd(1, 3);
            if ((baseB ** 2) * multB > valA) return `${baseB}² · ${multB} + ${baseA}² · ${multA}`;
            return `${baseA}² · ${multA} - ${baseB}² · ${multB}`;
        case 19:
            const inBracketA = rnd(1, 4);
            const inBracketB = rnd(1, 4);
            return `${rnd(2, 4)} · (${inBracketA} + ${inBracketB})²`;
        default: return '10 + 2 · 5';
    }
};

const evaluateExpression = (expr: string) => {
    const safe = expr
        .replace(/·/g, '*')
        .replace(/:/g, '/')
        .replace(/²/g, '**2')
        .replace(/³/g, '**3');
    try {
        return Function(`return (${safe})`)();
    } catch (e) {
        return 0;
    }
};

// --- КОМПОНЕНТ РИСОВАЛКИ (Brudnopis) ---
const DrawingModal = ({ visible, onClose }) => {
    const [paths, setPaths] = useState<string[]>([]);
    const [currentPath, setCurrentPath] = useState('');

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (evt) => {
                const { locationX, locationY } = evt.nativeEvent;
                setCurrentPath(`M${locationX},${locationY}`);
            },
            onPanResponderMove: (evt) => {
                const { locationX, locationY } = evt.nativeEvent;
                setCurrentPath((prev) => `${prev} L${locationX},${locationY}`);
            },
            onPanResponderRelease: () => {
                setPaths((prev) => [...prev, currentPath]);
                setCurrentPath('');
            },
        })
    ).current;

    // В момент release currentPath еще не успевает попасть в массив в замыкании PanResponder,
    // поэтому используем useEffect или просто логику рендера.
    // Упрощенный вариант: при release добавляем currentPath в paths.

    // Исправление для доступа к актуальному state внутри PanResponder (через useRef, если нужно, но здесь проще так):
    // В данном простом случае onPanResponderRelease имеет доступ к currentPath из замыкания рендера? Нет.
    // Перепишем немного логику для надежности.

    // Лучше так: мы обновляем state напрямую.

    useEffect(() => {
        if (currentPath && !visible) {
            // Сброс если закрыли? Нет, оставляем.
        }
    }, [visible]);

    const handleClear = () => {
        setPaths([]);
        setCurrentPath('');
    };

    // Чтобы currentPath добавился в paths корректно:
    // Мы используем onPanResponderRelease внутри компонента, он будет захватывать currentPath из стейта?
    // В React Native PanResponder лучше создавать внутри useEffect или использовать useRef для значений.
    // Но для простой рисовалки сделаем так:

    // Простейшая реализация "живого" рисования
    const onTouchMove = (evt: any) => {
        const { locationX, locationY } = evt.nativeEvent;
        if (!currentPath) {
            setCurrentPath(`M${locationX},${locationY}`);
        } else {
            setCurrentPath(`${currentPath} L${locationX},${locationY}`);
        }
    };

    const onTouchEnd = () => {
        if (currentPath) {
            setPaths([...paths, currentPath]);
            setCurrentPath('');
        }
    };

    return (
        <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={styles.drawingContainer}>
                    {/* Верхняя панель */}
                    <View style={styles.drawingHeader}>
                        <TouchableOpacity onPress={handleClear} style={styles.headerButton}>
                            <Text style={styles.headerButtonText}>🗑️ Wyczyść</Text>
                        </TouchableOpacity>
                        <Text style={styles.drawingTitle}>Brudnopis</Text>
                        <TouchableOpacity onPress={onClose} style={styles.headerButton}>
                            <Text style={styles.headerButtonText}>❌ Zamknij</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Зона рисования */}
                    <View
                        style={styles.canvas}
                        onStartShouldSetResponder={() => true}
                        onMoveShouldSetResponder={() => true}
                        onResponderGrant={(evt) => {
                            const { locationX, locationY } = evt.nativeEvent;
                            setCurrentPath(`M${locationX},${locationY}`);
                        }}
                        onResponderMove={onTouchMove}
                        onResponderRelease={onTouchEnd}
                    >
                        <Svg height="100%" width="100%">
                            {paths.map((d, index) => (
                                <Path key={index} d={d} stroke="#000" strokeWidth={3} fill="none" />
                            ))}
                            <Path d={currentPath} stroke="#000" strokeWidth={3} fill="none" />
                        </Svg>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

// --- ОСНОВНОЙ КОМПОНЕНТ ---

const OrderOperationsTrainerScreen4 = () => {
    const [task, setTask] = useState('');
    const [answer, setAnswer] = useState('');
    const [firstAttempt, setFirstAttempt] = useState(true);
    const [correctInput, setCorrectInput] = useState<boolean | null>(null);
    const [readyForNext, setReadyForNext] = useState(false);
    const [counter, setCounter] = useState(0);
    const [correctCount, setCorrectCount] = useState(0);
    const [wrongCount, setWrongCount] = useState(0);
    const [message, setMessage] = useState('');
    const [showHint, setShowHint] = useState(false);

    // Состояние для доски
    const [showScratchpad, setShowScratchpad] = useState(false);

    const backgroundColor = useRef(new Animated.Value(0)).current;

    const nextTask = () => {
        if (counter >= TASKS_LIMIT) {
            setMessage(`Gratulacje! 🎉 Ukończono ${TASKS_LIMIT} zadań!`);
            setReadyForNext(false);
            return;
        }
        const t = generateTask();
        setTask(t);
        setAnswer('');
        setFirstAttempt(true);
        setCorrectInput(null);
        setReadyForNext(false);
        setMessage('');
        setCounter(prev => prev + 1);
        backgroundColor.setValue(0);

        // Опционально: очищать черновик при новом задании?
        // Если хочешь автоочистку, нужно передать ref в DrawingModal, но пока оставим как есть.
    };

    useEffect(() => { nextTask(); }, []);

    const toggleHint = () => setShowHint(prev => !prev);
    const toggleScratchpad = () => setShowScratchpad(prev => !prev);

    const handleCheck = () => {
        Keyboard.dismiss();
        if (!answer) { setMessage('Wpisz odpowiedź!'); return; }
        const numAnswer = Number(answer);
        const correctResult = evaluateExpression(task);
        const isCorrect = Math.abs(numAnswer - correctResult) < 0.01;

        const currentUser = auth().currentUser;
        const statsDocRef = currentUser
            ? firestore().collection('users').doc(currentUser.uid).collection('exerciseStats').doc(EXERCISE_ID)
            : null;

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
                setMessage('Błąd! Spróbuj ponownie!');
                setAnswer('');
                setFirstAttempt(false);
            } else {
                setMessage(`Błąd! Poprawny wynik: ${correctResult}`);
                setReadyForNext(true);
            }
            setCorrectInput(false);
        }
    };

    const getValidationStyle = () => correctInput === null
        ? styles.input
        : correctInput ? styles.correctFinal : styles.errorFinal;

    const bgInterpolation = backgroundColor.interpolate({
        inputRange: [-1, 0, 1],
        outputRange: ['rgba(255, 0, 0, 0.2)', 'rgba(255, 255, 255, 0)', 'rgba(0, 255, 0, 0.2)']
    });

    return (
        <View style={{ flex: 1 }}>
            <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
            <ImageBackground source={require('../assets/background.jpg')} style={StyleSheet.absoluteFillObject} resizeMode="cover" />

            <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: bgInterpolation }]} pointerEvents="none" />

            <KeyboardAwareScrollView contentContainerStyle={styles.container} enableOnAndroid extraScrollHeight={100} keyboardShouldPersistTaps="handled">

                {/* КНОПКИ ВЕРХНЕГО МЕНЮ */}
                <View style={{ position: 'absolute', top: 10, right: 10, flexDirection: 'row', alignItems: 'center', zIndex: 10 }}>

                    {/* Кнопка Черновика */}
                    <TouchableOpacity onPress={toggleScratchpad} style={{ marginRight: 15, alignItems: 'center' }}>
                        {/* Если у тебя есть картинка карандаша, замени Text на Image */}
                        <View style={{ width: 50, height: 50, backgroundColor: '#FFF', borderRadius: 25, justifyContent: 'center', alignItems: 'center', elevation: 5 }}>
                            <Text style={{ fontSize: 24 }}>✏️</Text>
                        </View>
                        <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#007AFF', marginTop: 4 }}>Brudnopis</Text>
                    </TouchableOpacity>

                    {/* Кнопка Помощи */}
                    <View style={{ alignItems: 'center' }}>
                        <TouchableOpacity onPress={toggleHint}>
                            <Image source={require('../assets/question.png')} style={{ width: 60, height: 60 }} />
                        </TouchableOpacity>
                        <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#007AFF', marginTop: 4 }}>Pomoc</Text>
                    </View>
                </View>

                {/* Подсказка (перенесена, чтобы не перекрывать кнопки) */}
                {showHint && (
                    <View style={{ position: 'absolute', top: 90, right: 10, padding: 10, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 10, maxWidth: 260, zIndex: 11, elevation: 5 }}>
                        <Text style={{ textAlign: 'center', fontSize: 14, color: '#333' }}>
                            Pamiętaj o kolejności:{'\n'}
                            1. Nawiasy{'\n'}
                            2. Potęgi{'\n'}
                            3. Mnożenie i dzielenie{'\n'}
                            4. Dodawanie i odejmowanie
                        </Text>
                    </View>
                )}

                {/* МОДАЛКА ЧЕРНОВИКА */}
                <DrawingModal visible={showScratchpad} onClose={toggleScratchpad} />

                {/* КАРТОЧКА ЗАДАНИЯ */}
                <Animated.View style={[styles.card, { backgroundColor: 'transparent', marginTop: 60 }]}>
                    <View style={styles.overlayBackground} />
                    <Text style={styles.title}>Trener</Text>
                    <Text style={styles.title}>Kolejność wykonywania działań</Text>

                    <Text style={styles.task}>Oblicz:</Text>

                    <Text style={styles.example}>{task}</Text>

                    <TextInput
                        style={[getValidationStyle(), styles.finalInput]}
                        keyboardType="numeric"
                        value={answer}
                        onChangeText={setAnswer}
                        placeholder="Odpowiedź"
                        placeholderTextColor="#aaa"
                        editable={!readyForNext}
                    />

                    <View style={styles.buttonContainer}>
                        <Button
                            title={readyForNext ? 'Dalej' : 'Sprawdź'}
                            onPress={readyForNext ? nextTask : handleCheck}
                            color="#007AFF"
                        />
                    </View>

                    <Text style={styles.counterTextSmall}>Zadanie: {counter > TASKS_LIMIT ? TASKS_LIMIT : counter} / {TASKS_LIMIT}</Text>
                    {message ? <Text style={[styles.result, correctInput ? styles.correctText : styles.errorText]}>{message}</Text> : null}
                </Animated.View>

                <View style={styles.iconsBottom}>
                    <Image source={require('../assets/happy.png')} style={styles.iconSame} />
                    <Text style={styles.counterTextIcons}>{correctCount}</Text>
                    <Image source={require('../assets/sad.png')} style={styles.iconSame} />
                    <Text style={styles.counterTextIcons}>{wrongCount}</Text>
                </View>
            </KeyboardAwareScrollView>
        </View>
    );
};

const iconSize = screenWidth * 0.25;

const styles = StyleSheet.create({
    container: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    card: { width: '100%', maxWidth: 450, borderRadius: 20, padding: 30, alignItems: 'center' },
    overlayBackground: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 20 },
    title: { fontSize: 24, fontWeight: '700', marginBottom: 20, color: '#333', textAlign: 'center' },
    task: { fontSize: 22, fontWeight: '700', marginBottom: 10, color: '#007AFF', textAlign: 'center' },
    example: { fontSize: 32, fontWeight: '700', marginBottom: 25, color: '#007AFF', textAlign: 'center', letterSpacing: 1 },
    input: { width: 220, height: 56, borderWidth: 2, borderColor: '#ccc', borderRadius: 10, textAlign: 'center', fontSize: 22, backgroundColor: '#fafafa', marginBottom: 15, color: '#333' },
    finalInput: { width: 220 },
    buttonContainer: { marginTop: 20, width: '80%', borderRadius: 10, overflow: 'hidden' },
    result: { fontSize: 18, fontWeight: '700', marginTop: 20, textAlign: 'center' },
    counterTextSmall: { fontSize: Math.max(12, screenWidth * 0.035), fontWeight: '400', color: '#555', textAlign: 'center', marginTop: 10 },
    iconsBottom: { position: 'absolute', bottom: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' },
    iconSame: { width: iconSize, height: iconSize, resizeMode: 'contain', marginHorizontal: 10 },
    counterTextIcons: { fontSize: Math.max(14, iconSize * 0.28), marginHorizontal: 8, textAlign: 'center', color: '#333' },
    correctFinal: { width: 220, height: 56, borderWidth: 2, borderRadius: 10, textAlign: 'center', fontSize: 22, backgroundColor: '#d4edda', borderColor: '#28a745', color: '#155724', marginBottom: 15 },
    errorFinal: { width: 220, height: 56, borderWidth: 2, borderRadius: 10, textAlign: 'center', fontSize: 22, backgroundColor: '#f8d7da', borderColor: '#dc3545', color: '#721c24', marginBottom: 15 },
    correctText: { color: '#28a745' },
    errorText: { color: '#dc3545' },

    // Стили для рисовалки
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    drawingContainer: { width: '95%', height: '85%', backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden' },
    drawingHeader: { height: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, backgroundColor: '#f0f0f0', borderBottomWidth: 1, borderBottomColor: '#ccc' },
    drawingTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    headerButton: { padding: 5 },
    headerButtonText: { fontSize: 16, color: '#007AFF' },
    canvas: { flex: 1, backgroundColor: '#ffffff' }, // Можно поставить '#fffbec' (желтоватый) для эффекта бумаги
});

export default OrderOperationsTrainerScreen4;