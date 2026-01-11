import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TextInput, Keyboard, ImageBackground,
    Animated, StatusBar, Image, Dimensions, TouchableOpacity, Modal,
    Platform, KeyboardAvoidingView, TouchableWithoutFeedback, ScrollView, InteractionManager,
    useColorScheme
} from 'react-native';
import Svg, { Path, Rect, G } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { awardXpAndCoins } from '../../../services/xpService';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

const EXERCISE_ID = "FractionsTrainer_cl4";
const { width: screenWidth } = Dimensions.get('window');
const TASKS_LIMIT = 40;
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
                        <Text numberOfLines={2} style={[styles.problemPreviewTextSmall, { color: '#007AFF' }]}>{problemText}</Text>
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

// --- WIZUALIZACJA FIGUR ---
const FractionShape = ({ total, shaded, type }: { total: number, shaded: number, type: string }) => {
    const isDarkMode = useColorScheme() === 'dark';
    const size = 150;
    const center = size / 2;
    const radius = 65;
    const strokeColor = isDarkMode ? '#FFF' : '#2c3e50';
    const emptyColor = isDarkMode ? '#334155' : '#FFF';

    if (type === 'circle') {
        return (
            <Svg height={size} width={size} viewBox={`0 0 ${size} ${size}`}>
                {[...Array(total)].map((_, i) => {
                    const startAngle = (i * 360) / total - 90;
                    const endAngle = ((i + 1) * 360) / total - 90;
                    const x1 = center + radius * Math.cos((Math.PI * startAngle) / 180);
                    const y1 = center + radius * Math.sin((Math.PI * startAngle) / 180);
                    const x2 = center + radius * Math.cos((Math.PI * endAngle) / 180);
                    const y2 = center + radius * Math.sin((Math.PI * endAngle) / 180);
                    const d = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`;
                    return <Path key={i} d={d} fill={i < shaded ? "#4A90E2" : emptyColor} stroke={strokeColor} strokeWidth="2" />;
                })}
            </Svg>
        );
    }
    const w = 180; const h = 60; const partW = w / total;
    return (
        <Svg height={h + 10} width={w + 10}>
            <G x="5" y="5">
                {[...Array(total)].map((_, i) => (
                    <Rect key={i} x={i * partW} y="0" width={partW} height={h} fill={i < shaded ? "#4A90E2" : emptyColor} stroke={strokeColor} strokeWidth="2" />
                ))}
            </G>
        </Svg>
    );
};

// --- GŁÓWNY KOMPONENT ---
const FractionsTrainer = () => {
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
        questionBox: isDarkMode ? '#1E293B' : '#f0f8ff',

        inputBg: isDarkMode ? '#334155' : '#ffffff',
        inputBorder: isDarkMode ? '#475569' : '#ccc',
        inputText: isDarkMode ? '#FFFFFF' : '#007AFF',
        inputPlaceholder: isDarkMode ? '#94A3B8' : '#aaa',

        correctBg: isDarkMode ? 'rgba(21, 87, 36, 0.5)' : '#e8f5e9',
        correctBorder: isDarkMode ? '#4ADE80' : '#28a745',
        errorBg: isDarkMode ? 'rgba(114, 28, 36, 0.5)' : '#fbe9eb',
        errorBorder: isDarkMode ? '#F87171' : '#dc3545',
    };

    const [questionText, setQuestionText] = useState('');
    const [currentHint, setCurrentHint] = useState('');
    const [taskData, setTaskData] = useState({ total: 4, shaded: 1, type: '', isTextTask: false });
    const [userNum, setUserNum] = useState('');
    const [userDen, setUserDen] = useState('');
    const [status, setStatus] = useState<'neutral' | 'correct' | 'wrong'>('neutral');
    const [numCorrect, setNumCorrect] = useState<boolean | null>(null);
    const [denCorrect, setDenCorrect] = useState<boolean | null>(null);
    const [readyForNext, setReadyForNext] = useState(false);
    const [attempts, setAttempts] = useState(0);
    const [correctCount, setCorrectCount] = useState(0);
    const [wrongCount, setWrongCount] = useState(0);
    const [taskCount, setTaskCount] = useState(0);
    const [isFinished, setIsFinished] = useState(false);
    const [showMilestone, setShowMilestone] = useState(false);
    const [sessionCorrect, setSessionCorrect] = useState(0);
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
        setMessage(''); setNumCorrect(null); setDenCorrect(null); setStatus('neutral');
        setReadyForNext(false); setUserNum(''); setUserDen('');
        setAttempts(0); backgroundColor.setValue(0); setShowHint(false);

        const isVisual = Math.random() < 0.55;
        let total = 1, shaded = 1, q = "", hint = "", isText = true, type = "";

        if (isVisual) {
            total = [2, 3, 4, 5, 6, 8, 9, 10, 12][rnd(0, 8)];
            shaded = rnd(1, total - 1);
            type = Math.random() > 0.5 ? 'circle' : 'rect';
            isText = false;
            q = "Jaka część figury jest zamalowana?";
            hint = "Licznik (góra) to liczba części zamalowanych. Mianownik (dół) to suma wszystkich części.";
        } else {
            const subCategory = rnd(0, 3);
            const names = ["Ania", "Tomek", "Kasia", "Piotr", "Marek", "Zosia", "Bartek", "Ola"];
            const name = names[rnd(0, names.length - 1)];

            if (subCategory === 0) {
                total = rnd(5, 15); shaded = rnd(1, total - 1);
                q = Math.random() > 0.5 ? `Zapisz ułamek: licznik to ${shaded}, mianownik to ${total}.` : `Mianownik wynosi ${total}, a licznik ${shaded}.`;
                hint = "Góra = licznik, dół = mianownik.";
            } else {
                total = [4, 6, 8, 10, 12][rnd(0, 4)]; shaded = rnd(1, total - 1);
                q = `Pizzę podzielono na ${total} części. ${name} zjadł(a) ${shaded}. Jaka to część całości?`;
                hint = "Wszystkie kawałki (całość) wpisz w mianowniku.";
            }
        }

        setTaskData({ total, shaded, type, isTextTask: isText });
        setQuestionText(q);
        setCurrentHint(hint);
        setTimeout(() => numInputRef.current?.focus(), 400);
    };

    const handleCheck = () => {
        const n = parseInt(userNum); const d = parseInt(userDen);
        if (!userNum || !userDen) { setMessage('Wpisz obie liczby!'); return; }

        const isNCorrect = n === taskData.shaded;
        const isDCorrect = d === taskData.total;
        setNumCorrect(isNCorrect); setDenCorrect(isDCorrect);

        if (isNCorrect && isDCorrect) {
            setStatus('correct');
            Animated.timing(backgroundColor, { toValue: 1, duration: 500, useNativeDriver: false }).start();
            setCorrectCount(c => c + 1);
            setSessionCorrect(prev => prev + 1);
            setMessage('Doskonale! ✅');
            setReadyForNext(true);
            InteractionManager.runAfterInteractions(() => awardXpAndCoins(10, 2));
        } else {
            setStatus('wrong');
            const nextAttempt = attempts + 1;
            setAttempts(nextAttempt);
            if (nextAttempt < 2) {
                setMessage('Popraw błędy! ❌');
                if (!isNCorrect) setUserNum('');
                if (!isDCorrect) setUserDen('');
                Animated.sequence([
                    Animated.timing(backgroundColor, { toValue: -1, duration: 400, useNativeDriver: false }),
                    Animated.timing(backgroundColor, { toValue: 0, duration: 400, useNativeDriver: false })
                ]).start();
                setTimeout(() => setStatus('neutral'), 1500);
            } else {
                setMessage(`Wynik: ${taskData.shaded}/${taskData.total}`);
                setWrongCount(w => w + 1); setReadyForNext(true);
                Animated.timing(backgroundColor, { toValue: -1, duration: 500, useNativeDriver: false }).start();
            }
        }
    };

    const nextTask = () => {
        if (taskCount >= TASKS_LIMIT) { setIsFinished(true); return; }
        if (taskCount > 0 && taskCount % 10 === 0 && !showMilestone) {
            setShowMilestone(true); return;
        }
        setTaskCount(t => t + 1); generateProblem();
    };

    const handleRestart = () => {
        setIsFinished(false); setTaskCount(1); setCorrectCount(0);
        setWrongCount(0); setSessionCorrect(0); generateProblem();
    };

    const getFieldStyle = (isCorrect: boolean | null, value: string) => {
        const baseStyle = [styles.fractionInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.inputText }];
        if (isCorrect === true) return [...baseStyle, { backgroundColor: theme.correctBg, borderColor: theme.correctBorder }];
        if (isCorrect === false) return [...baseStyle, { backgroundColor: theme.errorBg, borderColor: theme.errorBorder }];
        return baseStyle;
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.container}>
                <StatusBar translucent backgroundColor="transparent" barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
                <ImageBackground source={theme.bgImage} style={StyleSheet.absoluteFillObject} resizeMode="cover">
                    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.bgOverlay }]} />
                </ImageBackground>
                <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: backgroundColor.interpolate({ inputRange: [-1, 0, 1], outputRange: ['rgba(255,0,0,0.15)', 'transparent', 'rgba(0,255,0,0.15)'] }) }]} pointerEvents="none" />

                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardContainer}>
                    {!isKeyboardVisible && (
                        <View style={styles.topButtons}>
                            <TouchableOpacity onPress={() => setShowScratchpad(true)} style={styles.topBtnItem}><Image source={require('../../../assets/pencil.png')} style={styles.iconTop} /><Text style={[styles.buttonLabel, { color: theme.topBtnText }]}>Brudnopis</Text></TouchableOpacity>
                            <TouchableOpacity onPress={() => setShowHint(!showHint)} style={styles.topBtnItem}><Image source={require('../../../assets/question.png')} style={styles.iconTop} /><Text style={[styles.buttonLabel, { color: theme.topBtnText }]}>Pomoc</Text></TouchableOpacity>
                        </View>
                    )}

                    <Modal visible={showMilestone} transparent={true} animationType="slide">
                        <View style={styles.modalOverlay}>
                            <View style={[styles.milestoneCard, { backgroundColor: theme.modalContent }]}>
                                <Text style={[styles.milestoneTitle, { color: theme.textMain }]}>Podsumowanie serii 📊</Text>
                                <View style={[styles.statsRowMilestone, { backgroundColor: theme.statsRow }]}><Text style={[styles.statsTextMilestone, { color: theme.textMain }]}>Poprawne: {sessionCorrect} / 10</Text></View>
                                <TouchableOpacity style={[styles.mButton, { backgroundColor: '#28a745', width: '80%' }]} onPress={() => { setShowMilestone(false); setSessionCorrect(0); nextTask(); }}><Text style={styles.mButtonText}>Kontynuuj</Text></TouchableOpacity>
                            </View>
                        </View>
                    </Modal>

                    <Modal visible={isFinished} transparent={true} animationType="fade">
                        <View style={styles.modalOverlay}>
                            <View style={[styles.milestoneCard, { backgroundColor: theme.modalContent }]}>
                                <Text style={[styles.milestoneTitle, { color: theme.textMain }]}>Gratulacje! 🏆</Text>
                                <View style={[styles.statsRowMilestone, { backgroundColor: theme.statsRow }]}><Text style={[styles.statsTextMilestone, { color: theme.textMain }]}>Wynik: {correctCount} / {TASKS_LIMIT}</Text></View>
                                <View style={styles.milestoneButtons}>
                                    <TouchableOpacity style={[styles.mButton, { backgroundColor: '#28a745' }]} onPress={handleRestart}><Text style={styles.mButtonText}>Od nowa</Text></TouchableOpacity>
                                    <TouchableOpacity style={[styles.mButton, { backgroundColor: '#dc3545' }]} onPress={() => navigation.goBack()}><Text style={styles.mButtonText}>Wyjdź</Text></TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>

                    {showHint && !isKeyboardVisible && (
                        <View style={[styles.hintBox, { backgroundColor: theme.modalContent, borderColor: '#007AFF' }]}><Text style={styles.hintTitle}>Podpowiedź:</Text><Text style={[styles.hintText, { color: theme.textMain }]}>{currentHint}</Text></View>
                    )}

                    <DrawingModal visible={showScratchpad} onClose={() => setShowScratchpad(false)} problemText={questionText} />

                    <ScrollView contentContainerStyle={styles.centerContent} keyboardShouldPersistTaps="handled">
                        <View style={styles.card}>
                            <View style={[styles.overlayBackground, { backgroundColor: theme.cardOverlay }]} />
                            <Text style={styles.headerTitle}>Ułamek jako część całości</Text>
                            <View style={[styles.questionBox, { backgroundColor: theme.questionBox }]}>
                                {!taskData.isTextTask && <FractionShape total={taskData.total} shaded={taskData.shaded} type={taskData.type} />}
                                <Text style={[styles.questionText, { color: theme.textMain }]}>{questionText}</Text>
                            </View>
                            <View style={styles.answerSection}>
                                <View style={styles.fractionContainer}>
                                    <TextInput ref={numInputRef} style={getFieldStyle(numCorrect, userNum)} keyboardType="numeric" value={userNum} onChangeText={(v) => { setUserNum(v); setStatus('neutral'); if(v.length >= 1) denInputRef.current?.focus(); }} editable={!readyForNext} maxLength={2} placeholder="L" placeholderTextColor={theme.inputPlaceholder} />
                                    <View style={[styles.fractionLine, { backgroundColor: theme.textMain }]} />
                                    <TextInput ref={denInputRef} style={getFieldStyle(denCorrect, userDen)} keyboardType="numeric" value={userDen} onChangeText={(v) => { setUserDen(v); setStatus('neutral'); }} editable={!readyForNext} maxLength={2} placeholder="M" placeholderTextColor={theme.inputPlaceholder} />
                                </View>
                            </View>
                            <TouchableOpacity style={[styles.mainBtn, {backgroundColor: readyForNext ? '#28a745' : '#007AFF'}]} onPress={readyForNext ? nextTask : handleCheck}><Text style={styles.mainBtnText}>{readyForNext ? 'Następne' : 'Sprawdź'}</Text></TouchableOpacity>
                            <Text style={[styles.counterTextSmall, { color: theme.textSub }]}>Zadanie: {taskCount} / {TASKS_LIMIT}</Text>
                            <View style={{height: 30, marginTop: 15, justifyContent: 'center'}}>
                                {message ? <Text style={[styles.result, status === 'correct' ? { color: '#28a745' } : { color: '#dc3545' }]}>{message}</Text> : null}
                            </View>
                        </View>
                    </ScrollView>

                    {!isKeyboardVisible && (
                        <View style={styles.iconsBottom}>
                            <Image source={require('../../../assets/happy.png')} style={styles.iconSame} /><Text style={[styles.counterTextIcons, { color: theme.textMain }]}>{correctCount}</Text>
                            <Image source={require('../../../assets/sad.png')} style={styles.iconSame} /><Text style={[styles.counterTextIcons, { color: theme.textMain }]}>{wrongCount}</Text>
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
    topButtons: { position: 'absolute', top: -10, right: 20, flexDirection: 'row', zIndex: 10 },
    topBtnItem: { alignItems: 'center', marginLeft: 15 },
    iconTop: { width: 70, height: 70, resizeMode: 'contain' },
    buttonLabel: { fontSize: 14, fontWeight: 'bold', marginTop: 2 },
    hintBox: { position: 'absolute', top: 110, right: 20, padding: 15, borderRadius: 15, width: 260, zIndex: 11, elevation: 5, borderWidth: 1 },
    hintTitle: { fontWeight: 'bold', color: '#007AFF', marginBottom: 5 },
    hintText: { fontSize: 14 },
    card: { width: '92%', maxWidth: 450, borderRadius: 25, padding: 25, alignItems: 'center', alignSelf: 'center', elevation: 4 },
    overlayBackground: { ...StyleSheet.absoluteFillObject, borderRadius: 25 },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#007AFF', marginBottom: 15, textTransform: 'uppercase' },
    questionBox: { width: '100%', padding: 20, borderRadius: 15, marginBottom: 15, alignItems: 'center' },
    questionText: { fontSize: 18, textAlign: 'center', fontWeight: '500', lineHeight: 26 },
    answerSection: { marginVertical: 10 },
    fractionContainer: { alignItems: 'center' },
    fractionInput: { width: 70, height: 55, borderWidth: 2, borderRadius: 10, fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
    fractionLine: { width: 85, height: 3, marginVertical: 6 },
    mainBtn: { marginTop: 20, paddingHorizontal: 40, paddingVertical: 14, borderRadius: 15 },
    mainBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    result: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
    counterTextSmall: { fontSize: 13, textAlign: 'center', marginTop: 15 },
    iconsBottom: { position: 'absolute', bottom: -10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' },
    iconSame: { width: combinedIconSize, height: combinedIconSize, resizeMode: 'contain', marginHorizontal: 10 },
    counterTextIcons: { fontSize: 22, fontWeight: 'bold' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    milestoneCard: { width: '90%', borderRadius: 20, padding: 25, alignItems: 'center' },
    milestoneTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 15 },
    statsRowMilestone: { marginVertical: 15, alignItems: 'center', padding: 15, borderRadius: 15, width: '100%' },
    statsTextMilestone: { fontSize: 18, fontWeight: 'bold' },
    milestoneButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
    mButton: { paddingVertical: 12, borderRadius: 12, width: '48%', alignItems: 'center' },
    mButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
    drawingContainer: { width: '95%', height: '85%', borderRadius: 20, overflow: 'hidden' },
    drawingHeader: { height: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
    drawingTitle: { fontSize: 18, fontWeight: 'bold' },
    problemPreviewContainer: { padding: 10, alignItems: 'center' },
    problemPreviewLabel: { fontSize: 12, color: '#777' },
    problemPreviewTextSmall: { fontSize: 16, fontWeight: '600' },
    canvas: { flex: 1 },
    headerButton: { padding: 10 },
    headerButtonText: { fontSize: 16, color: '#007AFF', fontWeight: '600' }
});

export default FractionsTrainer;