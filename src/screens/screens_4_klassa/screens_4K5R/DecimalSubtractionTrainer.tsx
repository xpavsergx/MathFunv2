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

const EXERCISE_ID = "DecimalSubtractionTrainer_IV_FinalFix";
const { width: screenWidth } = Dimensions.get('window');

// LIMIT ZADAŃ
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
const DecimalSubtractionTrainer = () => {
    const navigation = useNavigation();
    const isDarkMode = useColorScheme() === 'dark';

    const theme = {
        bgImage: require('../../../assets/background.jpg'),
        bgOverlay: isDarkMode ? 'rgba(0, 0, 0, 0.75)' : 'transparent',
        cardOverlay: isDarkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255,255,255,0.94)',
        textMain: isDarkMode ? '#FFFFFF' : '#333333',
        textSub: isDarkMode ? '#CBD5E1' : '#555555',
        topBtnText: isDarkMode ? '#FFFFFF' : '#007AFF',
        inputBg: isDarkMode ? '#334155' : '#ffffff',
        inputBorder: isDarkMode ? '#475569' : '#ccc',
        inputText: isDarkMode ? '#FFFFFF' : '#007AFF',
        digitText: isDarkMode ? '#E2E8F0' : '#222',
        carryBg: isDarkMode ? '#1E293B' : '#fcfcfc',
        modalContent: isDarkMode ? '#1E293B' : '#fff',
        correctBg: isDarkMode ? 'rgba(21, 128, 61, 0.3)' : '#d4edda',
        errorBg: isDarkMode ? 'rgba(185, 28, 28, 0.3)' : '#ffeef0',
        correctBorder: isDarkMode ? '#4ADE80' : '#28a745',
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
                n2 = rnd(1, Math.floor(n1 * 10)) / 10;
            } else if (subType === 1) {
                n1 = rnd(2, 9);
                n2 = rnd(1, 9) / 10;
            } else {
                n1 = rnd(5, 15);
                n2 = n1 - (rnd(1, 15) / 10);
            }
            n1 = Math.round(n1 * 100) / 100; n2 = Math.round(n2 * 100) / 100;
            if (n2 >= n1) n2 = n1 - 0.1;
            setNum1(n1); setNum2(n2);
        } else {
            let n1 = rnd(1000, 9999) / 100;
            let n2 = rnd(500, 8000) / 100;
            if (n2 >= n1) n2 = n1 - (rnd(100, 500) / 100);
            n1 = Math.round(n1 * 100) / 100; n2 = Math.round(n2 * 100) / 100;
            setNum1(n1); setNum2(n2);

            const s1 = n1.toFixed(2).replace('.', ',');
            const s2 = n2.toFixed(2).replace('.', ',');
            const maxLen = Math.max(s1.length, s2.length, (n1 - n2).toFixed(2).length);
            const f1 = s1.padStart(maxLen, ' '); const f2 = s2.padStart(maxLen, ' ');

            setVNum1Str(f1); setVNum2Str(f2);
            setUserDigits(new Array(maxLen).fill('')); setBorrows(new Array(maxLen).fill(''));
            setLockedIndices(new Array(maxLen).fill(false)); setErrorIndices(new Array(maxLen).fill(false));
            setTimeout(() => inputRefs.current[maxLen - 1]?.focus(), 500);
        }
    };

    const handleVerticalInput = (val: string, index: number) => {
        if (lockedIndices[index]) return;
        const clean = val.replace(/[^0-9]/g, '').slice(-1);
        const newDigits = [...userDigits]; newDigits[index] = clean;
        setUserDigits(newDigits);
        if (clean !== '' && index > 0) {
            let next = index - 1; if (vNum1Str[next] === ',') next--;
            while (next >= 0 && lockedIndices[next]) next--;
            if (next >= 0 && vNum1Str[next] === ',') next--;
            if (next >= 0) inputRefs.current[next]?.focus();
        }
    };

    const handleCheck = () => {
        const correctResultStr = (num1 - num2).toFixed(2).replace('.', ',');

        if (mode === 'mental') {
            const userVal = parseFloat(mentalInput.replace(',', '.').trim());
            const correctVal = parseFloat((num1 - num2).toFixed(2));
            if (Math.abs(userVal - correctVal) < 0.01) {
                handleSuccess();
            } else {
                Animated.sequence([
                    Animated.timing(bgAnim, { toValue: -1, duration: 200, useNativeDriver: false }),
                    Animated.timing(bgAnim, { toValue: 0, duration: 200, useNativeDriver: false })
                ]).start();

                if (attempts === 0) {
                    setMsg('Błąd! Spróbuj ponownie ⚠️');
                    setAttempts(1);
                    setMentalInput('');
                    setIsCorrect(false);
                } else {
                    handleFailure(correctResultStr);
                }
            }
        } else {
            const expectedArr = correctResultStr.padStart(userDigits.length, ' ').split('');
            let hasEmpty = false;
            for (let i = 0; i < userDigits.length; i++) {
                if (vNum1Str[i] !== ',' && expectedArr[i] !== ' ' && !userDigits[i] && !lockedIndices[i]) hasEmpty = true;
            }
            if (hasEmpty) { setMsg('Uzupełnij pola! ⚠️'); return; }

            let allGood = true;
            const newLocked = [...lockedIndices]; const newErrors = [...errorIndices]; const newUserDigits = [...userDigits];
            for (let i = 0; i < userDigits.length; i++) {
                if (vNum1Str[i] === ',') continue;
                if (userDigits[i] !== expectedArr[i] && expectedArr[i] !== ' ') allGood = false;
            }

            if (allGood) {
                handleSuccess();
            } else {
                Animated.sequence([
                    Animated.timing(bgAnim, { toValue: -1, duration: 200, useNativeDriver: false }),
                    Animated.timing(bgAnim, { toValue: 0, duration: 200, useNativeDriver: false })
                ]).start();

                if (attempts === 0) {
                    setMsg('Popraw błędy ⚠️');
                    setAttempts(1);
                    userDigits.forEach((d, i) => {
                        if (vNum1Str[i] === ',') return;
                        if (d === expectedArr[i] && d !== '') { newLocked[i] = true; } else { newErrors[i] = true; newUserDigits[i] = ''; }
                    });
                    setLockedIndices(newLocked); setErrorIndices(newErrors); setUserDigits(newUserDigits);
                } else {
                    handleFailure(correctResultStr);
                }
            }
        }
    };

    const handleSuccess = () => {
        setStats(s => ({ ...s, correct: s.correct + 1 })); setSessionCorrect(prev => prev + 1);
        setMsg('Doskonale! ✅'); setIsCorrect(true); setReadyForNext(true);
        Animated.timing(bgAnim, { toValue: 1, duration: 500, useNativeDriver: false }).start();
        InteractionManager.runAfterInteractions(() => awardXpAndCoins(8, 2));
    };

    const handleFailure = (res: string) => {
        setStats(s => ({ ...s, wrong: s.wrong + 1 })); setMsg(`Wynik: ${res}`);
        setIsCorrect(false); setReadyForNext(true);
    };

    const nextTask = () => {
        if (stats.count >= TASKS_LIMIT) { setIsFinished(true); return; }
        if (stats.count > 0 && stats.count % 10 === 0 && !showMilestone) { setShowMilestone(true); return; }
        setStats(s => ({ ...s, count: s.count + 1 })); generateProblem();
    };

    const handleRestart = () => {
        setIsFinished(false);
        setStats({ correct: 0, wrong: 0, count: 1 });
        setSessionCorrect(0);
        generateProblem();
    };

    const renderVerticalProblem = () => (
        <View style={styles.verticalContainer}>
            <View style={styles.vRow}>
                <View style={styles.plusSignContainer} />
                {borrows.map((c, i) => (
                    vNum1Str[i] === ',' || vNum1Str[i] === ' ' ? <View key={i} style={styles.commaCellEmpty} /> :
                        <View key={i} style={styles.carryCellWrapper}>
                            <TextInput style={[styles.carryInput, {backgroundColor: theme.carryBg, color: theme.textSub, borderColor: theme.inputBorder}]} keyboardType="numeric" maxLength={2} value={c} onChangeText={v => { const n = [...borrows]; n[i]=v; setBorrows(n); }} editable={!readyForNext} />
                        </View>
                ))}
            </View>
            <View style={[styles.numbersBox, { borderBottomColor: isDarkMode ? '#475569' : '#000' }]}>
                {[vNum1Str, vNum2Str].map((str, idx) => (
                    <View key={idx} style={styles.vRow}>
                        {idx === 1 && <View style={styles.plusSignContainer}><Text style={[styles.plusSign, {color: theme.textMain}]}>-</Text></View>}
                        {str.split('').map((char, i) => (
                            char === ',' ? <View key={i} style={styles.commaCell}><Text style={[styles.commaText, {color: theme.textMain}]}>,</Text></View> :
                                char === ' ' ? <View key={i} style={styles.digitCellEmpty} /> :
                                    <View key={i} style={styles.digitCell}><Text style={[styles.digitText, {color: theme.digitText}]}>{char}</Text></View>
                        ))}
                    </View>
                ))}
            </View>
            <View style={styles.vRow}>
                <View style={styles.plusSignContainer} />
                {userDigits.map((d, i) => (
                    vNum1Str[i] === ',' ? <View key={i} style={styles.commaCell}><Text style={[styles.commaText, {color: theme.textMain}]}>,</Text></View> :
                        <View key={i} style={[styles.inputCell, {backgroundColor: theme.inputBg, borderColor: theme.inputBorder}, lockedIndices[i] && {backgroundColor: theme.correctBg, borderColor: theme.correctBorder}, errorIndices[i] && {backgroundColor: theme.errorBg, borderColor: theme.errorBorder}]}>
                            <TextInput ref={el => inputRefs.current[i] = el} style={[styles.mainInput, {color: theme.inputText}, lockedIndices[i] && {color: isDarkMode ? '#86EFAC' : '#155724'}]} keyboardType="numeric" maxLength={1} value={d} onChangeText={v => handleVerticalInput(v, i)} editable={!readyForNext && !lockedIndices[i]} />
                        </View>
                ))}
            </View>
        </View>
    );

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.container}>
                <StatusBar translucent backgroundColor="transparent" barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
                <ImageBackground source={theme.bgImage} style={StyleSheet.absoluteFillObject} resizeMode="cover">
                    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.bgOverlay }]} />
                </ImageBackground>
                <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: bgAnim.interpolate({ inputRange: [-1, 0, 1], outputRange: ['rgba(255,0,0,0.3)', 'transparent', 'rgba(0,255,0,0.3)'] }) }]} pointerEvents="none" />

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
                            <Text style={[styles.hintText, { color: theme.textMain }]}>{mode === 'mental' ? "7,0 - 0,4 = ?" : "Pożyczaj od sąsiada z lewej!"}</Text>
                        </View>
                    )}

                    <DrawingModal visible={showScratchpad} onClose={() => setShowScratchpad(false)} problemText={`${num1} - ${num2}`} />

                    <Modal visible={showMilestone || isFinished} transparent animationType="fade">
                        <View style={styles.modalOverlay}>
                            <View style={[styles.milestoneCard, { backgroundColor: theme.modalContent }]}>
                                <Text style={[styles.milestoneTitle, { color: theme.textMain }]}>{isFinished ? "Koniec gry! 🏆" : "Statystyki 📊"}</Text>
                                <Text style={[styles.statsTextMilestone, { color: theme.textMain }]}>Poprawne: {isFinished ? stats.correct : sessionCorrect} / {isFinished ? TASKS_LIMIT : 10}</Text>
                                <View style={styles.milestoneButtons}>
                                    <TouchableOpacity style={[styles.mButton, { backgroundColor: '#28a745' }]} onPress={() => isFinished ? handleRestart() : (setShowMilestone(false), setSessionCorrect(0), nextTask())}><Text style={styles.mButtonText}>{isFinished ? "Od nowa" : "Dalej"}</Text></TouchableOpacity>
                                    <TouchableOpacity style={[styles.mButton, { backgroundColor: '#007AFF' }]} onPress={() => navigation.goBack()}><Text style={styles.mButtonText}>Menu</Text></TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>

                    <ScrollView contentContainerStyle={styles.centerContent} keyboardShouldPersistTaps="handled">
                        <View style={styles.card}>
                            <View style={[styles.overlayBackground, { backgroundColor: theme.cardOverlay }]} />
                            <Text style={[styles.headerTitle, { color: theme.textMain }]}>{mode === 'mental' ? "W pamięci" : "Pisemnie"}</Text>
                            <View style={styles.taskContent}>
                                {mode === 'mental' ? (
                                    <View style={styles.mentalContainer}>
                                        <Text style={[styles.equationText, {color: theme.textMain}]}>{num1.toString().replace('.', ',')} - {num2.toString().replace('.', ',')} =</Text>
                                        <TextInput style={[styles.mentalInput, {backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.inputText}]} keyboardType="numeric" value={mentalInput} onChangeText={setMentalInput} editable={!readyForNext} />
                                    </View>
                                ) : renderVerticalProblem()}
                            </View>
                            <TouchableOpacity style={styles.mainBtn} onPress={readyForNext ? nextTask : handleCheck}>
                                <Text style={styles.mainBtnText}>{readyForNext ? 'Następne' : 'Sprawdź'}</Text>
                            </TouchableOpacity>
                            <Text style={[styles.counterTextSmall, {color: theme.textSub}]}>Zadanie: {stats.count}/{TASKS_LIMIT}</Text>
                            <View style={{height: 30, marginTop: 15, justifyContent: 'center'}}>
                                {msg ? <Text style={[styles.msg, msg.includes('Doskonale') ? styles.correctText : styles.errorText]}>{msg}</Text> : null}
                            </View>
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
    keyboardContainer: { flex: 1, justifyContent: 'center' },
    centerContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 20 },
    topButtons: { position: 'absolute', top: 5, right: 20, flexDirection: 'row', zIndex: 10 },
    topBtnItem: { alignItems: 'center', marginLeft: 15 },
    iconTop: { width: 65, height: 65, resizeMode: 'contain' },
    buttonLabel: { fontSize: 13, fontWeight: 'bold', marginTop: 2 },
    hintBox: { position: 'absolute', top: 110, right: 20, padding: 15, borderRadius: 15, width: 240, zIndex: 11, elevation: 5, borderWidth: 1 },
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
    mainBtn: { marginTop: 25, backgroundColor: '#007AFF', paddingHorizontal: 40, paddingVertical: 14, borderRadius: 15 },
    mainBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    counterTextSmall: { fontSize: 13, marginTop: 10 },
    iconsBottom: { position: 'absolute', bottom: 5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' },
    iconSame: { width: combinedIconSize, height: combinedIconSize, resizeMode: 'contain' },
    counterTextIcons: { fontSize: 20, fontWeight: 'bold', marginLeft: -5, marginRight: 15 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
    drawingContainer: { width: '95%', height: '80%', borderRadius: 20, overflow: 'hidden' },
    drawingHeader: { height: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, borderBottomWidth: 1 },
    drawingTitle: { fontSize: 18, fontWeight: 'bold' },
    headerButton: { padding: 5 },
    headerButtonText: { fontSize: 14, color: '#007AFF', fontWeight: 'bold' },
    problemPreviewContainer: { padding: 10, alignItems: 'center', borderBottomWidth: 1 },
    problemPreviewLabel: { fontSize: 12, color: '#666' },
    problemPreviewTextSmall: { fontSize: 16, fontWeight: 'bold' },
    canvas: { flex: 1 },
    milestoneCard: { width: '85%', borderRadius: 20, padding: 25, alignItems: 'center' },
    milestoneTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
    statsTextMilestone: { fontSize: 18, fontWeight: 'bold', marginBottom: 20 },
    milestoneButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
    mButton: { paddingVertical: 12, borderRadius: 10, width: '48%', alignItems: 'center' },
    mButtonText: { color: '#fff', fontWeight: 'bold' },
    commaCellEmpty: { width: 15 },
    msg: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
    correctText: { color: '#28a745' },
    errorText: { color: '#dc3545' },
});

export default DecimalSubtractionTrainer;