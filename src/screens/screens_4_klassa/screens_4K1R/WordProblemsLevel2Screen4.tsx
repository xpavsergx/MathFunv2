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
    TouchableWithoutFeedback
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { awardXpAndCoins } from '../../../services/xpService';

const EXERCISE_ID = "wordProblemsLevel2";
const TASKS_LIMIT = 50;
const screenWidth = Dimensions.get('window').width;

const rnd = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

// --- ГЕНЕРАЦИЯ ЗАДАЧ (УРОВЕНЬ 2 - НОВЫЕ ТЕКСТЫ) ---
const generateTask = () => {
    const type = rnd(1, 8);

    switch (type) {
        case 1: { // Сравнение + Сумма (Было: Самолеты -> Стало: Каштаны)
            // Марек собрал X, Аня на Y больше. Сколько вместе?
            const marek = rnd(15, 35);
            const diff = rnd(5, 12);
            const ania = marek + diff;
            const total = marek + ania;
            return {
                text: `Marek zebrał w parku ${marek} kasztanów, a Ania znalazła o ${diff} więcej niż on. Ile kasztanów zebrali łącznie?`,
                answer: total,
                hint: `Najpierw oblicz, ile kasztanów ma Ania (${marek} + ${diff}), a potem dodaj zbiory Marka.`
            };
        }
        case 2: { // Сумма произведений (Было: Столики -> Стало: Ряды в кино/Автобусы)
            // X рядов по 8 мест, Y рядов по 10 мест.
            const r1 = rnd(4, 8); // ряды тип 1
            const s1 = rnd(8, 12); // мест в ряду 1
            const r2 = rnd(3, 6);  // ряды тип 2
            const s2 = rnd(10, 15); // мест в ряду 2
            const capacity = (r1 * s1) + (r2 * s2);
            return {
                text: `W małym kinie są dwa rodzaje rzędów: ${r1} rzędów po ${s1} miejsc oraz ${r2} rzędów po ${s2} miejsc. Ilu widzów zmieści się w tym kinie?`,
                answer: capacity,
                hint: `Pomnóż liczbę rzędów przez liczbę miejsc dla obu rodzajów, a potem dodaj wyniki do siebie.`
            };
        }
        case 3: { // Дроби/Множители (Было: Шарики -> Стало: Наклейки)
            // Синие (X), Желтые (X/2), Золотые (X*3)
            const blue = rnd(8, 24) * 2; // Четное
            const yellow = blue / 2;
            const gold = blue * 3;
            const total = blue + yellow + gold;
            return {
                text: `Kasia zbiera naklejki. Ma ${blue} niebieskich, żółtych ma 2 razy mniej niż niebieskich, a złotych — aż 3 razy więcej niż niebieskich. Ile naklejek ma łącznie?`,
                answer: total,
                hint: `Oblicz żółte (${blue} : 2) i złote (${blue} · 3), a następnie dodaj wszystkie do siebie.`
            };
        }
        case 4: { // Остаток (Было: Яблоки -> Стало: Мука в пекарне)
            // Всего было X. Использовали A мешков по B кг и C мешков по D кг.
            const bag1_count = rnd(3, 6);
            const bag1_weight = rnd(4, 5); // кг
            const bag2_count = rnd(2, 5);
            const bag2_weight = rnd(2, 4); // кг

            const used = (bag1_count * bag1_weight) + (bag2_count * bag2_weight);
            const left = rnd(10, 30);
            const total = used + left;

            return {
                text: `W magazynie piekarni było ${total} kg mąki. Piekarz zużył ${bag1_count} worków po ${bag1_weight} kg oraz ${bag2_count} worków po ${bag2_weight} kg. Ile mąki zostało w magazynie?`,
                answer: left,
                hint: `Oblicz, ile kg mąki zużyto łącznie (worki · waga), i odejmij to od całości (${total}).`
            };
        }
        case 5: { // Отрезки (Было: Лента -> Стало: Доски для забора/Плинтусы)
            // 3 доски по X м, четвертая на Y м длиннее.
            const baseLen = rnd(20, 50); // см
            const diff = rnd(10, 20);
            const longPart = baseLen + diff;
            const total = (3 * baseLen) + longPart;
            return {
                text: `Pan Adam układał listwy podłogowe. Użył trzech kawałków po ${baseLen} cm, a czwarty kawałek musiał być o ${diff} cm dłuższy od pozostałych. Jaką łączną długość miały te cztery listwy?`,
                answer: total,
                hint: `Oblicz długość czwartej listwy (${baseLen} + ${diff}), a potem dodaj długość trzech pozostałych (3 · ${baseLen}).`
            };
        }
        case 6: { // Возраст (Было: Дедушка -> Стало: Бабушка и внучка)
            // Бабушка X лет, в Y раз старше. Разница?
            const grandDaughter = rnd(5, 10);
            const multiplier = rnd(5, 8);
            const grandMa = grandDaughter * multiplier;
            const diff = grandMa - grandDaughter;
            return {
                text: `Babcia Zosia ma ${grandMa} lata i jest ${multiplier} razy starsza od swojej wnuczki Ewy. O ile lat babcia jest starsza od Ewy?`,
                answer: diff,
                hint: `Najpierw oblicz wiek Ewy (${grandMa} : ${multiplier}), a potem odejmij jej wiek od wieku babci.`
            };
        }
        case 7: { // Расстояние (Было: Города -> Стало: Велопробег)
            // Этап 1 = X км. Этап 2 в 2 раза длиннее.
            const stage1 = rnd(15, 40);
            const stage2 = stage1 * 2;
            const total = stage1 + stage2;
            return {
                text: `Pierwszy etap rajdu rowerowego wynosił ${stage1} km. Drugi etap był dokładnie dwa razy dłuższy. Ile kilometrów łącznie muszą przejechać rowerzyści?`,
                answer: total,
                hint: `Skoro drugi etap jest 2 razy dłuższy, pomnóż ${stage1} · 2. Potem dodaj oba dystanse.`
            };
        }
        case 8: { // Цепочка (Было: Семья -> Стало: Компьютерная игра)
            // Игрок 1 набрал X. Игрок 2 на Y меньше. Игрок 3 в Z раз больше Игрока 2.
            const p1 = rnd(50, 100); // Очки первого
            const diff = rnd(10, 30);
            const p2 = p1 - diff; // Очки второго
            const mult = rnd(2, 3);
            const p3 = p2 * mult; // Очки третьего (вопрос про него)
            return {
                text: `W grze komputerowej Bartek zdobył ${p1} punktów. Jego kolega Kuba zdobył o ${diff} punktów mniej. Mistrz gry zdobył ${mult} razy więcej punktów niż Kuba. Ile punktów ma Mistrz?`,
                answer: p3,
                hint: `Najpierw punkty Kuby (${p1} - ${diff}), potem punkty Mistrza (punkty Kuby · ${mult}).`
            };
        }

        default: return { text: 'Ile to 2+2?', answer: 4, hint: 'Dodaj.' };
    }
};

