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

const EXERCISE_ID = "DecimalSubtractionTrainer_IV_FinalFix";
const { width: screenWidth } = Dimensions.get('window');

const TASKS_LIMIT = 20;
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
const DecimalSubtractionTrainer = () => {
    const navigation = useNavigation();
    const isDarkMode = useColorScheme() === 'dark';

    const theme = {
        bgOverlay: isDarkMode ? 'rgba(0, 0, 0, 0.75)' : 'transparent',
        cardOverlay: isDarkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255,255,255,0.94)',
        textMain: isDarkMode ? '#FFFFFF' : '#333333',
        textSub: isDarkMode ? '#CBD5E1' : '#555555',
        topBtnText: isDarkMode ? '#FFFFFF' : '#007AFF',
        inputBg: isDarkMode ? '#334155' : '#fff',
        inputBorder: isDarkMode ? '#475569' : '#ccc',
        inputText: isDarkMode ? '#38BDF8' : '#007AFF',
        digitText: isDarkMode ? '#E2E8F0' : '#222',
        lineColor: isDarkMode ? '#FFFFFF' : '#000',
        modalContent: isDarkMode ? '#1E293B' : '#fff',
        statsRow: isDarkMode ? '#0F172A' : '#f8f9fa',
        correctBg: isDarkMode ? 'rgba(21, 87, 36, 0.5)' : '#e8f5e9',
        correctBorder: isDarkMode ? '#4ADE80' : '#28a745',
        errorBg: isDarkMode ? 'rgba(114, 28, 36, 0.5)' : '#ffeef0',
        errorBorder: isDarkMode ? '#F87171' : '#dc3545',
    };

    const [mode, setMode] = useState<'mental' | 'vertical'>('mental');
    const [num1, setNum1] = useState(0);
    const [num2, setNum2] = useState(0);
    const [vNum1Str, setVNum1Str] = useState('');
    const [vNum2Str, setVNum2Str] = useState('');
    const [userDigits, setUserDigits] = useState<string[]>([]);
    const [borrows, setBorrows] = useState<string[]>([]);
    const [lockedIndices, setLockedIndices] = useState<boolean[]>([]);
    const [errorIndices, setErrorIndices] = useState<boolean[]>([]);
    const [mentalInput, setMentalInput] = useState('');
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const [readyForNext, setReadyForNext] = useState(false);
    const [attempts, setAttempts] = useState(0);
    const [stats, setStats] = useState({ correct: 0, wrong: 0, count: 0 });
    const [msg, setMsg] = useState('');
    const [showScratchpad, setShowScratchpad] = useState(false);
    const [showHint, setShowHint] = useState(false);
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);
    const [showMilestone, setShowMilestone] = useState(false);
    const [sessionCorrect, setSessionCorrect] = useState(0);
    const [isFinished, setIsFinished] = useState(false);

    const bgAnim = useRef(new Animated.Value(0)).current;
    const inputRefs = useRef<(TextInput | null)[]>([]);

    useEffect(() => {
        const k1 = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
        const k2 = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
        nextTask();
        return () => { k1.remove(); k2.remove(); };
    }, []);

    const rnd = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

    const generateProblem = () => {
        setMsg(''); setIsCorrect(null); setReadyForNext(false);
        setMentalInput(''); setAttempts(0); setLockedIndices([]); setErrorIndices([]);
        bgAnim.setValue(0); setShowHint(false);

        const newMode = Math.random() < 0.5 ? 'mental' : 'vertical';
        setMode(newMode);

        if (newMode === 'mental') {
            const subType = Math.floor(Math.random() * 3);
            let n1 = 0, n2 = 0;
            if (subType === 0) {
                n1 = rnd(15, 55) / 10;
                n2 = rnd(1, Math.round((n1 % 1) * 10) + 2) / 10;
            } else if (subType === 1) {
                n1 = rnd(2, 9);
                n2 = rnd(1, 9) / 10;
            } else {
                n1 = rnd(5, 15);
                n2 = n1 - (rnd(1, 15) / 10);
            }
            n1 = Math.round(n1 * 100) / 100;
            n2 = Math.round(n2 * 100) / 100;
            if (n2 >= n1) n2 = n1 - 0.1;
            setNum1(n1); setNum2(n2);
        } else {
            let n1 = rnd(1000, 9999) / 100;
            let n2 = rnd(500, 8000) / 100;
            if (n2 >= n1) n2 = n1 - 5;
            setNum1(n1); setNum2(n2);
            const s1 = n1.toFixed(2).replace('.', ',');
            const s2 = n2.toFixed(2).replace('.', ',');
            const maxLen = Math.max(s1.length, s2.length);
            setVNum1Str(s1.padStart(maxLen, ' '));
            setVNum2Str(s2.padStart(maxLen, ' '));
            setUserDigits(new Array(maxLen).fill(''));
            setBorrows(new Array(maxLen).fill(''));
            setLockedIndices(new Array(maxLen).fill(false));
            setErrorIndices(new Array(maxLen).fill(false));
            setTimeout(() => inputRefs.current[maxLen - 1]?.focus(), 500);
        }
    };

    const handleVerticalInput = (val: string, index: number) => {
        if (lockedIndices[index]) return;
        const clean = val.replace(/[^0-9]/g, '').slice(-1);
        const newDigits = [...userDigits];
        newDigits[index] = clean;
        setUserDigits(newDigits);
        if (clean !== '' && index > 0) {
            let next = index - 1;
            if (vNum1Str[next] === ',') next--;
            inputRefs.current[next]?.focus();
        }
    };

    const handleCheck = () => {
        const correctResultStr = (num1 - num2).toFixed(2).replace('.', ',');
        if (mode === 'mental') {
            const cleanInput = mentalInput.replace(',', '.').trim();
            const userVal = parseFloat(cleanInput);
            const correctVal = parseFloat((num1 - num2).toFixed(2));
            if (Math.abs(userVal - correctVal) < 0.01) handleSuccess();
            else attempts === 0 ? (setAttempts(1), setMsg('Błąd! Spróbuj jeszcze raz ⚠️'), setMentalInput('')) : handleFailure(correctResultStr);
        } else {
            const expectedArr = correctResultStr.padStart(userDigits.length, ' ').split('');
            let allGood = true;
            userDigits.forEach((d, i) => {
                if (vNum1Str[i] !== ',' && expectedArr[i] !== ' ' && d !== expectedArr[i]) allGood = false;
            });
            if (allGood) handleSuccess();
            else if (attempts === 0) {
                setAttempts(1); setMsg('Popraw czerwone pola ⚠️');
                const newLocked = [...lockedIndices]; const newErrors = [...errorIndices]; const newUserDigits = [...userDigits];
                userDigits.forEach((d, i) => {
                    if (vNum1Str[i] !== ',' && expectedArr[i] !== ' ') {
                        if (d === expectedArr[i]) { newLocked[i] = true; newErrors[i] = false; }
                        else { newErrors[i] = true; newUserDigits[i] = ''; }
                    }
                });
                setLockedIndices(newLocked); setErrorIndices(newErrors); setUserDigits(newUserDigits);
            } else handleFailure(correctResultStr);
        }
    };

    const handleSuccess = () => {
        setStats(s => ({ ...s, correct: s.correct + 1 })); setSessionCorrect(prev => prev + 1);
        setMsg('Doskonale! ✅'); setIsCorrect(true); setReadyForNext(true);
        if (mode === 'vertical') setLockedIndices(new Array(userDigits.length).fill(true));
        Animated.timing(bgAnim, { toValue: 1, duration: 500, useNativeDriver: false }).start();
        InteractionManager.runAfterInteractions(() => awardXpAndCoins(8, 2));
    };

    const handleFailure = (correctRes: string) => {
        setStats(s => ({ ...s, wrong: s.wrong + 1 })); setMsg(`Wynik to: ${correctRes}`);
        setIsCorrect(false); setReadyForNext(true);
        Animated.timing(bgAnim, { toValue: -1, duration: 200, useNativeDriver: false }).start();
    };

    const nextTask = () => {
        if (stats.count >= TASKS_LIMIT) { setIsFinished(true); return; }
        if (stats.count > 0 && stats.count % 10 === 0 && !showMilestone) { setShowMilestone(true); return; }
        setStats(s => ({ ...s, count: s.count + 1 })); generateProblem();
    };

    const renderVerticalProblem = () => {
        return (
            <View style={styles.verticalContainer}>
                {/* Wiersz pożyczek */}
                <View style={styles.vRow}>
                    <View style={styles.plusSignContainer} />
                    {borrows.map((c, i) => (
                        vNum1Str[i] === ',' || vNum1Str[i] === ' '
                            ? <View key={i} style={styles.commaCellEmpty} />
                            : <View key={i} style={styles.carryCellWrapper}>
                                <TextInput style={[styles.carryInput, {backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.textSub}]} keyboardType="numeric" maxLength={2} value={c} onChangeText={v => { const n = [...borrows]; n[i]=v; setBorrows(n); }} editable={!readyForNext} />
                            </View>
                    ))}
                </View>
                {/* Liczby */}
                <View style={[styles.numbersBox, {borderBottomColor: theme.lineColor}]}>
                    {[vNum1Str, vNum2Str].map((str, rowIdx) => (
                        <View key={rowIdx} style={styles.vRow}>
                            {rowIdx === 1 && <View style={styles.plusSignContainer}><Text style={[styles.plusSign, {color: theme.digitText}]}>-</Text></View>}
                            {str.split('').map((char, i) => (
                                char === ','
                                    ? <View key={i} style={styles.commaCell}><Text style={[styles.commaText, {color: theme.digitText}]}>,</Text></View>
                                    : <View key={i} style={char === ' ' ? styles.digitCellEmpty : styles.digitCell}><Text style={[styles.digitText, {color: theme.digitText}]}>{char}</Text></View>
                            ))}
                        </View>
                    ))}
                </View>
                {/* Wynik */}
                <View style={styles.vRow}>
                    <View style={styles.plusSignContainer} />
                    {userDigits.map((d, i) => (
                        vNum1Str[i] === ','
                            ? <View key={i} style={styles.commaCell}><Text style={[styles.commaText, {color: theme.digitText}]}>,</Text></View>
                            : <View key={i} style={[styles.inputCell, {backgroundColor: theme.inputBg, borderColor: theme.inputBorder}, lockedIndices[i] && {backgroundColor: theme.correctBg, borderColor: theme.correctBorder}, errorIndices[i] && {backgroundColor: theme.errorBg, borderColor: theme.errorBorder}]}>
                                <TextInput ref={el => { inputRefs.current[i] = el; }} style={[styles.mainInput, {color: theme.inputText}]} keyboardType="numeric" maxLength={1} value={d} onChangeText={v => handleVerticalInput(v, i)} editable={!readyForNext && !lockedIndices[i]} />
                            </View>
                    ))}
                </View>
            </View>
        );
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.container}>
                <StatusBar translucent backgroundColor="transparent" barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
                <ImageBackground source={require('../../../assets/background.jpg')} style={StyleSheet.absoluteFillObject} resizeMode="cover">
                    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.bgOverlay }]} />
                </ImageBackground>
                <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: bgAnim.interpolate({ inputRange: [-1, 0, 1], outputRange: ['rgba(255,0,0,0.15)', 'transparent', 'rgba(0,255,0,0.15)'] }) }]} pointerEvents="none" />

                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardContainer}>
                    {!isKeyboardVisible && (
                        <View style={styles.topButtons}>
                            <TouchableOpacity onPress={() => setShowScratchpad(true)} style={styles.topBtnItem}>
                                <Image source={require('../../../assets/pencil.png')} style={styles.iconTop} />
                                <Text style={[styles.buttonLabel, {color: theme.topBtnText}]}>Brudnopis</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setShowHint(!showHint)} style={styles.topBtnItem}>
                                <Image source={require('../../../assets/question.png')} style={styles.iconTop} />
                                <Text style={[styles.buttonLabel, {color: theme.topBtnText}]}>Pomoc</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    <DrawingModal visible={showScratchpad} onClose={() => setShowScratchpad(false)} problemText={`${num1} - ${num2}`} />

                    <ScrollView contentContainerStyle={styles.centerContent}>
                        <View style={styles.card}>
                            <View style={[styles.overlayBackground, {backgroundColor: theme.cardOverlay}]} />
                            <Text style={[styles.headerTitle, {color: theme.textMain}]}>{mode === 'mental' ? "W pamięci" : "Pisemnie"}</Text>

                            <View style={styles.taskContent}>
                                {mode === 'mental' ? (
                                    <View style={styles.mentalContainer}>
                                        <Text style={[styles.equationText, {color: theme.textMain}]}>{num1.toString().replace('.', ',')} - {num2.toString().replace('.', ',')} =</Text>
                                        <TextInput style={[styles.mentalInput, {backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.inputText}, attempts === 1 && isCorrect === false && {borderColor: theme.errorBorder, backgroundColor: theme.errorBg}]} keyboardType="numeric" value={mentalInput} onChangeText={setMentalInput} editable={!readyForNext} />
                                    </View>
                                ) : renderVerticalProblem()}
                            </View>

                            <TouchableOpacity style={styles.mainBtn} onPress={readyForNext ? nextTask : handleCheck}>
                                <Text style={styles.mainBtnText}>{readyForNext ? 'Następne' : 'Sprawdź'}</Text>
                            </TouchableOpacity>
                            <Text style={[styles.counterTextSmall, {color: theme.textSub}]}>Zadanie: {stats.count}/{TASKS_LIMIT}</Text>
                            <Text style={[styles.msg, isCorrect ? {color: '#28a745'} : {color: '#dc3545'}]}>{msg}</Text>
                        </View>
                    </ScrollView>

                    {!isKeyboardVisible && (
                        <View style={styles.iconsBottom}>
                            <Image source={require('../../../assets/happy.png')} style={styles.iconSame} /><Text style={[styles.counterTextIcons, {color: theme.textMain}]}>{stats.correct}</Text>
                            <Image source={require('../../../assets/sad.png')} style={styles.iconSame} /><Text style={[styles.counterTextIcons, {color: theme.textMain}]}>{stats.wrong}</Text>
                        </View>
                    )}
                </KeyboardAvoidingView>
            </View>
        </TouchableWithoutFeedback>
    );
};



