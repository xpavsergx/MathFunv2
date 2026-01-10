import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    Button,
    Keyboard,
    ImageBackground,
    Animated,
    StatusBar,
    Image,
    Dimensions,
    TouchableOpacity,
    Modal,
    Platform,
    KeyboardAvoidingView,
    TouchableWithoutFeedback,
    ScrollView,
} from 'react-native';
import Svg, { Path, Line, Text as SvgText, G } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native'; // DODANE DO NAWIGACJI

// --- INTEGRACJA Z FIREBASE ---
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { awardXpAndCoins } from '../../../services/xpService';

const EXERCISE_ID = "fractionsNumberLine_cl4";
const TASKS_LIMIT = 30;
const screenWidth = Dimensions.get('window').width;
const combinedIconSize = screenWidth * 0.22;

const rnd = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const getCanonicalParts = (value: number, denominator: number) => {
    const tolerance = 0.001;
    const roundedValue = Math.round(value * denominator) / denominator;
    const whole = Math.floor(roundedValue + tolerance);
    const fractionalPart = roundedValue - whole;
    let num = Math.round(fractionalPart * denominator);
    let den = denominator;
    if (num === 0) return { whole, num: 0, den: 1, isInteger: true };
    return { whole, num, den, isInteger: false };
};

type NumberLineTask = {
    start: number;
    stepVal: number;
    denominator: number;
    hiddenIndex: number;
    answer: number;
    ticksCount: number;
    hint: string;
};

const generateTask = (): NumberLineTask => {
    const types = [2, 3, 4, 5, 6, 8, 10];
    const denominator = types[rnd(0, types.length - 1)];
    const stepVal = 1 / denominator;

    const startMode = rnd(1, 10);
    let startInteger = 0;
    if (startMode <= 6) startInteger = rnd(0, 3);
    else startInteger = rnd(10, 55);

    const ticksCount = rnd(5, 7);
    const hiddenIndex = rnd(1, ticksCount - 2);
    const totalParts = (startInteger * denominator) + hiddenIndex;
    const answer = totalParts / denominator;

    let partsName = "";
    if (denominator === 2) partsName = "dwie równe części";
    else if (denominator === 3) partsName = "trzy równe części";
    else if (denominator === 4) partsName = "cztery równe części";
    else partsName = `${denominator} równych części`;

    const hint = `Jeden cały odcinek (np. od 0 do 1) podzielono na ${partsName}.\nJeden mały skok to ułamek 1/${denominator}.`;
    return { start: startInteger, stepVal, denominator, hiddenIndex, answer, ticksCount, hint };
};

