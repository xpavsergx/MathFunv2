import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TextInput, Button, Keyboard, ImageBackground,
    Animated, StatusBar, Image, Dimensions, TouchableOpacity, Modal,
    Platform, KeyboardAvoidingView, TouchableWithoutFeedback, ScrollView, InteractionManager,
    useColorScheme
} from 'react-native';
import Svg, { Path, Line } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { awardXpAndCoins } from '../../../services/xpService';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

const EXERCISE_ID = "WrittenMultiplicationWithZerosTrainer";

const { width: screenWidth } = Dimensions.get('window');
const TASKS_LIMIT = 50;
const combinedIconSize = screenWidth * 0.25;
const CELL_SIZE = 46;

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
                    <View style={[styles.problemPreviewContainer, { backgroundColor: theme.previewBg, borderBottomColor: theme.border }]}><Text style={styles.problemPreviewLabel}>Zadanie:</Text><Text style={[styles.problemPreviewTextSmall, { color: isDarkMode ? '#FFF' : '#007AFF' }]}>{problemText}</Text></View>
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

const WrittenMultiplicationWithZerosTrainer = () => {
    const navigation = useNavigation();
    const isDarkMode = useColorScheme() === 'dark';

    const theme = {
        bgImage: require('../../../assets/background.jpg'),
        bgOverlay: isDarkMode ? 'rgba(0, 0, 0, 0.7)' : 'transparent',
        topBtnText: isDarkMode ? '#FFFFFF' : '#007AFF',
        textMain: isDarkMode ? '#FFFFFF' : '#333333',
        textSub: isDarkMode ? '#CBD5E1' : '#555555',
        cardOverlay: isDarkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255,255,255,0.85)',
        modalContent: isDarkMode ? '#1E293B' : '#fff',
        statsRow: isDarkMode ? '#0F172A' : '#f8f9fa',
        inputBg: isDarkMode ? '#334155' : '#fff',
        inputBorder: isDarkMode ? '#475569' : '#ccc',
        inputText: isDarkMode ? '#FFFFFF' : '#007AFF',
        lineColor: isDarkMode ? '#FFFFFF' : '#333333',
        digitColor: isDarkMode ? '#E2E8F0' : '#222',
        correctBg: isDarkMode ? 'rgba(21, 87, 36, 0.5)' : '#d4edda',
        errorBg: isDarkMode ? 'rgba(114, 28, 36, 0.5)' : '#f8d7da',
    };

    const [num1Base, setNum1Base] = useState('0');
    const [num1Zeros, setNum1Zeros] = useState(0);
    const [num2Base, setNum2Base] = useState('0');
    const [num2Zeros, setNum2Zeros] = useState(0);
    const [fullResult, setFullResult] = useState(0);
    const [userDigits, setUserDigits] = useState<string[]>([]);
    const [carries, setCarries] = useState<string[]>([]);

    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const [readyForNext, setReadyForNext] = useState<boolean>(false);
    const [correctCount, setCorrectCount] = useState<number>(0);
    const [wrongCount, setWrongCount] = useState<number>(0);
    const [taskCount, setTaskCount] = useState<number>(0);
    const [firstAttempt, setFirstAttempt] = useState<boolean>(true);

    const [showMilestone, setShowMilestone] = useState(false);
    const [sessionCorrect, setSessionCorrect] = useState(0);

    const [message, setMessage] = useState('');
    const [showScratchpad, setShowScratchpad] = useState(false);
    const [showHint, setShowHint] = useState(false);
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);

    const inputRefs = useRef<(TextInput | null)[]>([]);
    const backgroundColor = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const k1 = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
        const k2 = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
        nextTask();
        return () => { k1.remove(); k2.remove(); };
    }, []);

    const generateProblem = () => {
        setMessage(''); setIsCorrect(null); setReadyForNext(false); setFirstAttempt(true); setShowHint(false);
        backgroundColor.setValue(0);

        const n1B = Math.floor(100 + Math.random() * 800).toString();
        const n1Z = Math.floor(Math.random() * 2);
        const n2B = Math.floor(2 + Math.random() * 8).toString();
        const n2Z = Math.floor(1 + Math.random() * 2);

        const baseProd = (parseInt(n1B) * parseInt(n2B)).toString();
        const totalZeros = n1Z + n2Z;
        const totalVal = parseInt(n1B + "0".repeat(n1Z)) * parseInt(n2B + "0".repeat(n2Z));

        setNum1Base(n1B); setNum1Zeros(n1Z);
        setNum2Base(n2B); setNum2Zeros(n2Z);
        setFullResult(totalVal);

        const displayLen = baseProd.length + totalZeros;
        setUserDigits(new Array(displayLen).fill(''));
        setCarries(new Array(n1B.length).fill(''));

        inputRefs.current = new Array(displayLen).fill(null);

        setTimeout(() => {
            if (inputRefs.current[displayLen - 1]) inputRefs.current[displayLen - 1]?.focus();
        }, 500);
    };

    const handleDigitChange = (val: string, index: number) => {
        const cleanVal = val.replace(/[^0-9]/g, '').slice(-1);
        const newDigits = [...userDigits];
        newDigits[index] = cleanVal;
        setUserDigits(newDigits);

        if (cleanVal !== '' && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleCheck = () => {
        const userResStr = userDigits.join('').trim();
        const userRes = parseInt(userResStr, 10);

        if (userResStr === "" || isNaN(userRes) || userDigits.includes('')) {
            setMessage('Wpisz cały wynik!'); return;
        }

        if (userRes === fullResult) {
            Animated.timing(backgroundColor, { toValue: 1, duration: 500, useNativeDriver: false }).start();
            setCorrectCount(c => c + 1);
            setSessionCorrect(s => s + 1);
            setMessage('Świetnie! ✅'); setReadyForNext(true); setIsCorrect(true);
            InteractionManager.runAfterInteractions(() => awardXpAndCoins(5, 1));
            const currentUser = auth().currentUser;
            if (currentUser) {
                firestore().collection('users').doc(currentUser.uid).collection('exerciseStats').doc(EXERCISE_ID)
                    .set({ totalCorrect: firestore.FieldValue.increment(1) }, { merge: true }).catch(console.error);
            }
        } else {
            Animated.timing(backgroundColor, { toValue: -1, duration: 500, useNativeDriver: false }).start();
            InteractionManager.runAfterInteractions(() => {
                const currentUser = auth().currentUser;
                if (currentUser) {
                    firestore().collection('users').doc(currentUser.uid).collection('exerciseStats').doc(EXERCISE_ID)
                        .set({ totalWrong: firestore.FieldValue.increment(1) }, { merge: true }).catch(console.error);
                }
            });
            if (firstAttempt) {
                setMessage('Błąd. Spróbuj jeszcze raz.'); setFirstAttempt(false); setIsCorrect(false);
                setUserDigits(new Array(userDigits.length).fill(''));
                setTimeout(() => { if (inputRefs.current[userDigits.length - 1]) inputRefs.current[userDigits.length - 1]?.focus(); }, 100);
            } else {
                setMessage(`Poprawny wynik: ${fullResult}`); setWrongCount(w => w + 1); setReadyForNext(true); setIsCorrect(false);
            }
        }
    };

    const nextTask = () => {
        if (taskCount > 0 && taskCount % 10 === 0 && !showMilestone) {
            setShowMilestone(true);
            return;
        }
        if (taskCount >= TASKS_LIMIT) { setMessage('Koniec! 🏆'); return; }
        setTaskCount(t => t + 1); generateProblem();
    };

    const totalBaseCols = Math.max(num1Base.length, userDigits.length - (num1Zeros + num2Zeros));
    const totalZeroCols = num1Zeros + num2Zeros;
    const totalGridWidth = totalBaseCols + totalZeroCols;

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.container}>
                <StatusBar translucent backgroundColor="transparent" barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
                <ImageBackground source={theme.bgImage} style={StyleSheet.absoluteFillObject} resizeMode="cover">
                    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.bgOverlay }]} pointerEvents="none" />
                </ImageBackground>
                <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: backgroundColor.interpolate({ inputRange: [-1, 0, 1], outputRange: ['rgba(255,0,0,0.2)', 'rgba(255,255,255,0)', 'rgba(0,255,0,0.2)'] }) }]} pointerEvents="none" />

                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardContainer}>
                    {!isKeyboardVisible && (
                        <View style={styles.topButtons}>
                            <TouchableOpacity onPress={() => setShowScratchpad(true)} style={styles.topBtnItem}><Image source={require('../../../assets/pencil.png')} style={styles.iconTop} /><Text style={[styles.buttonLabel, { color: theme.topBtnText }]}>Brudnopis</Text></TouchableOpacity>
                            <TouchableOpacity onPress={() => setShowHint(!showHint)} style={styles.topBtnItem}><Image source={require('../../../assets/question.png')} style={styles.iconTop} /><Text style={[styles.buttonLabel, { color: theme.topBtnText }]}>Pomoc</Text></TouchableOpacity>
                        </View>
                    )}

                    {showHint && !isKeyboardVisible && (
                        <View style={[styles.hintBox, { backgroundColor: theme.modalContent, borderColor: '#007AFF' }]}>
                            <Text style={styles.hintTitle}>Mnożenie z zerami:</Text>
                            <Text style={[styles.hintText, { color: theme.textMain }]}>Pomnóż liczby bez zer, a na końcu dopisz tyle zer, ile jest w obu liczbach razem.</Text>
                        </View>
                    )}

                    <DrawingModal visible={showScratchpad} onClose={() => setShowScratchpad(false)} problemText={`${num1Base}${"0".repeat(num1Zeros)} × ${num2Base}${"0".repeat(num2Zeros)}`} />

                    <Modal visible={showMilestone} transparent={true} animationType="slide">
                        <View style={styles.modalOverlay}>
                            <View style={[styles.milestoneCard, { backgroundColor: theme.modalContent }]}>
                                <Text style={[styles.milestoneTitle, { color: theme.textMain }]}>Podsumowanie serii 📊</Text>
                                <View style={[styles.statsRow, { backgroundColor: theme.statsRow }]}>
                                    <Text style={[styles.statsText, { color: theme.textMain }]}>Poprawne: {sessionCorrect} / 10</Text>
                                    <Text style={[styles.statsText, { color: '#28a745', marginTop: 5 }]}>Skuteczność: {(sessionCorrect / 10 * 100).toFixed(0)}%</Text>
                                </View>
                                <Text style={[styles.suggestionText, { color: theme.textSub }]}>{sessionCorrect >= 8 ? "Rewelacyjnie! Jesteś mistrzem!" : "Trenuj dalej, aby być jeszcze lepszym."}</Text>
                                <View style={styles.milestoneButtons}>
                                    <TouchableOpacity style={[styles.mButton, { backgroundColor: '#28a745' }]} onPress={() => { setShowMilestone(false); setSessionCorrect(0); nextTask(); }}><Text style={styles.mButtonText}>Kontynuuj</Text></TouchableOpacity>
                                    <TouchableOpacity style={[styles.mButton, { backgroundColor: '#007AFF' }]} onPress={() => { setShowMilestone(false); navigation.goBack(); }}><Text style={styles.mButtonText}>Inny temat</Text></TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>

                    <ScrollView contentContainerStyle={styles.centerContent} keyboardShouldPersistTaps="handled">
                        <View style={styles.card}>
                            <View style={[styles.overlayBackground, { backgroundColor: theme.cardOverlay }]} />
                            <Text style={[styles.questionMain, { color: theme.textMain }]}>Mnożenie z zerami</Text>

                            <View style={[styles.mathGrid, { width: (totalGridWidth + 1) * CELL_SIZE }]}>
                                <View style={styles.row}>
                                    <View style={styles.cell} />
                                    {new Array(totalGridWidth).fill(0).map((_, i) => {
                                        const carryIdx = carries.length - 1 - (totalBaseCols - 1 - i);
                                        return (
                                            <View key={i} style={styles.cell}>
                                                {carryIdx >= 0 && carryIdx < carries.length && i < totalBaseCols && (
                                                    <View style={[styles.carryCell, { backgroundColor: theme.statsRow, borderColor: theme.inputBorder }]}><TextInput style={[styles.carryInput, { color: theme.textSub }]} keyboardType="numeric" maxLength={1} value={carries[carryIdx]} onChangeText={v => { const n = [...carries]; n[carryIdx] = v; setCarries(n); }} editable={!readyForNext} /></View>
                                                )}
                                            </View>
                                        );
                                    })}
                                </View>

                                <View style={styles.row}>
                                    <View style={styles.cell} />
                                    {num1Base.padStart(totalBaseCols, ' ').split('').concat(new Array(num1Zeros).fill('0')).map((d, i) => (
                                        <View key={i} style={styles.cell}><Text style={[styles.digit, { color: theme.digitColor }, i >= totalBaseCols && styles.grayDigit]}>{d}</Text></View>
                                    ))}
                                </View>

                                <View style={styles.row}>
                                    <View style={styles.cell}><Text style={[styles.digit, { color: theme.digitColor }]}>×</Text></View>
                                    {new Array(totalBaseCols - 1).fill(' ').concat(num2Base.split('')).concat(new Array(num2Zeros).fill('0')).map((d, i) => (
                                        <View key={i} style={styles.cell}><Text style={[styles.digit, { color: theme.digitColor }, i >= totalBaseCols && styles.grayDigit]}>{d}</Text></View>
                                    ))}
                                </View>

                                <View style={styles.separatorContainer}>
                                    <View style={[styles.horizontalLine, { backgroundColor: theme.lineColor }]} />
                                    <View style={[styles.dashedLine, { left: (totalBaseCols + 1) * CELL_SIZE - 1 }]}>
                                        <Svg height="160" width="2"><Line x1="1" y1="0" x2="1" y2="160" stroke={theme.lineColor} strokeWidth="2" strokeDasharray="6, 4" /></Svg>
                                    </View>
                                </View>

                                <View style={styles.row}>
                                    <View style={styles.cell} />
                                    {userDigits.map((d, i) => {
                                        const isZeroZone = i >= totalBaseCols;
                                        return (
                                            <View key={i} style={[
                                                styles.inputCell,
                                                { backgroundColor: theme.inputBg, borderColor: theme.inputBorder },
                                                isZeroZone && styles.zeroCellActive,
                                                isCorrect === false && { backgroundColor: theme.errorBg, borderColor: '#dc3545' },
                                                isCorrect === true && { backgroundColor: theme.correctBg, borderColor: '#28a745' }
                                            ]}>
                                                <TextInput
                                                    ref={(el) => { inputRefs.current[i] = el; }}
                                                    style={[styles.mainInput, { color: theme.inputText }, isZeroZone && { color: '#28a745' }]}
                                                    keyboardType="numeric"
                                                    value={d}
                                                    onChangeText={v => handleDigitChange(v, i)}
                                                    editable={!readyForNext}
                                                />
                                            </View>
                                        );
                                    })}
                                </View>
                            </View>

                            <View style={styles.buttonContainer}><Button title={readyForNext ? 'Dalej' : 'Sprawdź'} onPress={readyForNext ? nextTask : handleCheck} color="#007AFF" /></View>
                            <Text style={[styles.counterTextSmall, { color: theme.textSub }]}>Zadanie: {taskCount} / {TASKS_LIMIT}</Text>
                            {message ? <Text style={[styles.result, message.includes('Świetnie') ? styles.correctText : styles.errorText]}>{message}</Text> : null}
                        </View>
                    </ScrollView>

                    {!isKeyboardVisible && (
                        <View style={styles.iconsBottom}>
                            <Image source={require('../../../assets/happy.png')} style={styles.iconSame} /><Text style={[styles.counterTextIcons, { color: theme.textMain }]}>{correctCount}</Text><Image source={require('../../../assets/sad.png')} style={styles.iconSame} /><Text style={[styles.counterTextIcons, { color: theme.textMain }]}>{wrongCount}</Text>
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
    centerContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 20 },
    topButtons: { position: 'absolute', top: 40, right: 20, flexDirection: 'row', alignItems: 'center', zIndex: 10 },
    topBtnItem: { alignItems: 'center', marginLeft: 15 },
    iconTop: { width: 70, height: 70, resizeMode: 'contain' },
    buttonLabel: { fontSize: 14, fontWeight: 'bold', marginTop: 2 },
    hintBox: { position: 'absolute', top: 120, right: 20, padding: 15, borderRadius: 15, maxWidth: 260, zIndex: 11, elevation: 5, borderWidth: 1 },
    hintTitle: { fontSize: 16, fontWeight: 'bold', color: '#007AFF', marginBottom: 5, textAlign: 'center' },
    hintText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
    card: { width: '95%', maxWidth: 480, borderRadius: 20, padding: 20, marginTop: 20, alignItems: 'center', alignSelf: 'center' },
    overlayBackground: { ...StyleSheet.absoluteFillObject, borderRadius: 20 },
    questionMain: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
    mathGrid: { alignSelf: 'center' },
    row: { flexDirection: 'row', alignItems: 'center', height: 45 },
    cell: { width: CELL_SIZE, height: 45, justifyContent: 'center', alignItems: 'center' },
    digit: { fontSize: 34, fontWeight: 'bold', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
    grayDigit: { color: '#888' },
    separatorContainer: { width: '100%', height: 4, marginVertical: 8, position: 'relative' },
    horizontalLine: { width: '110%', height: 3, alignSelf: 'center' },
    dashedLine: { position: 'absolute', top: -125, zIndex: 10 },
    carryCell: { width: 46, height: 35, justifyContent: 'center', alignItems: 'center', marginHorizontal: 1, borderWidth: 1, borderRadius: 4 },
    carryInput: { width: '100%', height: '100%', fontSize: 18, textAlign: 'center', padding: 0 },
    inputCell: { width: 46, height: 55, borderWidth: 2, borderRadius: 8, marginHorizontal: 1, justifyContent: 'center', alignItems: 'center' },
    zeroCellActive: { borderColor: '#28a745' },
    mainInput: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', width: '100%', height: '100%', padding: 0 },
    buttonContainer: { marginTop: 25, width: '80%', borderRadius: 10, overflow: 'hidden' },
    result: { fontSize: 18, fontWeight: '700', marginTop: 15, textAlign: 'center' },
    correctText: { color: '#28a745' },
    errorText: { color: '#dc3545' },
    counterTextSmall: { fontSize: 12, fontWeight: '400', textAlign: 'center', marginTop: 10 },
    iconsBottom: { position: 'absolute', bottom: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' },
    iconSame: { width: combinedIconSize, height: combinedIconSize, resizeMode: 'contain', marginHorizontal: 10 },
    counterTextIcons: { fontSize: 16, marginHorizontal: 8, textAlign: 'center' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    drawingContainer: { width: '95%', height: '85%', borderRadius: 20, overflow: 'hidden' },
    drawingHeader: { height: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, borderBottomWidth: 1 },
    drawingTitle: { fontSize: 18, fontWeight: 'bold' },
    headerButton: { padding: 5 },
    headerButtonText: { fontSize: 16, color: '#007AFF' },
    problemPreviewContainer: { padding: 10, alignItems: 'center', borderBottomWidth: 1, width: '100%' },
    problemPreviewLabel: { fontSize: 12, color: '#777', textTransform: 'uppercase', marginBottom: 4 },
    problemPreviewTextSmall: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
    canvas: { flex: 1 },
    milestoneCard: { width: '90%', borderRadius: 20, padding: 25, alignItems: 'center', elevation: 10 },
    milestoneTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 15 },
    statsRow: { marginVertical: 10, alignItems: 'center', padding: 15, borderRadius: 15, width: '100%' },
    statsText: { fontSize: 18, fontWeight: 'bold' },
    suggestionText: { fontSize: 15, textAlign: 'center', marginVertical: 20, lineHeight: 22 },
    milestoneButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
    mButton: { paddingVertical: 12, paddingHorizontal: 15, borderRadius: 12, width: '48%', alignItems: 'center' },
    mButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 }
});

export default WrittenMultiplicationWithZerosTrainer;