const styles = StyleSheet.create({
    container: { flex: 1 },
    keyboardContainer: { flex: 1 },
    centerContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 20 },
    topButtons: { position: 'absolute', top: 40, right: 20, flexDirection: 'row', zIndex: 10 },
    topBtnItem: { alignItems: 'center', marginLeft: 15 },
    iconTop: { width: 60, height: 60, resizeMode: 'contain' },
    buttonLabel: { fontSize: 12, fontWeight: 'bold', marginTop: 2 },
    card: { width: '94%', borderRadius: 25, padding: 20, alignItems: 'center', elevation: 4 },
    overlayBackground: { ...StyleSheet.absoluteFillObject, borderRadius: 25 },
    headerTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
    taskContent: { minHeight: 180, justifyContent: 'center', alignItems: 'center', width: '100%' },
    mentalContainer: { flexDirection: 'row', alignItems: 'center' },
    equationText: { fontSize: 32, fontWeight: '800' },
    mentalInput: { width: 100, height: 60, borderWidth: 2, borderRadius: 12, fontSize: 28, textAlign: 'center', marginLeft: 10 },
    verticalContainer: { alignItems: 'flex-end' },
    vRow: { flexDirection: 'row', alignItems: 'flex-end' },
    numbersBox: { borderBottomWidth: 3, paddingBottom: 5, marginBottom: 5 },
    digitCell: { width: 45, height: 55, justifyContent: 'center', alignItems: 'center' },
    digitCellEmpty: { width: 45 },
    digitText: { fontSize: 32, fontWeight: '800' },
    commaCell: { width: 15, justifyContent: 'flex-end', alignItems: 'center' },
    commaCellEmpty: { width: 15 },
    commaText: { fontSize: 32, fontWeight: 'bold' },
    carryCellWrapper: { width: 45, height: 35, justifyContent: 'center', alignItems: 'center' },
    carryInput: { width: 35, height: 30, borderWidth: 1, borderRadius: 6, fontSize: 18, textAlign: 'center' },
    inputCell: { width: 45, height: 55, borderWidth: 2, borderRadius: 10, marginHorizontal: 1 },
    mainInput: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', flex: 1 },
    plusSignContainer: { width: 30, alignItems: 'center' },
    plusSign: { fontSize: 32, fontWeight: 'bold' },
    mainBtn: { marginTop: 20, backgroundColor: '#007AFF', paddingHorizontal: 40, paddingVertical: 12, borderRadius: 15 },
    mainBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    counterTextSmall: { fontSize: 12, marginTop: 10 },
    msg: { fontSize: 16, fontWeight: '700', marginTop: 10 },
    iconsBottom: { position: 'absolute', bottom: 20, flexDirection: 'row', width: '100%', justifyContent: 'center', alignItems: 'center' },
    iconSame: { width: combinedIconSize * 0.8, height: combinedIconSize * 0.8, resizeMode: 'contain' },
    counterTextIcons: { fontSize: 20, fontWeight: 'bold', marginHorizontal: 5 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    drawingContainer: { width: '96%', height: '80%', borderRadius: 20, overflow: 'hidden' },
    drawingHeader: { height: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, borderBottomWidth: 1 },
    drawingTitle: { fontSize: 16, fontWeight: 'bold' },
    headerButton: { padding: 5 },
    headerButtonText: { fontSize: 14, color: '#007AFF' },
    problemPreviewContainer: { padding: 10, alignItems: 'center', borderBottomWidth: 1 },
    problemPreviewLabel: { fontSize: 12, color: '#666' },
    problemPreviewTextSmall: { fontSize: 16, fontWeight: '600' },
    canvas: { flex: 1 },
    milestoneCard: { width: '85%', borderRadius: 20, padding: 20, alignItems: 'center' },
    milestoneTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
    statsRow: { padding: 10, borderRadius: 10, width: '100%', alignItems: 'center' },
    statsTextMilestone: { fontSize: 16, fontWeight: 'bold' },
    milestoneButtons: { flexDirection: 'row', marginTop: 15 },
    mButton: { padding: 10, borderRadius: 10, marginHorizontal: 5 }
});

export default DecimalSubtractionTrainer;