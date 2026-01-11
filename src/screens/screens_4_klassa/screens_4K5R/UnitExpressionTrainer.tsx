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

const EXERCISE_ID = "UnitExpression_Part2_Mass_Final";
const { width: screenWidth } = Dimensions.get('window');
const TASKS_LIMIT = 20;
const combinedIconSize = screenWidth * 0.25;

// --- BRUDNOPIS ---
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
                    <View style={[styles.problemPreviewContainer, { backgroundColor: theme.previewBg }]}>
                        <Text style={styles.problemPreviewLabel}>Zadanie:</Text>
                        <Text style={[styles.problemPreviewTextSmall, { color: isDarkMode ? '#38BDF8' : '#007AFF' }]}>{problemText}</Text>
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
const UnitExpressionTrainer = () => {
    const navigation = useNavigation();
    const isDarkMode = useColorScheme() === 'dark';

    const theme = {
        bgImage: require('../../../assets/background.jpg'),
        bgOverlay: isDarkMode ? 'rgba(0, 0, 0, 0.75)' : 'transparent',
        cardOverlay: isDarkMode ? 'rgba(30, 41, 59, 0.96)' : 'rgba(255,255,255,0.94)',
        textMain: isDarkMode ? '#F8FAFC' : '#333',
        textSub: isDarkMode ? '#94A3B8' : '#666',
        topBtnText: isDarkMode ? '#F8FAFC' : '#007AFF',

        inputBg: isDarkMode ? '#334155' : '#fff',
        inputBorder: isDarkMode ? '#475569' : '#ccc',
        inputText: isDarkMode ? '#F8FAFC' : '#007AFF',
        inputPlaceholder: isDarkMode ? '#64748B' : '#ccc',

        correctBg: isDarkMode ? 'rgba(21, 128, 61, 0.2)' : '#e8f5e9',
        correctBorder: '#28a745',
        errorBg: isDarkMode ? 'rgba(185, 28, 28, 0.2)' : '#fbe9eb',
        errorBorder: '#dc3545',

        modalContent: isDarkMode ? '#1E293B' : '#fff',
        statsRow: isDarkMode ? '#0F172A' : '#f8f9fa',
    };

    const [task, setTask] = useState({
        mode: 'mixedToDecimal', mainUnit: 'kg', subUnit: 'dag', factor: 100,
        mainValue: 0, subValue: 0, decimalString: '', questionDisplay: '', hintText: ''
    });

    const [inp1, setInp1] = useState('');
    const [inp2, setInp2] = useState('');
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
    const inp1Ref = useRef<TextInput>(null);
    const inp2Ref = useRef<TextInput>(null);
    const bgAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const k1 = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
        const k2 = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
        nextTask();
        return () => { k1.remove(); k2.remove(); };
    }, []);

    const formatDecimal = (whole: number, sub: number, factor: number): string => {
        let decimalPart = "";
        if (factor === 10) decimalPart = sub.toString();
        else if (factor === 100) decimalPart = sub < 10 ? `0${sub}` : `${sub}`;
        else if (factor === 1000) {
            if (sub < 10) decimalPart = `00${sub}`;
            else if (sub < 100) decimalPart = `0${sub}`;
            else decimalPart = `${sub}`;
        }
        return `${whole},${decimalPart}`;
    };

    const generateProblem = () => {
        setMsg(''); setStatus('neutral'); setReady(false);
        setInp1(''); setInp2(''); setAttempts(0); setShowHint(false);
        bgAnim.setValue(0);
        let newTask: any = {};
        let uniqueKey = "";
        let attemptCount = 0;
        const unitPairs = [
            { main: 'kg', sub: 'dag', factor: 100 }, { main: 't', sub: 'kg', factor: 1000 },
            { main: 'dag', sub: 'g', factor: 10 }, { main: 'kg', sub: 'g', factor: 1000 }
        ];
        const rnd = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

        do {
            const pair = unitPairs[rnd(0, unitPairs.length - 1)];
            const modes = ['mixedToDecimal', 'subToDecimal', 'decimalToSub', 'decimalToMixed'];
            const mode = modes[rnd(0, 3)];
            let mainVal = rnd(0, 15);
            let subVal = rnd(1, pair.factor - 1);
            if (mode === 'subToDecimal') mainVal = 0;
            const decimalString = formatDecimal(mainVal, subVal, pair.factor);
            let questionDisplay = (mode === 'mixedToDecimal') ? (mainVal === 0 ? `${subVal} ${pair.sub}` : `${mainVal} ${pair.main} ${subVal} ${pair.sub}`)
                : (mode === 'subToDecimal') ? `${subVal} ${pair.sub}` : `${decimalString} ${pair.main}`;

            newTask = { mode, mainUnit: pair.main, subUnit: pair.sub, factor: pair.factor, mainValue: mainVal, subValue: subVal, decimalString, questionDisplay, hintText: "Wskazówka: ..." };
            uniqueKey = `${mode}-${pair.main}-${mainVal}-${subVal}`;
            attemptCount++;
        } while (historyRef.current.has(uniqueKey) && attemptCount < 20);

        historyRef.current.add(uniqueKey);
        setTask(newTask);
        setTimeout(() => { inp1Ref.current?.focus(); }, 400);
    };

    const handleCheck = () => {
        let isCorrect = false;
        const cleanFloat = (val: string) => parseFloat(val.replace(',', '.').trim());
        const cleanInt = (val: string) => parseInt(val.replace(/\D/g, '') || '0', 10);

        if (task.mode === 'mixedToDecimal' || task.mode === 'subToDecimal') {
            isCorrect = Math.abs(cleanFloat(inp1) - cleanFloat(task.decimalString)) < 0.000001;
        } else if (task.mode === 'decimalToSub') {
            isCorrect = Math.abs(cleanFloat(inp1) - ((task.mainValue * task.factor) + task.subValue)) < 0.1;
        } else {
            isCorrect = cleanInt(inp1) === task.mainValue && cleanInt(inp2) === task.subValue;
        }

        if (isCorrect) {
            setStatus('correct'); setMsg('Doskonale! ✅');
            Animated.timing(bgAnim, { toValue: 1, duration: 500, useNativeDriver: false }).start();
            setStats(s => ({ ...s, correct: s.correct + 1 }));
            setSessionCorrect(prev => prev + 1);
            setReady(true);
            awardXpAndCoins(10, 2);
        } else {
            setStatus('wrong');
            if (attempts === 0) {
                setMsg('Błąd! Spróbuj jeszcze raz. ❌'); setAttempts(1);
                setInp1(''); if (task.mode === 'decimalToMixed') setInp2('');
                Animated.sequence([
                    Animated.timing(bgAnim, { toValue: -1, duration: 200, useNativeDriver: false }),
                    Animated.timing(bgAnim, { toValue: 0, duration: 200, useNativeDriver: false })
                ]).start();
            } else {
                setMsg(`Źle!`); setReady(true);
                setStats(s => ({ ...s, wrong: s.wrong + 1 }));
            }
        }
    };

    const nextTask = () => {
        if (stats.count >= TASKS_LIMIT) { setIsFinished(true); return; }
        if (stats.count > 0 && stats.count % 10 === 0 && !showMilestone) { setShowMilestone(true); return; }
        setStats(s => ({ ...s, count: s.count + 1 }));
        generateProblem();
    };

    const getInputStyle = () => {
        const base = { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.inputText };
        if (status === 'correct') return [base, { backgroundColor: theme.correctBg, borderColor: theme.correctBorder }];
        if (status === 'wrong') return [base, { backgroundColor: theme.errorBg, borderColor: theme.errorBorder }];
        return base;
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

                    <DrawingModal visible={showScratchpad} onClose={() => setShowScratchpad(false)} problemText={task.questionDisplay} />

                    <ScrollView contentContainerStyle={styles.centerContent} keyboardShouldPersistTaps="handled">
                        <View style={styles.card}>
                            <View style={[styles.overlayBackground, { backgroundColor: theme.cardOverlay }]} />
                            <Text style={[styles.headerTitle, { color: theme.textMain }]}>Jednostki Masy</Text>
                            <Text style={[styles.subHeader, { color: theme.textSub }]}>Uzupełnij brakujące liczby.</Text>

                            <View style={styles.taskContent}>
                                <View style={styles.equationRow}>
                                    <Text style={[styles.staticTextLarge, { color: theme.textMain }]}>{task.questionDisplay}</Text>
                                    <Text style={[styles.operatorSign, { color: theme.textMain }]}>=</Text>

                                    {task.mode === 'decimalToMixed' ? (
                                        <>
                                            <View style={styles.inputContainer}>
                                                <TextInput ref={inp1Ref} style={[styles.inputMedium, getInputStyle()]} keyboardType="numeric" placeholderTextColor={theme.inputPlaceholder} value={inp1} onChangeText={setInp1} editable={!ready} />
                                                <Text style={[styles.unitLabel, { color: theme.textMain }]}>{task.mainUnit}</Text>
                                            </View>
                                            <View style={[styles.inputContainer, { marginLeft: 10 }]}>
                                                <TextInput ref={inp2Ref} style={[styles.inputMedium, getInputStyle()]} keyboardType="numeric" placeholderTextColor={theme.inputPlaceholder} value={inp2} onChangeText={setInp2} editable={!ready} />
                                                <Text style={[styles.unitLabel, { color: theme.textMain }]}>{task.subUnit}</Text>
                                            </View>
                                        </>
                                    ) : (
                                        <View style={styles.inputContainer}>
                                            <TextInput ref={inp1Ref} keyboardType={(task.mode === 'mixedToDecimal' || task.mode === 'subToDecimal') ? "decimal-pad" : "numeric"} style={[styles.inputLarge, getInputStyle()]} placeholderTextColor={theme.inputPlaceholder} value={inp1} onChangeText={setInp1} editable={!ready} />
                                            <Text style={[styles.unitLabel, { color: theme.textMain }]}>{(task.mode === 'mixedToDecimal' || task.mode === 'subToDecimal') ? task.mainUnit : task.subUnit}</Text>
                                        </View>
                                    )}
                                </View>
                            </View>

                            <TouchableOpacity style={styles.mainBtn} onPress={ready ? nextTask : handleCheck}>
                                <Text style={styles.mainBtnText}>{ready ? 'Następne' : 'Sprawdź'}</Text>
                            </TouchableOpacity>

                            <Text style={[styles.counterTextSmall, { color: theme.textSub }]}>Zadanie: {stats.count}/{TASKS_LIMIT}</Text>
                            <View style={{height: 30, marginTop: 15}}>{msg ? <Text style={[styles.msg, status === 'correct' ? styles.correctText : styles.errorText]}>{msg}</Text> : null}</View>
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

const styles = StyleSheet.create({
    container: { flex: 1 },
    keyboardContainer: { flex: 1, justifyContent: 'center' },
    centerContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 20 },
    topButtons: { position: 'absolute', top: 45, right: 20, flexDirection: 'row', zIndex: 10 },
    topBtnItem: { alignItems: 'center', marginLeft: 15 },
    iconTop: { width: 60, height: 60, resizeMode: 'contain' },
    buttonLabel: { fontSize: 12, fontWeight: 'bold', marginTop: 2 },
    card: { width: '96%', maxWidth: 620, borderRadius: 25, padding: 25, alignItems: 'center', alignSelf: 'center', elevation: 4 },
    overlayBackground: { ...StyleSheet.absoluteFillObject, borderRadius: 25 },
    headerTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 5 },
    subHeader: { fontSize: 15, marginBottom: 20 },
    taskContent: { alignItems: 'center', width: '100%', marginBottom: 15 },
    equationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' },
    staticTextLarge: { fontSize: 24, fontWeight: 'bold', marginRight: 5 },
    operatorSign: { fontSize: 28, fontWeight: 'bold', marginHorizontal: 8 },
    inputContainer: { flexDirection: 'row', alignItems: 'center' },
    inputLarge: { width: 120, height: 60, borderWidth: 2, borderRadius: 12, fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginRight: 5 },
    inputMedium: { width: 85, height: 60, borderWidth: 2, borderRadius: 12, fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginRight: 5 },
    unitLabel: { fontSize: 22, fontWeight: 'bold' },
    mainBtn: { marginTop: 25, backgroundColor: '#007AFF', paddingHorizontal: 40, paddingVertical: 14, borderRadius: 15 },
    mainBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    counterTextSmall: { fontSize: 13, marginTop: 15 },
    msg: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
    correctText: { color: '#28a745' },
    errorText: { color: '#dc3545' },
    iconsBottom: { position: 'absolute', bottom: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' },
    iconSame: { width: combinedIconSize, height: combinedIconSize, resizeMode: 'contain' },
    counterTextIcons: { fontSize: 20, fontWeight: 'bold', marginHorizontal: 5 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
    drawingContainer: { width: '95%', height: '80%', borderRadius: 20, overflow: 'hidden' },
    drawingHeader: { height: 55, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, borderBottomWidth: 1 },
    drawingTitle: { fontSize: 18, fontWeight: 'bold' },
    headerButton: { padding: 10 },
    headerButtonText: { fontSize: 16, color: '#007AFF', fontWeight: '600' },
    problemPreviewContainer: { padding: 12, alignItems: 'center' },
    problemPreviewLabel: { fontSize: 12, color: '#666' },
    problemPreviewTextSmall: { fontSize: 18, fontWeight: 'bold' },
    canvas: { flex: 1 }
});

export default UnitExpressionTrainer;