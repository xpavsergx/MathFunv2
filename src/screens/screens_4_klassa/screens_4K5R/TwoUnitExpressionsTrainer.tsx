import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TextInput, Keyboard, ImageBackground,
    Animated, StatusBar, Image, Dimensions, TouchableOpacity, Modal,
    Platform, KeyboardAvoidingView, TouchableWithoutFeedback, ScrollView,
    InteractionManager, useColorScheme
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { awardXpAndCoins } from '../../../services/xpService';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

const EXERCISE_ID = "TwoUnitExpressions_Mixed_cl4";
const { width: screenWidth } = Dimensions.get('window');

const TASKS_LIMIT = 30;
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
                    <View style={[styles.drawingHeader, { backgroundColor: theme.headerBg }]}>
                        <TouchableOpacity onPress={handleClear} style={styles.headerButton}><Text style={styles.headerButtonText}>🗑️ Wyczyść</Text></TouchableOpacity>
                        <Text style={[styles.drawingTitle, { color: theme.text }]}>Brudnopis</Text>
                        <TouchableOpacity onPress={onClose} style={styles.headerButton}><Text style={styles.headerButtonText}>❌ Zamknij</Text></TouchableOpacity>
                    </View>
                    <View style={[styles.problemPreviewContainer, { backgroundColor: theme.previewBg }]}>
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
const TwoUnitExpressionsTrainer = () => {
    const navigation = useNavigation();
    const isDarkMode = useColorScheme() === 'dark';

    const theme = {
        bgImage: require('../../../assets/background.jpg'),
        bgOverlay: isDarkMode ? 'rgba(0, 0, 0, 0.75)' : 'transparent',
        cardOverlay: isDarkMode ? 'rgba(30, 41, 59, 0.96)' : 'rgba(255, 255, 255, 0.94)',
        textMain: isDarkMode ? '#FFFFFF' : '#333333',
        textSub: isDarkMode ? '#CBD5E1' : '#666666',
        topBtnText: isDarkMode ? '#FFFFFF' : '#007AFF',

        inputBg: isDarkMode ? '#334155' : '#FFFFFF',
        inputBorder: isDarkMode ? '#475569' : '#ccc',
        inputText: isDarkMode ? '#FFFFFF' : '#007AFF',
        inputPlaceholder: isDarkMode ? '#94A3B8' : '#ccc',

        modalContent: isDarkMode ? '#1E293B' : '#fff',
        statsRow: isDarkMode ? '#0F172A' : '#f8f9fa',

        unitColor: isDarkMode ? '#94A3B8' : '#2c3e50',
    };

    const [task, setTask] = useState({
        type: 'TO_DECIMAL',
        qText: '',
        unitLeft: '',
        unitRight1: '',
        unitRight2: '',
        correctVal1: '',
        correctVal2: '',
        hint: '',
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

    const rnd = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

    const generateProblem = () => {
        setMsg(''); setStatus('neutral'); setReady(false);
        setInp1(''); setInp2('');
        setAttempts(0); setShowHint(false);
        bgAnim.setValue(0);

        let newTask: any = {};
        let uniqueKey = "";
        let attemptCount = 0;

        const units = [
            { main: 'cm', sub: 'mm', factor: 10, precision: 1 },
            { main: 'dm', sub: 'cm', factor: 10, precision: 1 },
            { main: 'm', sub: 'cm', factor: 100, precision: 2 },
            { main: 'km', sub: 'm', factor: 1000, precision: 3 }
        ];

        do {
            const modeId = rnd(0, 2);
            const u = units[rnd(0, units.length - 1)];
            let valWhole = 0, valSub = 0, decimalVal = 0, decimalStr = "";

            if (modeId === 0) {
                const hasWhole = Math.random() > 0.5;
                valWhole = hasWhole ? rnd(1, 15) : 0;
                if (!hasWhole && u.factor >= 100) {
                    if (Math.random() < 0.4) valSub = rnd(1, 9);
                    else valSub = rnd(1, u.factor - 1);
                } else {
                    valSub = rnd(1, u.factor - 1);
                }
                const qText = valWhole > 0 ? `${valWhole} ${u.main} ${valSub} ${u.sub}` : `${valSub} ${u.sub}`;
                decimalVal = valWhole + (valSub / u.factor);
                decimalStr = decimalVal.toFixed(u.precision).replace('.', ',');
                newTask = { type: 'TO_DECIMAL', qText, unitRight1: u.main, correctVal1: decimalStr, hint: `1 ${u.main} = ${u.factor} ${u.sub}. Zapisz wynik z przecinkiem.` };
                uniqueKey = `TD-${qText}-${u.main}`;
            } else if (modeId === 1) {
                valSub = rnd(1, u.factor - 1);
                decimalVal = valSub / u.factor;
                decimalStr = decimalVal.toFixed(u.precision).replace('.', ',');
                newTask = { type: 'TO_SUBUNIT', qText: `${decimalStr} ${u.main}`, unitRight1: u.sub, correctVal1: valSub.toString(), hint: `Pomnóż przez ${u.factor}.` };
                uniqueKey = `TS-${decimalStr}-${u.main}`;
            } else {
                valWhole = rnd(1, 10); valSub = rnd(1, u.factor - 1);
                decimalVal = valWhole + (valSub / u.factor);
                decimalStr = decimalVal.toFixed(u.precision).replace('.', ',');
                newTask = { type: 'TO_TWO_UNITS', qText: `${decimalStr} ${u.main}`, unitRight1: u.main, unitRight2: u.sub, correctVal1: valWhole.toString(), correctVal2: valSub.toString(), hint: `Rozbij na całości и części.` };
                uniqueKey = `TT-${decimalStr}-${u.main}`;
            }
            attemptCount++;
        } while (historyRef.current.has(uniqueKey) && attemptCount < 20);

        historyRef.current.add(uniqueKey);
        setTask(newTask);
        setTimeout(() => { inp1Ref.current?.focus(); }, 400);
    };

    const handleCheck = () => {
        let isCorrect = false;
        const parseUserFloat = (text: string) => parseFloat(text.replace(/,/g, '.').replace(/\s/g, ''));
        const val1 = parseUserFloat(inp1);
        const val2 = parseUserFloat(inp2);

        if (task.type === 'TO_DECIMAL') {
            if (isNaN(val1)) return;
            isCorrect = Math.abs(val1 - parseFloat(task.correctVal1.replace(',', '.'))) < 0.00001;
        } else if (task.type === 'TO_SUBUNIT') {
            if (isNaN(val1)) return;
            isCorrect = Math.abs(val1 - parseFloat(task.correctVal1)) < 0.00001;
        } else if (task.type === 'TO_TWO_UNITS') {
            if (isNaN(val1) || isNaN(val2)) return;
            isCorrect = Math.abs(val1 - parseFloat(task.correctVal1)) < 0.00001 && Math.abs(val2 - parseFloat(task.correctVal2)) < 0.00001;
        }

        if (isCorrect) {
            setStatus('correct'); setMsg('Doskonale! ✅');
            Animated.timing(bgAnim, { toValue: 1, duration: 500, useNativeDriver: false }).start();
            setStats(s => ({ ...s, correct: s.correct + 1 }));
            setSessionCorrect(prev => prev + 1);
            setReady(true);
            InteractionManager.runAfterInteractions(() => awardXpAndCoins(10, 2));
        } else {
            setStatus('wrong');
            if (attempts === 0) {
                setMsg('Błąd! Spróbuj jeszcze raz. ❌');
                setAttempts(1);
                setTimeout(() => setStatus('neutral'), 1500);
            } else {
                setMsg('Koniec prób! ❌');
                setReady(true);
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
        if (status === 'correct') return [base, styles.inputCorrect];
        if (status === 'wrong') return [base, styles.inputError];
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

                    <Modal visible={showMilestone} transparent={true} animationType="slide">
                        <View style={styles.modalOverlay}>
                            <View style={[styles.milestoneCard, { backgroundColor: theme.modalContent }]}>
                                <Text style={[styles.milestoneTitle, { color: theme.textMain }]}>Podsumowanie serii 📊</Text>
                                <View style={[styles.statsRowMilestone, { backgroundColor: theme.statsRow }]}>
                                    <Text style={[styles.statsTextMilestone, { color: theme.textMain }]}>Poprawne: {sessionCorrect} / 10</Text>
                                </View>
                                <View style={styles.milestoneButtons}>
                                    <TouchableOpacity style={[styles.mButton, { backgroundColor: '#28a745' }]} onPress={() => { setShowMilestone(false); setSessionCorrect(0); setStats(s => ({ ...s, count: s.count + 1 })); generateProblem(); }}>
                                        <Text style={styles.mButtonText}>Kontynuuj</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>

                    {showHint && !isKeyboardVisible && (
                        <View style={[styles.hintBox, { backgroundColor: theme.modalContent, borderColor: '#007AFF' }]}>
                            <Text style={styles.hintTitle}>Wskazówka:</Text>
                            <Text style={[styles.hintText, { color: theme.textMain }]}>{task.hint}</Text>
                        </View>
                    )}

                    <DrawingModal visible={showScratchpad} onClose={() => setShowScratchpad(false)} problemText={task.qText} />

                    <ScrollView contentContainerStyle={styles.centerContent} keyboardShouldPersistTaps="handled">
                        <View style={styles.card}>
                            <View style={[styles.overlayBackground, { backgroundColor: theme.cardOverlay }]} />
                            <Text style={styles.headerTitle}>Wyrażenia i jednostki</Text>
                            <Text style={[styles.subHeader, { color: theme.textSub }]}>Uzupełnij brakujące liczby.</Text>

                            <View style={styles.taskContent}>
                                <View style={styles.equationRow}>
                                    <Text style={[styles.staticTextLarge, { color: theme.textMain }]}>{task.qText}</Text>
                                    <Text style={[styles.operatorSign, { color: theme.textMain }]}>=</Text>

                                    {(task.type === 'TO_DECIMAL' || task.type === 'TO_SUBUNIT') && (
                                        <View style={styles.inputContainer}>
                                            <TextInput
                                                ref={inp1Ref}
                                                style={[styles.inputLarge, getInputStyle()]}
                                                keyboardType="numeric"
                                                placeholder="?"
                                                placeholderTextColor={theme.inputPlaceholder}
                                                value={inp1}
                                                onChangeText={setInp1}
                                                editable={!ready}
                                            />
                                            <Text style={[styles.unitLabel, { color: theme.unitColor }]}>{task.unitRight1}</Text>
                                        </View>
                                    )}

                                    {task.type === 'TO_TWO_UNITS' && (
                                        <View style={styles.doubleInputRow}>
                                            <View style={styles.inputContainer}>
                                                <TextInput
                                                    ref={inp1Ref}
                                                    style={[styles.inputMedium, getInputStyle()]}
                                                    keyboardType="numeric"
                                                    placeholder="?"
                                                    placeholderTextColor={theme.inputPlaceholder}
                                                    value={inp1}
                                                    onChangeText={setInp1}
                                                    editable={!ready}
                                                />
                                                <Text style={[styles.unitLabel, { color: theme.unitColor }]}>{task.unitRight1}</Text>
                                            </View>
                                            <View style={[styles.inputContainer, { marginLeft: 10 }]}>
                                                <TextInput
                                                    ref={inp2Ref}
                                                    style={[styles.inputMedium, getInputStyle()]}
                                                    keyboardType="numeric"
                                                    placeholder="?"
                                                    placeholderTextColor={theme.inputPlaceholder}
                                                    value={inp2}
                                                    onChangeText={setInp2}
                                                    editable={!ready}
                                                />
                                                <Text style={[styles.unitLabel, { color: theme.unitColor }]}>{task.unitRight2}</Text>
                                            </View>
                                        </View>
                                    )}
                                </View>
                            </View>

                            <TouchableOpacity style={styles.mainBtn} onPress={ready ? nextTask : handleCheck}>
                                <Text style={styles.mainBtnText}>{ready ? 'Następne' : 'Sprawdź'}</Text>
                            </TouchableOpacity>

                            <Text style={[styles.counterTextSmall, { color: theme.textSub }]}>Zadanie: {stats.count}/{TASKS_LIMIT}</Text>
                            <View style={{height: 30, marginTop: 15}}>
                                {msg ? <Text style={[styles.msg, msg.includes('Doskonale') ? styles.correctText : styles.errorText]}>{msg}</Text> : null}
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

const styles = StyleSheet.create({
    container: { flex: 1 },
    keyboardContainer: { flex: 1, justifyContent: 'center' },
    centerContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 20 },
    topButtons: { position: 'absolute', top: 35, right: 20, flexDirection: 'row', zIndex: 10 },
    topBtnItem: { alignItems: 'center', marginLeft: 15 },
    iconTop: { width: 65, height: 65, resizeMode: 'contain' },
    buttonLabel: { fontSize: 13, fontWeight: 'bold', marginTop: 2 },
    hintBox: { position: 'absolute', top: 110, right: 20, padding: 15, borderRadius: 15, width: 260, zIndex: 11, elevation: 5, borderWidth: 1 },
    hintTitle: { fontWeight: 'bold', color: '#007AFF', marginBottom: 5 },
    hintText: { fontSize: 14 },
    card: { width: '96%', maxWidth: 620, borderRadius: 25, padding: 20, alignItems: 'center', alignSelf: 'center' },
    overlayBackground: { ...StyleSheet.absoluteFillObject, borderRadius: 25 },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#007AFF', marginBottom: 5 },
    subHeader: { fontSize: 15, marginBottom: 20 },
    taskContent: { alignItems: 'center', width: '100%', marginBottom: 15 },
    equationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' },
    staticTextLarge: { fontSize: 28, fontWeight: 'bold', marginRight: 5 },
    operatorSign: { fontSize: 30, fontWeight: 'bold', marginHorizontal: 8 },
    inputContainer: { flexDirection: 'row', alignItems: 'center' },
    doubleInputRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' },
    inputLarge: { width: 120, height: 60, borderWidth: 2, borderRadius: 12, fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginRight: 5 },
    inputMedium: { width: 85, height: 60, borderWidth: 2, borderRadius: 12, fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginRight: 5 },
    unitLabel: { fontSize: 22, fontWeight: 'bold' },
    inputCorrect: { borderColor: '#28a745', backgroundColor: 'rgba(40, 167, 69, 0.1)' },
    inputError: { borderColor: '#dc3545', backgroundColor: 'rgba(220, 53, 69, 0.1)' },
    mainBtn: { marginTop: 20, backgroundColor: '#007AFF', paddingHorizontal: 40, paddingVertical: 14, borderRadius: 15 },
    mainBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    counterTextSmall: { fontSize: 13, marginTop: 15 },
    msg: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
    correctText: { color: '#28a745' },
    errorText: { color: '#dc3545' },
    iconsBottom: { position: 'absolute', bottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' },
    iconSame: { width: combinedIconSize, height: combinedIconSize, resizeMode: 'contain', marginHorizontal: 5 },
    counterTextIcons: { fontSize: 20, fontWeight: 'bold' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
    drawingContainer: { width: '95%', height: '85%', borderRadius: 20, overflow: 'hidden' },
    drawingHeader: { height: 55, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
    drawingTitle: { fontSize: 18, fontWeight: 'bold' },
    headerButton: { padding: 10 },
    headerButtonText: { fontSize: 16, color: '#007AFF', fontWeight: '600' },
    problemPreviewContainer: { padding: 12, alignItems: 'center' },
    problemPreviewLabel: { fontSize: 12, color: '#666' },
    problemPreviewTextSmall: { fontSize: 17, fontWeight: '600' },
    canvas: { flex: 1 },
    milestoneCard: { width: '90%', borderRadius: 20, padding: 25, alignItems: 'center' },
    milestoneTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 15 },
    statsRowMilestone: { marginVertical: 10, alignItems: 'center', padding: 15, borderRadius: 15, width: '100%' },
    statsTextMilestone: { fontSize: 18, fontWeight: 'bold' },
    milestoneButtons: { flexDirection: 'row', justifyContent: 'center', width: '100%' },
    mButton: { paddingVertical: 12, paddingHorizontal: 30, borderRadius: 12, alignItems: 'center' },
    mButtonText: { color: '#fff', fontWeight: 'bold' }
});

export default TwoUnitExpressionsTrainer;