const NumberLineRenderer = ({ task }: { task: NumberLineTask }) => {
    const canvasWidth = 350;
    const canvasHeight = 160;
    const paddingX = 40;
    const lineY = 60;
    const tickHeight = 20;
    const spacing = (canvasWidth - (paddingX * 2)) / (task.ticksCount - 1);

    const renderTickLabel = (x: number, y: number, value: number, isHidden: boolean) => {
        if (isHidden) return <SvgText x={x} y={y + 10} fill="#E63946" fontSize="32" fontWeight="bold" textAnchor="middle">?</SvgText>;
        const { whole, num, den, isInteger } = getCanonicalParts(value, task.denominator);
        const textColor = "#333";
        if (isInteger) return <SvgText x={x} y={y} fill={textColor} fontSize="18" fontWeight="600" textAnchor="middle">{whole}</SvgText>;

        const fontSizeWhole = 18;
        const fontSizeFrac = 14;
        const wholeOffset = whole > 0 ? -12 : 0;
        const fracOffset = whole > 0 ? 8 : 0;

        return (
            <G>
                {whole > 0 && <SvgText x={x + wholeOffset} y={y} fill={textColor} fontSize={fontSizeWhole} fontWeight="600" textAnchor="middle">{whole}</SvgText>}
                <SvgText x={x + fracOffset} y={y - 8} fill={textColor} fontSize={fontSizeFrac} fontWeight="500" textAnchor="middle">{num}</SvgText>
                <Line x1={x + fracOffset - 8} y1={y - 2} x2={x + fracOffset + 8} y2={y - 2} stroke={textColor} strokeWidth="1.5" />
                <SvgText x={x + fracOffset} y={y + 12} fill={textColor} fontSize={fontSizeFrac} fontWeight="500" textAnchor="middle">{den}</SvgText>
            </G>
        );
    };

    const ticks = [];
    for (let i = 0; i < task.ticksCount; i++) {
        const x = paddingX + (i * spacing);
        const totalSteps = (task.start * task.denominator) + i;
        const value = totalSteps / task.denominator;
        const isHidden = i === task.hiddenIndex;
        ticks.push(
            <G key={i}>
                <Line x1={x} y1={lineY - tickHeight/2} x2={x} y2={lineY + tickHeight/2} stroke="#333" strokeWidth="2" />
                {renderTickLabel(x, lineY + 35, value, isHidden)}
            </G>
        );
    }

    return (
        <View style={styles.svgContainer}>
            <Svg width="100%" height="100%" viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}>
                <Line x1={5} y1={lineY} x2={canvasWidth - 15} y2={lineY} stroke="#333" strokeWidth="3" />
                <Path d={`M ${canvasWidth - 25} ${lineY - 7} L ${canvasWidth - 10} ${lineY} L ${canvasWidth - 25} ${lineY + 7}`} stroke="#333" strokeWidth="3" fill="none" />
                {task.start > 0 && <Path d={`M 5 ${lineY} L 20 ${lineY}`} stroke="#333" strokeWidth="3" strokeDasharray="4, 4" />}
                {ticks}
            </Svg>
        </View>
    );
};