const DrawingModal = ({ visible, onClose, problemText }: { visible: boolean; onClose: () => void, problemText: string }) => {
    const [paths, setPaths] = useState<string[]>([]);
    const [currentPath, setCurrentPath] = useState('');

    const handleClear = () => {
        setPaths([]);
        setCurrentPath('');
    };

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
                        <Text style={styles.problemPreviewLabel}>Treść zadania:</Text>
                        <Text style={styles.problemPreviewTextSmall}>{problemText}</Text>
                    </View>

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

const WordProblemsLevel2Screen4 = () => {
    const [taskData, setTaskData] = useState<{text: string, answer: number, hint: string}>({ text: '', answer: 0, hint: '' });
    const [userAnswer, setUserAnswer] = useState('');
    const [firstAttempt, setFirstAttempt] = useState(true);
    const [correctInput, setCorrectInput] = useState<boolean | null>(null);
    const [readyForNext, setReadyForNext] = useState(false);
    const [counter, setCounter] = useState(0);
    const [correctCount, setCorrectCount] = useState(0);
    const [wrongCount, setWrongCount] = useState(0);
    const [message, setMessage] = useState('');
    const [showHint, setShowHint] = useState(false);
    const [showScratchpad, setShowScratchpad] = useState(false);
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);

    const backgroundColor = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
        const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
        return () => {
            keyboardDidHideListener.remove();
            keyboardDidShowListener.remove();
        };
    }, []);

    const nextTask = () => {
        if (counter >= TASKS_LIMIT) {
            setMessage(`Gratulacje! 🎉 Rozwiązano ${TASKS_LIMIT} zadań!`);
            setReadyForNext(false);
            return;
        }
        const t = generateTask();
        setTaskData(t);
        setUserAnswer('');
        setFirstAttempt(true);
        setCorrectInput(null);
        setReadyForNext(false);
        setMessage('');
        setShowHint(false);
        setCounter(prev => prev + 1);
        backgroundColor.setValue(0);
    };

    useEffect(() => { nextTask(); }, []);

    const toggleHint = () => setShowHint(prev => !prev);
    const toggleScratchpad = () => setShowScratchpad(prev => !prev);

    const handleCheck = () => {
        Keyboard.dismiss();

        requestAnimationFrame(() => {
            if (!userAnswer) { setMessage('Wpisz odpowiedź!'); return; }
            const numAnswer = Number(userAnswer);
            const isCorrect = Math.abs(numAnswer - taskData.answer) < 0.01;

            const currentUser = auth().currentUser;
            const statsDocRef = currentUser
                ? firestore().collection('users').doc(currentUser.uid).collection('exerciseStats').doc(EXERCISE_ID)
                : null;

            if (isCorrect) {
                setCorrectInput(true);
                setCorrectCount(prev => prev + 1);
                statsDocRef?.set({ totalCorrect: firestore.FieldValue.increment(1) }, { merge: true }).catch(console.error);

                Animated.timing(backgroundColor, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: false
                }).start();

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
                    setMessage('Błąd! Spróbuj jeszcze raz.');
                    setUserAnswer('');
                    setFirstAttempt(false);
                } else {
                    setMessage(`Błąd! Poprawna odpowiedź: ${taskData.answer}`);
                    setReadyForNext(true);
                }
                setCorrectInput(false);
            }
        });
    };

    const getValidationStyle = () => correctInput === null
        ? styles.input
        : correctInput ? styles.correctFinal : styles.errorFinal;

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

                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.keyboardContainer}
                >

                    {!isKeyboardVisible && (
                        <View style={styles.topButtons}>
                            <TouchableOpacity onPress={toggleScratchpad} style={{ marginRight: 20, alignItems: 'center' }}>
                                <Image source={require('../../../assets/pencil.png')} style={styles.iconTop} />
                                <Text style={styles.buttonLabel}>Brudnopis</Text>
                            </TouchableOpacity>

                            <View style={{ alignItems: 'center' }}>
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
                            <Text style={styles.hintText}>{taskData.hint}</Text>
                        </View>
                    )}

                    <DrawingModal visible={showScratchpad} onClose={toggleScratchpad} problemText={taskData.text} />

                    <View style={styles.centerContent}>
                        <Animated.View style={[styles.card, { backgroundColor: 'transparent' }]}>
                            <View style={styles.overlayBackground} />


                            <Text style={styles.taskLabel}>Treść zadania:</Text>
                            <Text style={styles.taskText}>{taskData.text}</Text>

                            <TextInput
                                style={[getValidationStyle(), styles.finalInput]}
                                keyboardType="numeric"
                                value={userAnswer}
                                onChangeText={setUserAnswer}
                                placeholder="Twój wynik"
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
                    </View>

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

