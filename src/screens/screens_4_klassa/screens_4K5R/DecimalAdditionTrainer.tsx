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
const DecimalAdditionTrainer = () => {
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
        inputPlaceholder: isDarkMode ? '#94A3B8' : '#aaa', // Naprawiono błąd TS2339

        carryBg: isDarkMode ? '#0F172A' : '#fcfcfc',
        carryText: isDarkMode ? '#94A3B8' : '#888',

        correctBg: isDarkMode ? 'rgba(21, 87, 36, 0.5)' : '#d4edda',
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
        setMentalInput(''); setAttempts(0); setLockedIndices([]); setErrorIndices([]);
        bgAnim.setValue(0); setShowHint(false);

        const newMode = Math.random() < 0.5 ? 'mental' : 'vertical';
        setMode(newMode);

        if (newMode === 'mental') {
            const n1 = parseFloat((Math.random() * 5).toFixed(1));
            const n2 = parseFloat((Math.random() * 5).toFixed(1));
            setNum1(n1); setNum2(n2);
        } else {
            const n1 = parseFloat((Math.random() * 50).toFixed(2));
            const n2 = parseFloat((Math.random() * 50).toFixed(2));
            setNum1(n1); setNum2(n2);

            const s1 = n1.toFixed(2).replace('.', ',');
            const s2 = n2.toFixed(2).replace('.', ',');
            const resLen = (n1 + n2).toFixed(2).length;
            const maxLen = Math.max(s1.length, s2.length, resLen);
            const frac1Pad = s1.padStart(maxLen, ' ');
            const frac2Pad = s2.padStart(maxLen, ' ');

            setVNum1Str(frac1Pad); setVNum2Str(frac2Pad);
            setUserDigits(new Array(maxLen).fill(''));
            setCarries(new Array(maxLen).fill(''));
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
            if (next >= 0) inputRefs.current[next]?.focus();
        }
    };

    const handleCheck = () => {
        const correctResultStr = (num1 + num2).toFixed(2).replace('.', ',');
        if (mode === 'mental') {
            const userVal = parseFloat(mentalInput.replace(',', '.'));
            const correctVal = parseFloat((num1 + num2).toFixed(4));
            if (userVal === correctVal) handleSuccess();
            else handleFailure(correctResultStr);
        } else {
            const expectedArr = correctResultStr.padStart(userDigits.length, ' ').split('');
            if (userDigits.join('').trim() === expectedArr.join('').trim()) handleSuccess();
            else handleFailure(correctResultStr);
        }
    };

    const handleSuccess = () => {
        setStats(s => ({ ...s, correct: s.correct + 1 }));
        setSessionCorrect(prev => prev + 1);
        setMsg('Doskonale! ✅'); setIsCorrect(true); setReadyForNext(true);
        Animated.timing(bgAnim, { toValue: 1, duration: 500, useNativeDriver: false }).start();
        InteractionManager.runAfterInteractions(() => awardXpAndCoins(8, 2));
    };

    const handleFailure = (correctRes: string) => {
        setStats(s => ({ ...s, wrong: s.wrong + 1 }));
        setMsg(`Błąd. Wynik: ${correctRes}`); setIsCorrect(false); setReadyForNext(true);
        Animated.timing(bgAnim, { toValue: -1, duration: 500, useNativeDriver: false }).start();
    };

    const nextTask = () => {
        if (stats.count >= TASKS_LIMIT) { setIsFinished(true); return; }
        if (stats.count > 0 && stats.count % 10 === 0 && !showMilestone) { setShowMilestone(true); return; }
        setStats(s => ({ ...s, count: s.count + 1 })); generateProblem();
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
                    <ScrollView contentContainerStyle={styles.centerContent} keyboardShouldPersistTaps="handled">
                        <View style={styles.card}>
                            <View style={[styles.overlayBackground, { backgroundColor: theme.cardOverlay }]} />
                            <Text style={[styles.headerTitle, { color: theme.textMain }]}>{mode === 'mental' ? "W pamięci" : "Pisemnie"}</Text>

                            <View style={styles.taskContent}>
                                {mode === 'mental' ? (
                                    <View style={styles.mentalContainer}>
                                        <Text style={[styles.equationText, { color: theme.textMain }]}>{num1.toString().replace('.', ',')} + {num2.toString().replace('.', ',')} =</Text>
                                        <TextInput
                                            style={[styles.mentalInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.inputText }]}
                                            keyboardType="numeric" placeholder="?" placeholderTextColor={theme.inputPlaceholder}
                                            value={mentalInput} onChangeText={setMentalInput} editable={!readyForNext}
                                        />
                                    </View>
                                ) : (
                                    <View style={styles.verticalContainer}>
                                        {/* Wiersz przeniesień */}
                                        <View style={styles.vRow}>
                                            {carries.map((c, i) => (
                                                <TextInput
                                                    key={`c-${i}`}
                                                    style={[styles.carryInput, { backgroundColor: theme.carryBg, color: theme.carryText }]}
                                                    value={c}
                                                    onChangeText={v => { const n = [...carries]; n[i]=v; setCarries(n); }}
                                                />
                                            ))}
                                        </View>
                                        {/* Liczby i wynik (uproszczony widok dla przykładu) */}
                                        <Text style={{ color: theme.textMain, fontSize: 30 }}>{vNum1Str}{'\n'}{vNum2Str}</Text>
                                        <View style={styles.vRow}>
                                            {userDigits.map((d, i) => (
                                                <TextInput
                                                    key={`d-${i}`}
                                                    ref={(el) => { inputRefs.current[i] = el; }} // Naprawiono błąd TS2322
                                                    style={[styles.inputCell, { backgroundColor: theme.inputBg, color: theme.inputText }]}
                                                    value={d}
                                                    onChangeText={v => handleVerticalInput(v, i)}
                                                />
                                            ))}
                                        </View>
                                    </View>
                                )}
                            </View>

                            <TouchableOpacity style={styles.mainBtn} onPress={readyForNext ? nextTask : handleCheck}>
                                <Text style={styles.mainBtnText}>{readyForNext ? 'Dalej' : 'Sprawdź'}</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
                <DrawingModal visible={showScratchpad} onClose={() => setShowScratchpad(false)} problemText={`${num1} + ${num2}`} />
            </View>
        </TouchableWithoutFeedback>
    );
};



