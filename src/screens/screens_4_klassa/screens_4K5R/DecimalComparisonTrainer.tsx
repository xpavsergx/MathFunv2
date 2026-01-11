import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, ImageBackground,
    Animated, StatusBar, Image, Dimensions, TouchableOpacity, Modal,
    ScrollView, InteractionManager, Platform
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { awardXpAndCoins } from '../../../services/xpService';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

const EXERCISE_ID = "DecimalComparison_Hard_cl4";

const { width: screenWidth } = Dimensions.get('window');
const TASKS_LIMIT = 30; // Лимит задач
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

// --- ГЛАВНЫЙ КОМПОНЕНТ ---
const DecimalComparisonTrainer = () => {
    const navigation = useNavigation();

    const [task, setTask] = useState({
        q: 'Porównaj liczby',
        h: '',
        val1Str: '',
        val2Str: '',
        correctSign: '='
    });

    const [showScratchpad, setShowScratchpad] = useState(false);
    const [showHint, setShowHint] = useState(false);
    const [msg, setMsg] = useState('');

    const [attempts, setAttempts] = useState(0);
    const [currentSign, setCurrentSign] = useState('?');
    const [boxStatus, setBoxStatus] = useState<'neutral' | 'correct' | 'wrong'>('neutral');
    const [ready, setReady] = useState(false);

    // Статистика
    const [stats, setStats] = useState({ correct: 0, wrong: 0, count: 0 });
    // Возвращаем состояние для промежуточных итогов
    const [showMilestone, setShowMilestone] = useState(false);
    const [sessionCorrect, setSessionCorrect] = useState(0); // Правильные ответы в текущей десятке
    const [isFinished, setIsFinished] = useState(false);

    const historyRef = useRef<Set<string>>(new Set());
    const bgAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => { nextTask(); }, []);

    const rnd = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

    // --- ЛОГИКА ГЕНЕРАЦИИ (Без изменений, сложные числа) ---
    const generateProblem = () => {
        setMsg(''); setReady(false); setShowHint(false); setAttempts(0);
        setCurrentSign('?'); setBoxStatus('neutral');
        bgAnim.setValue(0);

        let n1Str = "";
        let n2Str = "";
        let sign = "";
        let uniqueKey = "";
        let attemptCount = 0;
        let hintText = "";

        do {
            const type = rnd(1, 100);

            // ТИП 1: Ловушка длины
            if (type <= 30) {
                const whole = rnd(0, 15);
                const digitA = rnd(2, 9);
                const digitB = digitA - 1;
                n1Str = `${whole},${digitA}`;
                const tail = rnd(10, 99);
                n2Str = `${whole},${digitB}${tail}`;
                hintText = "Nie patrz na długość liczby! Porównuj cyfry po kolei od lewej strony (części dziesiąte).";
                if (Math.random() > 0.5) { const temp = n1Str; n1Str = n2Str; n2Str = temp; }
            }
            // ТИП 2: Нули в середине
            else if (type <= 55) {
                const whole = rnd(0, 50);
                const digit = rnd(1, 9);
                if (Math.random() > 0.5) {
                    n1Str = `${whole},0${digit}`;
                    n2Str = `${whole},${digit}`;
                } else {
                    n1Str = `${whole},00${rnd(1,9)}`;
                    n2Str = `${whole},0${rnd(1,9)}`;
                }
                hintText = "Zwróć uwagę, gdzie stoi zero po przecinku.";
                if (Math.random() > 0.5) { const temp = n1Str; n1Str = n2Str; n2Str = temp; }
            }
            // ТИП 3: Тысячные доли
            else if (type <= 75) {
                const whole = rnd(0, 20);
                const base = rnd(10, 99);
                const end1 = rnd(0, 9);
                let end2 = rnd(0, 9);
                while(end2 === end1) end2 = rnd(0, 9);
                n1Str = `${whole},${base}${end1}`;
                n2Str = `${whole},${base}${end2}`;
                hintText = "Liczby różnią się dopiero na trzecim miejscu po przecinku.";
            }
            // ТИП 4: Равенство с нулями
            else if (type <= 90) {
                const whole = rnd(0, 99);
                const dec = rnd(1, 99);
                n1Str = `${whole},${dec}`;
                n2Str = `${whole},${dec}00`;
                hintText = "Czy dopisanie zer na końcu po przecinku zmienia wartość?";
                if (Math.random() > 0.5) { const temp = n1Str; n1Str = n2Str; n2Str = temp; }
            }
            // ТИП 5: Большая целая часть
            else {
                const w1 = rnd(100, 999);
                const w2 = w1 - 1;
                n1Str = `${w1},${rnd(0,5)}`;
                n2Str = `${w2},${rnd(800,999)}`;
                hintText = "Najpierw porównaj całości (to, co stoi przed przecinkiem).";
                if (Math.random() > 0.5) { const temp = n1Str; n1Str = n2Str; n2Str = temp; }
            }

            const val1 = parseFloat(n1Str.replace(',', '.'));
            const val2 = parseFloat(n2Str.replace(',', '.'));

            if (val1 > val2) sign = '>';
            else if (val1 < val2) sign = '<';
            else sign = '=';

            uniqueKey = `${n1Str}|${n2Str}`;
            attemptCount++;
        } while (historyRef.current.has(uniqueKey) && attemptCount < 20);

        historyRef.current.add(uniqueKey);

        setTask({
            q: 'Wstaw znak <, > lub =',
            h: hintText,
            val1Str: n1Str,
            val2Str: n2Str,
            correctSign: sign
        });
    };

    const handleSelectSign = (sign: string) => {
        if (ready) return;
        setCurrentSign(sign);
        setBoxStatus('neutral');
        setMsg('');
    };

    const handleCheck = () => {
        if (currentSign === '?') {
            setMsg('Wybierz znak z dołu! ⚠️');
            return;
        }

        if (currentSign === task.correctSign) {
            setBoxStatus('correct');
            setMsg('Doskonale! ✅');
            Animated.timing(bgAnim, { toValue: 1, duration: 500, useNativeDriver: false }).start();
            setStats(s => ({ ...s, correct: s.correct + 1 }));

            // Увеличиваем счетчик правильных ответов для текущей сессии (Milestone)
            setSessionCorrect(prev => prev + 1);

            setReady(true);
            InteractionManager.runAfterInteractions(() => awardXpAndCoins(10, 2));
            const currentUser = auth().currentUser;
            if (currentUser) {
                firestore().collection('users').doc(currentUser.uid).collection('exerciseStats').doc(EXERCISE_ID)
                    .set({ totalCorrect: firestore.FieldValue.increment(1) }, { merge: true }).catch(console.error);
            }
        } else {
            setBoxStatus('wrong');

            if (task.correctSign === '=' && currentSign !== '=') {
                setMsg('Te liczby są równe (zera nie zmieniają wartości).');
            } else if (task.val1Str.length !== task.val2Str.length && Math.random() > 0.5) {
                setMsg('Nie sugeruj się długością liczby! 📏');
            } else {
                setMsg('Błąd... Spróbuj poprawić! ❌');
            }

            if (attempts === 0) {
                setAttempts(1);
                Animated.sequence([
                    Animated.timing(bgAnim, { toValue: -1, duration: 200, useNativeDriver: false }),
                    Animated.timing(bgAnim, { toValue: 0, duration: 200, useNativeDriver: false })
                ]).start();
            } else {
                setMsg(`Poprawny znak to: ${task.correctSign}`);
                setReady(true);
                setStats(s => ({ ...s, wrong: s.wrong + 1 }));
                Animated.timing(bgAnim, { toValue: -1, duration: 500, useNativeDriver: false }).start();
                const currentUser = auth().currentUser;
                if (currentUser) {
                    firestore().collection('users').doc(currentUser.uid).collection('exerciseStats').doc(EXERCISE_ID)
                        .set({ totalWrong: firestore.FieldValue.increment(1) }, { merge: true }).catch(console.error);
                }
            }
        }
    };

    const nextTask = () => {
        // 1. Сначала проверяем, достигли ли мы конца игры (30 вопросов)
        // Если это был 30-й вопрос, сразу показываем ФИНАЛ, игнорируя Milestone
        if (stats.count >= TASKS_LIMIT) {
            setIsFinished(true);
            return;
        }

        // 2. Если не конец игры, проверяем, кратно ли 10 (10, 20...)
        // Показываем Milestone, ТОЛЬКО если это не начало игры
        if (stats.count > 0 && stats.count % 10 === 0 && !showMilestone) {
            setShowMilestone(true);
            return;
        }

        // 3. Если ничего из вышеперечисленного, идем дальше
        setStats(s => ({ ...s, count: s.count + 1 }));
        generateProblem();
    };

    // Функция продолжения после Milestone
    const handleContinueMilestone = () => {
        setShowMilestone(false);
        setSessionCorrect(0); // Сбрасываем счетчик сессии
        setStats(s => ({ ...s, count: s.count + 1 })); // Увеличиваем счетчик вопросов
        generateProblem();
    };

    const handleRestart = () => {
        setIsFinished(false);
        setShowMilestone(false);
        setStats({ correct: 0, wrong: 0, count: 1 });
        setSessionCorrect(0);
        historyRef.current.clear();
        generateProblem();
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

            {/* MODAL MILESTONE (ПРОМЕЖУТОЧНЫЙ) */}
            <Modal visible={showMilestone} transparent={true} animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.milestoneCard}>
                        <Text style={styles.milestoneTitle}>Podsumowanie serii 📊</Text>
                        <View style={styles.statsRowMilestone}>
                            <Text style={styles.statsTextMilestone}>Poprawne: {sessionCorrect} / 10</Text>
                            <Text style={[styles.statsTextMilestone, { color: '#28a745', marginTop: 5 }]}>Skuteczność: {(sessionCorrect / 10 * 100).toFixed(0)}%</Text>
                        </View>
                        <Text style={styles.suggestionTextMilestone}>{sessionCorrect >= 8 ? "Jesteś ekspertem od ułamków!" : "Uważaj na zera po przecinku. Trenuj dalej!"}</Text>
                        <View style={styles.milestoneButtons}>
                            {/* Кнопка продолжает игру через handleContinueMilestone */}
                            <TouchableOpacity style={[styles.mButton, { backgroundColor: '#28a745' }]} onPress={handleContinueMilestone}>
                                <Text style={styles.mButtonText}>Kontynuuj</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.mButton, { backgroundColor: '#007AFF' }]} onPress={() => { setShowMilestone(false); navigation.goBack(); }}>
                                <Text style={styles.mButtonText}>Inny temat</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* MODAL KOŃCOWY (ФИНАЛ) */}
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

            {showHint && (
                <View style={styles.hintBox}><Text style={styles.hintTitle}>Wskazówka:</Text><Text style={styles.hintText}>{task.h}</Text></View>
            )}

            <DrawingModal visible={showScratchpad} onClose={() => setShowScratchpad(false)} problemText={task.q} />

            <ScrollView contentContainerStyle={styles.centerContent}>
                <View style={styles.card}>
                    <View style={styles.overlayBackground} />
                    <Text style={styles.headerTitle}>Porównywanie ułamków</Text>
                    <Text style={styles.questionText}>{task.q}</Text>

                    {/* SEKCJA PORÓWNANIA */}
                    <View style={styles.comparisonContainer}>
                        <View style={styles.sideContainer}>
                            <View style={styles.numberDisplay}>
                                <Text style={[styles.decimalText, task.val1Str.length > 5 && styles.decimalTextSmall]}>{task.val1Str}</Text>
                            </View>
                        </View>

                        <View style={styles.signContainer}>
                            <View style={[
                                styles.signBox,
                                boxStatus === 'correct' ? styles.signBoxCorrect :
                                    boxStatus === 'wrong' ? styles.signBoxWrong :
                                        styles.signBoxNeutral
                            ]}>
                                <Text style={[
                                    styles.signText,
                                    boxStatus === 'neutral' && currentSign === '?' ? {color: '#ccc'} :
                                        boxStatus === 'neutral' ? {color: '#007AFF'} : {color: '#fff'}
                                ]}>
                                    {currentSign}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.sideContainer}>
                            <View style={styles.numberDisplay}>
                                <Text style={[styles.decimalText, task.val2Str.length > 5 && styles.decimalTextSmall]}>{task.val2Str}</Text>
                            </View>
                        </View>
                    </View>

                    {/* PRZYCISKI */}
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

    // CARD
    card: { width: '92%', maxWidth: 450, borderRadius: 25, padding: 25, alignItems: 'center', alignSelf: 'center', elevation: 4, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10 },
    overlayBackground: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: 25 },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 15 },
    questionText: { fontSize: 19, color: '#2c3e50', textAlign: 'center', fontWeight: '500', lineHeight: 28, marginBottom: 20 },

    // PORÓWNANIE
    comparisonContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 30, paddingHorizontal: 5 },
    sideContainer: { alignItems: 'center', flex: 1 },
    numberDisplay: { marginTop: 10, height: 80, justifyContent: 'center', alignItems: 'center' },

    decimalText: { fontSize: 34, fontWeight: 'bold', color: '#2c3e50' },
    decimalTextSmall: { fontSize: 26 }, // Dla długich liczb

    signContainer: { width: 60, alignItems: 'center', justifyContent: 'center' },
    signBox: { width: 60, height: 60, borderRadius: 12, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
    signBoxNeutral: { borderColor: '#ccc', backgroundColor: '#f9f9f9' },
    signBoxCorrect: { borderColor: '#28a745', backgroundColor: '#28a745' },
    signBoxWrong: { borderColor: '#dc3545', backgroundColor: '#dc3545' },
    signText: { fontSize: 32, fontWeight: 'bold' },

    answersRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginTop: 10 },
    answerBtn: { backgroundColor: '#fff', borderWidth: 2, borderColor: '#007AFF', borderRadius: 15, width: 70, height: 70, justifyContent: 'center', alignItems: 'center', elevation: 3 },
    answerBtnSelected: { backgroundColor: '#eef6ff', borderColor: '#005bb5' },
    answerBtnText: { fontSize: 36, fontWeight: 'bold', color: '#007AFF' },

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

export default DecimalComparisonTrainer;