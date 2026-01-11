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

const EXERCISE_ID = "FractionDivisionTrainer_cl4";
const { width: screenWidth } = Dimensions.get('window');

// ЛИМИТ ЗАДАНИЙ
const TASKS_LIMIT = 30;

const combinedIconSize = screenWidth * 0.25;

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
                        <Text numberOfLines={2} style={styles.problemPreviewTextSmall}>{problemText}</Text>
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
const FractionDivisionTrainer = () => {
    const navigation = useNavigation();

    // Stan logiki zadania
    const [task, setTask] = useState({
        type: 0,
        q: '', h: '',
        val1: 0, val2: 0,
        targetWhole: null as number | null,
        target1: 0, target2: 0,
    });

    // Inputy
    const [inpWhole, setInpWhole] = useState('');
    const [inp1, setInp1] = useState('');
    const [inp2, setInp2] = useState('');

    const [status, setStatus] = useState<'neutral' | 'correct' | 'wrong'>('neutral');
    const [msg, setMsg] = useState('');
    const [attempts, setAttempts] = useState(0);
    const [ready, setReady] = useState(false);

    // Statystyki
    const [stats, setStats] = useState({ correct: 0, wrong: 0, count: 0 });

    // Модальные окна
    const [showMilestone, setShowMilestone] = useState(false);
    const [isFinished, setIsFinished] = useState(false);

    const [sessionCorrect, setSessionCorrect] = useState(0);

    const [showScratchpad, setShowScratchpad] = useState(false);
    const [showHint, setShowHint] = useState(false);
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);

    const historyRef = useRef<Set<string>>(new Set());

    // Refs
    const wholeRef = useRef<TextInput>(null);
    const inp1Ref = useRef<TextInput>(null);
    const inp2Ref = useRef<TextInput>(null);

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
        setInpWhole(''); setInp1(''); setInp2('');
        setAttempts(0); setShowHint(false);
        bgAnim.setValue(0);

        let newTask: any = {};
        let uniqueKey = "";
        let attemptCount = 0;

        do {
            const type = rnd(0, 2);

            if (type === 0) {
                const a = rnd(1, 15);
                const b = rnd(a + 1, 20);
                newTask = {
                    type: 0,
                    q: `Zapisz iloraz w postaci ułamka.`,
                    h: `Kreska ułamkowa zastępuje znak dzielenia (:).`,
                    val1: a, val2: b,
                    targetWhole: null, target1: a, target2: b,
                };
                uniqueKey = `div2frac-${a}-${b}`;
            }
            else if (type === 1) {
                const a = rnd(1, 15);
                const b = rnd(2, 20);
                newTask = {
                    type: 1,
                    q: `Zapisz ułamek jako dzielenie.`,
                    h: `Licznik to dzielna (pierwsza), mianownik to dzielnik (druga).`,
                    val1: a, val2: b,
                    targetWhole: null, target1: a, target2: b,
                };
                uniqueKey = `frac2div-${a}-${b}`;
            }
            else {
                const den = rnd(2, 9);
                const whole = rnd(1, 5);
                const rem = rnd(1, den - 1);
                const num = whole * den + rem;
                newTask = {
                    type: 2,
                    q: 'Wyłącz całości (zamień na liczbę mieszaną).',
                    h: `Ile razy ${den} mieści się w ${num}? To liczba całości. Reszta idzie do licznika.`,
                    val1: num, val2: den,
                    targetWhole: whole, target1: rem, target2: den
                };
                uniqueKey = `improper-${num}-${den}`;
            }
            attemptCount++;
        } while (historyRef.current.has(uniqueKey) && attemptCount < 20);

        historyRef.current.add(uniqueKey);
        setTask(newTask);

        setTimeout(() => {
            if (newTask.type === 2) wholeRef.current?.focus();
            else inp1Ref.current?.focus();
        }, 400);
    };

    const handleCheck = () => {
        let isCorrect = true;

        if (task.type === 0 || task.type === 1) {
            if (!inp1 || !inp2) { setMsg('Wypełnij oba pola!'); return; }
            if (parseInt(inp1) !== task.target1 || parseInt(inp2) !== task.target2) isCorrect = false;
        } else {
            if (!inpWhole || !inp1 || !inp2) { setMsg('Wypełnij wszystkie pola!'); return; }
            if (parseInt(inpWhole) !== task.targetWhole) isCorrect = false;
            if (parseInt(inp1) !== task.target1) isCorrect = false;
            if (parseInt(inp2) !== task.target2) isCorrect = false;
        }

        if (isCorrect) {
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
            if (attempts === 0) {
                setMsg('Źle... Spróbuj jeszcze raz! ❌');
                setAttempts(1);

                if (task.type === 2) {
                    if (parseInt(inpWhole) !== task.targetWhole) setInpWhole('');
                    if (parseInt(inp1) !== task.target1) setInp1('');
                    if (parseInt(inp2) !== task.target2) setInp2('');
                } else {
                    if (parseInt(inp1) !== task.target1) setInp1('');
                    if (parseInt(inp2) !== task.target2) setInp2('');
                }

                Animated.sequence([
                    Animated.timing(bgAnim, { toValue: -1, duration: 200, useNativeDriver: false }),
                    Animated.timing(bgAnim, { toValue: 0, duration: 200, useNativeDriver: false })
                ]).start();

                setTimeout(() => {
                    setStatus('neutral');
                    if (task.type === 2) {
                        if (parseInt(inpWhole) !== task.targetWhole) wholeRef.current?.focus();
                        else if (parseInt(inp1) !== task.target1) inp1Ref.current?.focus();
                        else if (parseInt(inp2) !== task.target2) inp2Ref.current?.focus();
                    } else {
                        if (parseInt(inp1) !== task.target1) inp1Ref.current?.focus();
                        else if (parseInt(inp2) !== task.target2) inp2Ref.current?.focus();
                    }
                }, 1000);

            } else {
                let correctStr = "";
                if (task.type === 0) correctStr = `${task.target1}/${task.target2}`;
                else if (task.type === 1) correctStr = `${task.target1} : ${task.target2}`;
                else correctStr = `${task.targetWhole} ${task.target1}/${task.target2}`;

                setMsg(`Wynik: ${correctStr}`);
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

    // --- ИСПРАВЛЕННАЯ ФУНКЦИЯ ПЕРЕКЛЮЧЕНИЯ ЗАДАЧ ---
    const nextTask = () => {
        // 1. Сначала проверяем КОНЕЦ ИГРЫ (30 >= 30)
        // Чтобы на 30-й задаче не выскакивало промежуточное окно
        if (stats.count >= TASKS_LIMIT) {
            setIsFinished(true);
            return;
        }

        // 2. Потом проверяем промежуточную статистику (каждые 10)
        if (stats.count > 0 && stats.count % 10 === 0 && !showMilestone) {
            setShowMilestone(true);
            return;
        }

        // 3. Идем дальше
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

    const getInputStyle = (currentVal: string, targetVal: number | null) => {
        if (status === 'correct') return styles.inputCorrect;
        if (status === 'wrong') {
            if (currentVal && parseInt(currentVal) === targetVal) {
                return styles.inputCorrect;
            }
            return styles.inputError;
        }
        return {};
    };

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

                    {/* MODAL MILESTONE (Промежуточная статистика) */}
                    <Modal visible={showMilestone} transparent={true} animationType="slide">
                        <View style={styles.modalOverlay}>
                            <View style={styles.milestoneCard}>
                                <Text style={styles.milestoneTitle}>Podsumowanie serii 📊</Text>
                                <View style={styles.statsRowMilestone}>
                                    <Text style={styles.statsTextMilestone}>Poprawne: {sessionCorrect} / 10</Text>
                                    <Text style={[styles.statsTextMilestone, { color: '#28a745', marginTop: 5 }]}>Skuteczność: {(sessionCorrect / 10 * 100).toFixed(0)}%</Text>
                                </View>
                                <Text style={styles.suggestionTextMilestone}>{sessionCorrect >= 8 ? "Rewelacyjnie! Jesteś mistrzem!" : "Trenuj dalej, aby być jeszcze lepszym."}</Text>
                                <View style={styles.milestoneButtons}>
                                    <TouchableOpacity
                                        style={[styles.mButton, { backgroundColor: '#28a745' }]}
                                        onPress={() => {
                                            setShowMilestone(false);
                                            setSessionCorrect(0);
                                            setStats(s => ({ ...s, count: s.count + 1 }));
                                            generateProblem();
                                        }}
                                    >
                                        <Text style={styles.mButtonText}>Kontynuuj</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.mButton, { backgroundColor: '#007AFF' }]} onPress={() => { setShowMilestone(false); navigation.goBack(); }}>
                                        <Text style={styles.mButtonText}>Inny temat</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>

                    {/* MODAL FINISH (Конец игры) */}
                    <Modal visible={isFinished} transparent={true} animationType="fade">
                        <View style={styles.modalOverlay}>
                            <View style={styles.milestoneCard}>
                                <Text style={styles.milestoneTitle}>Gratulacje! 🏆</Text>
                                <Text style={[styles.suggestionTextMilestone, {fontSize: 18, marginBottom: 10}]}>
                                    Super! Dotarłeś do końca!
                                </Text>
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
                            <Text style={styles.headerTitle}>Ułamek jako dzielenie</Text>
                            <Text style={styles.questionText}>{task.q}</Text>

                            <View style={styles.taskContent}>
                                <View style={styles.equationRow}>

                                    {/* LEWA STRONA (ZADANIE) */}
                                    {task.type === 0 ? (
                                        <View style={styles.rowCenter}>
                                            <Text style={styles.bigNumber}>{task.val1}</Text>
                                            <Text style={styles.symbol}>:</Text>
                                            <Text style={styles.bigNumber}>{task.val2}</Text>
                                        </View>
                                    ) : (
                                        <View style={styles.fractionStatic}>
                                            <Text style={styles.staticNum}>{task.val1}</Text>
                                            <View style={styles.staticLine} />
                                            <Text style={styles.staticDen}>{task.val2}</Text>
                                        </View>
                                    )}

                                    {/* ZNAK RÓWNOŚCI */}
                                    <Text style={styles.equalSign}>=</Text>

                                    {/* PRAWA STRONA (INPUTY) */}
                                    {task.type === 0 ? (
                                        <View style={styles.fractionInputContainer}>
                                            <TextInput
                                                ref={inp1Ref}
                                                style={[styles.fractionInput, getInputStyle(inp1, task.target1)]}
                                                keyboardType="numeric"
                                                placeholder="?"
                                                placeholderTextColor="#ccc"
                                                value={inp1}
                                                onChangeText={setInp1}
                                                onSubmitEditing={() => inp2Ref.current?.focus()}
                                                blurOnSubmit={false}
                                                returnKeyType="next"
                                                editable={!ready}
                                            />
                                            <View style={styles.fractionLineLarge} />
                                            <TextInput
                                                ref={inp2Ref}
                                                style={[styles.fractionInput, getInputStyle(inp2, task.target2)]}
                                                keyboardType="numeric"
                                                placeholder="?"
                                                placeholderTextColor="#ccc"
                                                value={inp2}
                                                onChangeText={setInp2}
                                                returnKeyType="done"
                                                editable={!ready}
                                            />
                                        </View>
                                    ) : task.type === 1 ? (
                                        <View style={styles.rowCenter}>
                                            <TextInput
                                                ref={inp1Ref}
                                                style={[styles.fractionInput, getInputStyle(inp1, task.target1)]}
                                                keyboardType="numeric"
                                                placeholder="?"
                                                placeholderTextColor="#ccc"
                                                value={inp1}
                                                onChangeText={setInp1}
                                                onSubmitEditing={() => inp2Ref.current?.focus()}
                                                blurOnSubmit={false}
                                                returnKeyType="next"
                                                editable={!ready}
                                            />
                                            <Text style={styles.symbol}>:</Text>
                                            <TextInput
                                                ref={inp2Ref}
                                                style={[styles.fractionInput, getInputStyle(inp2, task.target2)]}
                                                keyboardType="numeric"
                                                placeholder="?"
                                                placeholderTextColor="#ccc"
                                                value={inp2}
                                                onChangeText={setInp2}
                                                returnKeyType="done"
                                                editable={!ready}
                                            />
                                        </View>
                                    ) : (
                                        <View style={styles.mixedContainer}>
                                            <TextInput
                                                ref={wholeRef}
                                                style={[styles.wholeInput, getInputStyle(inpWhole, task.targetWhole)]}
                                                keyboardType="numeric"
                                                placeholder="?"
                                                placeholderTextColor="#ccc"
                                                value={inpWhole}
                                                onChangeText={setInpWhole}
                                                onSubmitEditing={() => inp1Ref.current?.focus()}
                                                blurOnSubmit={false}
                                                returnKeyType="next"
                                                editable={!ready}
                                            />
                                            <View style={styles.fractionInputContainer}>
                                                <TextInput
                                                    ref={inp1Ref}
                                                    style={[styles.fractionInputSmall, getInputStyle(inp1, task.target1)]}
                                                    keyboardType="numeric"
                                                    placeholder="?"
                                                    placeholderTextColor="#ccc"
                                                    value={inp1}
                                                    onChangeText={setInp1}
                                                    onSubmitEditing={() => inp2Ref.current?.focus()}
                                                    blurOnSubmit={false}
                                                    returnKeyType="next"
                                                    editable={!ready}
                                                />
                                                <View style={styles.fractionLineSmall} />
                                                <TextInput
                                                    ref={inp2Ref}
                                                    style={[styles.fractionInputSmall, getInputStyle(inp2, task.target2)]}
                                                    keyboardType="numeric"
                                                    placeholder="?"
                                                    placeholderTextColor="#ccc"
                                                    value={inp2}
                                                    onChangeText={setInp2}
                                                    returnKeyType="done"
                                                    editable={!ready}
                                                />
                                            </View>
                                        </View>
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
    card: { width: '92%', maxWidth: 450, borderRadius: 25, padding: 25, alignItems: 'center', alignSelf: 'center', elevation: 4, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10 },
    overlayBackground: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: 25 },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 15 },
    questionText: { fontSize: 19, color: '#2c3e50', textAlign: 'center', fontWeight: '500', lineHeight: 28, marginBottom: 20 },
    taskContent: { alignItems: 'center', width: '100%', marginBottom: 10 },
    equationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' },
    rowCenter: { flexDirection: 'row', alignItems: 'center' },
    mixedContainer: { flexDirection: 'row', alignItems: 'center' },
    fractionStatic: { alignItems: 'center', justifyContent: 'center' },
    staticNum: { fontSize: 28, fontWeight: 'bold', color: '#2c3e50', marginBottom: -2 },
    staticLine: { width: 40, height: 3, backgroundColor: '#2c3e50', marginVertical: 4 },
    staticDen: { fontSize: 28, fontWeight: 'bold', color: '#2c3e50', marginTop: -2 },
    bigNumber: { fontSize: 32, fontWeight: 'bold', color: '#2c3e50' },
    symbol: { fontSize: 32, fontWeight: 'bold', color: '#2c3e50', marginHorizontal: 10 },
    equalSign: { fontSize: 40, fontWeight: 'bold', color: '#2c3e50', marginHorizontal: 15 },
    fractionInputContainer: { alignItems: 'center' },
    fractionInput: { width: 75, height: 60, borderWidth: 2, borderColor: '#ccc', borderRadius: 12, backgroundColor: '#fff', fontSize: 28, fontWeight: 'bold', textAlign: 'center', color: '#007AFF' },
    fractionLineLarge: { width: 90, height: 4, backgroundColor: '#333', marginVertical: 8, borderRadius: 2 },
    wholeInput: { width: 60, height: 80, borderWidth: 2, borderColor: '#ccc', borderRadius: 12, backgroundColor: '#fff', fontSize: 32, fontWeight: 'bold', textAlign: 'center', color: '#007AFF', marginRight: 10 },
    fractionInputSmall: { width: 60, height: 50, borderWidth: 2, borderColor: '#ccc', borderRadius: 10, backgroundColor: '#fff', fontSize: 22, fontWeight: 'bold', textAlign: 'center', color: '#007AFF' },
    fractionLineSmall: { width: 70, height: 3, backgroundColor: '#333', marginVertical: 5, borderRadius: 2 },
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
    suggestionTextMilestone: { fontSize: 15, color: '#666', textAlign: 'center', marginVertical: 20, lineHeight: 22 },
    milestoneButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
    mButton: { paddingVertical: 12, paddingHorizontal: 15, borderRadius: 12, width: '48%', alignItems: 'center' },
    mButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 }
});

export default FractionDivisionTrainer;