const styles = StyleSheet.create({
    container: { flex: 1 },
    keyboardContainer: { flex: 1 },
    centerContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 20 },
    card: { width: '96%', maxWidth: 550, borderRadius: 25, padding: 20, alignItems: 'center' },
    overlayBackground: { ...StyleSheet.absoluteFillObject, borderRadius: 25 },
    headerTitle: { fontSize: 26, fontWeight: 'bold', marginBottom: 25 },
    taskContent: { minHeight: 180, justifyContent: 'center', alignItems: 'center' },
    mentalContainer: { flexDirection: 'row', alignItems: 'center' },
    equationText: { fontSize: 40, fontWeight: '800', marginRight: 15 },
    mentalInput: { width: 120, height: 75, borderWidth: 3, borderRadius: 16, fontSize: 36, textAlign: 'center' },
    verticalContainer: { alignItems: 'flex-end' },
    vRow: { flexDirection: 'row' },
    carryInput: { width: 30, height: 30, fontSize: 16, textAlign: 'center', margin: 2, borderRadius: 5 },
    inputCell: { width: 45, height: 55, borderWidth: 2, borderRadius: 10, fontSize: 24, textAlign: 'center', margin: 2 },
    mainBtn: { marginTop: 30, backgroundColor: '#007AFF', paddingHorizontal: 50, paddingVertical: 16, borderRadius: 18 },
    mainBtnText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    drawingContainer: { width: '95%', height: '85%', borderRadius: 20, overflow: 'hidden' },
    drawingHeader: { height: 55, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
    drawingTitle: { fontSize: 18, fontWeight: 'bold' },
    headerButton: { padding: 10 },
    headerButtonText: { fontSize: 16, color: '#007AFF' },
    problemPreviewContainer: { padding: 12, alignItems: 'center' },
    problemPreviewLabel: { fontSize: 13, color: '#666' },
    problemPreviewTextSmall: { fontSize: 16, fontWeight: '600' },
    canvas: { flex: 1 }
});

export default DecimalAdditionTrainer;