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

const EXERCISE_ID = "DecimalFractions_Class4";
const { width: screenWidth } = Dimensions.get('window');
const TASKS_LIMIT = 30;
const combinedIconSize = screenWidth * 0.25;

const gcd = (a: number, b: number): number => {
    return b === 0 ? a : gcd(b, a % b);
};

// --- MODAL BRUDNOPISU ---
const DrawingModal = ({ visible, onClose, problemText }: { visible: boolean; onClose: () => void, problemText: string }) => {
    const isDarkMode = useColorScheme() === 'dark';
    const [paths, setPaths] = useState<string[]>([]);
    const [currentPath, setCurrentPath] = useState('');

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
                        <Text style={[styles.problemPreviewTextSmall, { color: isDarkMode ? '#60A5FA' : '#007AFF' }]}>{problemText}</Text>
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

// --- GŁÓWNY KOMPONENT ---
const DecimalFractionTrainer = () => {
    const navigation = useNavigation();
    const isDarkMode = useColorScheme() === 'dark';

    const theme = {
        bgImage: require('../../../assets/background.jpg'),
        bgOverlay: isDarkMode ? 'rgba(0, 0, 0, 0.75)' : 'transparent',
        topBtnText: isDarkMode ? '#FFFFFF' : '#007AFF',
        textMain: isDarkMode ? '#FFFFFF' : '#333333',
        textSub: isDarkMode ? '#CBD5E1' : '#555555',
        cardOverlay: isDarkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255,255,255,0.94)',
        modalContent: isDarkMode ? '#1E293B' : '#fff',
        statsRow: isDarkMode ? '#0F172A' : '#f8f9fa',

        inputBg: isDarkMode ? '#334155' : '#ffffff',
        inputBorder: isDarkMode ? '#475569' : '#ccc',
        inputText: isDarkMode ? '#FFFFFF' : '#007AFF',
        inputPlaceholder: isDarkMode ? '#94A3B8' : '#ccc',

        correctBg: isDarkMode ? 'rgba(21, 87, 36, 0.5)' : '#e8f5e9',
        correctBorder: isDarkMode ? '#4ADE80' : '#28a745',
        errorBg: isDarkMode ? 'rgba(114, 28, 36, 0.5)' : '#fbe9eb',
        errorBorder: isDarkMode ? '#F87171' : '#dc3545',
    };

    const [task, setTask] = useState({
        type: 'toDecimal', q: '', h: '', whole: 0, num: 0, den: 1, targetDecimalStr: '', simpWhole: 0, simpNum: 0, simpDen: 1,
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
        const denominators = [10, 100, 100, 100, 1000, 1000, 1000];

        do {
            const den = denominators[rnd(0, denominators.length - 1)];
            const whole = rnd(0, 15);
            let num = 0;
            const difficultyRoll = Math.random();

            if (den === 10) num = rnd(1, 9);
            else if (den === 100) num = difficultyRoll < 0.4 ? rnd(1, 9) : rnd(10, 99);
            else if (den === 1000) num = difficultyRoll < 0.2 ? rnd(1, 9) : (difficultyRoll < 0.5 ? rnd(10, 99) : rnd(100, 999));

            while (num % 10 === 0 && num > 0) {
                if (den === 100) num = rnd(1, 99);
                if (den === 1000) num = rnd(1, 999);
            }

            const taskType = Math.random() > 0.5 ? 'toDecimal' : 'toFraction';
            const common = gcd(num, den);
            const simpNum = num / common;
            const simpDen = den / common;
            const simpWhole = whole;

            let fractionPart = "";
            if (den === 10) fractionPart = num.toString().padStart(1, '0');
            if (den === 100) fractionPart = num.toString().padStart(2, '0');
            if (den === 1000) fractionPart = num.toString().padStart(3, '0');

            const targetDecimalStr = `${whole}.${fractionPart}`;

            newTask = {
                type: taskType,
                q: taskType === 'toDecimal' ? 'Zapisz w postaci dziesiętnej.' : 'Zapisz w postaci ułamka i skróć.',
                h: taskType === 'toDecimal' ? `Pamiętaj o zerach po przecinku.` : `Pamiętaj o skracaniu ułamka!`,
                whole, num, den, targetDecimalStr, simpWhole, simpNum, simpDen
            };

            uniqueKey = `${taskType}-${whole}-${num}-${den}`;
            attemptCount++;
        } while (historyRef.current.has(uniqueKey) && attemptCount < 20);

        historyRef.current.add(uniqueKey);
        setTask(newTask);
        setTimeout(() => {
            if (newTask.type === 'toDecimal') decimalRef.current?.focus();
            else newTask.whole > 0 ? wholeRef.current?.focus() : numRef.current?.focus();
        }, 400);
    };

    const handleCheck = () => {
        let allCorrect = false;
        let partialError = false;

        if (task.type === 'toDecimal') {
            if (!inpDecimal) { setMsg('Wpisz wynik! ⚠️'); return; }
            const userInput = inpDecimal.replace(',', '.').trim();
            if (Math.abs(parseFloat(userInput) - parseFloat(task.targetDecimalStr)) < 0.000001) allCorrect = true;
        } else {
            if ((task.simpWhole > 0 && !inpWhole) || !inpNum || !inpDen) { setMsg('Uzupełnij ułamek! ⚠️'); return; }
            const uWhole = parseInt(inpWhole || '0');
            const uNum = parseInt(inpNum || '0');
            const uDen = parseInt(inpDen || '0');
            if (Math.abs((uWhole + uNum/uDen) - (task.simpWhole + task.simpNum/task.simpDen)) < 0.0001) {
                if (uNum === task.simpNum && uDen === task.simpDen && uWhole === task.simpWhole) allCorrect = true;
                else partialError = true;
            }
        }

        if (allCorrect) {
            setStatus('correct'); setMsg('Doskonale! ✅');
            Animated.timing(bgAnim, { toValue: 1, duration: 500, useNativeDriver: false }).start();
            setStats(s => ({ ...s, correct: s.correct + 1 }));
            setSessionCorrect(prev => prev + 1); setReady(true);
            InteractionManager.runAfterInteractions(() => awardXpAndCoins(10, 2));
        } else {
            if (partialError) { setMsg('Skróć ułamek! ✂️'); return; }
            setStatus('wrong');
            if (attempts === 0) {
                setMsg('Błąd! Spróbuj jeszcze raz. ❌'); setAttempts(1);
                Animated.sequence([
                    Animated.timing(bgAnim, { toValue: -1, duration: 200, useNativeDriver: false }),
                    Animated.timing(bgAnim, { toValue: 0, duration: 200, useNativeDriver: false })
                ]).start();
                setTimeout(() => setStatus('neutral'), 1500);
            } else {
                let res = task.type === 'toDecimal' ? task.targetDecimalStr.replace('.', ',') : `${task.simpWhole > 0 ? task.simpWhole + ' ' : ''}${task.simpNum}/${task.simpDen}`;
                setMsg(`Wynik: ${res}`); setReady(true);
                setStats(s => ({ ...s, wrong: s.wrong + 1 }));
                Animated.timing(bgAnim, { toValue: -1, duration: 500, useNativeDriver: false }).start();
            }
        }
    };

    const nextTask = () => {
        if (stats.count >= TASKS_LIMIT) { setIsFinished(true); return; }
        if (stats.count > 0 && stats.count % 10 === 0 && !showMilestone) { setShowMilestone(true); return; }
        setStats(s => ({ ...s, count: s.count + 1 })); generateProblem();
    };

    const handleRestart = () => {
        setIsFinished(false); setStats({ correct: 0, wrong: 0, count: 1 });
        setSessionCorrect(0); historyRef.current.clear(); generateProblem();
    };

    const getInpStyle = () => {
        if (status === 'correct') return [styles.inputBox, { borderColor: theme.correctBorder, backgroundColor: theme.correctBg }];
        if (status === 'wrong') return [styles.inputBox, { borderColor: theme.errorBorder, backgroundColor: theme.errorBg }];
        return [styles.inputBox, { borderColor: theme.inputBorder, backgroundColor: theme.inputBg }];
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.container}>
                <StatusBar translucent backgroundColor="transparent" barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
                <ImageBackground source={theme.bgImage} style={StyleSheet.absoluteFillObject} resizeMode="cover">
                    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.bgOverlay }]} />
                </ImageBackground>
                <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: bgAnim.interpolate({ inputRange: [-1, 0, 1], outputRange: ['rgba(255,0,0,0.15)', 'transparent', 'rgba(0,255,0,0.15)'] }) }]} pointerEvents="none" />

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

                    <DrawingModal visible={showScratchpad} onClose={() => setShowScratchpad(false)} problemText={task.q} />

                    <Modal visible={showMilestone} transparent={true} animationType="slide">
                        <View style={styles.modalOverlay}>
                            <View style={[styles.milestoneCard, { backgroundColor: theme.modalContent }]}>
                                <Text style={[styles.milestoneTitle, { color: theme.textMain }]}>Podsumowanie 📊</Text>
                                <View style={[styles.statsRowMilestone, { backgroundColor: theme.statsRow }]}>
                                    <Text style={[styles.statsTextMilestone, { color: theme.textMain }]}>Poprawne: {sessionCorrect} / 10</Text>
                                </View>
                                <View style={styles.milestoneButtons}>
                                    <TouchableOpacity style={[styles.mButton, { backgroundColor: '#28a745' }]} onPress={() => { setShowMilestone(false); setSessionCorrect(0); nextTask(); }}><Text style={styles.mButtonText}>Kontynuuj</Text></TouchableOpacity>
                                    <TouchableOpacity style={[styles.mButton, { backgroundColor: '#007AFF' }]} onPress={() => { setShowMilestone(false); navigation.goBack(); }}><Text style={styles.mButtonText}>Inny temat</Text></TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>

                    <Modal visible={isFinished} transparent={true} animationType="fade">
                        <View style={styles.modalOverlay}>
                            <View style={[styles.milestoneCard, { backgroundColor: theme.modalContent }]}>
                                <Text style={[styles.milestoneTitle, { color: theme.textMain }]}>Gratulacje! 🏆</Text>
                                <Text style={[styles.statsTextMilestone, { color: theme.textMain }]}>Wynik: {stats.correct} / {TASKS_LIMIT}</Text>
                                <View style={styles.milestoneButtons}>
                                    <TouchableOpacity style={[styles.mButton, { backgroundColor: '#28a745' }]} onPress={handleRestart}><Text style={styles.mButtonText}>Jeszcze raz</Text></TouchableOpacity>
                                    <TouchableOpacity style={[styles.mButton, { backgroundColor: '#dc3545' }]} onPress={() => navigation.goBack()}><Text style={styles.mButtonText}>Wyjdź</Text></TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>

                    {showHint && !isKeyboardVisible && (
                        <View style={[styles.hintBox, { backgroundColor: theme.modalContent, borderColor: '#007AFF' }]}><Text style={styles.hintTitle}>Wskazówka:</Text><Text style={[styles.hintText, { color: theme.textMain }]}>{task.h}</Text></View>
                    )}

                    <ScrollView contentContainerStyle={styles.centerContent} keyboardShouldPersistTaps="handled">
                        <View style={styles.card}>
                            <View style={[styles.overlayBackground, { backgroundColor: theme.cardOverlay }]} />
                            <Text style={[styles.headerTitle, { color: theme.textMain }]}>Ułamki Dziesiętne</Text>
                            <Text style={[styles.subHeader, { color: theme.textSub }]}>{task.q}</Text>

                            <View style={styles.taskContent}>
                                <View style={styles.equationRow}>
                                    {task.type === 'toDecimal' ? (
                                        <>
                                            <View style={styles.mixedContainer}>
                                                {task.whole > 0 && <Text style={[styles.staticWhole, { color: theme.textMain }]}>{task.whole}</Text>}
                                                <View style={styles.fractionStatic}>
                                                    <Text style={[styles.staticNum, { color: theme.textMain }]}>{task.num}</Text>
                                                    <View style={[styles.staticLine, { backgroundColor: theme.textMain }]} />
                                                    <Text style={[styles.staticDen, { color: theme.textMain }]}>{task.den}</Text>
                                                </View>
                                            </View>
                                            <Text style={[styles.operatorSign, { color: theme.textMain }]}>=</Text>
                                            <TextInput ref={decimalRef} style={[...getInpStyle(), styles.decimalInput, { color: theme.inputText }]} keyboardType="decimal-pad" placeholder="0,0" placeholderTextColor={theme.inputPlaceholder} value={inpDecimal} onChangeText={setInpDecimal} editable={!ready} />
                                        </>
                                    ) : (
                                        <>
                                            <Text style={[styles.staticDecimal, { color: theme.textMain }]}>{task.targetDecimalStr.replace('.', ',')}</Text>
                                            <Text style={[styles.operatorSign, { color: theme.textMain }]}>=</Text>
                                            <View style={styles.mixedInputContainer}>
                                                {(task.simpWhole > 0 || inpWhole !== '') && (
                                                    <TextInput ref={wholeRef} style={[...getInpStyle(), styles.wholeInput, { color: theme.inputText }]} keyboardType="numeric" placeholder="?" placeholderTextColor={theme.inputPlaceholder} value={inpWhole} onChangeText={setInpWhole} onSubmitEditing={() => numRef.current?.focus()} editable={!ready} />
                                                )}
                                                <View style={styles.fractionInputColumn}>
                                                    <TextInput ref={numRef} style={[...getInpStyle(), styles.fractionInput, { color: theme.inputText }]} keyboardType="numeric" placeholder="L" placeholderTextColor={theme.inputPlaceholder} value={inpNum} onChangeText={setInpNum} onSubmitEditing={() => denRef.current?.focus()} editable={!ready} />
                                                    <View style={[styles.fractionLineLarge, { backgroundColor: theme.textMain }]} />
                                                    <TextInput ref={denRef} style={[...getInpStyle(), styles.fractionInput, { color: theme.inputText }]} keyboardType="numeric" placeholder="M" placeholderTextColor={theme.inputPlaceholder} value={inpDen} onChangeText={setInpDen} editable={!ready} />
                                                </View>
                                            </View>
                                        </>
                                    )}
                                </View>
                            </View>

                            <TouchableOpacity style={styles.mainBtn} onPress={ready ? nextTask : handleCheck}>
                                <Text style={styles.mainBtnText}>{ready ? 'Następne' : 'Sprawdź'}</Text>
                            </TouchableOpacity>

                            <Text style={[styles.counterTextSmall, { color: theme.textSub }]}>Zadanie: {stats.count}/{TASKS_LIMIT}</Text>
                            {msg ? <Text style={[styles.msg, msg.includes('Doskonale') ? { color: '#28a745' } : { color: '#dc3545' }]}>{msg}</Text> : null}
                        </View>
                    </ScrollView>

                    {!isKeyboardVisible && (
                        <View style={styles.iconsBottom}>
                            <Image source={require('../../../assets/happy.png')} style={styles.iconSame} />
                            <Text style={[styles.counterTextIcons, { color: theme.textMain }]}>{stats.correct}</Text>
                            <Image source={require('../../../assets/sad.png')} style={styles.iconSame} />
                            <Text style={[styles.counterTextIcons, { color: theme.textMain }]}>{stats.wrong}</Text>
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
    iconTop: { width: 70, height: 70, resizeMode: 'contain' },
    buttonLabel: { fontSize: 14, fontWeight: 'bold', marginTop: 2 },
    hintBox: { position: 'absolute', top: 100, right: 20, padding: 15, borderRadius: 15, width: 260, zIndex: 11, elevation: 5, borderWidth: 1 },
    hintTitle: { fontWeight: 'bold', color: '#007AFF', marginBottom: 5 },
    hintText: { fontSize: 14 },
    card: { width: '96%', maxWidth: 600, borderRadius: 25, padding: 20, alignItems: 'center', alignSelf: 'center', elevation: 4 },
    overlayBackground: { ...StyleSheet.absoluteFillObject, borderRadius: 25 },
    headerTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 5 },
    subHeader: { fontSize: 15, marginBottom: 20, textAlign: 'center' },
    taskContent: { alignItems: 'center', width: '100%', marginBottom: 10 },
    equationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' },
    mixedContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 4 },
    staticWhole: { fontSize: 32, fontWeight: 'bold', marginRight: 6 },
    staticDecimal: { fontSize: 32, fontWeight: 'bold', marginHorizontal: 4 },
    fractionStatic: { alignItems: 'center' },
    staticNum: { fontSize: 24, fontWeight: 'bold' },
    staticLine: { width: 40, height: 3, marginVertical: 3 },
    staticDen: { fontSize: 24, fontWeight: 'bold' },
    operatorSign: { fontSize: 32, fontWeight: 'bold', marginHorizontal: 10 },
    mixedInputContainer: { flexDirection: 'row', alignItems: 'center' },
    inputBox: { borderWidth: 2, borderRadius: 12, textAlign: 'center', fontWeight: 'bold' },
    wholeInput: { width: 70, height: 80, fontSize: 34, marginRight: 8 },
    decimalInput: { width: 160, height: 80, fontSize: 36 },
    fractionInputColumn: { alignItems: 'center' },
    fractionInput: { width: 85, height: 65, fontSize: 28 },
    fractionLineLarge: { width: 95, height: 4, marginVertical: 8, borderRadius: 2 },
    mainBtn: { marginTop: 25, backgroundColor: '#007AFF', paddingHorizontal: 40, paddingVertical: 14, borderRadius: 15 },
    mainBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    counterTextSmall: { fontSize: 13, textAlign: 'center', marginTop: 15 },
    msg: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginTop: 10 },
    iconsBottom: { position: 'absolute', bottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' },
    iconSame: { width: combinedIconSize, height: combinedIconSize, resizeMode: 'contain', marginHorizontal: 10 },
    counterTextIcons: { fontSize: 20, marginHorizontal: 8, fontWeight: 'bold' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
    drawingContainer: { width: '95%', height: '85%', borderRadius: 20, overflow: 'hidden' },
    drawingHeader: { height: 55, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
    drawingTitle: { fontSize: 18, fontWeight: 'bold' },
    headerButton: { padding: 10 },
    headerButtonText: { fontSize: 16, color: '#007AFF', fontWeight: '600' },
    problemPreviewContainer: { padding: 12, alignItems: 'center' },
    problemPreviewLabel: { fontSize: 12, color: '#777' },
    problemPreviewTextSmall: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
    canvas: { flex: 1 },
    milestoneCard: { width: '90%', borderRadius: 20, padding: 25, alignItems: 'center', elevation: 10 },
    milestoneTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 15 },
    statsRowMilestone: { marginVertical: 10, alignItems: 'center', padding: 15, borderRadius: 15, width: '100%' },
    statsTextMilestone: { fontSize: 18, fontWeight: 'bold' },
    milestoneButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 20 },
    mButton: { paddingVertical: 12, paddingHorizontal: 15, borderRadius: 12, width: '48%', alignItems: 'center' },
    mButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 }
});

export default DecimalFractionTrainer;