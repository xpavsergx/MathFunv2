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

const EXERCISE_ID = "FractionsAdditionTrainer_cl4";
const { width: screenWidth } = Dimensions.get('window');
const TASKS_LIMIT = 35;
const combinedIconSize = screenWidth * 0.25;

const gcd = (a: number, b: number): number => {
    return b === 0 ? a : gcd(b, a % b);
};

// --- MODAL BRUDNOPISU Z OBSŁUGĄ CIEMNEGO MOTYWU ---
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
                        <Text style={[styles.problemPreviewTextSmall, { color: '#007AFF' }]}>{problemText}</Text>
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

const FractionsAdditionTrainer = () => {
    const navigation = useNavigation();
    const isDarkMode = useColorScheme() === 'dark';

    // DYNAMICZNY MOTYW
    const theme = {
        bgImage: require('../../../assets/background.jpg'),
        bgOverlay: isDarkMode ? 'rgba(0, 0, 0, 0.75)' : 'transparent',
        topBtnText: isDarkMode ? '#FFFFFF' : '#007AFF',
        textMain: isDarkMode ? '#FFFFFF' : '#2c3e50',
        textSub: isDarkMode ? '#CBD5E1' : '#555',
        cardOverlay: isDarkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255,255,255,0.94)',
        modalContent: isDarkMode ? '#1E293B' : '#fff',
        statsRow: isDarkMode ? '#0F172A' : '#f8f9fa',
        inputBg: isDarkMode ? '#334155' : '#fff',
        inputBorder: isDarkMode ? '#475569' : '#ccc',
        inputText: isDarkMode ? '#FFFFFF' : '#333',
        placeholder: isDarkMode ? '#94A3B8' : '#ccc',
        correctBg: isDarkMode ? 'rgba(21, 87, 36, 0.4)' : '#e8f5e9',
        errorBg: isDarkMode ? 'rgba(114, 28, 36, 0.4)' : '#fbe9eb',
        lineColor: isDarkMode ? '#CBD5E1' : '#2c3e50',
    };

    const [task, setTask] = useState({
        q: '', h: '',
        t1Whole: 0, t1Num: 0, t1Den: 1,
        t2Whole: 0, t2Num: 0, t2Den: 1,
        midWhole: 0, midNum: 0, midDen: 1,
        finalWhole: 0, finalNum: 0, finalDen: 1,
        isTwoStep: false, hasMidWhole: false, hasFinalWhole: false
    });

    const [inpMidWhole, setInpMidWhole] = useState('');
    const [inpMidNum, setInpMidNum] = useState('');
    const [inpMidDen, setInpMidDen] = useState('');
    const [inpFinalWhole, setInpFinalWhole] = useState('');
    const [inpFinalNum, setInpFinalNum] = useState('');
    const [inpFinalDen, setInpFinalDen] = useState('');

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
    const midWholeRef = useRef<TextInput>(null);
    const midNumRef = useRef<TextInput>(null);
    const midDenRef = useRef<TextInput>(null);
    const finalWholeRef = useRef<TextInput>(null);
    const finalNumRef = useRef<TextInput>(null);
    const finalDenRef = useRef<TextInput>(null);
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
        setInpMidWhole(''); setInpMidNum(''); setInpMidDen('');
        setInpFinalWhole(''); setInpFinalNum(''); setInpFinalDen('');
        setAttempts(0); setShowHint(false);
        bgAnim.setValue(0);

        let newTask: any = {};
        let uniqueKey = "";
        let attemptCount = 0;
        const denominators = [3, 4, 5, 6, 7, 8, 9, 10, 12];

        do {
            const den = denominators[rnd(0, denominators.length - 1)];
            const forceImproper = Math.random() > 0.3;
            let w1 = rnd(0, 3); let w2 = rnd(0, 3);
            if (w1 === 0 && w2 === 0) w1 = 1;
            let n1 = rnd(1, den - 1);
            let n2 = forceImproper ? rnd(den - n1, den + 1) : rnd(1, den - 1);

            const midWhole = w1 + w2; const midNum = n1 + n2; const midDen = den;
            const hasMidWhole = midWhole > 0;
            let finalWhole = midWhole; let finalNum = midNum; let finalDen = midDen;

            if (finalNum >= finalDen) {
                finalWhole += Math.floor(finalNum / finalDen);
                finalNum = finalNum % finalDen;
            }
            if (finalNum > 0) {
                const common = gcd(finalNum, finalDen);
                finalNum /= common; finalDen /= common;
            }

            const isTwoStep = (midNum !== finalNum) || (midWhole !== finalWhole);
            newTask = {
                q: `${w1 > 0 ? w1 + ' ' : ''}${n1}/${den} + ${w2 > 0 ? w2 + ' ' : ''}${n2}/${den}`,
                h: 'Dodaj całości i liczniki. Jeśli licznik ≥ mianownik, wyłącz całości przed ułamek.',
                t1Whole: w1, t1Num: n1, t1Den: den, t2Whole: w2, t2Num: n2, t2Den: den,
                midWhole, midNum, midDen, hasMidWhole,
                finalWhole, finalNum, finalDen, hasFinalWhole: finalWhole > 0, isTwoStep
            };
            uniqueKey = `${w1}-${n1}-${w2}-${n2}-${den}`;
            attemptCount++;
        } while (historyRef.current.has(uniqueKey) && attemptCount < 20);

        historyRef.current.add(uniqueKey);
        setTask(newTask);
        setTimeout(() => newTask.hasMidWhole ? midWholeRef.current?.focus() : midNumRef.current?.focus(), 400);
    };

    const handleCheck = () => {
        if ((task.hasMidWhole && !inpMidWhole) || !inpMidNum || !inpMidDen) { setMsg('Wypełnij pola!'); return; }
        if (task.isTwoStep && ((task.hasFinalWhole && !inpFinalWhole) || (task.finalNum > 0 && !inpFinalNum))) { setMsg('Dokończ wynik!'); return; }

        const uMidW = parseInt(inpMidWhole || '0'); const uMidN = parseInt(inpMidNum || '0'); const uMidD = parseInt(inpMidDen || '0');
        const uFinW = parseInt(inpFinalWhole || '0'); const uFinN = parseInt(inpFinalNum || '0'); const uFinD = parseInt(inpFinalDen || '0');

        const midCorrect = (task.hasMidWhole ? uMidW === task.midWhole : true) && uMidN === task.midNum && uMidD === task.midDen;
        let finCorrect = true;
        if (task.isTwoStep) {
            finCorrect = (task.hasFinalWhole ? uFinW === task.finalWhole : uFinW === 0) &&
                (task.finalNum > 0 ? (uFinN === task.finalNum && uFinD === task.finalDen) : true);
        }

        if (midCorrect && finCorrect) {
            setStatus('correct'); setMsg('Doskonale! ✅');
            Animated.timing(bgAnim, { toValue: 1, duration: 500, useNativeDriver: false }).start();
            setStats(s => ({ ...s, correct: s.correct + 1 }));
            setSessionCorrect(prev => prev + 1); setReady(true);
            InteractionManager.runAfterInteractions(() => awardXpAndCoins(10, 2));
        } else {
            setStatus('wrong');
            if (attempts === 0) {
                setMsg('Błąd! Spróbuj poprawić ✍️'); setAttempts(1);
                if (task.hasMidWhole && uMidW !== task.midWhole) setInpMidWhole('');
                if (uMidN !== task.midNum) setInpMidNum('');
                if (uMidD !== task.midDen) setInpMidDen('');
                if (task.isTwoStep) { setInpFinalWhole(''); setInpFinalNum(''); setInpFinalDen(''); }
                Animated.sequence([Animated.timing(bgAnim, { toValue: -1, duration: 200, useNativeDriver: false }), Animated.timing(bgAnim, { toValue: 0, duration: 200, useNativeDriver: false })]).start();
                setTimeout(() => setStatus('neutral'), 1500);
            } else {
                let res = `${task.midWhole > 0 ? task.midWhole + ' ' : ''}${task.midNum}/${task.midDen}`;
                if (task.isTwoStep) res += ` = ${task.finalWhole > 0 ? task.finalWhole + ' ' : ''}${task.finalNum > 0 ? task.finalNum + '/' + task.finalDen : ''}`;
                setMsg(`Niestety źle. Wynik: ${res}`); setReady(true); setStats(s => ({ ...s, wrong: s.wrong + 1 }));
                Animated.timing(bgAnim, { toValue: -1, duration: 500, useNativeDriver: false }).start();
            }
        }
    };

    const nextTask = () => {
        if (stats.count >= TASKS_LIMIT) { setIsFinished(true); return; }
        if (stats.count > 0 && stats.count % 10 === 0 && !showMilestone) {
            setShowMilestone(true); return;
        }
        setStats(s => ({ ...s, count: s.count + 1 }));
        generateProblem();
    };

    const handleRestart = () => {
        setIsFinished(false); setStats({ correct: 0, wrong: 0, count: 1 });
        setSessionCorrect(0); historyRef.current.clear(); generateProblem();
    };

    const getInputStyle = (currentVal: string, targetVal: number) => {
        const base = { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.inputText };
        if (status === 'neutral') return [styles.inputNeutral, base];
        if (status === 'correct') return [styles.inputCorrect, base, { backgroundColor: theme.correctBg, borderColor: '#28a745' }];
        return (currentVal && parseInt(currentVal) === targetVal)
            ? [styles.inputCorrect, base, { backgroundColor: theme.correctBg, borderColor: '#28a745' }]
            : [styles.inputError, base, { backgroundColor: theme.errorBg, borderColor: '#dc3545' }];
    };

    const renderStaticMixed = (whole: number, num: number, den: number) => (
        <View style={styles.mixedContainer}>
            {whole > 0 && <Text style={[styles.staticWhole, { color: theme.textMain }]}>{whole}</Text>}
            <View style={styles.fractionStatic}>
                <Text style={[styles.staticNum, { color: theme.textMain }]}>{num}</Text>
                <View style={[styles.staticLine, { backgroundColor: theme.lineColor }]} />
                <Text style={[styles.staticDen, { color: theme.textMain }]}>{den}</Text>
            </View>
        </View>
    );

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.container}>
                <StatusBar translucent backgroundColor="transparent" barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
                <ImageBackground source={theme.bgImage} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                <View style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.bgOverlay }]} pointerEvents="none" />
                <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: bgAnim.interpolate({ inputRange: [-1, 0, 1], outputRange: ['rgba(255,0,0,0.15)', 'transparent', 'rgba(0,255,0,0.15)'] }) }]} pointerEvents="none" />

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
                                <TouchableOpacity style={styles.mButton} onPress={() => { setShowMilestone(false); setSessionCorrect(0); setStats(s => ({ ...s, count: s.count + 1 })); generateProblem(); }}><Text style={styles.mButtonText}>Kontynuuj</Text></TouchableOpacity>
                            </View>
                        </View>
                    </Modal>

                    <Modal visible={isFinished} transparent={true} animationType="fade">
                        <View style={styles.modalOverlay}>
                            <View style={[styles.milestoneCard, { backgroundColor: theme.modalContent }]}>
                                <Text style={[styles.milestoneTitle, { color: theme.textMain }]}>Gratulacje! 🏆</Text>
                                <View style={[styles.statsRowMilestone, { backgroundColor: theme.statsRow }]}><Text style={[styles.statsTextMilestone, { color: theme.textMain }]}>Wynik końcowy: {stats.correct} / {TASKS_LIMIT}</Text></View>
                                <TouchableOpacity style={styles.mButton} onPress={handleRestart}><Text style={styles.mButtonText}>Od nowa</Text></TouchableOpacity>
                                <TouchableOpacity style={[styles.mButton, {backgroundColor: '#dc3545'}]} onPress={() => navigation.goBack()}><Text style={styles.mButtonText}>Wyjdź</Text></TouchableOpacity>
                            </View>
                        </View>
                    </Modal>

                    {showHint && !isKeyboardVisible && (
                        <View style={[styles.hintBox, { backgroundColor: theme.modalContent, borderColor: '#007AFF' }]}><Text style={styles.hintTitle}>Wskazówka:</Text><Text style={[styles.hintText, { color: theme.textMain }]}>{task.h}</Text></View>
                    )}

                    <DrawingModal visible={showScratchpad} onClose={() => setShowScratchpad(false)} problemText={task.q} />

                    <ScrollView contentContainerStyle={styles.centerContent} keyboardShouldPersistTaps="handled">
                        <View style={styles.card}>
                            <View style={[styles.overlayBackground, { backgroundColor: theme.cardOverlay }]} />
                            <Text style={styles.headerTitle}>Dodawanie ułamków</Text>

                            <View style={styles.taskContent}>
                                <View style={styles.equationRow}>
                                    {renderStaticMixed(task.t1Whole, task.t1Num, task.t1Den)}
                                    <Text style={[styles.operatorSign, { color: theme.textMain }]}>+</Text>
                                    {renderStaticMixed(task.t2Whole, task.t2Num, task.t2Den)}
                                    <Text style={[styles.operatorSign, { color: theme.textMain }]}>=</Text>

                                    <View style={styles.mixedInputContainer}>
                                        {task.hasMidWhole && (
                                            <TextInput ref={midWholeRef} style={[styles.wholeInput, getInputStyle(inpMidWhole, task.midWhole)]} keyboardType="numeric" value={inpMidWhole} onChangeText={t => {setInpMidWhole(t); setStatus('neutral');}} onSubmitEditing={() => midNumRef.current?.focus()} blurOnSubmit={false} editable={!ready} placeholder="?" placeholderTextColor={theme.placeholder} />
                                        )}
                                        <View style={styles.fractionInputColumn}>
                                            <TextInput ref={midNumRef} style={[styles.fractionInput, getInputStyle(inpMidNum, task.midNum)]} keyboardType="numeric" value={inpMidNum} onChangeText={t => {setInpMidNum(t); setStatus('neutral');}} onSubmitEditing={() => midDenRef.current?.focus()} blurOnSubmit={false} editable={!ready} placeholder="?" placeholderTextColor={theme.placeholder} />
                                            <View style={[styles.fractionLineLarge, { backgroundColor: theme.lineColor }]} />
                                            <TextInput ref={midDenRef} style={[styles.fractionInput, getInputStyle(inpMidDen, task.midDen)]} keyboardType="numeric" value={inpMidDen} onChangeText={t => {setInpMidDen(t); setStatus('neutral');}} onSubmitEditing={() => task.isTwoStep ? (task.hasFinalWhole ? finalWholeRef.current?.focus() : finalNumRef.current?.focus()) : handleCheck()} blurOnSubmit={!task.isTwoStep} editable={!ready} placeholder="?" placeholderTextColor={theme.placeholder} />
                                        </View>
                                    </View>

                                    {task.isTwoStep && (
                                        <>
                                            <Text style={[styles.operatorSign, { color: theme.textMain }]}>=</Text>
                                            <View style={styles.mixedInputContainer}>
                                                {(task.hasFinalWhole || task.finalNum === 0) && (
                                                    <TextInput ref={finalWholeRef} style={[styles.wholeInput, getInputStyle(inpFinalWhole, task.finalWhole)]} keyboardType="numeric" value={inpFinalWhole} onChangeText={t => {setInpFinalWhole(t); setStatus('neutral');}} onSubmitEditing={() => finalNumRef.current?.focus()} blurOnSubmit={false} editable={!ready} placeholder="?" placeholderTextColor={theme.placeholder} />
                                                )}
                                                {task.finalNum > 0 && (
                                                    <View style={styles.fractionInputColumn}>
                                                        <TextInput ref={finalNumRef} style={[styles.fractionInput, getInputStyle(inpFinalNum, task.finalNum)]} keyboardType="numeric" value={inpFinalNum} onChangeText={t => {setInpFinalNum(t); setStatus('neutral');}} onSubmitEditing={() => finalDenRef.current?.focus()} blurOnSubmit={false} editable={!ready} placeholder="?" placeholderTextColor={theme.placeholder} />
                                                        <View style={[styles.fractionLineLarge, { backgroundColor: theme.lineColor }]} />
                                                        <TextInput ref={finalDenRef} style={[styles.fractionInput, getInputStyle(inpFinalDen, task.finalDen)]} keyboardType="numeric" value={inpFinalDen} onChangeText={t => {setInpFinalDen(t); setStatus('neutral');}} onSubmitEditing={handleCheck} editable={!ready} placeholder="?" placeholderTextColor={theme.placeholder} />
                                                    </View>
                                                )}
                                            </View>
                                        </>
                                    )}
                                </View>
                            </View>

                            <TouchableOpacity style={[styles.mainBtn, {backgroundColor: ready ? '#28a745' : '#007AFF'}]} onPress={ready ? nextTask : handleCheck}>
                                <Text style={styles.mainBtnText}>{ready ? 'Następne' : 'Sprawdź'}</Text>
                            </TouchableOpacity>

                            <Text style={[styles.counterTextSmall, { color: theme.textSub }]}>Zadanie: {stats.count}/{TASKS_LIMIT}</Text>
                            <View style={{height: 30, marginTop: 15, justifyContent: 'center'}}>
                                {msg ? <Text style={[styles.msg, status === 'correct' ? styles.correctText : styles.errorText]}>{msg}</Text> : null}
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
    topButtons: { position: 'absolute', top: 25, right: 20, flexDirection: 'row', zIndex: 10 },
    topBtnItem: { alignItems: 'center', marginLeft: 15 },
    iconTop: { width: 70, height: 70, resizeMode: 'contain' },
    buttonLabel: { fontSize: 14, fontWeight: 'bold', marginTop: 2 },
    hintBox: { position: 'absolute', top: 110, right: 20, padding: 15, borderRadius: 15, width: 260, zIndex: 11, elevation: 5, borderWidth: 1 },
    hintTitle: { fontWeight: 'bold', color: '#007AFF', marginBottom: 5 },
    hintText: { fontSize: 14 },
    card: { width: '96%', maxWidth: 600, borderRadius: 25, padding: 20, alignItems: 'center', alignSelf: 'center', elevation: 4 },
    overlayBackground: { ...StyleSheet.absoluteFillObject, borderRadius: 25 },
    headerTitle: { fontSize: 22, fontWeight: '800', color: '#007AFF', marginBottom: 15, textTransform: 'uppercase' },
    taskContent: { alignItems: 'center', width: '100%', marginBottom: 10 },
    equationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' },
    mixedContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 4 },
    staticWhole: { fontSize: 28, fontWeight: 'bold', marginRight: 4 },
    fractionStatic: { alignItems: 'center' },
    staticNum: { fontSize: 24, fontWeight: 'bold' },
    staticLine: { width: 35, height: 3, marginVertical: 3 },
    staticDen: { fontSize: 24, fontWeight: 'bold' },
    operatorSign: { fontSize: 32, fontWeight: 'bold', marginHorizontal: 6 },
    mixedInputContainer: { flexDirection: 'row', alignItems: 'center' },
    wholeInput: { width: 50, height: 70, borderWidth: 2, borderRadius: 12, fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginRight: 5 },
    fractionInputColumn: { alignItems: 'center' },
    fractionInput: { width: 60, height: 50, borderWidth: 2, borderRadius: 10, fontSize: 22, fontWeight: 'bold', textAlign: 'center' },
    inputNeutral: {},
    inputCorrect: {},
    inputError: {},
    fractionLineLarge: { width: 70, height: 3, marginVertical: 4 },
    mainBtn: { marginTop: 20, paddingHorizontal: 40, paddingVertical: 14, borderRadius: 15 },
    mainBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    counterTextSmall: { fontSize: 13, textAlign: 'center', marginTop: 15 },
    msg: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
    correctText: { color: '#28a745' },
    errorText: { color: '#dc3545' },
    iconsBottom: { position: 'absolute', bottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' },
    iconSame: { width: combinedIconSize, height: combinedIconSize, resizeMode: 'contain', marginHorizontal: 10 },
    counterTextIcons: { fontSize: 20, marginHorizontal: 8 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    milestoneCard: { width: '90%', borderRadius: 20, padding: 25, alignItems: 'center' },
    milestoneTitle: { fontSize: 22, fontWeight: 'bold' },
    statsRowMilestone: { marginVertical: 15, alignItems: 'center', width: '100%', padding: 10, borderRadius: 10 },
    statsTextMilestone: { fontSize: 18, fontWeight: 'bold' },
    mButton: { paddingVertical: 12, borderRadius: 12, width: '48%', alignItems: 'center', backgroundColor: '#28a745' },
    mButtonText: { color: '#fff', fontWeight: 'bold' },
    headerButton: { padding: 10 },
    headerButtonText: { fontSize: 16, color: '#007AFF', fontWeight: '600' },
    drawingContainer: { width: '95%', height: '85%', borderRadius: 20, overflow: 'hidden' },
    drawingHeader: { height: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, borderBottomWidth: 1 },
    drawingTitle: { fontSize: 18, fontWeight: 'bold' },
    problemPreviewContainer: { padding: 10, alignItems: 'center', borderBottomWidth: 1 },
    problemPreviewLabel: { fontSize: 12, color: '#777' },
    problemPreviewTextSmall: { fontSize: 16, fontWeight: '600' },
    canvas: { flex: 1 }
});

export default FractionsAdditionTrainer;