const DrawingModal = ({ visible, onClose }: { visible: boolean; onClose: () => void }) => {
    const [paths, setPaths] = useState<string[]>([]);
    const [currentPath, setCurrentPath] = useState('');
    const handleClear = () => { setPaths([]); setCurrentPath(''); };
    const onTouchMove = (evt: any) => {
        const { locationX, locationY } = evt.nativeEvent;
        if (!currentPath) setCurrentPath(`M${locationX},${locationY}`); else setCurrentPath(`${currentPath} L${locationX},${locationY}`);
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
                    <View style={styles.canvas} onStartShouldSetResponder={() => true} onMoveShouldSetResponder={() => true} onResponderGrant={(evt) => { const { locationX, locationY } = evt.nativeEvent; setCurrentPath(`M${locationX},${locationY}`); }} onResponderMove={onTouchMove} onResponderRelease={onTouchEnd}>
                        <Svg height="100%" width="100%">{paths.map((d, index) => (<Path key={index} d={d} stroke="#000" strokeWidth={3} fill="none" />))}<Path d={currentPath} stroke="#000" strokeWidth={3} fill="none" /></Svg>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const FractionsNumberLineTrainerPL = () => {
    const navigation = useNavigation(); // DO PRZEKIEROWANIA DO PODTEMATÓW
    const [taskData, setTaskData] = useState<NumberLineTask | null>(null);
    const [userWhole, setUserWhole] = useState('');
    const [userNum, setUserNum] = useState('');
    const [userDen, setUserDen] = useState('');
    const [readyForNext, setReadyForNext] = useState(false);
    const [counter, setCounter] = useState(0);
    const [correctCount, setCorrectCount] = useState(0);
    const [wrongCount, setWrongCount] = useState(0);
    const [attemptsLeft, setAttemptsLeft] = useState(2);
    const [message, setMessage] = useState('');
    const [showHint, setShowHint] = useState(false);
    const [showScratchpad, setShowScratchpad] = useState(false);
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);
    const [isWholeCorrect, setIsWholeCorrect] = useState<boolean | null>(null);
    const [isNumCorrect, setIsNumCorrect] = useState<boolean | null>(null);
    const [isDenCorrect, setIsDenCorrect] = useState<boolean | null>(null);

    const [showMilestone, setShowMilestone] = useState(false);
    const [sessionCorrect, setSessionCorrect] = useState(0);

    const backgroundColor = useRef(new Animated.Value(0)).current;
    const wholeInputRef = useRef<TextInput>(null);
    const numInputRef = useRef<TextInput>(null);
    const denInputRef = useRef<TextInput>(null);

    useEffect(() => {
        const k1 = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
        const k2 = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
        return () => { k1.remove(); k2.remove(); };
    }, []);

    const nextTask = () => {
        if (counter > 0 && counter % 10 === 0 && !showMilestone) {
            setShowMilestone(true);
            return;
        }

        if (counter >= TASKS_LIMIT) {
            setMessage(`Gratulacje! 🎉 Ukończono arkusz!`);
            setReadyForNext(false);
            return;
        }

        const t = generateTask();
        setTaskData(t);
        setUserWhole(''); setUserNum(''); setUserDen('');
        setIsWholeCorrect(null); setIsNumCorrect(null); setIsDenCorrect(null);
        setReadyForNext(false);
        setAttemptsLeft(2);
        setMessage('');
        setShowHint(false);
        setCounter(prev => prev + 1);
        backgroundColor.setValue(0);
    };

    useEffect(() => { nextTask(); }, []);

    const handleCheck = () => {
        Keyboard.dismiss();
        if (!taskData) return;
        if (!userWhole && !userNum && !userDen) { setMessage('Wpisz odpowiedź!'); return; }
        if ((userNum && !userDen) || (!userNum && userDen)) { setMessage('Uzupełnij obie części ułamka!'); return; }

        const w = userWhole === '' ? 0 : parseInt(userWhole);
        const n = userNum === '' ? 0 : parseInt(userNum);
        const d = userDen === '' ? 1 : parseInt(userDen);
        if (d === 0) { setMessage('Mianownik nie może być 0!'); return; }

        const userValue = w + (n / d);
        const isCorrectTotal = Math.abs(userValue - taskData.answer) < 0.001;
        const currentUser = auth().currentUser;
        const statsDocRef = currentUser ? firestore().collection('users').doc(currentUser.uid).collection('exerciseStats').doc(EXERCISE_ID) : null;

        if (isCorrectTotal) {
            setIsWholeCorrect(true); setIsNumCorrect(true); setIsDenCorrect(true);
            setCorrectCount(prev => prev + 1);
            setSessionCorrect(prev => prev + 1);
            statsDocRef?.set({ totalCorrect: firestore.FieldValue.increment(1) }, { merge: true }).catch(console.error);
            Animated.timing(backgroundColor, { toValue: 1, duration: 500, useNativeDriver: false }).start();
            setMessage('Świetnie! ✅');
            awardXpAndCoins(5, 1);
            setReadyForNext(true);
        } else {
            if (attemptsLeft === 2) {
                setAttemptsLeft(1);
                setMessage('Błąd. Spróbuj jeszcze raz.');
                Animated.sequence([
                    Animated.timing(backgroundColor, { toValue: -1, duration: 300, useNativeDriver: false }),
                    Animated.timing(backgroundColor, { toValue: 0, duration: 300, useNativeDriver: false }),
                ]).start();
                const correctParts = getCanonicalParts(taskData.answer, taskData.denominator);
                if (w !== correctParts.whole) { setIsWholeCorrect(false); setUserWhole(''); } else { setIsWholeCorrect(true); }
                if (n !== correctParts.num) { setIsNumCorrect(false); setUserNum(''); } else { setIsNumCorrect(true); }
                if (d !== correctParts.den) { setIsDenCorrect(false); setUserDen(''); } else { setIsDenCorrect(true); }
            } else {
                setAttemptsLeft(0);
                setWrongCount(prev => prev + 1);
                statsDocRef?.set({ totalWrong: firestore.FieldValue.increment(1) }, { merge: true }).catch(console.error);
                Animated.timing(backgroundColor, { toValue: -1, duration: 500, useNativeDriver: false }).start();
                const { whole, num, den, isInteger } = getCanonicalParts(taskData.answer, taskData.denominator);
                const correctStr = isInteger ? `${whole}` : whole > 0 ? `${whole} ${num}/${den}` : `${num}/${den}`;
                setMessage(`Błąd. Poprawna odpowiedź: ${correctStr}`);
                setIsWholeCorrect(false); setIsNumCorrect(false); setIsDenCorrect(false);
                setReadyForNext(true);
            }
        }
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ flex: 1 }}>
                <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
                <ImageBackground source={require('../../../assets/background.jpg')} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: backgroundColor.interpolate({ inputRange: [-1, 0, 1], outputRange: ['rgba(255, 0, 0, 0.2)', 'rgba(255, 255, 255, 0)', 'rgba(0, 255, 0, 0.2)'] }) }]} pointerEvents="none" />

                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardContainer}>
                    {!isKeyboardVisible && (
                        <View style={styles.topButtons}>
                            <TouchableOpacity onPress={() => setShowScratchpad(true)} style={{ marginRight: 20, alignItems: 'center' }}>
                                <Image source={require('../../../assets/pencil.png')} style={styles.iconTop} />
                                <Text style={styles.buttonLabel}>Brudnopis</Text>
                            </TouchableOpacity>
                            <View style={{ alignItems: 'center' }}>
                                <TouchableOpacity onPress={() => setShowHint(!showHint)}>
                                    <Image source={require('../../../assets/question.png')} style={styles.iconTop} />
                                </TouchableOpacity>
                                <Text style={styles.buttonLabel}>Pomoc</Text>
                            </View>
                        </View>
                    )}

                    {showHint && taskData && !isKeyboardVisible && (
                        <View style={styles.hintBox}>
                            <Text style={styles.hintTitle}>Podpowiedź:</Text>
                            <Text style={styles.hintText}>{taskData.hint}</Text>
                        </View>
                    )}

                    <DrawingModal visible={showScratchpad} onClose={() => setShowScratchpad(false)} />

                    {/* MODAL RAPORTU - POPRAWIONY PRZYCISK */}
                    <Modal visible={showMilestone} transparent={true} animationType="slide">
                        <View style={styles.modalOverlay}>
                            <View style={[styles.card, { backgroundColor: '#fff', padding: 25 }]}>
                                <Text style={styles.milestoneTitle}>Podsumowanie serii 📊</Text>
                                <View style={styles.statsRow}>
                                    <Text style={styles.statsText}>Poprawne: {sessionCorrect} / 10</Text>
                                    <Text style={[styles.statsText, { color: '#28a745', marginTop: 5 }]}>
                                        Skuteczność: {(sessionCorrect / 10 * 100).toFixed(0)}%
                                    </Text>
                                </View>
                                <Text style={styles.suggestionText}>
                                    {sessionCorrect >= 8 ? "Rewelacyjnie! Jesteś mistrzem!" : "Dobra robota! Trenuj dalej, aby być jeszcze lepszym."}
                                </Text>
                                <View style={styles.milestoneButtons}>
                                    <TouchableOpacity
                                        style={[styles.mButton, { backgroundColor: '#28a745' }]}
                                        onPress={() => {
                                            setShowMilestone(false);
                                            setSessionCorrect(0);
                                            nextTask();
                                        }}
                                    >
                                        <Text style={styles.mButtonText}>Kontynuuj</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.mButton, { backgroundColor: '#007AFF' }]}
                                        onPress={() => {
                                            setShowMilestone(false);
                                            navigation.goBack(); // POWRÓT DO PODTEMATÓW
                                        }}
                                    >
                                        <Text style={styles.mButtonText}>Inny temat</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>

                    <ScrollView contentContainerStyle={styles.centerContent} keyboardShouldPersistTaps="handled">
                        <View style={styles.card}>
                            <View style={styles.overlayBackground} />
                            <Text style={styles.title}>Ułamki na Osi</Text>
                            <Text style={styles.taskLabel}>Jaką liczbę ukryto pod "?"</Text>

                            {taskData && <NumberLineRenderer task={taskData} />}

                            <Text style={styles.inputLabel}>
                                {attemptsLeft === 1 ? "Masz drugą szansę! Popraw błędne pola." : "Wpisz wynik (całości i ułamek)"}
                            </Text>

                            <View style={styles.answerSection}>
                                <View style={styles.wholeContainer}>
                                    <TextInput
                                        ref={wholeInputRef}
                                        style={[styles.wholeInput, isWholeCorrect === false && styles.inputError, isWholeCorrect === true && styles.inputCorrect]}
                                        keyboardType="numeric"
                                        value={userWhole}
                                        onChangeText={setUserWhole}
                                        placeholder="0"
                                        placeholderTextColor="#ddd"
                                        editable={!readyForNext}
                                        maxLength={2}
                                        blurOnSubmit={false}
                                        onSubmitEditing={() => numInputRef.current?.focus()}
                                        returnKeyType="next"
                                    />
                                    <Text style={styles.labelSmall}>Całości</Text>
                                </View>
                                <View style={styles.fractionContainer}>
                                    <TextInput
                                        ref={numInputRef}
                                        style={[styles.fractionInput, isNumCorrect === false && styles.inputError, isNumCorrect === true && styles.inputCorrect]}
                                        keyboardType="numeric"
                                        value={userNum}
                                        onChangeText={(v) => { setUserNum(v); if(v.length >= 1) denInputRef.current?.focus(); }}
                                        editable={!readyForNext}
                                        maxLength={2}
                                        blurOnSubmit={false}
                                        onSubmitEditing={() => denInputRef.current?.focus()}
                                        returnKeyType="next"
                                        placeholder="L"
                                        placeholderTextColor="#ddd"
                                    />
                                    <View style={styles.fractionLine} />
                                    <TextInput
                                        ref={denInputRef}
                                        style={[styles.fractionInput, isDenCorrect === false && styles.inputError, isDenCorrect === true && styles.inputCorrect]}
                                        keyboardType="numeric"
                                        value={userDen}
                                        onChangeText={setUserDen}
                                        editable={!readyForNext}
                                        maxLength={2}
                                        returnKeyType="done"
                                        placeholder="M"
                                        placeholderTextColor="#ddd"
                                    />
                                </View>
                            </View>

                            <View style={styles.buttonContainer}>
                                <Button title={readyForNext ? 'Dalej' : 'Sprawdź'} onPress={readyForNext ? nextTask : handleCheck} color="#007AFF" />
                            </View>
                            <Text style={styles.counterTextSmall}>Zadanie: {counter > TASKS_LIMIT ? TASKS_LIMIT : counter} / {TASKS_LIMIT}</Text>
                            {message ? <Text style={[styles.result, message.includes('Świetnie') ? styles.correctText : styles.errorText]}>{message}</Text> : null}
                        </View>
                    </ScrollView>

                    {!isKeyboardVisible && (
                        <View style={styles.iconsBottom}>
                            <Image source={require('../../../assets/happy.png')} style={styles.iconSame} />
                            <Text style={styles.counterTextIcons}>{correctCount}</Text>
                            <Image source={require('../../../assets/sad.png')} style={styles.iconSame} />
                            <Text style={styles.counterTextIcons}>{wrongCount}</Text>
                        </View>
                    )}
                </KeyboardAvoidingView>
            </View>
        </TouchableWithoutFeedback>
    );
};

