import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
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
    InteractionManager
} from 'react-native';
import Svg, { Path, Line, Text as SvgText, G } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';

import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { awardXpAndCoins } from '../../../services/xpService';

const EXERCISE_ID = "fractionsNumberLine_cl4";
const TASKS_LIMIT = 30;
const screenWidth = Dimensions.get('window').width;

// TWOJE ORYGINALNE WYMIARY IKON
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
    let startInteger = startMode <= 6 ? rnd(0, 3) : rnd(10, 55);
    const ticksCount = rnd(5, 7);
    const hiddenIndex = rnd(1, ticksCount - 2);
    const totalParts = (startInteger * denominator) + hiddenIndex;
    const answer = totalParts / denominator;
    const hint = `Jeden cały odcinek podzielono na równe części.\nJeden mały skok to ułamek 1/${denominator}.`;
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
        return (
            <G>
                {whole > 0 && <SvgText x={x - 12} y={y} fill={textColor} fontSize="18" fontWeight="600" textAnchor="middle">{whole}</SvgText>}
                <SvgText x={x + (whole > 0 ? 8 : 0)} y={y - 8} fill={textColor} fontSize="14" fontWeight="500" textAnchor="middle">{num}</SvgText>
                <Line x1={x + (whole > 0 ? 8 : 0) - 8} y1={y - 2} x2={x + (whole > 0 ? 8 : 0) + 8} y2={y - 2} stroke={textColor} strokeWidth="1.5" />
                <SvgText x={x + (whole > 0 ? 8 : 0)} y={y + 12} fill={textColor} fontSize="14" fontWeight="500" textAnchor="middle">{den}</SvgText>
            </G>
        );
    };

    const ticks = [];
    for (let i = 0; i < task.ticksCount; i++) {
        const x = paddingX + (i * spacing);
        const totalSteps = (task.start * task.denominator) + i;
        const value = totalSteps / task.denominator;
        ticks.push(
            <G key={i}>
                <Line x1={x} y1={lineY - tickHeight/2} x2={x} y2={lineY + tickHeight/2} stroke="#333" strokeWidth="2" />
                {renderTickLabel(x, lineY + 35, value, i === task.hiddenIndex)}
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
    const navigation = useNavigation();
    const [taskData, setTaskData] = useState<NumberLineTask | null>(null);
    const [userWhole, setUserWhole] = useState('');
    const [userNum, setUserNum] = useState('');
    const [userDen, setUserDen] = useState('');
    const [readyForNext, setReadyForNext] = useState(false);
    const [stats, setStats] = useState({ correct: 0, wrong: 0, count: 0 });
    const [attemptsLeft, setAttemptsLeft] = useState(2);
    const [message, setMessage] = useState('');
    const [showHint, setShowHint] = useState(false);
    const [showScratchpad, setShowScratchpad] = useState(false);
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);
    const [status, setStatus] = useState<'neutral' | 'correct' | 'wrong'>('neutral');
    const [isWholeCorrect, setIsWholeCorrect] = useState<boolean | null>(null);
    const [isNumCorrect, setIsNumCorrect] = useState<boolean | null>(null);
    const [isDenCorrect, setIsDenCorrect] = useState<boolean | null>(null);

    const [showMilestone, setShowMilestone] = useState(false);
    const [isFinished, setIsFinished] = useState(false);
    const [sessionCorrect, setSessionCorrect] = useState(0);

    const backgroundColor = useRef(new Animated.Value(0)).current;
    const wholeInputRef = useRef<TextInput>(null);
    const numInputRef = useRef<TextInput>(null);
    const denInputRef = useRef<TextInput>(null);

    useEffect(() => {
        const k1 = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
        const k2 = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
        nextTask();
        return () => { k1.remove(); k2.remove(); };
    }, []);

    const nextTask = () => {
        if (stats.count >= TASKS_LIMIT) { setIsFinished(true); return; }
        if (stats.count > 0 && stats.count % 10 === 0 && !showMilestone) { setShowMilestone(true); return; }

        const t = generateTask();
        setTaskData(t);
        setUserWhole(''); setUserNum(''); setUserDen('');
        setIsWholeCorrect(null); setIsNumCorrect(null); setIsDenCorrect(null);
        setReadyForNext(false); setAttemptsLeft(2); setMessage('');
        setShowHint(false); setStatus('neutral');
        setStats(prev => ({ ...prev, count: prev.count + 1 }));
        backgroundColor.setValue(0);
    };

    const handleRestart = () => {
        setIsFinished(false); setStats({ correct: 0, wrong: 0, count: 0 });
        setSessionCorrect(0); nextTask();
    };

    const handleCheck = () => {
        if (!taskData) return;
        if (!userWhole && !userNum && !userDen) { setMessage('Wpisz odpowiedź!'); return; }
        if ((userNum && !userDen) || (!userNum && userDen)) { setMessage('Uzupełnij ułamek!'); return; }

        Keyboard.dismiss();
        const w = userWhole === '' ? 0 : parseInt(userWhole);
        const n = userNum === '' ? 0 : parseInt(userNum);
        const d = userDen === '' ? 1 : parseInt(userDen);
        const isCorrectTotal = Math.abs((w + n/d) - taskData.answer) < 0.001;

        if (isCorrectTotal) {
            setStatus('correct'); setIsWholeCorrect(true); setIsNumCorrect(true); setIsDenCorrect(true);
            setStats(p => ({ ...p, correct: p.correct + 1 })); setSessionCorrect(s => s + 1);
            Animated.timing(backgroundColor, { toValue: 1, duration: 500, useNativeDriver: false }).start();
            setMessage('Świetnie! ✅'); awardXpAndCoins(5, 1); setReadyForNext(true);
            const currentUser = auth().currentUser;
            if (currentUser) firestore().collection('users').doc(currentUser.uid).collection('exerciseStats').doc(EXERCISE_ID).set({ totalCorrect: firestore.FieldValue.increment(1) }, { merge: true }).catch(console.error);
        } else {
            setStatus('wrong');
            if (attemptsLeft === 2) {
                setAttemptsLeft(1); setMessage('Błąd! Spróbuj jeszcze raz ✍️');
                Animated.sequence([Animated.timing(backgroundColor, { toValue: -1, duration: 200, useNativeDriver: false }), Animated.timing(backgroundColor, { toValue: 0, duration: 200, useNativeDriver: false })]).start();
                const correctParts = getCanonicalParts(taskData.answer, taskData.denominator);
                if (w !== correctParts.whole) { setIsWholeCorrect(false); setUserWhole(''); }
                if (n !== correctParts.num) { setIsNumCorrect(false); setUserNum(''); }
                if (d !== correctParts.den) { setIsDenCorrect(false); setUserDen(''); }
                setTimeout(() => setStatus('neutral'), 1500);
            } else {
                setAttemptsLeft(0); setStats(p => ({ ...p, wrong: p.wrong + 1 }));
                Animated.timing(backgroundColor, { toValue: -1, duration: 500, useNativeDriver: false }).start();
                const { whole, num, den, isInteger } = getCanonicalParts(taskData.answer, taskData.denominator);
                setMessage(`Błąd. Wynik: ${isInteger ? whole : (whole > 0 ? whole+' ' : '') + num+'/'+den}`);
                setIsWholeCorrect(false); setIsNumCorrect(false); setIsDenCorrect(false); setReadyForNext(true);
                const currentUser = auth().currentUser;
                if (currentUser) firestore().collection('users').doc(currentUser.uid).collection('exerciseStats').doc(EXERCISE_ID).set({ totalWrong: firestore.FieldValue.increment(1) }, { merge: true }).catch(console.error);
            }
        }
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ flex: 1 }}>
                <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
                <ImageBackground source={require('../../../assets/background.jpg')} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: backgroundColor.interpolate({ inputRange: [-1, 0, 1], outputRange: ['rgba(255, 0, 0, 0.15)', 'transparent', 'rgba(0, 255, 0, 0.15)'] }) }]} pointerEvents="none" />

                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardContainer}>
                    {!isKeyboardVisible && (
                        <View style={styles.topButtons}>
                            <TouchableOpacity onPress={() => setShowScratchpad(true)} style={styles.topBtnItem}><Image source={require('../../../assets/pencil.png')} style={styles.iconTop} /><Text style={styles.buttonLabel}>Brudnopis</Text></TouchableOpacity>
                            <TouchableOpacity onPress={() => setShowHint(!showHint)} style={styles.topBtnItem}><Image source={require('../../../assets/question.png')} style={styles.iconTop} /><Text style={styles.buttonLabel}>Pomoc</Text></TouchableOpacity>
                        </View>
                    )}

                    {showHint && taskData && !isKeyboardVisible && (
                        <View style={styles.hintBox}><Text style={styles.hintTitle}>Wskazówka:</Text><Text style={styles.hintText}>{taskData.hint}</Text></View>
                    )}

                    <DrawingModal visible={showScratchpad} onClose={() => setShowScratchpad(false)} />

                    <Modal visible={showMilestone} transparent={true} animationType="slide">
                        <View style={styles.modalOverlay}>
                            <View style={styles.milestoneCard}>
                                <Text style={styles.milestoneTitle}>Podsumowanie serii 📊</Text>
                                <View style={styles.statsRowMilestone}><Text style={styles.statsTextMilestone}>Poprawne: {sessionCorrect} / 10</Text></View>
                                <TouchableOpacity style={styles.mButton} onPress={() => { setShowMilestone(false); setSessionCorrect(0); nextTask(); }}><Text style={styles.mButtonText}>Kontynuuj</Text></TouchableOpacity>
                            </View>
                        </View>
                    </Modal>

                    <Modal visible={isFinished} transparent={true} animationType="fade">
                        <View style={styles.modalOverlay}>
                            <View style={styles.milestoneCard}>
                                <Text style={styles.milestoneTitle}>Gratulacje! 🏆</Text>
                                <View style={styles.statsRowMilestone}><Text style={styles.statsTextMilestone}>Wynik: {stats.correct} / {TASKS_LIMIT}</Text></View>
                                <View style={styles.milestoneButtons}>
                                    <TouchableOpacity style={styles.mButton} onPress={handleRestart}><Text style={styles.mButtonText}>Od nowa</Text></TouchableOpacity>
                                    <TouchableOpacity style={[styles.mButton, {backgroundColor: '#dc3545'}]} onPress={() => navigation.goBack()}><Text style={styles.mButtonText}>Wyjdź</Text></TouchableOpacity>
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
                            <View style={styles.answerSection}>
                                <View style={styles.wholeContainer}>
                                    <TextInput ref={wholeInputRef} style={[styles.wholeInput, isWholeCorrect === false && styles.inputError, isWholeCorrect === true && styles.inputCorrect]} keyboardType="numeric" value={userWhole} onChangeText={(t) => {setUserWhole(t); setStatus('neutral');}} placeholder="0" editable={!readyForNext} onSubmitEditing={() => numInputRef.current?.focus()} returnKeyType="next" />
                                    <Text style={styles.labelSmall}>Całości</Text>
                                </View>
                                <View style={styles.fractionContainer}>
                                    <TextInput ref={numInputRef} style={[styles.fractionInput, isNumCorrect === false && styles.inputError, isNumCorrect === true && styles.inputCorrect]} keyboardType="numeric" value={userNum} onChangeText={(v) => { setUserNum(v); setStatus('neutral'); if(v.length >= 1) denInputRef.current?.focus(); }} editable={!readyForNext} onSubmitEditing={() => denInputRef.current?.focus()} returnKeyType="next" placeholder="L" />
                                    <View style={styles.fractionLine} />
                                    <TextInput ref={denInputRef} style={[styles.fractionInput, isDenCorrect === false && styles.inputError, isDenCorrect === true && styles.inputCorrect]} keyboardType="numeric" value={userDen} onChangeText={(t) => {setUserDen(t); setStatus('neutral');}} editable={!readyForNext} returnKeyType="done" placeholder="M" />
                                </View>
                            </View>
                            <TouchableOpacity style={[styles.mainBtn, {backgroundColor: readyForNext ? '#28a745' : '#007AFF'}]} onPress={readyForNext ? nextTask : handleCheck}><Text style={styles.mainBtnText}>{readyForNext ? 'Następne' : 'Sprawdź'}</Text></TouchableOpacity>
                            <Text style={styles.counterTextSmall}>Zadanie: {stats.count > TASKS_LIMIT ? TASKS_LIMIT : stats.count} / {TASKS_LIMIT}</Text>
                            <View style={{height: 30, marginTop: 15, justifyContent: 'center'}}>{message ? <Text style={[styles.result, status === 'correct' ? styles.correctText : styles.errorText]}>{message}</Text> : null}</View>
                        </View>
                    </ScrollView>

                    {!isKeyboardVisible && (
                        <View style={styles.iconsBottom}>
                            <Image source={require('../../../assets/happy.png')} style={styles.iconSame} /><Text style={styles.counterTextIcons}>{stats.correct}</Text>
                            <Image source={require('../../../assets/sad.png')} style={styles.iconSame} /><Text style={styles.counterTextIcons}>{stats.wrong}</Text>
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
    topButtons: { position: 'absolute', top: 7, right: 20, flexDirection: 'row', alignItems: 'center', zIndex: 100 },
    topBtnItem: { alignItems: 'center', marginLeft: 15 },
    iconTop: { width: 60, height: 60, resizeMode: 'contain' },
    buttonLabel: { fontSize: 12, fontWeight: 'bold', color: '#007AFF', marginTop: -2 },
    hintBox: { position: 'absolute', top: 110, right: 20, padding: 15, backgroundColor: '#fff', borderRadius: 15, width: 260, zIndex: 11, elevation: 5, borderWidth: 1, borderColor: '#007AFF' },
    hintTitle: { fontWeight: 'bold', color: '#007AFF', marginBottom: 5, textAlign: 'center' },
    hintText: { fontSize: 14, color: '#333', textAlign: 'center' },
    card: { width: '95%', maxWidth: 450, borderRadius: 25, padding: 25, alignItems: 'center', alignSelf: 'center', elevation: 4 },
    overlayBackground: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: 25 },
    title: { fontSize: 20, fontWeight: '800', color: '#333', marginBottom: 5, textTransform: 'uppercase' },
    taskLabel: { fontSize: 18, fontWeight: '600', marginBottom: 15, color: '#007AFF', textAlign: 'center' },
    svgContainer: { width: '100%', height: 160, alignItems: 'center', justifyContent: 'center' },
    answerSection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 15 },
    wholeContainer: { alignItems: 'center', marginRight: 15 },
    wholeInput: { width: 60, height: 80, borderWidth: 2, borderRadius: 12, fontSize: 32, fontWeight: 'bold', textAlign: 'center', color: '#333' },
    fractionContainer: { alignItems: 'center' },
    fractionInput: { width: 60, height: 50, borderWidth: 2, borderRadius: 10, fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
    fractionLine: { width: 70, height: 3, backgroundColor: '#333', marginVertical: 4 },
    labelSmall: { fontSize: 10, color: '#777', marginTop: 4 },
    inputNeutral: { borderColor: '#ccc', backgroundColor: '#fff', color: '#333' },
    inputCorrect: { borderColor: '#28a745', backgroundColor: '#e8f5e9', color: '#28a745' },
    inputError: { borderColor: '#dc3545', backgroundColor: '#fbe9eb', color: '#dc3545' },
    mainBtn: { marginTop: 20, paddingHorizontal: 40, paddingVertical: 14, borderRadius: 15 },
    mainBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    counterTextSmall: { fontSize: 13, color: '#555', textAlign: 'center', marginTop: 15 },
    result: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
    correctText: { color: '#28a745' },
    errorText: { color: '#dc3545' },
    iconsBottom: {
        position: 'absolute',
        bottom: 2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        zIndex: 1
    },
    iconSame: { width: combinedIconSize, height: combinedIconSize, resizeMode: 'contain', marginHorizontal: 10 },
    counterTextIcons: { fontSize: 18, marginHorizontal: 8, color: '#333', fontWeight: 'bold' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    milestoneCard: { width: '90%', backgroundColor: '#fff', borderRadius: 20, padding: 25, alignItems: 'center' },
    milestoneTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 10 },
    statsRowMilestone: { marginVertical: 15, alignItems: 'center' },
    statsTextMilestone: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    milestoneButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 10 },
    mButton: { paddingVertical: 12, borderRadius: 12, width: '48%', alignItems: 'center', backgroundColor: '#28a745' },
    mButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
    drawingContainer: { width: '95%', height: '85%', backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden' },
    drawingHeader: { height: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, backgroundColor: '#f0f0f0' },
    drawingTitle: { fontSize: 18, fontWeight: 'bold' },
    headerButton: { padding: 5 },
    headerButtonText: { fontSize: 16, color: '#007AFF' },
    canvas: { flex: 1, backgroundColor: '#ffffff' }
});

export default FractionsNumberLineTrainerPL;