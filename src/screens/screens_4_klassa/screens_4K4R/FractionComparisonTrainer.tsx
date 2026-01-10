import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, ImageBackground,
    Animated, StatusBar, Image, Dimensions, TouchableOpacity, Modal,
    ScrollView, InteractionManager, Platform, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { awardXpAndCoins } from '../../../services/xpService';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

const EXERCISE_ID = "fractionComparisonTrainer_cl4";

const { width: screenWidth } = Dimensions.get('window');
const TASKS_LIMIT = 35;
const combinedIconSize = screenWidth * 0.25;

// --- MODAL BRUDNOPISU (Без изменений) ---
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

// --- ВИЗУАЛИЗАЦИЯ ---
const FractionPie = ({ whole, num, den, color = "#4A90E2" }: { whole: number, num: number, den: number, color?: string }) => {
    const size = 60;
    const radius = 28; const center = 30;
    const renderCircle = (fillColor: string, isPartial: boolean = false) => (
        <Svg height={size} width={size} viewBox={`0 0 ${size} ${size}`}>
            <Circle cx={center} cy={center} r={radius} stroke="#333" strokeWidth="1.5" fill="#fff" />
            {isPartial ? (
                [...Array(den)].map((_, i) => {
                    const startAngle = (i * 360) / den - 90;
                    const endAngle = ((i + 1) * 360) / den - 90;
                    const x1 = center + radius * Math.cos((Math.PI * startAngle) / 180);
                    const y1 = center + radius * Math.sin((Math.PI * startAngle) / 180);
                    const x2 = center + radius * Math.cos((Math.PI * endAngle) / 180);
                    const y2 = center + radius * Math.sin((Math.PI * endAngle) / 180);
                    const d = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`;
                    const isActive = i < num;
                    return <Path key={i} d={d} fill={isActive ? fillColor : "transparent"} stroke="#333" strokeWidth="0.5" />;
                })
            ) : (
                <Circle cx={center} cy={center} r={radius} fill={fillColor} stroke="#333" strokeWidth="1.5" />
            )}
        </Svg>
    );
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {[...Array(whole)].map((_, i) => <View key={`w-${i}`} style={{ margin: 1 }}>{renderCircle(color, false)}</View>)}
            {num > 0 && <View key="part" style={{ margin: 1 }}>{renderCircle(color, true)}</View>}
        </View>
    );
};

// --- ГЛАВНЫЙ КОМПОНЕНТ ---
const FractionComparisonTrainer = () => {
    const [task, setTask] = useState({
        type: 'text',
        q: 'Porównaj ułamki',
        h: '',
        left: { w: 0, n: 0, d: 1 },
        right: { w: 0, n: 0, d: 1 },
        correctSign: '='
    });

    const [showScratchpad, setShowScratchpad] = useState(false);
    const [showHint, setShowHint] = useState(false);
    const [msg, setMsg] = useState('');

    // Состояние логики
    const [attempts, setAttempts] = useState(0);
    const [currentSign, setCurrentSign] = useState('?'); // Текущий выбранный знак
    const [boxStatus, setBoxStatus] = useState<'neutral' | 'correct' | 'wrong'>('neutral');
    const [ready, setReady] = useState(false); // Готовность к следующему вопросу (Sprawdź -> Następne)

    // Статистика
    const [stats, setStats] = useState({ correct: 0, wrong: 0, count: 0 });
    const historyRef = useRef<Set<string>>(new Set());
    const bgAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => { nextTask(); }, []);

    const rnd = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

    const generateProblem = () => {
        setMsg(''); setReady(false); setShowHint(false); setAttempts(0);
        setCurrentSign('?'); setBoxStatus('neutral');
        bgAnim.setValue(0);

        let left = { w: 0, n: 1, d: 2 };
        let right = { w: 0, n: 1, d: 2 };
        let h = "";
        let q = "Wstaw znak <, > lub =";
        let isVisual = false;
        let uniqueKey = "";
        let attemptCount = 0;

        do {
            const randType = Math.random();
            if (randType < 0.35) {
                const d = rnd(4, 25);
                left = { w: 0, n: rnd(1, d - 1), d: d };
                let n2 = rnd(1, d - 1);
                while (n2 === left.n) n2 = rnd(1, d - 1);
                right = { w: 0, n: n2, d: d };
                h = "Mianowniki są takie same. Porównaj liczniki.";
            } else if (randType < 0.70) {
                const n = rnd(1, 8);
                let d1 = rnd(n + 1, 20);
                let d2 = rnd(n + 1, 20);
                while (d1 === d2) d2 = rnd(n + 1, 20);
                left = { w: 0, n: n, d: d1 };
                right = { w: 0, n: n, d: d2 };
                h = "Liczniki są takie same.\nWIĘKSZY jest ten ułamek, który ma MNIEJSZY mianownik.";
            } else if (randType < 0.85) {
                if (Math.random() > 0.5) {
                    const d = rnd(3, 9);
                    left = { w: 0, n: rnd(1, d-1), d: d };
                    right = { w: 0, n: rnd(d+1, d+4), d: d };
                    h = "Jeden ułamek jest mniejszy od 1, a drugi większy.";
                } else {
                    left = { w: 0, n: rnd(1, 8), d: rnd(2, 9) };
                    right = { w: 1, n: 0, d: 1 };
                    h = "Czy licznik jest większy od mianownika?";
                }
                if(Math.random() > 0.5) { const temp = left; left = right; right = temp; }
            } else {
                if (Math.random() > 0.5) {
                    const d = rnd(3, 10);
                    left = { w: rnd(1, 3), n: rnd(1, d-1), d: d };
                    right = { w: left.w + (Math.random() > 0.5 ? 1 : -1), n: rnd(1, d-1), d: d };
                    if (right.w < 1) right.w = left.w + 1;
                    h = "Porównaj najpierw całości.";
                } else {
                    isVisual = true;
                    const d = [4, 6, 8, 10][rnd(0, 3)];
                    left = { w: 0, n: rnd(1, d-1), d: d };
                    let n2 = rnd(1, d-1);
                    while(n2 === left.n) n2 = rnd(1, d-1);
                    right = { w: 0, n: n2, d: d };
                    q = "Gdzie zamalowano więcej?";
                    h = "Spójrz na rysunki.";
                }
            }
            uniqueKey = `${left.w}-${left.n}-${left.d}|${right.w}-${right.n}-${right.d}`;
            attemptCount++;
        } while (historyRef.current.has(uniqueKey) && attemptCount < 20);

        historyRef.current.add(uniqueKey);

        const valL = left.w + (left.n / left.d);
        const valR = right.w + (right.n / right.d);
        let sign = '=';
        if (Math.abs(valL - valR) < 0.0001) sign = '=';
        else if (valL > valR) sign = '>';
        else sign = '<';

        setTask({ type: isVisual ? 'visual' : 'text', q, h, left, right, correctSign: sign });
    };

    // Функция ВЫБОРА знака (просто ставит его в окошко)
    const handleSelectSign = (sign: string) => {
        if (ready) return; // Если уже ответили правильно, не даем менять
        setCurrentSign(sign);
        setBoxStatus('neutral'); // Сбрасываем цвет если меняем выбор
        setMsg('');
    };

    // Функция ПРОВЕРКИ (по нажатию на кнопку Sprawdź)
    const handleCheck = () => {
        if (currentSign === '?') {
            setMsg('Wybierz znak!');
            return;
        }

        if (currentSign === task.correctSign) {
            // ПРАВИЛЬНО
            setBoxStatus('correct');
            setMsg('Doskonale! ✅');
            Animated.timing(bgAnim, { toValue: 1, duration: 500, useNativeDriver: false }).start();
            setStats(s => ({ ...s, correct: s.correct + 1 }));
            setReady(true); // Кнопка меняется на "Następne"
            InteractionManager.runAfterInteractions(() => awardXpAndCoins(10, 2));
            const currentUser = auth().currentUser;
            if (currentUser) {
                firestore()
                    .collection('users')
                    .doc(currentUser.uid)
                    .collection('exerciseStats')
                    .doc(EXERCISE_ID)
                    .set({
                        totalCorrect: firestore.FieldValue.increment(1)
                    }, { merge: true })
                    .catch(error => console.error("Błąd zapisu do bazy:", error));
            }
        } else {
            // НЕПРАВИЛЬНО
            setBoxStatus('wrong');

            if (attempts === 0) {
                // Первая попытка
                setMsg('Źle... Spróbuj poprawić! ❌');
                setAttempts(1);
                // Анимация тряски
                Animated.sequence([
                    Animated.timing(bgAnim, { toValue: -1, duration: 200, useNativeDriver: false }),
                    Animated.timing(bgAnim, { toValue: 0, duration: 200, useNativeDriver: false })
                ]).start();
                // Кнопка остается "Sprawdź", пользователь может выбрать другой знак
            } else {
                // Вторая попытка (Конец)
                setMsg(`Niestety źle. Prawidłowy znak to: ${task.correctSign}`);
                setReady(true); // Кнопка меняется на "Następne"
                setStats(s => ({ ...s, wrong: s.wrong + 1 }));
                Animated.timing(bgAnim, { toValue: -1, duration: 500, useNativeDriver: false }).start();
                InteractionManager.runAfterInteractions(() => {
                    const currentUser = auth().currentUser;
                    if (currentUser) {
                        firestore()
                            .collection('users')
                            .doc(currentUser.uid)
                            .collection('exerciseStats')
                            .doc(EXERCISE_ID)
                            .set({
                                totalWrong: firestore.FieldValue.increment(1)
                            }, { merge: true })
                            .catch(error => console.error("Błąd zapisu błędnych:", error));
                    }
                });
            }
        }
    };

    const nextTask = () => {
        if (stats.count >= TASKS_LIMIT) { setMsg('Koniec treningu! 🏆'); return; }
        setStats(s => ({ ...s, count: s.count + 1 }));
        generateProblem();
    };

    const renderFractionNumber = (f: { w: number, n: number, d: number }) => {
        if (f.w >= 1 && f.n === 0 && f.d === 1) return <Text style={styles.wholeNumberBig}>{f.w}</Text>;
        return (
            <View style={styles.fractionContainer}>
                {f.w > 0 && <Text style={styles.wholeNumber}>{f.w}</Text>}
                {f.d > 1 && (
                    <View style={styles.fractionPart}>
                        <Text style={styles.numerator}>{f.n}</Text>
                        <View style={styles.fractionLine} />
                        <Text style={styles.denominator}>{f.d}</Text>
                    </View>
                )}
            </View>
        );
    };

    const getSignBoxStyle = () => {
        if (boxStatus === 'correct') return styles.signBoxCorrect;
        if (boxStatus === 'wrong') return styles.signBoxWrong;
        return styles.signBoxNeutral;
    };

    return (
        <View style={styles.container}>
            <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
            <ImageBackground source={require('../../../assets/background.jpg')} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
            <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: bgAnim.interpolate({ inputRange: [-1, 0, 1], outputRange: ['rgba(255,0,0,0.15)', 'transparent', 'rgba(0,255,0,0.15)'] }) }]} pointerEvents="none" />

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

            {showHint && (
                <View style={styles.hintBox}>
                    <Text style={styles.hintTitle}>Wskazówka:</Text>
                    <Text style={styles.hintText}>{task.h}</Text>
                </View>
            )}

            <DrawingModal visible={showScratchpad} onClose={() => setShowScratchpad(false)} problemText={task.q} />

            <ScrollView contentContainerStyle={styles.centerContent}>
                <View style={styles.card}>
                    <View style={styles.overlayBackground} />
                    <Text style={styles.headerTitle}>Porównywanie ułamków</Text>
                    <Text style={styles.questionText}>{task.q}</Text>

                    <View style={styles.comparisonContainer}>
                        <View style={styles.sideContainer}>
                            {task.type === 'visual' && <FractionPie whole={task.left.w} num={task.left.n} den={task.left.d} color="#4A90E2" />}
                            <View style={styles.numberDisplay}>{renderFractionNumber(task.left)}</View>
                        </View>
                        <View style={styles.signContainer}>
                            <View style={[styles.signBox, getSignBoxStyle()]}>
                                <Text style={[styles.signText, boxStatus === 'neutral' ? {} : {color: '#fff'}]}>{currentSign}</Text>
                            </View>
                        </View>
                        <View style={styles.sideContainer}>
                            {task.type === 'visual' && <FractionPie whole={task.right.w} num={task.right.n} den={task.right.d} color="#F5A623" />}
                            <View style={styles.numberDisplay}>{renderFractionNumber(task.right)}</View>
                        </View>
                    </View>

                    {/* КНОПКИ ВЫБОРА ЗНАКА */}
                    <View style={styles.answersRow}>
                        <TouchableOpacity style={[styles.answerBtn, currentSign === '<' && styles.answerBtnSelected]} onPress={() => handleSelectSign('<')}>
                            <Text style={styles.answerBtnText}>&lt;</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.answerBtn, currentSign === '=' && styles.answerBtnSelected]} onPress={() => handleSelectSign('=')}>
                            <Text style={styles.answerBtnText}>=</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.answerBtn, currentSign === '>' && styles.answerBtnSelected]} onPress={() => handleSelectSign('>')}>
                            <Text style={styles.answerBtnText}>&gt;</Text>
                        </TouchableOpacity>
                    </View>

                    {/* ГЛАВНАЯ КНОПКА (Sprawdź / Następne) */}
                    <TouchableOpacity style={styles.mainBtn} onPress={ready ? nextTask : handleCheck}>
                        <Text style={styles.mainBtnText}>{ready ? 'Następne' : 'Sprawdź'}</Text>
                    </TouchableOpacity>

                    <Text style={styles.counterTextSmall}>Zadanie: {stats.count}/{TASKS_LIMIT}</Text>

                    <View style={{height: 30, marginTop: 15, justifyContent: 'center'}}>
                        {msg ? <Text style={[styles.msg, msg.includes('Doskonale') ? styles.correctText : styles.errorText]}>{msg}</Text> : null}
                    </View>
                </View>
            </ScrollView>

            <View style={styles.iconsBottom}>
                <Image source={require('../../../assets/happy.png')} style={styles.iconSame} />
                <Text style={styles.counterTextIcons}>{stats.correct}</Text>
                <Image source={require('../../../assets/sad.png')} style={styles.iconSame} />
                <Text style={styles.counterTextIcons}>{stats.wrong}</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
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

    comparisonContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 30, paddingHorizontal: 5 },
    sideContainer: { alignItems: 'center', flex: 1 },
    numberDisplay: { marginTop: 10, height: 80, justifyContent: 'center', alignItems: 'center' },
    fractionContainer: { flexDirection: 'row', alignItems: 'center' },
    wholeNumber: { fontSize: 40, fontWeight: 'bold', color: '#2c3e50', marginRight: 8 },
    wholeNumberBig: { fontSize: 50, fontWeight: 'bold', color: '#2c3e50' },
    fractionPart: { alignItems: 'center', justifyContent: 'center' },
    numerator: { fontSize: 28, fontWeight: 'bold', color: '#2c3e50', marginBottom: -2 },
    fractionLine: { width: 40, height: 3, backgroundColor: '#2c3e50', marginVertical: 4, borderRadius: 2 },
    denominator: { fontSize: 28, fontWeight: 'bold', color: '#2c3e50', marginTop: -2 },

    signContainer: { width: 60, alignItems: 'center', justifyContent: 'center' },
    signBox: { width: 55, height: 55, borderRadius: 12, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
    signBoxNeutral: { borderColor: '#ccc', backgroundColor: '#f9f9f9' },
    signBoxCorrect: { borderColor: '#28a745', backgroundColor: '#28a745' },
    signBoxWrong: { borderColor: '#dc3545', backgroundColor: '#dc3545' },
    signText: { fontSize: 32, fontWeight: 'bold', color: '#007AFF' },

    answersRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginTop: 10 },
    answerBtn: { backgroundColor: '#fff', borderWidth: 2, borderColor: '#007AFF', borderRadius: 15, width: 70, height: 70, justifyContent: 'center', alignItems: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 3 },
    answerBtnSelected: { backgroundColor: '#eef6ff', borderColor: '#005bb5', transform: [{scale: 1.05}] }, // Легкая подсветка выбранной кнопки
    answerBtnText: { fontSize: 36, fontWeight: 'bold', color: '#007AFF' },

    // КНОПКА SPRAWDŹ / NASTĘPNE
    mainBtn: { marginTop: 20, backgroundColor: '#007AFF', paddingHorizontal: 40, paddingVertical: 14, borderRadius: 15 },
    mainBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

    counterTextSmall: { fontSize: Math.max(12, screenWidth * 0.035), fontWeight: '400', color: '#555', textAlign: 'center', marginTop: 15 },

    msg: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
    correctText: { color: '#28a745' },
    errorText: { color: '#dc3545' },

    iconsBottom: { position: 'absolute', bottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' },
    iconSame: { width: combinedIconSize, height: combinedIconSize, resizeMode: 'contain', marginHorizontal: 10 },
    counterTextIcons: { fontSize: Math.max(14, combinedIconSize * 0.28), marginHorizontal: 8, textAlign: 'center', color: '#333' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
    drawingContainer: { width: '95%', height: '85%', backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden' },
    drawingHeader: { height: 55, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, backgroundColor: '#f0f0f0' },
    drawingTitle: { fontSize: 18, fontWeight: 'bold' },
    headerButton: { padding: 10 },
    headerButtonText: { fontSize: 16, color: '#007AFF', fontWeight: '600' },
    problemPreviewContainer: { backgroundColor: '#eef6fc', padding: 12, alignItems: 'center' },
    problemPreviewLabel: { fontSize: 13, color: '#666' },
    problemPreviewTextSmall: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
    canvas: { flex: 1, backgroundColor: '#fff' },
});

export default FractionComparisonTrainer;