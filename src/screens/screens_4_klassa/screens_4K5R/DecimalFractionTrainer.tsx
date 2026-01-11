import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TextInput, Keyboard, ImageBackground,
    Animated, StatusBar, Image, Dimensions, TouchableOpacity, Modal,
    Platform, KeyboardAvoidingView, TouchableWithoutFeedback, ScrollView, InteractionManager
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { awardXpAndCoins } from '../../../services/xpService';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

const EXERCISE_ID = "DecimalFractions_Class4";
const { width: screenWidth } = Dimensions.get('window');

// LIMIT ZADAŃ
const TASKS_LIMIT = 30;
const combinedIconSize = screenWidth * 0.25;

// --- Helper: GCD (Największy Wspólny Dzielnik) ---
const gcd = (a: number, b: number): number => {
    return b === 0 ? a : gcd(b, a % b);
};

// --- MODAL BRUDNOPISU ---
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

// --- GŁÓWNY KOMPONENT ---
const DecimalFractionTrainer = () => {
    const navigation = useNavigation();

    // --- Stan Gry ---
    const [task, setTask] = useState({
        type: 'toDecimal', // 'toDecimal' (ułamek -> 0,5) lub 'toFraction' (0,5 -> 1/2)
        q: '',
        h: '',
        whole: 0,
        num: 0,
        den: 1,
        targetDecimalStr: '', // Oczekiwany string (np. "3.05")
        simpWhole: 0,
        simpNum: 0,
        simpDen: 1, // Skrócona forma
    });

    const [inpWhole, setInpWhole] = useState('');
    const [inpNum, setInpNum] = useState('');
    const [inpDen, setInpDen] = useState('');
    const [inpDecimal, setInpDecimal] = useState('');

    const [status, setStatus] = useState<'neutral' | 'correct' | 'wrong'>('neutral');
    const [msg, setMsg] = useState('');
    const [attempts, setAttempts] = useState(0);
    const [ready, setReady] = useState(false);
    const [stats, setStats] = useState({ correct: 0, wrong: 0, count: 0 });
    const [showMilestone, setShowMilestone] = useState(false);
    const [isFinished, setIsFinished] = useState(false);
    const [sessionCorrect, setSessionCorrect] = useState(0);
    const [showScratchpad, setShowScratchpad] = useState(false);
    const [showHint, setShowHint] = useState(false);
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);

    const historyRef = useRef<Set<string>>(new Set());

    const wholeRef = useRef<TextInput>(null);
    const numRef = useRef<TextInput>(null);
    const denRef = useRef<TextInput>(null);
    const decimalRef = useRef<TextInput>(null);

    const bgAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const k1 = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
        const k2 = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
        nextTask();
        return () => { k1.remove(); k2.remove(); };
    }, []);

    const rnd = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

    const generateProblem = () => {
        setMsg(''); setStatus('neutral'); setReady(false);
        setInpWhole(''); setInpNum(''); setInpDen(''); setInpDecimal('');
        setAttempts(0); setShowHint(false);
        bgAnim.setValue(0);

        let newTask: any = {};
        let uniqueKey = "";
        let attemptCount = 0;

        // --- УЛУЧШЕННАЯ ЛОГИКА ГЕНЕРАЦИИ ---
        // 1. Приоритет знаменателей: 100 и 1000 чаще
        const denominators = [10, 100, 100, 100, 1000, 1000, 1000];

        do {
            const den = denominators[rnd(0, denominators.length - 1)];
            const whole = rnd(0, 15);

            let num = 0;
            const difficultyRoll = Math.random();

            // 2. Логика для "ноликов в середине" (например, 5/100 -> 0.05)
            if (den === 10) {
                num = rnd(1, 9);
            } else if (den === 100) {
                // 40% шанс на однозначное число (например 3/100 -> 0.03)
                if (difficultyRoll < 0.4) {
                    num = rnd(1, 9);
                } else {
                    num = rnd(10, 99);
                }
            } else if (den === 1000) {
                // 30% шанс на двузначное (0.025)
                // 20% шанс на однозначное (0.005)
                // 50% обычное (0.125)
                if (difficultyRoll < 0.2) {
                    num = rnd(1, 9);
                } else if (difficultyRoll < 0.5) {
                    num = rnd(10, 99);
                } else {
                    num = rnd(100, 999);
                }
            }
            // Удаляем нули на конце (например 50/100), чтобы не путать с 5/10,
            // если только мы не хотим специально тренировать равенство.
            // Для 4 класса лучше пока избегать 50/100 в генераторе "сложных" кейсов,
            // но рандом их может выдать. Оставим как есть, это жизненно.
            while (num % 10 === 0 && num > 0) {
                num = num / 10;
                // Не меняем знаменатель тут, просто уменьшаем числитель? Нет, тогда дробь изменится.
                // Лучше просто перегенерировать число, если оно круглое, чтобы усложнить задачу.
                if (den === 100) num = rnd(1, 99);
                if (den === 1000) num = rnd(1, 999);
            }

            const taskType = Math.random() > 0.5 ? 'toDecimal' : 'toFraction';

            // Расчет сокращенной дроби
            const common = gcd(num, den);
            const simpNum = num / common;
            const simpDen = den / common;
            const simpWhole = whole;

            // Формирование строки ответа с ведущими нулями
            let fractionPart = "";
            if (den === 10) fractionPart = num.toString().padStart(1, '0');
            if (den === 100) fractionPart = num.toString().padStart(2, '0');
            if (den === 1000) fractionPart = num.toString().padStart(3, '0');

            const targetDecimalStr = `${whole}.${fractionPart}`;

            newTask = {
                type: taskType,
                q: taskType === 'toDecimal'
                    ? 'Zapisz podaną liczbę w postaci dziesiętnej.'
                    : 'Zapisz liczbę w postaci ułamka zwykłego lub liczby mieszanej i skróć.',
                h: taskType === 'toDecimal'
                    ? `Pamiętaj o zerach! ${den === 100 ? 'Dwa miejsca po przecinku.' : den === 1000 ? 'Trzy miejsca po przecinku.' : ''}`
                    : `Licznik to liczby po przecinku, a mianownik to 10, 100 lub 1000. Pamiętaj o skracaniu!`,
                whole, num, den,
                targetDecimalStr,
                simpWhole, simpNum, simpDen
            };

            uniqueKey = `${taskType}-${whole}-${num}-${den}`;
            attemptCount++;
        } while (historyRef.current.has(uniqueKey) && attemptCount < 20);

        historyRef.current.add(uniqueKey);
        setTask(newTask);

        setTimeout(() => {
            if (newTask.type === 'toDecimal') {
                decimalRef.current?.focus();
            } else {
                if (newTask.whole > 0) wholeRef.current?.focus();
                else numRef.current?.focus();
            }
        }, 400);
    };

    const handleCheck = () => {
        let allCorrect = false;
        let partialError = false;

        if (task.type === 'toDecimal') {
            if (!inpDecimal) { setMsg('Wpisz wynik! ⚠️'); return; }

            const userInput = inpDecimal.replace(',', '.').trim();
            const valUser = parseFloat(userInput);
            const valTarget = parseFloat(task.targetDecimalStr);

            if (isNaN(valUser)) { setMsg('To nie jest liczba! ⚠️'); return; }

            // Строгое сравнение или мягкое?
            // Для 3.05 (3 + 5/100) юзер должен ввести 3,05
            if (Math.abs(valUser - valTarget) < 0.000001) {
                // Доп проверка на формат для случаев типа 3.05
                // Если юзер введет 3.5 для задачи 3 5/100 - это ошибка математическая, она отловится выше.
                // Если юзер введет 3.050 - это верно математически.
                allCorrect = true;
            }

        } else {
            // toFraction
            let missing = false;
            if (task.simpWhole > 0 && !inpWhole) missing = true;
            if (!inpNum || !inpDen) missing = true;

            if (missing) { setMsg('Uzupełnij ułamek! ⚠️'); return; }

            const uWhole = parseInt(inpWhole || '0');
            const uNum = parseInt(inpNum || '0');
            const uDen = parseInt(inpDen || '0');

            const userVal = uWhole + (uDen !== 0 ? uNum / uDen : 0);
            const targetVal = task.simpWhole + (task.simpNum / task.simpDen);

            if (Math.abs(userVal - targetVal) < 0.0001) {
                if (uNum === task.simpNum && uDen === task.simpDen && uWhole === task.simpWhole) {
                    allCorrect = true;
                } else {
                    partialError = true; // Верно, но не сокращено
                }
            }
        }

        if (allCorrect) {
            setStatus('correct'); setMsg('Doskonale! ✅');
            Animated.timing(bgAnim, { toValue: 1, duration: 500, useNativeDriver: false }).start();
            setStats(s => ({ ...s, correct: s.correct + 1 }));
            setSessionCorrect(prev => prev + 1);
            setReady(true);
            InteractionManager.runAfterInteractions(() => awardXpAndCoins(10, 2));
            const currentUser = auth().currentUser;
            if (currentUser) {
                firestore().collection('users').doc(currentUser.uid).collection('exerciseStats').doc(EXERCISE_ID)
                    .set({ totalCorrect: firestore.FieldValue.increment(1) }, { merge: true }).catch(e => console.error(e));
            }
        } else {
            setStatus('wrong');

            if (partialError && task.type === 'toFraction') {
                setMsg('Skróć ułamek! ✂️');
                return;
            }

            if (attempts === 0) {
                setMsg('Błąd! Spróbuj jeszcze raz. ❌');
                setAttempts(1);

                if (task.type === 'toDecimal') {
                    setInpDecimal('');
                } else {
                    const uWhole = parseInt(inpWhole || '0');
                    if (uWhole !== task.simpWhole) setInpWhole('');
                    setInpNum('');
                    setInpDen('');
                }

                Animated.sequence([
                    Animated.timing(bgAnim, { toValue: -1, duration: 200, useNativeDriver: false }),
                    Animated.timing(bgAnim, { toValue: 0, duration: 200, useNativeDriver: false })
                ]).start();

                setTimeout(() => setStatus('neutral'), 1500);
            } else {
                let res = "";
                if (task.type === 'toDecimal') {
                    res = task.targetDecimalStr.replace('.', ',');
                } else {
                    res = "";
                    if (task.simpWhole > 0) res += `${task.simpWhole} `;
                    res += `${task.simpNum}/${task.simpDen}`;
                }

                setMsg(`Wynik: ${res}`);
                setReady(true);
                setStats(s => ({ ...s, wrong: s.wrong + 1 }));
                Animated.timing(bgAnim, { toValue: -1, duration: 500, useNativeDriver: false }).start();
                const currentUser = auth().currentUser;
                if (currentUser) {
                    firestore().collection('users').doc(currentUser.uid).collection('exerciseStats').doc(EXERCISE_ID)
                        .set({ totalWrong: firestore.FieldValue.increment(1) }, { merge: true }).catch(e => console.error(e));
                }
            }
        }
    };

    const nextTask = () => {
        if (stats.count >= TASKS_LIMIT) { setIsFinished(true); return; }
        if (stats.count > 0 && stats.count % 10 === 0 && !showMilestone) {
            setShowMilestone(true);
            return;
        }
        setStats(s => ({ ...s, count: s.count + 1 }));
        generateProblem();
    };

    const handleRestart = () => {
        setIsFinished(false);
        setStats({ correct: 0, wrong: 0, count: 1 });
        setSessionCorrect(0);
        historyRef.current.clear();
        generateProblem();
    };

    const getInputStyle = (currentVal: string, targetVal: number | string) => {
        if (status === 'correct') return styles.inputCorrect;
        if (status === 'wrong') {
            return styles.inputError;
        }
        return {};
    };

    const renderStaticMixed = (whole: number, num: number, den: number) => (
        <View style={styles.mixedContainer}>
            {whole > 0 && <Text style={styles.staticWhole}>{whole}</Text>}
            <View style={styles.fractionStatic}>
                <Text style={styles.staticNum}>{num}</Text>
                <View style={styles.staticLine} />
                <Text style={styles.staticDen}>{den}</Text>
            </View>
        </View>
    );

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.container}>
                <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
                <ImageBackground source={require('../../../assets/background.jpg')} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: bgAnim.interpolate({ inputRange: [-1, 0, 1], outputRange: ['rgba(255,0,0,0.15)', 'transparent', 'rgba(0,255,0,0.15)'] }) }]} pointerEvents="none" />

                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardContainer}>
                    {!isKeyboardVisible && (
                        <View style={styles.topButtons}>
                            <TouchableOpacity onPress={() => setShowScratchpad(true)} style={styles.topBtnItem}><Image source={require('../../../assets/pencil.png')} style={styles.iconTop} /><Text style={styles.buttonLabel}>Brudnopis</Text></TouchableOpacity>
                            <TouchableOpacity onPress={() => setShowHint(!showHint)} style={styles.topBtnItem}><Image source={require('../../../assets/question.png')} style={styles.iconTop} /><Text style={styles.buttonLabel}>Pomoc</Text></TouchableOpacity>
                        </View>
                    )}

                    <Modal visible={showMilestone} transparent={true} animationType="slide">
                        <View style={styles.modalOverlay}>
                            <View style={styles.milestoneCard}>
                                <Text style={styles.milestoneTitle}>Podsumowanie serii 📊</Text>
                                <View style={styles.statsRowMilestone}>
                                    <Text style={styles.statsTextMilestone}>Poprawne: {sessionCorrect} / 10</Text>
                                    <Text style={[styles.statsTextMilestone, { color: '#28a745', marginTop: 5 }]}>Skuteczność: {(sessionCorrect / 10 * 100).toFixed(0)}%</Text>
                                </View>
                                <View style={styles.milestoneButtons}>
                                    <TouchableOpacity style={[styles.mButton, { backgroundColor: '#28a745' }]} onPress={() => { setShowMilestone(false); setSessionCorrect(0); setStats(s => ({ ...s, count: s.count + 1 })); generateProblem(); }}>
                                        <Text style={styles.mButtonText}>Kontynuuj</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.mButton, { backgroundColor: '#007AFF' }]} onPress={() => { setShowMilestone(false); navigation.goBack(); }}>
                                        <Text style={styles.mButtonText}>Inny temat</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>

                    <Modal visible={isFinished} transparent={true} animationType="fade">
                        <View style={styles.modalOverlay}>
                            <View style={styles.milestoneCard}>
                                <Text style={styles.milestoneTitle}>Gratulacje! 🏆</Text>
                                <View style={styles.statsRowMilestone}>
                                    <Text style={styles.statsTextMilestone}>Twój wynik końcowy:</Text>
                                    <Text style={[styles.statsTextMilestone, { fontSize: 24, color: '#28a745', marginTop: 5 }]}>{stats.correct} / {TASKS_LIMIT}</Text>
                                </View>
                                <View style={styles.milestoneButtons}>
                                    <TouchableOpacity style={[styles.mButton, { backgroundColor: '#28a745' }]} onPress={handleRestart}>
                                        <Text style={styles.mButtonText}>Zagraj jeszcze raz</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.mButton, { backgroundColor: '#dc3545' }]} onPress={() => navigation.goBack()}>
                                        <Text style={styles.mButtonText}>Wyjdź do menu</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>

                    {showHint && !isKeyboardVisible && (
                        <View style={styles.hintBox}><Text style={styles.hintTitle}>Wskazówka:</Text><Text style={styles.hintText}>{task.h}</Text></View>
                    )}

                    <DrawingModal visible={showScratchpad} onClose={() => setShowScratchpad(false)} problemText={task.q} />

                    <ScrollView contentContainerStyle={styles.centerContent} keyboardShouldPersistTaps="handled">
                        <View style={styles.card}>
                            <View style={styles.overlayBackground} />
                            <Text style={styles.headerTitle}>Ułamki Dziesiętne</Text>
                            <Text style={styles.subHeader}>{task.q}</Text>

                            <View style={styles.taskContent}>
                                <View style={styles.equationRow}>

                                    {/* --- TRYB: UŁAMEK -> DZIESIĘTNY --- */}
                                    {task.type === 'toDecimal' && (
                                        <>
                                            {renderStaticMixed(task.whole, task.num, task.den)}
                                            <Text style={styles.operatorSign}>=</Text>
                                            <TextInput
                                                ref={decimalRef}
                                                style={[styles.decimalInput, getInputStyle(inpDecimal, task.targetDecimalStr)]}
                                                keyboardType="decimal-pad"
                                                placeholder="0,0"
                                                placeholderTextColor="#ccc"
                                                value={inpDecimal}
                                                onChangeText={setInpDecimal}
                                                returnKeyType="done"
                                                editable={!ready}
                                            />
                                        </>
                                    )}

                                    {/* --- TRYB: DZIESIĘTNY -> UŁAMEK --- */}
                                    {task.type === 'toFraction' && (
                                        <>
                                            <Text style={styles.staticDecimal}>
                                                {task.targetDecimalStr.replace('.', ',')}
                                            </Text>
                                            <Text style={styles.operatorSign}>=</Text>

                                            <View style={styles.mixedInputContainer}>
                                                {(task.simpWhole > 0 || inpWhole !== '') && (
                                                    <TextInput
                                                        ref={wholeRef}
                                                        style={[styles.wholeInput, getInputStyle(inpWhole, task.simpWhole)]}
                                                        keyboardType="numeric"
                                                        placeholder="?"
                                                        placeholderTextColor="#ccc"
                                                        value={inpWhole}
                                                        onChangeText={setInpWhole}
                                                        onSubmitEditing={() => numRef.current?.focus()}
                                                        blurOnSubmit={false}
                                                        returnKeyType="next"
                                                        editable={!ready}
                                                    />
                                                )}
                                                <View style={styles.fractionInputColumn}>
                                                    <TextInput
                                                        ref={numRef}
                                                        style={[styles.fractionInput, getInputStyle(inpNum, task.simpNum)]}
                                                        keyboardType="numeric"
                                                        placeholder="L"
                                                        placeholderTextColor="#ccc"
                                                        value={inpNum}
                                                        onChangeText={setInpNum}
                                                        onSubmitEditing={() => denRef.current?.focus()}
                                                        blurOnSubmit={false}
                                                        returnKeyType="next"
                                                        editable={!ready}
                                                    />
                                                    <View style={styles.fractionLineLarge} />
                                                    <TextInput
                                                        ref={denRef}
                                                        style={[styles.fractionInput, getInputStyle(inpDen, task.simpDen)]}
                                                        keyboardType="numeric"
                                                        placeholder="M"
                                                        placeholderTextColor="#ccc"
                                                        value={inpDen}
                                                        onChangeText={setInpDen}
                                                        returnKeyType="done"
                                                        editable={!ready}
                                                    />
                                                </View>
                                            </View>
                                        </>
                                    )}

                                </View>
                            </View>

                            <TouchableOpacity style={styles.mainBtn} onPress={ready ? nextTask : handleCheck}>
                                <Text style={styles.mainBtnText}>{ready ? 'Następne' : 'Sprawdź'}</Text>
                            </TouchableOpacity>

                            <Text style={styles.counterTextSmall}>Zadanie: {stats.count}/{TASKS_LIMIT}</Text>
                            <View style={{height: 30, marginTop: 15, justifyContent: 'center'}}>
                                {msg ? <Text style={[styles.msg, msg.includes('Doskonale') ? styles.correctText : styles.errorText]}>{msg}</Text> : null}
                            </View>
                        </View>
                    </ScrollView>

                    {!isKeyboardVisible && (
                        <View style={styles.iconsBottom}>
                            <Image source={require('../../../assets/happy.png')} style={styles.iconSame} /><Text style={styles.counterTextIcons}>{stats.correct}</Text>
                            <Image source={require('../../../assets/sad.png')} style={styles.iconSame} /><Text style={styles.counterTextIcons}>{stats.wrong}</Text>
                        </View>
                    )}
                </KeyboardAvoidingView>
            </View>
        </TouchableWithoutFeedback>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    keyboardContainer: { flex: 1, justifyContent: 'center' },
    centerContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 20 },
    topButtons: { position: 'absolute', top: 25, right: 20, flexDirection: 'row', zIndex: 10 },
    topBtnItem: { alignItems: 'center', marginLeft: 15 },
    iconTop: { width: 70, height: 70, resizeMode: 'contain', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3 },
    buttonLabel: { fontSize: 14, fontWeight: 'bold', color: '#007AFF', marginTop: 2, textShadowColor: 'rgba(255,255,255,0.8)', textShadowRadius: 3 },
    hintBox: { position: 'absolute', top: 100, right: 20, padding: 15, backgroundColor: '#fff', borderRadius: 15, width: 260, zIndex: 11, elevation: 5, borderWidth: 1, borderColor: '#007AFF' },
    hintTitle: { fontWeight: 'bold', color: '#007AFF', marginBottom: 5 },
    hintText: { fontSize: 14, color: '#333' },

    card: { width: '96%', maxWidth: 600, borderRadius: 25, padding: 20, alignItems: 'center', alignSelf: 'center', elevation: 4, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10 },
    overlayBackground: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: 25 },

    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 5 },
    subHeader: { fontSize: 15, color: '#555', marginBottom: 20, textAlign: 'center' },

    taskContent: { alignItems: 'center', width: '100%', marginBottom: 10 },
    equationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' },

    mixedContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 4 },
    staticWhole: { fontSize: 32, fontWeight: 'bold', color: '#2c3e50', marginRight: 6, marginBottom: 2 },
    staticDecimal: { fontSize: 32, fontWeight: 'bold', color: '#2c3e50', marginHorizontal: 4 },
    fractionStatic: { alignItems: 'center', justifyContent: 'center' },
    staticNum: { fontSize: 24, fontWeight: 'bold', color: '#2c3e50', marginBottom: -2 },
    staticLine: { width: 40, height: 3, backgroundColor: '#2c3e50', marginVertical: 3 },
    staticDen: { fontSize: 24, fontWeight: 'bold', color: '#2c3e50', marginTop: -2 },

    operatorSign: { fontSize: 32, fontWeight: 'bold', color: '#2c3e50', marginHorizontal: 10 },

    mixedInputContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 5 },

    // Большие ячейки
    wholeInput: { width: 70, height: 80, borderWidth: 2, borderColor: '#ccc', borderRadius: 12, backgroundColor: '#fff', fontSize: 34, fontWeight: 'bold', textAlign: 'center', color: '#007AFF', marginRight: 8 },
    decimalInput: { width: 160, height: 80, borderWidth: 2, borderColor: '#ccc', borderRadius: 12, backgroundColor: '#fff', fontSize: 36, fontWeight: 'bold', textAlign: 'center', color: '#007AFF' },
    fractionInputColumn: { alignItems: 'center' },
    fractionInput: { width: 85, height: 65, borderWidth: 2, borderColor: '#ccc', borderRadius: 12, backgroundColor: '#fff', fontSize: 28, fontWeight: 'bold', textAlign: 'center', color: '#007AFF' },
    fractionLineLarge: { width: 95, height: 4, backgroundColor: '#333', marginVertical: 8, borderRadius: 2 },

    inputCorrect: { borderColor: '#28a745', backgroundColor: '#e8f5e9', color: '#28a745' },
    inputError: { borderColor: '#dc3545', backgroundColor: '#fbe9eb', color: '#dc3545' },

    mainBtn: { marginTop: 25, backgroundColor: '#007AFF', paddingHorizontal: 40, paddingVertical: 14, borderRadius: 15 },
    mainBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    counterTextSmall: { fontSize: 13, color: '#555', textAlign: 'center', marginTop: 15 },
    msg: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
    correctText: { color: '#28a745' },
    errorText: { color: '#dc3545' },

    iconsBottom: { position: 'absolute', bottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' },
    iconSame: { width: combinedIconSize, height: combinedIconSize, resizeMode: 'contain', marginHorizontal: 10 },
    counterTextIcons: { fontSize: 20, marginHorizontal: 8, color: '#333' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    drawingContainer: { width: '95%', height: '85%', backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden' },
    drawingHeader: { height: 55, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, backgroundColor: '#f0f0f0' },
    drawingTitle: { fontSize: 18, fontWeight: 'bold' },
    headerButton: { padding: 10 },
    headerButtonText: { fontSize: 16, color: '#007AFF', fontWeight: '600' },
    problemPreviewContainer: { backgroundColor: '#f9f9f9', padding: 12, alignItems: 'center' },
    problemPreviewLabel: { fontSize: 13, color: '#666' },
    problemPreviewTextSmall: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
    canvas: { flex: 1, backgroundColor: '#ffffff' },

    milestoneCard: { width: '90%', backgroundColor: '#fff', borderRadius: 20, padding: 25, alignItems: 'center', elevation: 10 },
    milestoneTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 15 },
    statsRowMilestone: { marginVertical: 10, alignItems: 'center', backgroundColor: '#f8f9fa', padding: 15, borderRadius: 15, width: '100%' },
    statsTextMilestone: { fontSize: 18, color: '#333', fontWeight: 'bold' },
    milestoneButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
    mButton: { paddingVertical: 12, paddingHorizontal: 15, borderRadius: 12, width: '48%', alignItems: 'center' },
    mButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 }
});

export default DecimalFractionTrainer;