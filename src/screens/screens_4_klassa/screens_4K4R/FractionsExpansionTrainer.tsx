import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TextInput, Keyboard, ImageBackground,
    Animated, StatusBar, Image, Dimensions, TouchableOpacity, Modal,
    Platform, KeyboardAvoidingView, TouchableWithoutFeedback, ScrollView, InteractionManager,
    useColorScheme
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { awardXpAndCoins } from '../../../services/xpService';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

const EXERCISE_ID = "FractionsExpansionTrainer_cl4";
const { width: screenWidth } = Dimensions.get('window');
const TASKS_LIMIT = 40;
const combinedIconSize = screenWidth * 0.25;

// --- MODAL BRUDNOPISU (SCRATCHPAD) ---
const DrawingModal = ({ visible, onClose, problemText }: { visible: boolean; onClose: () => void, problemText: string }) => {
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
                <View style={[styles.drawingContainer, { backgroundColor: theme.bg }]}>
                    <View style={[styles.drawingHeader, { backgroundColor: theme.headerBg }]}>
                        <TouchableOpacity onPress={handleClear} style={styles.headerButton}><Text style={styles.headerButtonText}>🗑️ Wyczyść</Text></TouchableOpacity>
                        <Text style={[styles.drawingTitle, { color: theme.text }]}>Brudnopis</Text>
                        <TouchableOpacity onPress={onClose} style={styles.headerButton}><Text style={styles.headerButtonText}>❌ Zamknij</Text></TouchableOpacity>
                    </View>
                    <View style={[styles.problemPreviewContainer, { backgroundColor: theme.previewBg }]}>
                        <Text style={styles.problemPreviewLabel}>Zadanie:</Text>
                        <Text numberOfLines={2} style={[styles.problemPreviewTextSmall, { color: theme.text }]}>{problemText}</Text>
                    </View>
                    <View
                        style={[styles.canvas, { backgroundColor: theme.canvas }]}
                        onStartShouldSetResponder={() => true}
                        onMoveShouldSetResponder={() => true}
                        onResponderGrant={(evt) => { const { locationX, locationY } = evt.nativeEvent; setCurrentPath(`M${locationX},${locationY}`); }}
                        onResponderMove={onTouchMove}
                        onResponderRelease={onTouchEnd}
                    >
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

// --- GŁÓWNY KOMPONENT ---
const FractionsExpansionTrainer = () => {
    const navigation = useNavigation();
    const isDarkMode = useColorScheme() === 'dark';

    const theme = {
        bgImage: require('../../../assets/background.jpg'),
        bgOverlay: isDarkMode ? 'rgba(0, 0, 0, 0.75)' : 'transparent',
        topBtnText: isDarkMode ? '#FFFFFF' : '#007AFF',
        cardOverlay: isDarkMode ? 'rgba(30, 41, 59, 0.96)' : 'rgba(255,255,255,0.94)',
        textMain: isDarkMode ? '#FFFFFF' : '#2c3e50',
        textSub: isDarkMode ? '#94A3B8' : '#555',
        modalContent: isDarkMode ? '#1E293B' : '#fff',
        inputBg: isDarkMode ? '#334155' : '#fff',
        inputBorder: isDarkMode ? '#475569' : '#ccc',
        inputText: isDarkMode ? '#FFFFFF' : '#007AFF',
        fractionLine: isDarkMode ? '#FFFFFF' : '#333',
        correctBg: isDarkMode ? 'rgba(21, 87, 36, 0.5)' : '#e8f5e9',
        errorBg: isDarkMode ? 'rgba(114, 28, 36, 0.5)' : '#fbe9eb',
    };

    const [task, setTask] = useState({
        type: 0, q: '', h: '', leftNum: 1, leftDen: 1,
        rightNumTarget: 0, rightDenTarget: 0,
        isRightNumInput: false, isRightDenInput: false
    });

    const [userNum, setUserNum] = useState('');
    const [userDen, setUserDen] = useState('');
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
    const numInputRef = useRef<TextInput>(null);
    const denInputRef = useRef<TextInput>(null);
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
        setUserNum(''); setUserDen(''); setAttempts(0); setShowHint(false);
        bgAnim.setValue(0);

        let newTask: any = {};
        let uniqueKey = "";
        let attemptCount = 0;
        const bases = [[1,2], [1,3], [2,3], [1,4], [3,4], [1,5], [2,5], [3,5], [4,5], [1,6], [5,6]];

        do {
            const type = rnd(0, 2);
            const base = bases[rnd(0, bases.length - 1)];
            const bn = base[0]; const bd = base[1];

            if (type === 0) { // SIMPLIFY
                const multiplier = rnd(2, 5);
                newTask = {
                    type: 0, q: `Skróć ułamek.`,
                    h: `Podziel licznik i mianownik przez wspólny dzielnik (np. przez ${multiplier}).`,
                    leftNum: bn * multiplier, leftDen: bd * multiplier,
                    rightNumTarget: bn, rightDenTarget: bd,
                    isRightNumInput: true, isRightDenInput: true
                };
                uniqueKey = `simp-${bn * multiplier}-${bd * multiplier}`;
            } else if (type === 1) { // EXPAND
                const multiplier = rnd(2, 4);
                newTask = {
                    type: 1, q: `Rozszerz ułamek przez ${multiplier}.`,
                    h: `Pomnóż licznik i mianownik przez ${multiplier}.`,
                    leftNum: bn, leftDen: bd,
                    rightNumTarget: bn * multiplier, rightDenTarget: bd * multiplier,
                    isRightNumInput: true, isRightDenInput: true
                };
                uniqueKey = `exp-${bn}-${bd}-${multiplier}`;
            } else { // EQUALITY (FIND MISSING)
                const multiplier = rnd(2, 4);
                const missingTop = Math.random() > 0.5;
                newTask = {
                    type: 2, q: 'Wpisz brakującą liczbę.',
                    h: missingTop ? `Pomnóż licznik przez ${multiplier}.` : `Pomnóż mianownik przez ${multiplier}.`,
                    leftNum: bn, leftDen: bd,
                    rightNumTarget: bn * multiplier, rightDenTarget: bd * multiplier,
                    isRightNumInput: missingTop, isRightDenInput: !missingTop
                };
                uniqueKey = `eq-${bn}-${bd}-${multiplier}-${missingTop ? 'top' : 'bot'}`;
            }
            attemptCount++;
        } while (historyRef.current.has(uniqueKey) && attemptCount < 20);

        historyRef.current.add(uniqueKey);
        setTask(newTask);
        setTimeout(() => {
            if (newTask.isRightNumInput) numInputRef.current?.focus();
            else if (newTask.isRightDenInput) denInputRef.current?.focus();
        }, 400);
    };

    const handleCheck = () => {
        if ((task.isRightNumInput && !userNum) || (task.isRightDenInput && !userDen)) {
            setMsg('Wypełnij puste pola!');
            return;
        }

        const isNCorrect = !task.isRightNumInput || parseInt(userNum) === task.rightNumTarget;
        const isDCorrect = !task.isRightDenInput || parseInt(userDen) === task.rightDenTarget;

        if (isNCorrect && isDCorrect) {
            setStatus('correct'); setMsg('Doskonale! ✅');
            Animated.timing(bgAnim, { toValue: 1, duration: 500, useNativeDriver: false }).start();
            setStats(s => ({ ...s, correct: s.correct + 1 }));
            setSessionCorrect(prev => prev + 1);
            setReady(true);
            InteractionManager.runAfterInteractions(() => awardXpAndCoins(10, 2));
        } else {
            setStatus('wrong');
            if (attempts === 0) {
                setMsg('Błąd! Spróbuj poprawić ✍️');
                setAttempts(1);
                if (task.isRightNumInput && !isNCorrect) setUserNum('');
                if (task.isRightDenInput && !isDCorrect) setUserDen('');
                Animated.sequence([
                    Animated.timing(bgAnim, { toValue: -1, duration: 200, useNativeDriver: false }),
                    Animated.timing(bgAnim, { toValue: 0, duration: 200, useNativeDriver: false })
                ]).start();
                setTimeout(() => setStatus('neutral'), 1500);
            } else {
                setMsg(`Niestety źle. Wynik: ${task.rightNumTarget}/${task.rightDenTarget}`);
                setReady(true);
                setStats(s => ({ ...s, wrong: s.wrong + 1 }));
                Animated.timing(bgAnim, { toValue: -1, duration: 500, useNativeDriver: false }).start();
            }
        }
    };

    const nextTask = () => {
        if (stats.count >= TASKS_LIMIT) {
            setIsFinished(true);
            return;
        }
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

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.container}>
                <StatusBar translucent backgroundColor="transparent" barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

                <ImageBackground source={theme.bgImage} style={StyleSheet.absoluteFillObject} resizeMode="cover">
                    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.bgOverlay }]} pointerEvents="none" />
                </ImageBackground>

                <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: bgAnim.interpolate({ inputRange: [-1, 0, 1], outputRange: ['rgba(255,0,0,0.2)', 'transparent', 'rgba(0,255,0,0.2)'] }) }]} pointerEvents="none" />

                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardContainer}>
                    {!isKeyboardVisible && (
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

                    {/* MODAL MILESTONE */}
                    <Modal visible={showMilestone} transparent={true} animationType="slide">
                        <View style={styles.modalOverlay}>
                            <View style={[styles.milestoneCard, { backgroundColor: theme.modalContent }]}>
                                <Text style={[styles.milestoneTitle, { color: theme.textMain }]}>Podsumowanie serii 📊</Text>
                                <View style={styles.statsRowMilestone}>
                                    <Text style={[styles.statsTextMilestone, { color: theme.textMain }]}>Poprawne: {sessionCorrect} / 10</Text>
                                </View>
                                <View style={styles.milestoneButtons}>
                                    <TouchableOpacity style={[styles.mButton, { backgroundColor: '#28a745' }]} onPress={() => { setShowMilestone(false); setSessionCorrect(0); setStats(s => ({ ...s, count: s.count + 1 })); generateProblem(); }}><Text style={styles.mButtonText}>Kontynuuj</Text></TouchableOpacity>
                                    <TouchableOpacity style={[styles.mButton, { backgroundColor: '#007AFF' }]} onPress={() => { setShowMilestone(false); navigation.goBack(); }}><Text style={styles.mButtonText}>Inny temat</Text></TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>

                    {/* MODAL FINALNY */}
                    <Modal visible={isFinished} transparent={true} animationType="fade">
                        <View style={styles.modalOverlay}>
                            <View style={[styles.milestoneCard, { backgroundColor: theme.modalContent }]}>
                                <Text style={[styles.milestoneTitle, { color: theme.textMain }]}>Gratulacje! 🏆</Text>
                                <View style={styles.statsRowMilestone}>
                                    <Text style={[styles.statsTextMilestone, { color: theme.textMain }]}>Wynik końcowy: {stats.correct} / {TASKS_LIMIT}</Text>
                                </View>
                                <View style={styles.milestoneButtons}>
                                    <TouchableOpacity style={[styles.mButton, { backgroundColor: '#28a745' }]} onPress={handleRestart}><Text style={styles.mButtonText}>Od nowa</Text></TouchableOpacity>
                                    <TouchableOpacity style={[styles.mButton, { backgroundColor: '#dc3545' }]} onPress={() => { setIsFinished(false); navigation.goBack(); }}><Text style={styles.mButtonText}>Wyjdź</Text></TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>

                    {showHint && !isKeyboardVisible && (
                        <View style={[styles.hintBox, { backgroundColor: theme.modalContent, borderColor: '#007AFF' }]}>
                            <Text style={styles.hintTitle}>Wskazówka:</Text>
                            <Text style={[styles.hintText, { color: theme.textMain }]}>{task.h}</Text>
                        </View>
                    )}

                    <DrawingModal visible={showScratchpad} onClose={() => setShowScratchpad(false)} problemText={task.q} />

                    <ScrollView contentContainerStyle={styles.centerContent} keyboardShouldPersistTaps="handled">
                        <View style={styles.card}>
                            <View style={[styles.overlayBackground, { backgroundColor: theme.cardOverlay }]} />
                            <Text style={[styles.headerTitle, { color: theme.textMain }]}>Ułamki</Text>
                            <Text style={[styles.questionText, { color: theme.textMain }]}>{task.q}</Text>

                            <View style={styles.taskContent}>
                                <View style={styles.equationRow}>
                                    <View style={styles.fractionStatic}>
                                        <Text style={[styles.staticNum, { color: theme.textMain }]}>{task.leftNum}</Text>
                                        <View style={[styles.staticLine, { backgroundColor: theme.fractionLine }]} />
                                        <Text style={[styles.staticDen, { color: theme.textMain }]}>{task.leftDen}</Text>
                                    </View>
                                    <Text style={[styles.equalSign, { color: theme.textMain }]}>=</Text>
                                    <View style={styles.fractionInputContainer}>
                                        {task.isRightNumInput ? (
                                            <TextInput
                                                ref={numInputRef}
                                                style={[
                                                    styles.fractionInput,
                                                    { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.inputText },
                                                    status === 'correct' ? { backgroundColor: theme.correctBg, borderColor: '#28a745' } :
                                                        status === 'wrong' ? { backgroundColor: theme.errorBg, borderColor: '#dc3545' } : {}
                                                ]}
                                                keyboardType="numeric"
                                                placeholder="?"
                                                placeholderTextColor={theme.textSub}
                                                value={userNum}
                                                onChangeText={(v) => { setUserNum(v); setStatus('neutral'); if(v.length >= 1 && task.isRightDenInput) denInputRef.current?.focus(); }}
                                                editable={!ready}
                                            />
                                        ) : <Text style={[styles.staticNum, { color: theme.textMain }]}>{task.rightNumTarget}</Text>}
                                        <View style={[styles.fractionLineLarge, { backgroundColor: theme.fractionLine }]} />
                                        {task.isRightDenInput ? (
                                            <TextInput
                                                ref={denInputRef}
                                                style={[
                                                    styles.fractionInput,
                                                    { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.inputText },
                                                    status === 'correct' ? { backgroundColor: theme.correctBg, borderColor: '#28a745' } :
                                                        status === 'wrong' ? { backgroundColor: theme.errorBg, borderColor: '#dc3545' } : {}
                                                ]}
                                                keyboardType="numeric"
                                                placeholder="?"
                                                placeholderTextColor={theme.textSub}
                                                value={userDen}
                                                onChangeText={(v) => { setUserDen(v); setStatus('neutral'); }}
                                                editable={!ready}
                                            />
                                        ) : <Text style={[styles.staticDen, { color: theme.textMain }]}>{task.rightDenTarget}</Text>}
                                    </View>
                                </View>
                            </View>

                            <TouchableOpacity style={[styles.mainBtn, {backgroundColor: ready ? '#28a745' : '#007AFF'}]} onPress={ready ? nextTask : handleCheck}>
                                <Text style={styles.mainBtnText}>{ready ? 'Następne' : 'Sprawdź'}</Text>
                            </TouchableOpacity>

                            <Text style={[styles.counterTextSmall, { color: theme.textSub }]}>Zadanie: {stats.count}/{TASKS_LIMIT}</Text>
                            <View style={{height: 30, marginTop: 15, justifyContent: 'center'}}>
                                {msg ? <Text style={[styles.msg, status === 'correct' ? styles.correctText : styles.errorText]}>{msg}</Text> : null}
                            </View>
                        </View>
                    </ScrollView>

                    {!isKeyboardVisible && (
                        <View style={styles.iconsBottom}>
                            <Image source={require('../../../assets/happy.png')} style={styles.iconSame} /><Text style={[styles.counterTextIcons, { color: theme.textMain }]}>{stats.correct}</Text>
                            <Image source={require('../../../assets/sad.png')} style={styles.iconSame} /><Text style={[styles.counterTextIcons, { color: theme.textMain }]}>{stats.wrong}</Text>
                        </View>
                    )}
                </KeyboardAvoidingView>
            </View>
        </TouchableWithoutFeedback>
    );
};

