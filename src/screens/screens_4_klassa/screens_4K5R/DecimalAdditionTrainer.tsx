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

const EXERCISE_ID = "DecimalAdditionTrainer_IV_FinalFix";
const { width: screenWidth } = Dimensions.get('window');
const TASKS_LIMIT = 20;
const combinedIconSize = screenWidth * 0.25;

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
                    <View style={[styles.canvas, { backgroundColor: theme.canvas }]} onResponderMove={onTouchMove} onResponderRelease={onTouchEnd} onStartShouldSetResponder={() => true}>
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
const DecimalAdditionTrainer = () => {
    const navigation = useNavigation();
    const isDarkMode = useColorScheme() === 'dark';

    const theme = {
        bgImage: require('../../../assets/background.jpg'),
        bgOverlay: isDarkMode ? 'rgba(0, 0, 0, 0.75)' : 'transparent',
        cardOverlay: isDarkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255,255,255,0.94)',
        textMain: isDarkMode ? '#FFFFFF' : '#333333',
        textSub: isDarkMode ? '#94A3B8' : '#555555',
        topBtnText: isDarkMode ? '#FFFFFF' : '#007AFF',

        // Поля ввода
        inputBg: isDarkMode ? '#334155' : '#ffffff',
        inputBorder: isDarkMode ? '#475569' : '#ccc',
        inputText: isDarkMode ? '#FFFFFF' : '#007AFF',

        // Вертикальные клетки
        digitText: isDarkMode ? '#E2E8F0' : '#222',
        carryBg: isDarkMode ? '#1E293B' : '#fcfcfc',

        // Состояние успеха/ошибки
        correctBg: isDarkMode ? 'rgba(21, 128, 61, 0.3)' : '#e8f5e9',
        errorBg: isDarkMode ? 'rgba(185, 28, 28, 0.3)' : '#ffeef0',
        modalContent: isDarkMode ? '#1E293B' : '#fff',
    };

    // Состояния... (без изменений)
    const [mode, setMode] = useState<'mental' | 'vertical'>('mental');
    const [num1, setNum1] = useState(0);
    const [num2, setNum2] = useState(0);
    const [vNum1Str, setVNum1Str] = useState('');
    const [vNum2Str, setVNum2Str] = useState('');
    const [userDigits, setUserDigits] = useState<string[]>([]);
    const [carries, setCarries] = useState<string[]>([]);
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

    const generateProblem = () => {
        setMsg(''); setIsCorrect(null); setReadyForNext(false);
        setMentalInput('');
        setAttempts(0);
        setLockedIndices([]);
        setErrorIndices([]);
        bgAnim.setValue(0);
        setShowHint(false);

        const newMode = Math.random() < 0.5 ? 'mental' : 'vertical';
        setMode(newMode);

        if (newMode === 'mental') {
            const n1 = parseFloat((Math.random() * 5).toFixed(1));
            const n2 = parseFloat((Math.random() * 5).toFixed(1));
            setNum1(n1); setNum2(n2);
        } else {
            const rawVal1 = parseFloat((Math.random() * 50).toFixed(2));
            const rawVal2 = parseFloat((Math.random() * 50).toFixed(2));
            setNum1(rawVal1); setNum2(rawVal2);

            const s1 = rawVal1.toFixed(2).replace('.', ',');
            const s2 = rawVal2.toFixed(2).replace('.', ',');
            const resLen = (rawVal1 + rawVal2).toFixed(2).length;
            const maxLen = Math.max(s1.length, s2.length, resLen);

            const frac1Pad = s1.padStart(maxLen, ' ');
            const frac2Pad = s2.padStart(maxLen, ' ');
            setVNum1Str(frac1Pad); setVNum2Str(frac2Pad);
            setUserDigits(new Array(maxLen).fill(''));
            setCarries(new Array(maxLen).fill(''));
            setLockedIndices(new Array(maxLen).fill(false));
            setErrorIndices(new Array(maxLen).fill(false));

            setTimeout(() => { inputRefs.current[maxLen - 1]?.focus(); }, 500);
        }
    };

    const handleVerticalInput = (val: string, index: number) => {
        if (lockedIndices[index]) return;
        const clean = val.replace(/[^0-9]/g, '').slice(-1);
        const newDigits = [...userDigits];
        newDigits[index] = clean;
        setUserDigits(newDigits);
        if (clean !== '' && index > 0) {
            let nextIndex = index - 1;
            if (vNum1Str[nextIndex] === ',') nextIndex--;
            inputRefs.current[nextIndex]?.focus();
        }
    };

    const handleCheck = () => {
        const correctResultStr = (num1 + num2).toFixed(2).replace('.', ',');
        if (mode === 'mental') {
            const userVal = parseFloat(mentalInput.replace(',', '.').trim());
            const correctVal = parseFloat((num1 + num2).toFixed(2));
            if (userVal === correctVal) handleSuccess();
            else attempts === 0 ? (setAttempts(1), setMsg('Spróbuj jeszcze raz!')) : handleFailure(correctResultStr);
        } else {
            const expectedArr = correctResultStr.padStart(userDigits.length, ' ').split('');
            let allGood = true;
            for (let i = 0; i < userDigits.length; i++) {
                if (vNum1Str[i] !== ',' && expectedArr[i] !== ' ' && userDigits[i] !== expectedArr[i]) allGood = false;
            }
            if (allGood) handleSuccess();
            else if (attempts === 0) {
                setAttempts(1);
                setMsg('Popraw błędy');
                const newLocked = [...lockedIndices];
                const newErrors = [...errorIndices];
                const newUserDigits = [...userDigits];
                userDigits.forEach((d, i) => {
                    if (vNum1Str[i] !== ',' && expectedArr[i] !== ' ') {
                        if (d === expectedArr[i]) newLocked[i] = true;
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
        Animated.timing(bgAnim, { toValue: 1, duration: 500, useNativeDriver: false }).start();
        awardXpAndCoins(8, 2);
    };

    const handleFailure = (res: string) => {
        setStats(s => ({ ...s, wrong: s.wrong + 1 }));
        setMsg(`Wynik to: ${res}`); setIsCorrect(false); setReadyForNext(true);
    };

    const nextTask = () => {
        if (stats.count >= TASKS_LIMIT) { setIsFinished(true); return; }
        if (stats.count > 0 && stats.count % 10 === 0 && !showMilestone) { setShowMilestone(true); return; }
        setStats(s => ({ ...s, count: s.count + 1 }));
        generateProblem();
    };

    // --- RENDER PISEMNY ---
    const renderVerticalProblem = () => {
        const renderRow = (paddedStr: string, isSecond: boolean) => (
            <View style={styles.vRow}>
                {isSecond && <View style={styles.plusSignContainer}><Text style={[styles.plusSign, {color: theme.textMain}]}>+</Text></View>}
                {paddedStr.split('').map((char, i) => {
                    if (char === ',') return <View key={i} style={styles.commaCell}><Text style={[styles.commaText, {color: theme.textMain}]}>,</Text></View>;
                    if (char === ' ') return <View key={i} style={styles.digitCellEmpty} />;
                    return (
                        <View key={i} style={styles.digitCell}>
                            <Text style={[styles.digitText, {color: theme.digitText}]}>{char}</Text>
                        </View>
                    );
                })}
            </View>
        );

        return (
            <View style={styles.verticalContainer}>
                <View style={[styles.vRow, { marginBottom: 8 }]}>
                    <View style={styles.plusSignContainer} />
                    {carries.map((c, i) => (
                        vNum1Str[i] === ',' || vNum1Str[i] === ' ' ? <View key={i} style={styles.commaCellEmpty} /> :
                            <View key={i} style={styles.carryCellWrapper}>
                                <TextInput style={[styles.carryInput, {backgroundColor: theme.carryBg, color: theme.textSub, borderColor: theme.inputBorder}]} value={c} onChangeText={v => { const n = [...carries]; n[i]=v; setCarries(n); }} keyboardType="numeric" maxLength={1} />
                            </View>
                    ))}
                </View>
                <View style={[styles.numbersBox, { borderBottomColor: isDarkMode ? '#475569' : '#000' }]}>
                    {renderRow(vNum1Str, false)}
                    {renderRow(vNum2Str, true)}
                </View>
                <View style={styles.vRow}>
                    <View style={styles.plusSignContainer} />
                    {userDigits.map((d, i) => (
                        vNum1Str[i] === ',' ? <View key={i} style={styles.commaCell}><Text style={[styles.commaText, {color: theme.textMain}]}>,</Text></View> :
                            <View key={i} style={[styles.inputCell, {backgroundColor: theme.inputBg, borderColor: theme.inputBorder}, lockedIndices[i] && {borderColor: '#28a745', backgroundColor: theme.correctBg}, errorIndices[i] && {borderColor: '#dc3545', backgroundColor: theme.errorBg}]}>
                                <TextInput ref={el => inputRefs.current[i] = el} style={[styles.mainInput, {color: theme.inputText}, lockedIndices[i] && {color: '#28a745'}]} value={d} onChangeText={v => handleVerticalInput(v, i)} keyboardType="numeric" maxLength={1} editable={!readyForNext && !lockedIndices[i]} />
                            </View>
                    ))}
                </View>
            </View>
        );
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.container}>
                <StatusBar translucent backgroundColor="transparent" barStyle={isDarkMode ? "light-content" : "dark-content"} />
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

                    {showHint && !isKeyboardVisible && (
                        <View style={[styles.hintBox, { backgroundColor: theme.modalContent, borderColor: '#007AFF' }]}>
                            <Text style={styles.hintTitle}>Wskazówka:</Text>
                            <Text style={[styles.hintText, { color: theme.textMain }]}>
                                {mode === 'mental' ? "Pamiętaj o przecinku!" : "Uzupełnij wszystkie pola."}
                            </Text>
                        </View>
                    )}

                    <DrawingModal visible={showScratchpad} onClose={() => setShowScratchpad(false)} problemText={`${num1} + ${num2}`} />

                    <Modal visible={showMilestone || isFinished} transparent animationType="fade">
                        <View style={styles.modalOverlay}>
                            <View style={[styles.milestoneCard, { backgroundColor: theme.modalContent }]}>
                                <Text style={[styles.milestoneTitle, { color: theme.textMain }]}>{isFinished ? "Koniec gry! 🏆" : "Statystyki 📊"}</Text>
                                <View style={[styles.statsRowMilestone, {backgroundColor: isDarkMode ? '#0F172A' : '#f8f9fa'}]}>
                                    <Text style={[styles.statsTextMilestone, {color: theme.textMain}]}>Wynik: {isFinished ? stats.correct : sessionCorrect} / {isFinished ? TASKS_LIMIT : 10}</Text>
                                </View>
                                <View style={styles.milestoneButtons}>
                                    <TouchableOpacity style={[styles.mButton, { backgroundColor: '#28a745' }]} onPress={() => { isFinished ? (setIsFinished(false), setStats({correct:0, wrong:0, count:1}), generateProblem()) : (setShowMilestone(false), setSessionCorrect(0), nextTask()) }}><Text style={styles.mButtonText}>{isFinished ? "Jeszcze raz" : "Dalej"}</Text></TouchableOpacity>
                                    <TouchableOpacity style={[styles.mButton, { backgroundColor: '#007AFF' }]} onPress={() => navigation.goBack()}><Text style={styles.mButtonText}>Menu</Text></TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>

                    <ScrollView contentContainerStyle={styles.centerContent} keyboardShouldPersistTaps="handled">
                        <View style={styles.card}>
                            <View style={[styles.overlayBackground, { backgroundColor: theme.cardOverlay }]} />
                            <Text style={[styles.headerTitle, { color: theme.textMain }]}>{mode === 'mental' ? "Oblicz w pamięci" : "Oblicz pisemnie"}</Text>

                            <View style={styles.taskContent}>
                                {mode === 'mental' ? (
                                    <View style={styles.mentalContainer}>
                                        <Text style={[styles.equationText, {color: theme.textMain}]}>{num1.toString().replace('.', ',')} + {num2.toString().replace('.', ',')} =</Text>
                                        <TextInput
                                            style={[styles.mentalInput, {backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.inputText}, isCorrect && {borderColor: '#28a745'}]}
                                            keyboardType="numeric" placeholder="?" placeholderTextColor={isDarkMode ? "#475569" : "#ccc"}
                                            value={mentalInput} onChangeText={setMentalInput} editable={!readyForNext}
                                        />
                                    </View>
                                ) : renderVerticalProblem()}
                            </View>

                            <TouchableOpacity style={styles.mainBtn} onPress={readyForNext ? nextTask : handleCheck}>
                                <Text style={styles.mainBtnText}>{readyForNext ? 'Następne' : 'Sprawdź'}</Text>
                            </TouchableOpacity>

                            <Text style={[styles.counterTextSmall, {color: theme.textSub}]}>Zadanie: {stats.count}/{TASKS_LIMIT}</Text>
                            <View style={{height: 30, marginTop: 15}}>{msg ? <Text style={[styles.msg, msg.includes('Doskonale') ? styles.correctText : styles.errorText]}>{msg}</Text> : null}</View>
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

// ... стили (незначительные правки для прозрачности и теней)
const styles = StyleSheet.create({
    container: { flex: 1 },
    keyboardContainer: { flex: 1, justifyContent: 'center' },
    centerContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 20 },
    topButtons: { position: 'absolute', top: 5, right: 20, flexDirection: 'row', zIndex: 10 },
    topBtnItem: { alignItems: 'center', marginLeft: 15 },
    iconTop: { width: 60, height: 60, resizeMode: 'contain' },
    buttonLabel: { fontSize: 13, fontWeight: 'bold', marginTop: 2 },
    hintBox: { position: 'absolute', top: 110, right: 20, padding: 15, borderRadius: 15, width: 240, zIndex: 11, borderWidth: 1 },
    hintTitle: { fontWeight: 'bold', color: '#007AFF', marginBottom: 5 },
    hintText: { fontSize: 14 },
    card: { width: '96%', maxWidth: 500, borderRadius: 25, padding: 20, alignItems: 'center', alignSelf: 'center' },
    overlayBackground: { ...StyleSheet.absoluteFillObject, borderRadius: 25 },
    headerTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
    taskContent: { alignItems: 'center', width: '100%', marginBottom: 10, minHeight: 180, justifyContent: 'center' },
    mentalContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    equationText: { fontSize: 32, fontWeight: '800', marginRight: 10 },
    mentalInput: { width: 100, height: 65, borderWidth: 2, borderRadius: 12, fontSize: 28, fontWeight: 'bold', textAlign: 'center' },
    verticalContainer: { alignItems: 'flex-end' },
    vRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'flex-end', marginBottom: 4 },
    numbersBox: { borderBottomWidth: 3, paddingBottom: 8, marginBottom: 8, paddingHorizontal: 5 },
    digitCell: { width: 45, height: 55, justifyContent: 'center', alignItems: 'center' },
    digitCellEmpty: { width: 45, height: 55 },
    digitText: { fontSize: 32, fontWeight: '800' },
    commaCell: { width: 15, height: 55, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 5 },
    commaText: { fontSize: 32, fontWeight: 'bold' },
    carryCellWrapper: { width: 45, height: 35, marginBottom: 2 },
    carryInput: { width: '100%', height: '100%', borderWidth: 1, borderRadius: 6, textAlign: 'center', fontSize: 18, fontWeight: 'bold' },
    inputCell: { width: 45, height: 55, borderWidth: 2, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginHorizontal: 1 },
    mainInput: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', width: '100%' },
    plusSignContainer: { width: 30, height: 55, alignItems: 'center', justifyContent: 'center' },
    plusSign: { fontSize: 30, fontWeight: 'bold' },
    mainBtn: { marginTop: 20, backgroundColor: '#007AFF', paddingHorizontal: 40, paddingVertical: 14, borderRadius: 15 },
    mainBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    counterTextSmall: { fontSize: 13, marginTop: 10 },
    msg: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
    correctText: { color: '#28a745' },
    errorText: { color: '#dc3545' },
    iconsBottom: { position: 'absolute', bottom: 5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' },
    iconSame: { width: combinedIconSize, height: combinedIconSize, resizeMode: 'contain' },
    counterTextIcons: { fontSize: 20, fontWeight: 'bold', marginLeft: -10, marginRight: 20 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
    drawingContainer: { width: '95%', height: '80%', borderRadius: 20, overflow: 'hidden' },
    drawingHeader: { height: 55, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15 },
    drawingTitle: { fontSize: 18, fontWeight: 'bold' },
    headerButton: { padding: 10 },
    headerButtonText: { fontSize: 14, color: '#007AFF', fontWeight: 'bold' },
    problemPreviewContainer: { padding: 10, alignItems: 'center' },
    problemPreviewLabel: { fontSize: 12, color: '#666' },
    problemPreviewTextSmall: { fontSize: 16, fontWeight: 'bold' },
    canvas: { flex: 1 },
    milestoneCard: { width: '85%', borderRadius: 20, padding: 20, alignItems: 'center' },
    milestoneTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
    statsRowMilestone: { padding: 15, borderRadius: 12, width: '100%', alignItems: 'center' },
    statsTextMilestone: { fontSize: 18, fontWeight: 'bold' },
    milestoneButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 20 },
    mButton: { paddingVertical: 12, borderRadius: 10, width: '48%', alignItems: 'center' },
    mButtonText: { color: '#fff', fontWeight: 'bold' },
    commaCellEmpty: { width: 15 }
});

export default DecimalAdditionTrainer;