const styles = StyleSheet.create({
    keyboardContainer: { flex: 1, justifyContent: 'center' },
    centerContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 20 },
    topButtons: { position: 'absolute', top: 25, right: 20, flexDirection: 'row', alignItems: 'center', zIndex: 100 },
    iconTop: { width: 60, height: 60, resizeMode: 'contain' },
    buttonLabel: { fontSize: 12, fontWeight: 'bold', color: '#007AFF', marginTop: -2, textShadowColor: 'rgba(255, 255, 255, 0.8)', textShadowRadius: 3 },
    hintBox: { position: 'absolute', top: 95, right: 20, padding: 15, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 15, maxWidth: 280, zIndex: 101, elevation: 5, borderWidth: 1, borderColor: '#007AFF' },
    hintTitle: { fontSize: 16, fontWeight: 'bold', color: '#007AFF', marginBottom: 5, textAlign: 'center' },
    hintText: { fontSize: 15, color: '#333', lineHeight: 22 },
    card: { width: '95%', maxWidth: 450, borderRadius: 20, padding: 20, alignItems: 'center' },
    overlayBackground: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.90)', borderRadius: 20 },
    title: { fontSize: 24, fontWeight: '700', marginBottom: 5, color: '#333', textAlign: 'center' },
    taskLabel: { fontSize: 18, fontWeight: '600', marginBottom: 5, color: '#007AFF', textAlign: 'center' },
    inputLabel: { fontSize: 13, color: '#666', marginBottom: 10, fontStyle: 'italic', textAlign: 'center' },
    svgContainer: { width: '100%', height: 160, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    answerSection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 15 },
    wholeContainer: { alignItems: 'center', marginRight: 15, justifyContent: 'center' },
    wholeInput: { width: 60, height: 80, borderWidth: 2, borderColor: '#ccc', borderRadius: 10, backgroundColor: '#fff', fontSize: 32, fontWeight: 'bold', textAlign: 'center', color: '#333' },
    fractionContainer: { alignItems: 'center', justifyContent: 'center' },
    fractionInput: { width: 60, height: 50, borderWidth: 2, borderColor: '#ccc', borderRadius: 8, backgroundColor: '#fff', fontSize: 24, fontWeight: 'bold', textAlign: 'center', color: '#007AFF' },
    fractionLine: { width: 70, height: 3, backgroundColor: '#333', marginVertical: 5 },
    labelSmall: { fontSize: 10, color: '#777', marginTop: 4 },
    inputCorrect: { borderColor: '#28a745', backgroundColor: '#e8f5e9', color: '#28a745' },
    inputError: { borderColor: '#dc3545', backgroundColor: '#fbe9eb', color: '#dc3545' },
    buttonContainer: { marginTop: 10, width: '80%', borderRadius: 10, overflow: 'hidden' },
    result: { fontSize: 18, fontWeight: '700', marginTop: 20, textAlign: 'center' },
    correctText: { color: '#28a745' },
    errorText: { color: '#dc3545' },
    counterTextSmall: { fontSize: 12, fontWeight: '400', color: '#555', textAlign: 'center', marginTop: 10 },
    iconsBottom: { position: 'absolute', bottom: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', zIndex: 100 },
    iconSame: { width: combinedIconSize, height: combinedIconSize, resizeMode: 'contain', marginHorizontal: 10 },
    counterTextIcons: { fontSize: 18, marginHorizontal: 8, textAlign: 'center', color: '#333', fontWeight: 'bold' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    drawingContainer: { width: '95%', height: '85%', backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden' },
    drawingHeader: { height: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, backgroundColor: '#f0f0f0', borderBottomWidth: 1, borderBottomColor: '#ccc' },
    drawingTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    headerButton: { padding: 5 },
    headerButtonText: { fontSize: 16, color: '#007AFF' },
    canvas: { flex: 1, backgroundColor: '#ffffff' },
    milestoneTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 15 },
    statsRow: { marginVertical: 10, alignItems: 'center', backgroundColor: '#f8f9fa', padding: 15, borderRadius: 15, width: '100%' },
    statsText: { fontSize: 18, color: '#333', fontWeight: 'bold' },
    suggestionText: { fontSize: 15, color: '#666', textAlign: 'center', marginVertical: 20, lineHeight: 22 },
    milestoneButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
    mButton: { paddingVertical: 12, paddingHorizontal: 15, borderRadius: 12, width: '48%', alignItems: 'center' },
    mButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 }
});

export default FractionsNumberLineTrainerPL;