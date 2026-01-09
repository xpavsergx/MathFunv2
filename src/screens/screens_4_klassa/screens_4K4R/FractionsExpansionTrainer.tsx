import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TextInput, Keyboard, ImageBackground,
    Animated, StatusBar, Image, Dimensions, TouchableOpacity, Modal,
    Platform, KeyboardAvoidingView, TouchableWithoutFeedback, ScrollView, InteractionManager
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
// Upewnij się, że ścieżka do xpService jest poprawna w Twoim projekcie
import { awardXpAndCoins } from '../../../services/xpService';

const { width: screenWidth } = Dimensions.get('window');
const TASKS_LIMIT = 40;
const combinedIconSize = screenWidth * 0.25;

// --- MODAL BRUDNOPISU ---
const DrawingModal = ({ visible, onClose, problemText }: { visible: boolean; onClose: () => void, problemText: string }) => {
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
                <View style={styles.drawingContainer}>
                    <View style={styles.drawingHeader}>
                        <TouchableOpacity onPress={handleClear} style={styles.headerButton}><Text style={styles.headerButtonText}>🗑️ Wyczyść</Text></TouchableOpacity>
                        <Text style={styles.drawingTitle}>Brudnopis</Text>
                        <TouchableOpacity onPress={onClose} style={styles.headerButton}><Text style={styles.headerButtonText}>❌ Zamknij</Text></TouchableOpacity>
                    </View>
                    <View style={styles.problemPreviewContainer}>
                        <Text style={styles.problemPreviewLabel}>Zadanie:</Text>
                        <Text numberOfLines={2} style={styles.problemPreviewTextSmall}>{problemText}</Text>
                    </View>
                    <View style={styles.canvas} onStartShouldSetResponder={() => true} onMoveShouldSetResponder={() => true} onResponderGrant={(evt) => { const { locationX, locationY } = evt.nativeEvent; setCurrentPath(`M${locationX},${locationY}`); }} onResponderMove={onTouchMove} onResponderRelease={onTouchEnd}>
                        <Svg height="100%" width="100%">
                            {paths.map((d, index) => (<Path key={index} d={d} stroke="#000" strokeWidth={3} fill="none" />))}
                            <Path d={currentPath} stroke="#000" strokeWidth={3} fill="none" />
                        </Svg>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

// --- WIZUALIZACJA ---
const FractionShape = ({ total, shaded }: { total: number, shaded: number }) => {
    if (total > 16) return null; // Ukrywamy dla dużych mianowników

    const size = 120;
    const center = size / 2;
    const radius = 55;

    return (
        <View style={{ marginBottom: 15 }}>
            <Svg height={size} width={size} viewBox={`0 0 ${size} ${size}`}>
                {[...Array(total)].map((_, i) => {
                    const startAngle = (i * 360) / total - 90;
                    const endAngle = ((i + 1) * 360) / total - 90;
                    const x1 = center + radius * Math.cos((Math.PI * startAngle) / 180);
                    const y1 = center + radius * Math.sin((Math.PI * startAngle) / 180);
                    const x2 = center + radius * Math.cos((Math.PI * endAngle) / 180);
                    const y2 = center + radius * Math.sin((Math.PI * endAngle) / 180);
                    const d = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`;
                    return <Path key={i} d={d} fill={i < shaded ? "#4A90E2" : "#FFF"} stroke="#2c3e50" strokeWidth="2" />;
                })}
            </Svg>
        </View>
    );
};

// --- GŁÓWNY KOMPONENT ---
const FractionsExpansionTrainer = () => {
    const [questionText, setQuestionText] = useState('');
    const [currentHint, setCurrentHint] = useState('');

    // taskData przechowuje poprawne odpowiedzi (targetNum, targetDen) oraz dane do wizualizacji (visTotal, visShaded)
    const [taskData, setTaskData] = useState({ targetNum: 1, targetDen: 1, visTotal: 0, visShaded: 0 });

    const [userNum, setUserNum] = useState('');
    const [userDen, setUserDen] = useState('');
    const [numCorrect, setNumCorrect] = useState<boolean | null>(null);
    const [denCorrect, setDenCorrect] = useState<boolean | null>(null);
    const [readyForNext, setReadyForNext] = useState(false);
    const [attempts, setAttempts] = useState(0);
    const [correctCount, setCorrectCount] = useState(0);
    const [wrongCount, setWrongCount] = useState(0);
    const [taskCount, setTaskCount] = useState(0);
    const [message, setMessage] = useState('');
    const [showScratchpad, setShowScratchpad] = useState(false);
    const [showHint, setShowHint] = useState(false);
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);

    const numInputRef = useRef<TextInput>(null);
    const denInputRef = useRef<TextInput>(null);
    const backgroundColor = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const k1 = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
        const k2 = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
        nextTask();
        return () => { k1.remove(); k2.remove(); };
    }, []);

    const rnd = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

    const generateProblem = () => {
        setMessage(''); setNumCorrect(null); setDenCorrect(null);
        setReadyForNext(false); setUserNum(''); setUserDen('');
        setAttempts(0); backgroundColor.setValue(0); setShowHint(false);

        // Typy zadań:
        // 0: Skracanie (Simplifying)
        // 1: Rozszerzanie (Expanding)
        // 2: Uzupełnianie równości (Missing Value)
        const type = rnd(0, 2);

        let q = "", hint = "";
        let tNum = 0, tDen = 0; // Target values (answers)
        let vTotal = 0, vShaded = 0; // Visual values

        // Baza ułamków nieskracalnych do generowania zadań
        const bases = [
            [1,2], [1,3], [2,3], [1,4], [3,4], [1,5], [2,5], [3,5], [4,5],
            [1,6], [5,6], [1,7], [2,7], [3,7], [1,8], [3,8], [5,8], [7,8]
        ];
        const base = bases[rnd(0, bases.length - 1)];
        const bn = base[0];
        const bd = base[1];

        if (type === 0) {
            // SKRACANIE (np. 12/32 -> 3/8)
            const multiplier = rnd(2, 6);
            const bigN = bn * multiplier;
            const bigD = bd * multiplier;

            tNum = bn;
            tDen = bd;
            vTotal = bigD; vShaded = bigN;

            q = `Skróć ułamek ${bigN}/${bigD} do postaci nieskracalnej.`;
            hint = `Podziel licznik i mianownik przez największy wspólny dzielnik (tutaj przez ${multiplier}).`;

        } else if (type === 1) {
            // ROZSZERZANIE (np. 2/3 przez 4)
            const multiplier = rnd(2, 5);

            tNum = bn * multiplier;
            tDen = bd * multiplier;
            vTotal = bd; vShaded = bn;

            q = `Rozszerz ułamek ${bn}/${bd} przez ${multiplier}.`;
            hint = `Pomnóż górę i dół ułamka przez ${multiplier}.`;

        } else {
            // RÓWNOŚĆ (np. 2/7 = ?/28)
            const multiplier = rnd(2, 5);
            const bigN = bn * multiplier;
            const bigD = bd * multiplier;
            const missingTop = Math.random() > 0.5;

            tNum = bigN;
            tDen = bigD;
            vTotal = 0; vShaded = 0;

            if (missingTop) {
                q = `Wpisz liczby tak, aby równość była prawdziwa: \n ${bn}/${bd} = ⬜ / ${bigD}`;
                hint = `Mianownik powiększył się ${multiplier} razy (${bd} • ${multiplier} = ${bigD}), więc licznik też pomnóż przez ${multiplier}.`;
            } else {
                q = `Wpisz liczby tak, aby równość była prawdziwa: \n ${bn}/${bd} = ${bigN} / ⬜`;
                hint = `Licznik powiększył się ${multiplier} razy, więc mianownik też musisz pomnożyć przez ${multiplier}.`;
            }
        }

        setTaskData({ targetNum: tNum, targetDen: tDen, visTotal: vTotal, visShaded: vShaded });
        setQuestionText(q);
        setCurrentHint(hint);
        setTimeout(() => numInputRef.current?.focus(), 400);
    };

    const handleCheck = () => {
        const n = parseInt(userNum);
        const d = parseInt(userDen);
        if (!userNum || !userDen) { setMessage('Wpisz obie liczby!'); return; }

        const isNCorrect = n === taskData.targetNum;
        const isDCorrect = d === taskData.targetDen;
        setNumCorrect(isNCorrect);
        setDenCorrect(isDCorrect);

        if (isNCorrect && isDCorrect) {
            Animated.timing(backgroundColor, { toValue: 1, duration: 500, useNativeDriver: false }).start();
            setCorrectCount(c => c + 1); setMessage('Doskonale! ✅');
            setReadyForNext(true); InteractionManager.runAfterInteractions(() => awardXpAndCoins(10, 2));
        } else {
            const nextAttempt = attempts + 1;
            setAttempts(nextAttempt);
            if (nextAttempt < 2) {
                setMessage('Popraw błędy! ❌');
                if (!isNCorrect) setUserNum('');
                if (!isDCorrect) setUserDen('');
                Animated.sequence([Animated.timing(backgroundColor, { toValue: -1, duration: 400, useNativeDriver: false }), Animated.timing(backgroundColor, { toValue: 0, duration: 400, useNativeDriver: false })]).start();
            } else {
                setMessage(`Wynik: ${taskData.targetNum}/${taskData.targetDen}`);
                setWrongCount(w => w + 1); setReadyForNext(true);
                Animated.timing(backgroundColor, { toValue: -1, duration: 500, useNativeDriver: false }).start();
            }
        }
    };

    const nextTask = () => {
        if (taskCount >= TASKS_LIMIT) { setMessage('Koniec! 🏆'); return; }
        setTaskCount(t => t + 1); generateProblem();
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.container}>
                <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
                <ImageBackground source={require('../../../assets/background.jpg')} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: backgroundColor.interpolate({ inputRange: [-1, 0, 1], outputRange: ['rgba(255,0,0,0.15)', 'rgba(255,255,255,0)', 'rgba(0,255,0,0.15)'] }) }]} pointerEvents="none" />

                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardContainer}>
                    {!isKeyboardVisible && (
                        <View style={styles.topButtons}>
                            <TouchableOpacity onPress={() => setShowScratchpad(true)} style={styles.topBtnItem}><Image source={require('../../../assets/pencil.png')} style={styles.iconTop} /><Text style={styles.buttonLabel}>Brudnopis</Text></TouchableOpacity>
                            <TouchableOpacity onPress={() => setShowHint(!showHint)} style={styles.topBtnItem}><Image source={require('../../../assets/question.png')} style={styles.iconTop} /><Text style={styles.buttonLabel}>Pomoc</Text></TouchableOpacity>
                        </View>
                    )}

                    {showHint && !isKeyboardVisible && (
                        <View style={styles.hintBox}><Text style={styles.hintTitle}>Wskazówka:</Text><Text style={styles.hintText}>{currentHint}</Text></View>
                    )}

                    <DrawingModal visible={showScratchpad} onClose={() => setShowScratchpad(false)} problemText={questionText} />

                    <ScrollView contentContainerStyle={styles.centerContent} keyboardShouldPersistTaps="handled">
                        <View style={styles.card}>
                            <View style={styles.overlayBackground} />
                            <Text style={styles.headerTitle}>Rozszerzanie i skracanie</Text>
                            <View style={styles.questionBox}>
                                {taskData.visTotal > 0 && <FractionShape total={taskData.visTotal} shaded={taskData.visShaded} />}
                                <Text style={styles.questionText}>{questionText}</Text>
                            </View>
                            <View style={styles.answerSection}>
                                <View style={styles.fractionContainer}>
                                    <TextInput ref={numInputRef} style={[styles.fractionInput, numCorrect === false && styles.inputError, numCorrect === true && styles.inputCorrect]} keyboardType="numeric" value={userNum} onChangeText={(v) => { setUserNum(v); if(v.length >= 1) denInputRef.current?.focus(); }} editable={!readyForNext} maxLength={3} />
                                    <View style={styles.fractionLine} />
                                    <TextInput ref={denInputRef} style={[styles.fractionInput, denCorrect === false && styles.inputError, denCorrect === true && styles.inputCorrect]} keyboardType="numeric" value={userDen} onChangeText={setUserDen} editable={!readyForNext} maxLength={3} />
                                </View>
                            </View>
                            <TouchableOpacity style={styles.mainBtn} onPress={readyForNext ? nextTask : handleCheck}><Text style={styles.mainBtnText}>{readyForNext ? 'Następne' : 'Sprawdź'}</Text></TouchableOpacity>
                            <Text style={styles.counterTextSmall}>Zadanie: {taskCount} / {TASKS_LIMIT}</Text>
                            {message ? <Text style={[styles.result, message.includes('Doskonale') ? styles.correctText : styles.errorText]}>{message}</Text> : null}
                        </View>
                    </ScrollView>

                    {!isKeyboardVisible && (
                        <View style={styles.iconsBottom}>
                            <Image source={require('../../../assets/happy.png')} style={styles.iconSame} /><Text style={styles.counterTextIcons}>{correctCount}</Text>
                            <Image source={require('../../../assets/sad.png')} style={styles.iconSame} /><Text style={styles.counterTextIcons}>{wrongCount}</Text>
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
    iconTop: { width: 70, height: 70, resizeMode: 'contain', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3 },
    buttonLabel: { fontSize: 14, fontWeight: 'bold', color: '#007AFF', marginTop: 2, textShadowColor: 'rgba(255,255,255,0.8)', textShadowRadius: 3 },
    hintBox: { position: 'absolute', top: 100, right: 20, padding: 15, backgroundColor: '#fff', borderRadius: 15, width: 260, zIndex: 11, elevation: 5, borderWidth: 1, borderColor: '#007AFF' },
    hintTitle: { fontWeight: 'bold', color: '#007AFF', marginBottom: 5 },
    hintText: { fontSize: 14, color: '#333' },
    card: { width: '92%', maxWidth: 400, borderRadius: 25, padding: 25, alignItems: 'center', alignSelf: 'center', elevation: 4, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10 },
    overlayBackground: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: 25 },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 15 },
    questionBox: { width: '100%', backgroundColor: '#f0f8ff', padding: 20, borderRadius: 15, marginBottom: 20, alignItems: 'center' },
    questionText: { fontSize: 19, color: '#2c3e50', textAlign: 'center', fontWeight: '500', lineHeight: 28 },
    answerSection: { marginVertical: 10 },
    fractionContainer: { alignItems: 'center' },
    fractionInput: { width: 80, height: 60, borderWidth: 2, borderColor: '#ccc', borderRadius: 10, backgroundColor: '#fff', fontSize: 28, fontWeight: 'bold', textAlign: 'center', color: '#007AFF' },
    fractionLine: { width: 100, height: 3, backgroundColor: '#333', marginVertical: 8 },
    inputCorrect: { borderColor: '#28a745', backgroundColor: '#e8f5e9', color: '#28a745' },
    inputError: { borderColor: '#dc3545', backgroundColor: '#fbe9eb', color: '#dc3545' },
    mainBtn: { marginTop: 20, backgroundColor: '#007AFF', paddingHorizontal: 40, paddingVertical: 14, borderRadius: 15 },
    mainBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    result: { fontSize: 18, fontWeight: '700', marginTop: 15 },
    correctText: { color: '#28a745' },
    errorText: { color: '#dc3545' },
    counterTextSmall: { fontSize: Math.max(12, screenWidth * 0.035), fontWeight: '400', color: '#555', textAlign: 'center', marginTop: 15 },
    iconsBottom: { position: 'absolute', bottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' },
    iconSame: { width: combinedIconSize, height: combinedIconSize, resizeMode: 'contain', marginHorizontal: 10 },
    counterTextIcons: { fontSize: Math.max(14, combinedIconSize * 0.28), marginHorizontal: 8, textAlign: 'center', color: '#333' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
    drawingContainer: { width: '95%', height: '85%', backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden' },
    drawingHeader: { height: 55, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, backgroundColor: '#f0f0f0' },
    drawingTitle: { fontSize: 18, fontWeight: 'bold' },
    headerButton: { padding: 10 },
    headerButtonText: { color: '#007AFF', fontWeight: '600' },
    problemPreviewContainer: { backgroundColor: '#eef6fc', padding: 12, alignItems: 'center' },
    problemPreviewLabel: { fontSize: 13, color: '#666' },
    problemPreviewTextSmall: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
    canvas: { flex: 1, backgroundColor: '#fff' },
});

export default FractionsExpansionTrainer;