import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TextInput, Keyboard, ImageBackground,
    Animated, StatusBar, Image, Dimensions, TouchableOpacity, Modal,
    Platform, KeyboardAvoidingView, TouchableWithoutFeedback, ScrollView, InteractionManager,
    useColorScheme
} from 'react-native';
import Svg, { Path, Rect, Line } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { awardXpAndCoins } from '../../../services/xpService';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

const EXERCISE_ID = "MixedNumbersTrainer_cl4";
const { width: screenWidth } = Dimensions.get('window');
const TASKS_LIMIT = 40;
const combinedIconSize = screenWidth * 0.25;

// --- MODAL BRUDNOPISU ---
const DrawingModal = ({ visible, onClose, problemText }: { visible: boolean; onClose: () => void, problemText: string }) => {
    const [paths, setPaths] = useState<string[]>([]);
    const [currentPath, setCurrentPath] = useState('');
    const isDarkMode = useColorScheme() === 'dark';

    const theme = {
        bg: isDarkMode ? '#1E293B' : '#fff',
        text: isDarkMode ? '#FFF' : '#333',
        canvas: isDarkMode ? '#0F172A' : '#ffffff',
        stroke: isDarkMode ? '#FFF' : '#000',
        headerBg: isDarkMode ? '#334155' : '#f0f0f0',
        border: isDarkMode ? '#475569' : '#ccc',
        previewBg: isDarkMode ? '#1E293B' : '#f9f9f9',
    };

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
                <View style={[styles.drawingContainer, { backgroundColor: theme.bg }]}>
                    <View style={[styles.drawingHeader, { backgroundColor: theme.headerBg, borderBottomColor: theme.border }]}>
                        <TouchableOpacity onPress={handleClear} style={styles.headerButton}><Text style={styles.headerButtonText}>🗑️ Wyczyść</Text></TouchableOpacity>
                        <Text style={[styles.drawingTitle, { color: theme.text }]}>Brudnopis</Text>
                        <TouchableOpacity onPress={onClose} style={styles.headerButton}><Text style={styles.headerButtonText}>❌ Zamknij</Text></TouchableOpacity>
                    </View>
                    <View style={[styles.problemPreviewContainer, { backgroundColor: theme.previewBg, borderBottomColor: theme.border }]}>
                        <Text style={styles.problemPreviewLabel}>Zadanie:</Text>
                        <Text numberOfLines={2} style={[styles.problemPreviewTextSmall, { color: theme.text }]}>{problemText}</Text>
                    </View>
                    <View style={[styles.canvas, { backgroundColor: theme.canvas }]} onStartShouldSetResponder={() => true} onMoveShouldSetResponder={() => true} onResponderGrant={(evt) => { const { locationX, locationY } = evt.nativeEvent; setCurrentPath(`M${locationX},${locationY}`); }} onResponderMove={onTouchMove} onResponderRelease={onTouchEnd}>
                        <Svg height="100%" width="100%">
                            {paths.map((d, index) => (<Path key={index} d={d} stroke={theme.stroke} strokeWidth={3} fill="none" />))}
                            <Path d={currentPath} stroke={theme.stroke} strokeWidth={3} fill="none" />
                        </Svg>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

// --- WIZUALIZACJA ---
const MixedShape = ({ whole, num, den }: { whole: number, num: number, den: number }) => {
    const isDarkMode = useColorScheme() === 'dark';
    if (!den || den === 0 || isNaN(den)) return null;
    const size = 90;
    const radius = 40; const center = 45;
    const strokeColor = isDarkMode ? '#94A3B8' : '#333';

    const renderCircle = (isFull: boolean) => (
        <Svg height={size} width={size} viewBox={`0 0 ${size} ${size}`}>
            {[...Array(den)].map((_, i) => {
                const startAngle = (i * 360) / den - 90;
                const endAngle = ((i + 1) * 360) / den - 90;
                const x1 = center + radius * Math.cos((Math.PI * startAngle) / 180);
                const y1 = center + radius * Math.sin((Math.PI * startAngle) / 180);
                const x2 = center + radius * Math.cos((Math.PI * endAngle) / 180);
                const y2 = center + radius * Math.sin((Math.PI * endAngle) / 180);
                const d = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`;
                const fill = isFull || i < num ? "#4A90E2" : (isDarkMode ? "#1E293B" : "#FFF");
                return <Path key={i} d={d} fill={fill} stroke={strokeColor} strokeWidth="1" />;
            })}
        </Svg>
    );
    return (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
            {[...Array(whole)].map((_, i) => <View key={`w-${i}`} style={{margin: 2}}>{renderCircle(true)}</View>)}
            {num > 0 && <View key="part" style={{margin: 2}}>{renderCircle(false)}</View>}
        </View>
    );
};

const LiquidCup = ({ full, level, den }: { full: number, level: number, den: number }) => {
    const isDarkMode = useColorScheme() === 'dark';
    if (!den || den === 0) return null;
    const strokeColor = isDarkMode ? '#94A3B8' : '#333';

    const renderCup = (isFull: boolean, fillLevel: number) => {
        const height = 80; const width = 50;
        const fillH = isFull ? height : (fillLevel / den) * height;
        return (
            <View style={{ marginHorizontal: 5, alignItems: 'center' }}>
                <Svg height={90} width={60}>
                    <Rect x="5" y="5" width={width} height={height} stroke={strokeColor} strokeWidth="2" fill="none" />
                    <Rect x="5" y={5 + (height - fillH)} width={width} height={fillH} fill="rgba(74, 144, 226, 0.6)" />
                    {[...Array(den)].map((_, i) => (
                        <Line key={i} x1="5" y1={5 + i * (height / den)} x2="15" y2={5 + i * (height / den)} stroke={strokeColor} strokeWidth="1" />
                    ))}
                </Svg>
            </View>
        );
    };
    return (
        <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
            {[...Array(full)].map((_, i) => <View key={i}>{renderCup(true, den)}</View>)}
            {renderCup(false, level)}
        </View>
    );
};

const MixedNumbersTrainer = () => {
    const navigation = useNavigation();
    const isDarkMode = useColorScheme() === 'dark';

    const theme = {
        bgImage: require('../../../assets/background.jpg'),
        bgOverlay: isDarkMode ? 'rgba(0, 0, 0, 0.7)' : 'transparent',
        topBtnText: isDarkMode ? '#FFFFFF' : '#007AFF',
        textMain: isDarkMode ? '#FFFFFF' : '#333333',
        textSub: isDarkMode ? '#CBD5E1' : '#555555',
        cardOverlay: isDarkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255,255,255,0.94)',
        questionBox: isDarkMode ? '#0F172A' : '#f0f8ff',
        modalContent: isDarkMode ? '#1E293B' : '#fff',
        inputBg: isDarkMode ? '#334155' : '#fff',
        inputBorder: isDarkMode ? '#475569' : '#ccc',
        inputText: isDarkMode ? '#FFFFFF' : '#007AFF',
        fractionLine: isDarkMode ? '#FFFFFF' : '#333',
    };

    const [task, setTask] = useState<any>({
        type: 'visual', q: '', h: '', ans: { w: 0, n: 0, d: 1 },
        whole: 0, num: 0, den: 1, full: 0, level: 0
    });

    const [inputs, setInputs] = useState({ w: '', n: '', d: '' });
    const [correctness, setCorrectness] = useState({ w: null, n: null, d: null });
    const [status, setStatus] = useState<'neutral' | 'correct' | 'wrong'>('neutral');
    const [ready, setReady] = useState(false);
    const [attempts, setAttempts] = useState(0);
    const [msg, setMsg] = useState('');

    const [stats, setStats] = useState({ correct: 0, wrong: 0, count: 0 });
    const [showMilestone, setShowMilestone] = useState(false);
    const [isFinished, setIsFinished] = useState(false);
    const [sessionCorrect, setSessionCorrect] = useState(0);

    const [showScratchpad, setShowScratchpad] = useState(false);
    const [showHint, setShowHint] = useState(false);
    const [keyboardVisible, setKeyboardVisible] = useState(false);

    const bgAnim = useRef(new Animated.Value(0)).current;
    const wRef = useRef<TextInput>(null);
    const nRef = useRef<TextInput>(null);
    const dRef = useRef<TextInput>(null);

    useEffect(() => {
        const k1 = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
        const k2 = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
        nextTask();
        return () => { k1.remove(); k2.remove(); };
    }, []);

    const rnd = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

    const generateProblem = () => {
        setMsg(''); setCorrectness({ w: null, n: null, d: null }); setStatus('neutral');
        setReady(false); setInputs({ w: '', n: '', d: '' });
        setAttempts(0); bgAnim.setValue(0); setShowHint(false);

        const type = rnd(0, 3);
        let q = '', h = '', ans = { w: 0, n: 0, d: 0 }, data = {};

        if (type === 0) {
            const den = [3, 4, 5, 6, 8][rnd(0, 4)];
            const whole = rnd(1, 3);
            const num = rnd(1, den - 1);
            q = "Zapisz liczbę mieszaną przedstawioną na rysunku:";
            h = "Policz całe figury (duża liczba) i zamalowane części ostatniej figury (ułamek).";
            ans = { w: whole, n: num, d: den };
            data = { type: 'visual', whole, num, den };
        } else if (type === 1) {
            const den = [2, 3, 4, 5][rnd(0, 3)];
            const full = rnd(1, 2);
            const level = rnd(1, den - 1);
            q = "Ile łącznie litrów soku jest w naczyniach?";
            h = "Jedno pełne naczynie to 1 cała. Sprawdź na ile części podzielono ostatnie naczynie.";
            ans = { w: full, n: level, d: den };
            data = { type: 'liquid', full, level, den };
        } else {
            const wVal = rnd(1, 5); const nVal = rnd(1, 5); const dVal = rnd(nVal + 1, 10);
            q = `Zapisz za pomocą cyfr: ${wVal} całe i ${nVal}/${dVal}.`;
            h = "Pierwsza liczba to całości (duża liczba), a ułamek zapisz obok.";
            ans = { w: wVal, n: nVal, d: dVal };
            data = { type: 'text' };
        }
        setTask({ q, h, ans, ...data });
    };

    const handleCheck = () => {
        if (!inputs.n || !inputs.d) { setMsg('Uzupełnij ułamek!'); return; }
        const uw = inputs.w === '' ? 0 : parseInt(inputs.w);
        const un = parseInt(inputs.n);
        const ud = parseInt(inputs.d);
        const isW = uw === task.ans.w;
        const isN = un === task.ans.n;
        const isD = ud === task.ans.d;

        if (isW && isN && isD) {
            setStatus('correct');
            setCorrectness({ w: true, n: true, d: true });
            Animated.timing(bgAnim, { toValue: 1, duration: 500, useNativeDriver: false }).start();
            setStats(s => ({ ...s, correct: s.correct + 1 }));
            setSessionCorrect(prev => prev + 1);
            setMsg('Doskonale! ✅');
            setReady(true);
            InteractionManager.runAfterInteractions(() => {
                awardXpAndCoins(10, 2);
                firestore().collection('users').doc(auth().currentUser?.uid).collection('exerciseStats').doc(EXERCISE_ID)
                    .set({ totalCorrect: firestore.FieldValue.increment(1) }, { merge: true }).catch(console.error);
            });
        } else {
            setStatus('wrong');
            const nextAtt = attempts + 1;
            setAttempts(nextAtt);
            if (nextAtt < 2) {
                setMsg('Błąd! Spróbuj poprawić ✍️');
                setInputs(prev => ({
                    w: isW ? prev.w : '',
                    n: isN ? prev.n : '',
                    d: isD ? prev.d : ''
                }));
                setCorrectness({ w: isW, n: isN, d: isD });
                Animated.sequence([
                    Animated.timing(bgAnim, { toValue: -1, duration: 200, useNativeDriver: false }),
                    Animated.timing(bgAnim, { toValue: 0, duration: 200, useNativeDriver: false })
                ]).start();
                setTimeout(() => setStatus('neutral'), 1500);
            } else {
                const wText = task.ans.w > 0 ? `${task.ans.w} ` : '';
                setMsg(`Wynik: ${wText}${task.ans.n}/${task.ans.d}`);
                setStats(s => ({ ...s, wrong: s.wrong + 1 }));
                setReady(true);
                Animated.timing(bgAnim, { toValue: -1, duration: 500, useNativeDriver: false }).start();
                firestore().collection('users').doc(auth().currentUser?.uid).collection('exerciseStats').doc(EXERCISE_ID)
                    .set({ totalWrong: firestore.FieldValue.increment(1) }, { merge: true }).catch(console.error);
            }
        }
    };

    const nextTask = () => {
        if (stats.count >= TASKS_LIMIT) { setIsFinished(true); return; }
        if (stats.count > 0 && stats.count % 10 === 0 && !showMilestone) {
            setShowMilestone(true); return;
        }
        setStats(s => ({ ...s, count: s.count + 1 }));
        generateProblem();
    };

    const handleRestart = () => {
        setIsFinished(false); setStats({ correct: 0, wrong: 0, count: 1 });
        setSessionCorrect(0); generateProblem();
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.container}>
                <StatusBar translucent backgroundColor="transparent" barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
                <ImageBackground source={theme.bgImage} style={StyleSheet.absoluteFillObject} resizeMode="cover">
                    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.bgOverlay }]} pointerEvents="none" />
                </ImageBackground>
                <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: bgAnim.interpolate({ inputRange: [-1, 0, 1], outputRange: ['rgba(255,0,0,0.15)', 'transparent', 'rgba(0,255,0,0.15)'] }) }]} pointerEvents="none" />

                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardContainer}>
                    {!keyboardVisible && (
                        <View style={styles.topButtons}>
                            <TouchableOpacity onPress={() => setShowScratchpad(true)} style={styles.topBtnItem}>
                                <Image source={require('../../../assets/pencil.png')} style={styles.iconTop} />
                                <Text style={[styles.buttonLabel, { color: theme.topBtnText }]}>Brudnopis</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setShowHint(!showHint)} style={styles.topBtnItem}>
                                <Image source={require('../../../assets/question.png')} style={styles.iconTop} />
                                <Text style={[styles.buttonLabel, { color: theme.topBtnText }]}>Pomoc</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* ✅ ДОБАВЛЕНО ОКНО ПОДСКАЗКИ */}
                    {showHint && !keyboardVisible && task.h !== '' && (
                        <View style={[styles.hintBox, { backgroundColor: theme.modalContent, borderColor: '#007AFF' }]}>
                            <Text style={styles.hintTitle}>Jak to zrobić?</Text>
                            <Text style={[styles.hintText, { color: theme.textMain }]}>{task.h}</Text>
                        </View>
                    )}

                    <Modal visible={showMilestone} transparent={true} animationType="slide">
                        <View style={styles.modalOverlay}>
                            <View style={[styles.milestoneCard, { backgroundColor: theme.modalContent }]}>
                                <Text style={[styles.milestoneTitle, { color: theme.textMain }]}>Podsumowanie serii 📊</Text>
                                <View style={styles.statsRowMilestone}><Text style={[styles.statsTextMilestone, { color: theme.textMain }]}>Poprawne: {sessionCorrect} / 10</Text></View>
                                <TouchableOpacity style={[styles.mButton, { backgroundColor: '#28a745', width: '80%' }]} onPress={() => { setShowMilestone(false); setSessionCorrect(0); nextTask(); }}><Text style={styles.mButtonText}>Kontynuuj</Text></TouchableOpacity>
                            </View>
                        </View>
                    </Modal>

                    <Modal visible={isFinished} transparent={true} animationType="fade">
                        <View style={styles.modalOverlay}>
                            <View style={[styles.milestoneCard, { backgroundColor: theme.modalContent }]}>
                                <Text style={[styles.milestoneTitle, { color: theme.textMain }]}>Gratulacje! 🏆</Text>
                                <View style={styles.statsRowMilestone}><Text style={[styles.statsTextMilestone, { color: theme.textMain }]}>Wynik: {stats.correct} / {TASKS_LIMIT}</Text></View>
                                <View style={styles.milestoneButtons}>
                                    <TouchableOpacity style={[styles.mButton, { backgroundColor: '#28a745' }]} onPress={handleRestart}><Text style={styles.mButtonText}>Od nowa</Text></TouchableOpacity>
                                    <TouchableOpacity style={[styles.mButton, { backgroundColor: '#dc3545' }]} onPress={() => { setIsFinished(false); navigation.goBack(); }}><Text style={styles.mButtonText}>Wyjdź</Text></TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>

                    <DrawingModal visible={showScratchpad} onClose={() => setShowScratchpad(false)} problemText={task.q} />

                    <ScrollView contentContainerStyle={styles.centerContent} keyboardShouldPersistTaps="handled">
                        <View style={styles.card}>
                            <View style={[styles.overlayBackground, { backgroundColor: theme.cardOverlay }]} />
                            <Text style={[styles.headerTitle, { color: theme.topBtnText }]}>Liczby mieszane</Text>
                            <View style={[styles.questionBox, { backgroundColor: theme.questionBox }]}>
                                {task.type === 'visual' && <MixedShape whole={task.whole} num={task.num} den={task.den} />}
                                {task.type === 'liquid' && <LiquidCup full={task.full} level={task.level} den={task.den} />}
                                <Text style={[styles.questionText, { color: theme.textMain }]}>{task.q}</Text>
                            </View>

                            <View style={styles.answerSection}>
                                <TextInput
                                    ref={wRef}
                                    style={[styles.wholeInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.inputText }, correctness.w === false && styles.inputError, correctness.w === true && styles.inputCorrect]}
                                    keyboardType="numeric" placeholder="?" placeholderTextColor={isDarkMode ? "#94A3B8" : "#ccc"} value={inputs.w}
                                    onChangeText={(v) => { setInputs({ ...inputs, w: v }); setStatus('neutral'); }}
                                    returnKeyType="next" onSubmitEditing={() => nRef.current?.focus()} blurOnSubmit={false} editable={!ready}
                                />
                                <View style={styles.fractionGroup}>
                                    <TextInput
                                        ref={nRef}
                                        style={[styles.smallInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.inputText }, correctness.n === false && styles.inputError, correctness.n === true && styles.inputCorrect]}
                                        keyboardType="numeric" placeholder="?" placeholderTextColor={isDarkMode ? "#94A3B8" : "#ccc"} value={inputs.n}
                                        onChangeText={(v) => { setInputs({ ...inputs, n: v }); setStatus('neutral'); if(v.length >= 1) dRef.current?.focus(); }}
                                        returnKeyType="next" onSubmitEditing={() => dRef.current?.focus()} blurOnSubmit={false} editable={!ready}
                                    />
                                    <View style={[styles.line, { backgroundColor: theme.fractionLine }]} />
                                    <TextInput
                                        ref={dRef}
                                        style={[styles.smallInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.inputText }, correctness.d === false && styles.inputError, correctness.d === true && styles.inputCorrect]}
                                        keyboardType="numeric" placeholder="?" placeholderTextColor={isDarkMode ? "#94A3B8" : "#ccc"} value={inputs.d}
                                        onChangeText={(v) => { setInputs({ ...inputs, d: v }); setStatus('neutral'); }}
                                        returnKeyType="done" editable={!ready}
                                    />
                                </View>
                            </View>

                            <TouchableOpacity style={[styles.mainBtn, {backgroundColor: ready ? '#28a745' : '#007AFF'}]} onPress={ready ? nextTask : handleCheck}>
                                <Text style={styles.btnText}>{ready ? 'Następne' : 'Sprawdź'}</Text>
                            </TouchableOpacity>
                            <Text style={[styles.taskCounter, { color: theme.textSub }]}>Zadanie {stats.count}/{TASKS_LIMIT}</Text>
                            <View style={styles.msgContainer}>
                                {msg ? <Text style={[styles.msg, status === 'correct' ? styles.correctText : styles.errorText]}>{msg}</Text> : null}
                            </View>
                        </View>
                    </ScrollView>

                    {!keyboardVisible && (
                        <View style={styles.iconsBottom}>
                            <Image source={require('../../../assets/happy.png')} style={styles.owl} /><Text style={[styles.score, { color: theme.textMain }]}>{stats.correct}</Text>
                            <Image source={require('../../../assets/sad.png')} style={styles.owl} /><Text style={[styles.score, { color: theme.textMain }]}>{stats.wrong}</Text>
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
    topButtons: { position: 'absolute', top: 40, right: 20, flexDirection: 'row', zIndex: 100 },
    topBtnItem: { alignItems: 'center', marginLeft: 15 },
    iconTop: { width: 70, height: 70, resizeMode: 'contain' },
    buttonLabel: { fontSize: 14, fontWeight: 'bold', marginTop: 2 },
    // ✅ СТИЛИ ДЛЯ ОКНА ПОДСКАЗКИ
    hintBox: {
        position: 'absolute',
        top: 130,
        right: 20,
        padding: 15,
        borderRadius: 15,
        width: 260,
        zIndex: 150,
        elevation: 10,
        borderWidth: 2
    },
    hintTitle: { fontWeight: 'bold', color: '#007AFF', marginBottom: 5, fontSize: 16 },
    hintText: { fontSize: 15, lineHeight: 22 },

    card: { width: '92%', maxWidth: 450, borderRadius: 25, padding: 25, alignItems: 'center', alignSelf: 'center', elevation: 4 },
    overlayBackground: { ...StyleSheet.absoluteFillObject, borderRadius: 25 },
    headerTitle: { fontSize: 20, fontWeight: '800', marginBottom: 15, textTransform: 'uppercase' },
    questionBox: { width: '100%', padding: 15, borderRadius: 15, marginBottom: 15, alignItems: 'center' },
    questionText: { fontSize: 18, textAlign: 'center', fontWeight: '500', lineHeight: 26 },
    answerSection: { flexDirection: 'row', alignItems: 'center', marginVertical: 10 },
    wholeInput: { width: 70, height: 80, borderWidth: 2, borderRadius: 12, fontSize: 32, textAlign: 'center', marginRight: 15, fontWeight: 'bold' },
    fractionGroup: { alignItems: 'center' },
    smallInput: { width: 70, height: 50, borderWidth: 2, borderRadius: 10, fontSize: 24, textAlign: 'center', fontWeight: 'bold' },
    line: { width: 85, height: 3, marginVertical: 6 },
    inputCorrect: { borderColor: '#28a745' },
    inputError: { borderColor: '#dc3545' },
    mainBtn: { marginTop: 20, paddingHorizontal: 40, paddingVertical: 14, borderRadius: 15 },
    btnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    taskCounter: { marginTop: 15, fontSize: 13, textAlign: 'center' },
    msgContainer: { height: 40, marginTop: 10, justifyContent: 'center' },
    msg: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
    correctText: { color: '#28a745' },
    errorText: { color: '#dc3545' },
    iconsBottom: { position: 'absolute', bottom: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' },
    owl: { width: combinedIconSize, height: combinedIconSize, resizeMode: 'contain', marginHorizontal: 10 },
    score: { fontSize: 22, fontWeight: 'bold' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    milestoneCard: { width: '90%', borderRadius: 20, padding: 25, alignItems: 'center' },
    milestoneTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 15 },
    statsRowMilestone: { marginVertical: 15, alignItems: 'center' },
    statsTextMilestone: { fontSize: 18, fontWeight: 'bold' },
    milestoneButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
    mButton: { paddingVertical: 12, borderRadius: 12, width: '48%', alignItems: 'center' },
    mButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
    drawingContainer: { width: '95%', height: '85%', borderRadius: 20, overflow: 'hidden' },
    drawingHeader: { height: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, borderBottomWidth: 1 },
    drawingTitle: { fontSize: 18, fontWeight: 'bold' },
    problemPreviewContainer: { padding: 10, alignItems: 'center', borderBottomWidth: 1 },
    problemPreviewLabel: { fontSize: 12, color: '#777' },
    problemPreviewTextSmall: { fontSize: 16, fontWeight: '600' },
    canvas: { flex: 1 },
    headerButton: { padding: 10 },
    headerButtonText: { fontSize: 16, color: '#007AFF', fontWeight: '600' }
});

export default MixedNumbersTrainer;