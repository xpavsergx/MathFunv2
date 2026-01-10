import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TextInput, Button, Keyboard, ImageBackground,
    Animated, StatusBar, Image, Dimensions, TouchableOpacity, Modal,
    Platform, KeyboardAvoidingView, ScrollView, InteractionManager, SafeAreaView
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { awardXpAndCoins } from '../../../services/xpService';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

const EXERCISE_ID = "WrittenDivisionTrainer";

const { width: screenWidth } = Dimensions.get('window');
const calculatedCellSize = (screenWidth - 40) / 8;
const CELL_WIDTH = Math.min(46, calculatedCellSize);
const FONT_SIZE_DIGIT = CELL_WIDTH * 0.72;
const FONT_SIZE_INPUT = CELL_WIDTH * 0.6;
const TASKS_LIMIT = 50;
const combinedIconSize = screenWidth * 0.28;

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
                    <View style={styles.problemPreviewContainer}><Text style={styles.problemPreviewLabel}>Zadanie:</Text><Text style={styles.problemPreviewTextSmall}>{problemText}</Text></View>
                    <View style={styles.canvas} onStartShouldSetResponder={() => true} onMoveShouldSetResponder={() => true} onResponderGrant={(evt) => { const { locationX, locationY } = evt.nativeEvent; setCurrentPath(`M${locationX},${locationY}`); }} onResponderMove={onTouchMove} onResponderRelease={onTouchEnd}>
                        <Svg height="100%" width="100%">
                            {paths.map((d, index) => (<Path key={`path-${index}`} d={d} stroke="#000" strokeWidth={3} fill="none" />))}
                            <Path d={currentPath} stroke="#000" strokeWidth={3} fill="none" />
                        </Svg>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const WrittenDivisionTrainer = () => {
    const navigation = useNavigation();
    const [dividend, setDividend] = useState<string>('');
    const [divisor, setDivisor] = useState<string>('');
    const [gridConfig, setGridConfig] = useState<any[]>([]);
    const [userInputs, setUserInputs] = useState<{[key: string]: string}>({});
    const [correctValues, setCorrectValues] = useState<{[key: string]: string}>({});
    const [focusOrder, setFocusOrder] = useState<string[]>([]);
    const [dividendLength, setDividendLength] = useState(3);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const [readyForNext, setReadyForNext] = useState(false);
    const [correctCount, setCorrectCount] = useState(0);
    const [wrongCount, setWrongCount] = useState(0);
    const [taskCount, setTaskCount] = useState(0);
    const [firstAttempt, setFirstAttempt] = useState(true);
    const [showMilestone, setShowMilestone] = useState(false);
    const [sessionCorrect, setSessionCorrect] = useState(0);
    const [message, setMessage] = useState('');
    const [showScratchpad, setShowScratchpad] = useState(false);
    const [showHint, setShowHint] = useState(false);
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);

    const inputRefs = useRef<{[key: string]: TextInput | null}>({});
    const backgroundColor = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const k1 = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
        const k2 = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
        nextTask();
        return () => { k1.remove(); k2.remove(); };
    }, []);

    const generateProblem = () => {
        setMessage(''); setIsCorrect(null); setReadyForNext(false); setFirstAttempt(true);
        backgroundColor.setValue(0);
        setUserInputs({});
        const len = Math.floor(Math.random() * 4) + 2;
        setDividendLength(len);
        const n2 = Math.floor(2 + Math.random() * 8);
        let n1;
        const wantNoRemainder = Math.random() < 0.8;
        const minVal = Math.pow(10, len - 1);
        const maxVal = Math.pow(10, len) - 1;
        const absoluteMin = n2 * 11;
        const effectiveMin = Math.max(minVal, absoluteMin);
        if (effectiveMin > maxVal) { n1 = maxVal; } else {
            if (wantNoRemainder) {
                const minQ = Math.ceil(effectiveMin / n2);
                const maxQ = Math.floor(maxVal / n2);
                const q = Math.floor(minQ + Math.random() * (maxQ - minQ + 1));
                n1 = q * n2;
            } else { n1 = Math.floor(effectiveMin + Math.random() * (maxVal - effectiveMin + 1)); }
        }
        const n1Str = n1.toString();
        setDividend(n1Str);
        setDivisor(n2.toString());
        const cv: {[key: string]: string} = {};
        const layoutRows = [];
        const order: string[] = [];
        const qCols = Array.from({length: len}, (_, i) => i);
        layoutRows.push({ type: 'quotient', cols: qCols });
        let currentRemainder = 0;
        for (let i = 0; i < len; i++) {
            const digit = parseInt(n1Str[i]);
            const val = currentRemainder * 10 + digit;
            const q = Math.floor(val / n2);
            const m = q * n2;
            const r = val - m;
            if (i === 0 && q === 0) { currentRemainder = r; continue; }
            cv[`q_${i}`] = q.toString();
            order.push(`q_${i}`);
            const mStr = m.toString();
            const mKeys = [];
            if (mStr.length === 2) {
                if (i > 0) { cv[`m${i}_${i-1}`] = mStr[0]; mKeys.push(`m${i}_${i-1}`); order.push(`m${i}_${i-1}`); }
                cv[`m${i}_${i}`] = mStr[mStr.length - 1]; mKeys.push(`m${i}_${i}`); order.push(`m${i}_${i}`);
            } else { cv[`m${i}_${i}`] = mStr; mKeys.push(`m${i}_${i}`); order.push(`m${i}_${i}`); }
            layoutRows.push({ type: 'sub', keys: mKeys });
            const nextKeys = [];
            const isLastStep = i === len - 1;
            if (r !== 0 || isLastStep) { cv[`r${i}_${i}`] = r.toString(); nextKeys.push(`r${i}_${i}`); order.push(`r${i}_${i}`); }
            if (!isLastStep) { cv[`d${i+1}_${i+1}`] = n1Str[i+1]; nextKeys.push(`d${i+1}_${i+1}`); order.push(`d${i+1}_${i+1}`); }
            if (isLastStep) layoutRows.push({ type: 'final', keys: nextKeys });
            else layoutRows.push({ type: 'rem_drop', keys: nextKeys });
            currentRemainder = r;
        }
        setGridConfig(layoutRows);
        setCorrectValues(cv);
        setFocusOrder(order);
        inputRefs.current = {};
        setTimeout(() => {
            const firstKey = order[0];
            if (firstKey && inputRefs.current[firstKey]) inputRefs.current[firstKey]?.focus();
        }, 500);
    };

    const handleInput = (key: string, val: string) => {
        const cleanVal = val.replace(/[^0-9]/g, '').slice(-1);
        setUserInputs(prev => ({...prev, [key]: cleanVal}));
        if (cleanVal !== '') {
            const currentIndex = focusOrder.indexOf(key);
            if (currentIndex !== -1 && currentIndex < focusOrder.length - 1) {
                const nextKey = focusOrder[currentIndex + 1];
                if (inputRefs.current[nextKey]) inputRefs.current[nextKey]?.focus();
            }
        }
    };

    const handleCheck = () => {
        const quotientKeys = Object.keys(correctValues).filter(k => k.startsWith('q_'));
        let resultCorrect = true;
        for (const k of quotientKeys) {
            if (!userInputs[k] || userInputs[k] !== correctValues[k]) { resultCorrect = false; break; }
        }
        if (!resultCorrect) {
            if (!quotientKeys.some(k => userInputs[k])) { setMessage('Wpisz wynik na górze!'); return; }
            processResult(false); return;
        }
        const intermediateKeys = Object.keys(correctValues).filter(k => !k.startsWith('q_'));
        let intermediateError = intermediateKeys.some(k => userInputs[k] && userInputs[k] !== '' && userInputs[k] !== correctValues[k]);
        if (intermediateError) { setMessage('Błąd w obliczeniach pomocniczych.'); processResult(false); }
        else { processResult(true); }
    };

    const processResult = (isSuccess: boolean) => {
        if (isSuccess) {
            Animated.timing(backgroundColor, { toValue: 1, duration: 500, useNativeDriver: false }).start();
            setCorrectCount(c => c + 1);
            setSessionCorrect(s => s + 1);
            setMessage('Świetnie! ✅');
            setReadyForNext(true);
            setIsCorrect(true);
            InteractionManager.runAfterInteractions(() => awardXpAndCoins(15, 3));
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
                setMessage('Błąd. Spróbuj jeszcze raz.');
                setFirstAttempt(false); setIsCorrect(false); setUserInputs({});
                setTimeout(() => {
                    const firstKey = focusOrder[0];
                    if(firstKey && inputRefs.current[firstKey]) inputRefs.current[firstKey]?.focus();
                }, 100);
            } else {
                const q = Math.floor(parseInt(dividend)/parseInt(divisor));
                const r = parseInt(dividend) % parseInt(divisor);
                setMessage(`Wynik: ${r > 0 ? `${q} reszta ${r}` : `${q}`}`);
                setWrongCount(w => w + 1); setReadyForNext(true); setIsCorrect(false); setUserInputs(correctValues);
            }
        }
    }

    const nextTask = () => {
        if (taskCount > 0 && taskCount % 10 === 0 && !showMilestone) { setShowMilestone(true); return; }
        if (taskCount >= TASKS_LIMIT) { setMessage('Koniec! 🏆'); return; }
        setTaskCount(t => t + 1); generateProblem();
    };

    const renderGridRow = (rowConfig: any, index: number) => {
        const cols = Array.from({length: dividendLength}, (_, i) => i);
        if (rowConfig.type === 'quotient') {
            return (
                <View key={`row-${index}`} style={styles.row}>
                    {cols.map(c => {
                        const key = `q_${c}`;
                        const shouldRender = correctValues[key] !== undefined;
                        return (
                            <View key={`q_${c}`} style={styles.cell}>
                                {shouldRender ? (
                                    <View style={[styles.inputBox, isCorrect === false && styles.errorBorder, isCorrect === true && styles.correctBorder]}>
                                        <TextInput
                                            ref={(el) => {inputRefs.current[key] = el;}}
                                            style={[styles.mainInput, {color: '#28a745'}]}
                                            value={userInputs[key] || ''}
                                            onChangeText={v => handleInput(key, v)}
                                            keyboardType="numeric" maxLength={1} editable={!readyForNext}
                                        />
                                    </View>
                                ) : <View style={styles.cellSpacer} />}
                            </View>
                        );
                    })}
                    <View style={styles.cellSpacer} /><View style={styles.cellSpacer} />
                </View>
            );
        }
        if (rowConfig.type === 'sub' || rowConfig.type === 'rem_drop' || rowConfig.type === 'final') {
            const effectiveKeys = rowConfig.keys || [];
            const minCol = effectiveKeys.length > 0 ? Math.min(...effectiveKeys.map((k: string) => parseInt(k.split('_')[1]))) : -1;
            const isSub = rowConfig.type === 'sub';
            return (
                <View key={`row-${index}`} style={isSub ? [styles.row, { marginBottom: 15 }] : styles.row}>
                    {cols.map(c => {
                        const keyForCol = effectiveKeys.find((k: string) => k.endsWith(`_${c}`));
                        return (
                            <View key={`c-${c}`} style={styles.cell}>
                                {isSub && c === minCol && <View style={styles.minusContainer}><Text style={styles.operatorSmall}>-</Text></View>}
                                {keyForCol ? (
                                    <View style={[styles.inputBox, isCorrect === false && styles.errorBorder, isCorrect === true && styles.correctBorder]}>
                                        <TextInput
                                            ref={(el) => {inputRefs.current[keyForCol] = el;}}
                                            style={styles.mainInput}
                                            value={userInputs[keyForCol] || ''}
                                            onChangeText={v => handleInput(keyForCol, v)}
                                            keyboardType="numeric" maxLength={1} editable={!readyForNext}
                                        />
                                    </View>
                                ) : null}
                            </View>
                        );
                    })}
                    <View style={styles.cellSpacer} /><View style={styles.cellSpacer} />
                    {isSub && <View style={[styles.lineUnderSub, { left: minCol * CELL_WIDTH, width: effectiveKeys.length * CELL_WIDTH }]} />}
                </View>
            );
        }
        return null;
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
            <ImageBackground source={require('../../../assets/background.jpg')} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
            <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: backgroundColor.interpolate({ inputRange: [-1, 0, 1], outputRange: ['rgba(255,0,0,0.2)', 'rgba(255,255,255,0)', 'rgba(0,255,0,0.2)'] }) }]} pointerEvents="none" />
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardContainer}>
                {!isKeyboardVisible && (
                    <View style={styles.topButtons}>
                        <TouchableOpacity onPress={() => setShowScratchpad(true)} style={styles.topBtnItem}><Image source={require('../../../assets/pencil.png')} style={styles.iconTop} /><Text style={styles.buttonLabel}>Brudnopis</Text></TouchableOpacity>
                        <TouchableOpacity onPress={() => setShowHint(!showHint)} style={styles.topBtnItem}><Image source={require('../../../assets/question.png')} style={styles.iconTop} /><Text style={styles.buttonLabel}>Pomoc</Text></TouchableOpacity>
                    </View>
                )}
                <Modal visible={showMilestone} transparent={true} animationType="slide">
                    <View style={styles.modalOverlay}>
                        <View style={styles.milestoneCard}>
                            <Text style={styles.milestoneTitle}>Podsumowanie serii 📊</Text>
                            <View style={styles.statsRow}>
                                <Text style={styles.statsText}>Poprawne: {sessionCorrect} / 10</Text>
                                <Text style={[styles.statsText, { color: '#28a745', marginTop: 5 }]}>Skuteczność: {(sessionCorrect / 10 * 100).toFixed(0)}%</Text>
                            </View>
                            <Text style={styles.suggestionText}>{sessionCorrect >= 8 ? "Rewelacyjnie! Jesteś mistrzem!" : "Trenuj dalej, aby być jeszcze lepszym."}</Text>
                            <View style={styles.milestoneButtons}>
                                <TouchableOpacity style={[styles.mButton, { backgroundColor: '#28a745' }]} onPress={() => { setShowMilestone(false); setSessionCorrect(0); nextTask(); }}><Text style={styles.mButtonText}>Kontynuuj</Text></TouchableOpacity>
                                <TouchableOpacity style={[styles.mButton, { backgroundColor: '#007AFF' }]} onPress={() => { setShowMilestone(false); navigation.goBack(); }}><Text style={styles.mButtonText}>Inny temat</Text></TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
                <DrawingModal visible={showScratchpad} onClose={() => setShowScratchpad(false)} problemText={`${dividend} : ${divisor}`} />
                <View style={styles.mainContentSection}>
                    <View style={styles.card}>
                        <View style={styles.overlayBackground} />
                        <Text style={styles.questionMain}>Dzielenie pisemne</Text>
                        <View style={styles.scrollAreaContainer}>
                            <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={true} nestedScrollEnabled={true} keyboardShouldPersistTaps="handled">
                                <ScrollView horizontal={true} persistentScrollbar={true} style={{ flexGrow: 0 }} keyboardShouldPersistTaps="handled">
                                    <View style={styles.divisionGrid}>
                                        {gridConfig.length > 0 ? renderGridRow(gridConfig[0], 0) : null}
                                        <View style={[styles.lineAboveDividend, { width: CELL_WIDTH * dividendLength + 10 }]} />
                                        <View style={styles.row}>
                                            {dividend.split('').map((d, i) => (
                                                <View key={`d-${i}`} style={styles.cell}><Text style={styles.digit}>{d}</Text></View>
                                            ))}
                                            <View style={styles.cell}><Text style={styles.operator}>:</Text></View>
                                            <View style={styles.cell}><Text style={styles.digit}>{divisor}</Text></View>
                                        </View>
                                        {gridConfig.slice(1).map((rowConf, idx) => renderGridRow(rowConf, idx + 1))}
                                    </View>
                                </ScrollView>
                            </ScrollView>
                        </View>
                        <View style={styles.buttonContainer}>
                            <Button title={readyForNext ? 'Dalej' : 'Sprawdź'} onPress={readyForNext ? nextTask : handleCheck} color="#007AFF" />
                        </View>
                        <Text style={styles.counterTextSmall}>Zadanie: {taskCount} / {TASKS_LIMIT}</Text>
                        {message ? <Text style={[styles.result, message.includes('Świetnie') ? styles.correctText : styles.errorText]}>{message}</Text> : null}
                    </View>
                </View>
                {!isKeyboardVisible && (
                    <View style={styles.footerSection}>
                        <Image source={require('../../../assets/happy.png')} style={styles.iconSame} /><Text style={styles.counterTextIcons}>{correctCount}</Text>
                        <Image source={require('../../../assets/sad.png')} style={styles.iconSame} /><Text style={styles.counterTextIcons}>{wrongCount}</Text>
                    </View>
                )}
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    keyboardContainer: { flex: 1, flexDirection: 'column', justifyContent: 'space-between' },
    topButtons: { flexDirection: 'row', justifyContent: 'flex-end', paddingRight: 20, paddingTop: 10, height: 90, zIndex: 10 },
    topBtnItem: { alignItems: 'center', marginLeft: 15 },
    iconTop: { width: 70, height: 70, resizeMode: 'contain', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3 },
    buttonLabel: { fontSize: 14, fontWeight: 'bold', color: '#007AFF', marginTop: 2 },
    mainContentSection: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 10, paddingBottom: 10 },
    card: { width: '98%', maxWidth: 500, flex: 1, maxHeight: '80%', borderRadius: 20, padding: 15, alignItems: 'center', elevation: 5 },
    overlayBackground: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 20 },
    scrollAreaContainer: { width: '100%', flex: 1, marginBottom: 10 },
    scrollContent: { flexGrow: 1, alignItems: 'center', paddingBottom: 40 },
    footerSection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingBottom: 40 },
    questionMain: { fontSize: 24, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 15, marginTop: 5 },
    divisionGrid: { alignItems: 'flex-start' },
    row: { flexDirection: 'row', alignItems: 'center', height: CELL_WIDTH + 6 },
    cell: { width: CELL_WIDTH, height: CELL_WIDTH, justifyContent: 'center', alignItems: 'center' },
    cellSpacer: { width: CELL_WIDTH, height: CELL_WIDTH },
    digit: { fontSize: FONT_SIZE_DIGIT, fontWeight: 'bold', width: CELL_WIDTH, textAlign: 'center', color: '#222' },
    operator: { fontSize: FONT_SIZE_DIGIT, fontWeight: 'bold', color: '#222' },
    operatorSmall: { fontSize: 28, fontWeight: 'bold', color: '#222', textAlign: 'center' },
    minusContainer: { position: 'absolute', left: -25, top: 10, width: 20, justifyContent: 'center', alignItems: 'center' },
    lineAboveDividend: { height: 4, backgroundColor: '#000000', marginTop: 5, marginBottom: 5 },
    lineUnderSub: { position: 'absolute', bottom: -10, height: 4, backgroundColor: '#000000', zIndex: -1 },
    inputBox: { width: CELL_WIDTH - 6, height: CELL_WIDTH + 6, borderWidth: 2, borderColor: '#ccc', borderRadius: 6, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
    mainInput: { fontSize: FONT_SIZE_INPUT, fontWeight: 'bold', textAlign: 'center', color: '#007AFF', width: '100%', height: '100%', padding: 0 },
    errorBorder: { borderColor: '#dc3545', backgroundColor: '#f8d7da' },
    correctBorder: { borderColor: '#28a745', backgroundColor: '#d4edda' },
    buttonContainer: { marginTop: 10, width: '80%', borderRadius: 10, overflow: 'hidden', alignSelf: 'center' },
    result: { fontSize: 18, fontWeight: '700', marginTop: 10, textAlign: 'center' },
    correctText: { color: '#28a745' },
    errorText: { color: '#dc3545' },
    counterTextSmall: { fontSize: 12, fontWeight: '400', color: '#555', textAlign: 'center', marginTop: 5 },
    iconSame: { width: combinedIconSize, height: combinedIconSize, resizeMode: 'contain', marginHorizontal: 10 },
    counterTextIcons: { fontSize: 16, marginHorizontal: 8, textAlign: 'center', color: '#333' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    drawingContainer: { width: '95%', height: '85%', backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden' },
    drawingHeader: { height: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, backgroundColor: '#f0f0f0', borderBottomWidth: 1, borderBottomColor: '#ccc' },
    drawingTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    headerButton: { padding: 5 },
    headerButtonText: { fontSize: 16, color: '#007AFF' },
    problemPreviewContainer: { backgroundColor: '#f9f9f9', padding: 10, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee', width: '100%' },
    problemPreviewLabel: { fontSize: 12, color: '#777', textTransform: 'uppercase', marginBottom: 4 },
    problemPreviewTextSmall: { fontSize: 16, fontWeight: '600', color: '#007AFF', textAlign: 'center' },
    canvas: { flex: 1, backgroundColor: '#ffffff' },
    milestoneCard: { width: '90%', backgroundColor: '#fff', borderRadius: 20, padding: 25, alignItems: 'center', elevation: 10 },
    milestoneTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 15 },
    statsRow: { marginVertical: 10, alignItems: 'center', backgroundColor: '#f8f9fa', padding: 15, borderRadius: 15, width: '100%' },
    statsText: { fontSize: 18, color: '#333', fontWeight: 'bold' },
    suggestionText: { fontSize: 15, color: '#666', textAlign: 'center', marginVertical: 20, lineHeight: 22 },
    milestoneButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
    mButton: { paddingVertical: 12, paddingHorizontal: 15, borderRadius: 12, width: '48%', alignItems: 'center' },
    mButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 }
});

export default WrittenDivisionTrainer;