const iconSize = screenWidth * 0.25;

const styles = StyleSheet.create({
    keyboardContainer: { flex: 1, justifyContent: 'center' },
    centerContent: { alignItems: 'center', paddingHorizontal: 20 },

    topButtons: { position: 'absolute', top: 40, right: 20, flexDirection: 'row', alignItems: 'center', zIndex: 10 },
    iconTop: { width: 80, height: 80, resizeMode: 'contain', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3 },
    buttonLabel: { fontSize: 14, fontWeight: 'bold', color: '#007AFF', marginTop: 2, textShadowColor: 'rgba(255, 255, 255, 0.8)', textShadowRadius: 3 },

    hintBox: {
        position: 'absolute',
        top: 130,
        right: 20,
        padding: 15,
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: 15,
        maxWidth: 280,
        zIndex: 11,
        elevation: 5,
        borderWidth: 1,
        borderColor: '#007AFF'
    },
    hintTitle: { fontSize: 16, fontWeight: 'bold', color: '#007AFF', marginBottom: 5, textAlign: 'center' },
    hintText: { fontSize: 16, color: '#333', lineHeight: 22 },

    card: { width: '100%', maxWidth: 450, borderRadius: 20, padding: 30, alignItems: 'center' },
    overlayBackground: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 20 },
    title: { fontSize: 24, fontWeight: '700', marginBottom: 10, color: '#333', textAlign: 'center' },

    taskLabel: { fontSize: 18, fontWeight: '700', marginBottom: 5, color: '#007AFF', textAlign: 'center', textTransform: 'uppercase' },
    taskText: { fontSize: 22, fontWeight: '600', marginBottom: 25, color: '#333', textAlign: 'center', lineHeight: 30 },

    input: { width: 220, height: 56, borderWidth: 2, borderColor: '#ccc', borderRadius: 10, textAlign: 'center', fontSize: 22, backgroundColor: '#fafafa', marginBottom: 15, color: '#333' },
    finalInput: { width: 220 },
    buttonContainer: { marginTop: 10, width: '80%', borderRadius: 10, overflow: 'hidden' },
    result: { fontSize: 18, fontWeight: '700', marginTop: 20, textAlign: 'center' },
    counterTextSmall: { fontSize: Math.max(12, screenWidth * 0.035), fontWeight: '400', color: '#555', textAlign: 'center', marginTop: 10 },

    iconsBottom: { position: 'absolute', bottom: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' },
    iconSame: { width: iconSize, height: iconSize, resizeMode: 'contain', marginHorizontal: 10 },
    counterTextIcons: { fontSize: Math.max(14, iconSize * 0.28), marginHorizontal: 8, textAlign: 'center', color: '#333' },

    correctFinal: { width: 220, height: 56, borderWidth: 2, borderRadius: 10, textAlign: 'center', fontSize: 22, backgroundColor: '#d4edda', borderColor: '#28a745', color: '#155724', marginBottom: 15 },
    errorFinal: { width: 220, height: 56, borderWidth: 2, borderRadius: 10, textAlign: 'center', fontSize: 22, backgroundColor: '#f8d7da', borderColor: '#dc3545', color: '#721c24', marginBottom: 15 },
    correctText: { color: '#28a745' },
    errorText: { color: '#dc3545' },

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

export default WordProblemsLevel2Screen4;