// --- STYLES ---
const styles = StyleSheet.create({
    container: { flex: 1 },
    keyboardContainer: { flex: 1, justifyContent: 'center' },
    centerContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 20 },
    topButtons: { position: 'absolute', top: 40, right: 20, flexDirection: 'row', zIndex: 10 },
    topBtnItem: { alignItems: 'center', marginLeft: 15 },
    iconTop: { width: 70, height: 70, resizeMode: 'contain' },
    buttonLabel: { fontSize: 14, fontWeight: 'bold', marginTop: 2 },
    hintBox: { position: 'absolute', top: 120, right: 20, padding: 15, borderRadius: 15, width: 260, zIndex: 11, elevation: 5, borderWidth: 1 },
    hintTitle: { fontWeight: 'bold', color: '#007AFF', marginBottom: 5 },
    hintText: { fontSize: 14 },
    card: { width: '92%', maxWidth: 450, borderRadius: 25, padding: 25, alignItems: 'center', alignSelf: 'center', elevation: 4 },
    overlayBackground: { ...StyleSheet.absoluteFillObject, borderRadius: 25 },
    headerTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 15 },
    questionText: { fontSize: 19, textAlign: 'center', fontWeight: '500', lineHeight: 28, marginBottom: 20 },
    taskContent: { alignItems: 'center', width: '100%', marginBottom: 10 },
    equationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    fractionStatic: { alignItems: 'center', justifyContent: 'center' },
    staticNum: { fontSize: 28, fontWeight: 'bold', marginBottom: -2 },
    staticLine: { width: 40, height: 3, marginVertical: 4 },
    staticDen: { fontSize: 28, fontWeight: 'bold', marginTop: -2 },
    equalSign: { fontSize: 40, fontWeight: 'bold', marginHorizontal: 15 },
    fractionInputContainer: { alignItems: 'center' },
    fractionInput: { width: 75, height: 60, borderWidth: 2, borderRadius: 12, fontSize: 28, fontWeight: 'bold', textAlign: 'center' },
    fractionLineLarge: { width: 90, height: 4, marginVertical: 8, borderRadius: 2 },
    mainBtn: { marginTop: 25, paddingHorizontal: 40, paddingVertical: 14, borderRadius: 15 },
    mainBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    counterTextSmall: { fontSize: 13, textAlign: 'center', marginTop: 15 },
    msg: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
    correctText: { color: '#28a745' },
    errorText: { color: '#dc3545' },
    iconsBottom: { position: 'absolute', bottom: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' },
    iconSame: { width: combinedIconSize, height: combinedIconSize, resizeMode: 'contain', marginHorizontal: 10 },
    counterTextIcons: { fontSize: 22, fontWeight: 'bold', marginHorizontal: 8 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
    drawingContainer: { width: '95%', height: '85%', borderRadius: 20, overflow: 'hidden' },
    drawingHeader: { height: 55, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
    drawingTitle: { fontSize: 18, fontWeight: 'bold' },
    headerButton: { padding: 10 },
    headerButtonText: { fontSize: 16, color: '#007AFF', fontWeight: '600' },
    problemPreviewContainer: { padding: 12, alignItems: 'center' },
    problemPreviewLabel: { fontSize: 13, color: '#666' },
    problemPreviewTextSmall: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
    canvas: { flex: 1 },
    milestoneCard: { width: '90%', borderRadius: 20, padding: 25, alignItems: 'center' },
    milestoneTitle: { fontSize: 22, fontWeight: 'bold' },
    statsRowMilestone: { marginVertical: 15, alignItems: 'center' },
    statsTextMilestone: { fontSize: 18, fontWeight: 'bold' },

    // ИСПРАВЛЕНО: Добавлено отсутствующее свойство milestoneButtons
    milestoneButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginTop: 20
    },

    mButton: { paddingVertical: 12, borderRadius: 12, width: '48%', alignItems: 'center' },
    mButtonText: { color: '#fff', fontWeight: 'bold' }
});

export default FractionsExpansionTrainer;