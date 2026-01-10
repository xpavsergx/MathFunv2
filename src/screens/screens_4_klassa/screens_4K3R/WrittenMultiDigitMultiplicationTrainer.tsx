import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TextInput, Button, Keyboard, ImageBackground,
    Animated, StatusBar, Image, Dimensions, TouchableOpacity, Modal,
    Platform, KeyboardAvoidingView, TouchableWithoutFeedback, ScrollView, InteractionManager
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { awardXpAndCoins } from '../../../services/xpService';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

const EXERCISE_ID = "WrittenMultiDigitMultiplicationTrainer";

const { width: screenWidth } = Dimensions.get('window');
const TASKS_LIMIT = 50;
const combinedIconSize = screenWidth * 0.25;
const CELL_WIDTH = 48; // Stała szerokość komórki
const GRID_WIDTH_COLS = 7; // Liczba kolumn w siatce

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

const WrittenMultiDigitMultiplicationTrainer = () => {
    const [num1, setNum1] = useState('');
    const [num2, setNum2] = useState('');
    const [fullResult, setFullResult] = useState(0);

    // Pola odpowiedzi
    const [partial1, setPartial1] = useState<string[]>([]);
    const [partial2, setPartial2] = useState<string[]>([]);
    const [finalRes, setFinalRes] = useState<string[]>([]);
    const [carriesTop, setCarriesTop] = useState<string[]>([]);

    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const [readyForNext, setReadyForNext] = useState(false);
    const [correctCount, setCorrectCount] = useState(0);
    const [wrongCount, setWrongCount] = useState(0);
    const [taskCount, setTaskCount] = useState(0);
    const [firstAttempt, setFirstAttempt] = useState(true);
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

        const n1 = Math.floor(1000 + Math.random() * 8999);
        const n2 = Math.floor(11 + Math.random() * 88);

        setNum1(n1.toString());
        setNum2(n2.toString());
        setFullResult(n1 * n2);

        setPartial1(new Array(GRID_WIDTH_COLS).fill(''));
        setPartial2(new Array(GRID_WIDTH_COLS).fill(''));
        setFinalRes(new Array(GRID_WIDTH_COLS).fill(''));
        setCarriesTop(new Array(GRID_WIDTH_COLS).fill(''));

        inputRefs.current = {};

        setTimeout(() => {
            const startKey = `p1-${GRID_WIDTH_COLS - 1}`;
            if (inputRefs.current[startKey]) inputRefs.current[startKey]?.focus();
        }, 500);
    };

    const handleDigitChange = (val: string, index: number, type: string, arrSetter: React.Dispatch<React.SetStateAction<string[]>>, arr: string[]) => {
        const cleanVal = val.replace(/[^0-9]/g, '').slice(-1);
        const newArr = [...arr];
        newArr[index] = cleanVal;
        arrSetter(newArr);

        if (cleanVal !== '') {
            const nextIndex = index - 1;
            if (nextIndex >= 0) {
                const nextKey = `${type}-${nextIndex}`;
                if (inputRefs.current[nextKey]) {
                    inputRefs.current[nextKey]?.focus();
                }
            }
        }
    };

    const handleCheck = () => {
        const p1Val = parseInt(partial1.join(''), 10);
        const p2Val = parseInt(partial2.join(''), 10);
        const finalVal = parseInt(finalRes.join(''), 10);

        const expectedP1 = parseInt(num1) * (parseInt(num2) % 10);
        const expectedP2 = parseInt(num1) * Math.floor(parseInt(num2) / 10);

        const isFilled = finalRes.some(d => d !== '') && partial1.some(d => d !== '');

        if (!isFilled) { setMessage('Wypełnij kratki!'); return; }

        if (finalVal === fullResult && p1Val === expectedP1 && p2Val === expectedP2) {
            Animated.timing(backgroundColor, { toValue: 1, duration: 500, useNativeDriver: false }).start();
            setCorrectCount(c => c + 1); setMessage('Świetnie! ✅'); setReadyForNext(true); setIsCorrect(true);
            InteractionManager.runAfterInteractions(() => awardXpAndCoins(10, 2));
            const currentUser = auth().currentUser;
            if (currentUser) {
                firestore()
                    .collection('users')
                    .doc(currentUser.uid)
                    .collection('exerciseStats')
                    .doc(EXERCISE_ID)
                    .set({
                        totalCorrect: firestore.FieldValue.increment(1)
                    }, { merge: true })
                    .catch(error => console.error("Błąd zapisu do bazy:", error));
            }

        } else {
            Animated.timing(backgroundColor, { toValue: -1, duration: 500, useNativeDriver: false }).start();
            InteractionManager.runAfterInteractions(() => {
                const currentUser = auth().currentUser;
                if (currentUser) {
                    firestore()
                        .collection('users')
                        .doc(currentUser.uid)
                        .collection('exerciseStats')
                        .doc(EXERCISE_ID)
                        .set({
                            totalWrong: firestore.FieldValue.increment(1)
                        }, { merge: true })
                        .catch(error => console.error("Błąd zapisu błędnych:", error));
                }
            });
            if (firstAttempt) {
                setMessage('Błąd. Spróbuj jeszcze raz.');
                setFirstAttempt(false);
                setIsCorrect(false);

                // CZYŚCIMY WSZYSTKO PRZY BŁĘDZIE
                setPartial1(new Array(GRID_WIDTH_COLS).fill(''));
                setPartial2(new Array(GRID_WIDTH_COLS).fill(''));
                setFinalRes(new Array(GRID_WIDTH_COLS).fill(''));
                setCarriesTop(new Array(GRID_WIDTH_COLS).fill(''));

                setTimeout(() => {
                    const startKey = `p1-${GRID_WIDTH_COLS - 1}`;
                    if (inputRefs.current[startKey]) inputRefs.current[startKey]?.focus();
                }, 100);
            } else {
                setMessage(`Poprawny wynik: ${fullResult}`);
                setWrongCount(w => w + 1);
                setReadyForNext(true);
                setIsCorrect(false);
            }
        }
    };

    const nextTask = () => {
        if (taskCount >= TASKS_LIMIT) { setMessage('Koniec! 🏆'); return; }
        setTaskCount(t => t + 1); generateProblem();
    };

    const pad = (str: string) => new Array(GRID_WIDTH_COLS - str.length).fill('').concat(str.split(''));
    const n1Arr = pad(num1);
    const n2Arr = pad(num2);

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.container}>
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

                    {showHint && !isKeyboardVisible && (
                        <View style={styles.hintBox}>
                            <Text style={styles.hintTitle}>Mnożenie wielocyfrowe:</Text>
                            <Text style={styles.hintText}>1. Pomnóż górną liczbę przez jedności (pierwszy rząd).{'\n'}2. Pomnóż przez dziesiątki (drugi rząd, przesuń w lewo).{'\n'}3. Dodaj oba wyniki.</Text>
                        </View>
                    )}

                    <DrawingModal visible={showScratchpad} onClose={() => setShowScratchpad(false)} problemText={`${num1} × ${num2}`} />

                    <ScrollView contentContainerStyle={styles.centerContent} keyboardShouldPersistTaps="handled">
                        <View style={styles.card}>
                            <View style={styles.overlayBackground} />
                            <Text style={styles.questionMain}>Mnożenie pisemne</Text>

                            <View style={styles.columnContainer}>

                                {/* 1. Pamięć (Carries) */}
                                <View style={[styles.row, {marginBottom: 5}]}>
                                    {carriesTop.map((c, i) => (
                                        <View key={`carry-${i}`} style={styles.cellWrapper}>
                                            {i >= GRID_WIDTH_COLS - num1.length ? (
                                                <View style={styles.carryCell}>
                                                    <TextInput
                                                        ref={(el) => { inputRefs.current[`c-${i}`] = el; }}
                                                        style={styles.carryInput}
                                                        value={c}
                                                        onChangeText={v => handleDigitChange(v, i, 'c', setCarriesTop, carriesTop)}
                                                        keyboardType="numeric" maxLength={1}
                                                    />
                                                </View>
                                            ) : null}
                                        </View>
                                    ))}
                                </View>

                                {/* BLOK LICZB (MNOŻNA I MNOŻNIK) - Z LINIĄ */}
                                <View style={styles.numbersBox}>
                                    {/* Num 1 */}
                                    <View style={styles.row}>
                                        {n1Arr.map((d, i) => (
                                            <View key={`n1-${i}`} style={styles.cellWrapper}>
                                                <Text style={styles.digit}>{d}</Text>
                                            </View>
                                        ))}
                                    </View>
                                    {/* Num 2 */}
                                    <View style={styles.row}>
                                        {n2Arr.map((d, i) => (
                                            <View key={`n2-${i}`} style={styles.cellWrapper}>
                                                {i === GRID_WIDTH_COLS - num2.length - 1 ? <Text style={styles.digit}>×</Text> : <Text style={styles.digit}>{d}</Text>}
                                            </View>
                                        ))}
                                    </View>
                                </View>

                                {/* BLOK WYNIKÓW CZĄSTKOWYCH - Z LINIĄ */}
                                <View style={styles.numbersBox}>
                                    {/* Partial 1 */}
                                    <View style={styles.row}>
                                        {partial1.map((d, i) => (
                                            <View key={`p1-${i}`} style={styles.cellWrapper}>
                                                {i >= GRID_WIDTH_COLS - (num1.length + 1) ? (
                                                    <View style={[styles.inputCell, isCorrect === false && styles.errorFinalCell]}>
                                                        <TextInput
                                                            ref={(el) => { inputRefs.current[`p1-${i}`] = el; }}
                                                            style={styles.mainInput}
                                                            value={d}
                                                            onChangeText={v => handleDigitChange(v, i, 'p1', setPartial1, partial1)}
                                                            keyboardType="numeric" maxLength={1} editable={!readyForNext}
                                                        />
                                                    </View>
                                                ) : null}
                                            </View>
                                        ))}
                                    </View>
                                    {/* Partial 2 */}
                                    <View style={styles.row}>
                                        {partial2.map((d, i) => (
                                            <View key={`p2-${i}`} style={styles.cellWrapper}>
                                                {i === 0 ? <Text style={styles.digit}>+</Text> : null}
                                                {/* Schodek: nie pokazujemy ostatniej kratki */}
                                                {i < GRID_WIDTH_COLS - 1 && i >= GRID_WIDTH_COLS - (num1.length + 2) ? (
                                                    <View style={[styles.inputCell, isCorrect === false && styles.errorFinalCell]}>
                                                        <TextInput
                                                            ref={(el) => { inputRefs.current[`p2-${i}`] = el; }}
                                                            style={styles.mainInput}
                                                            value={d}
                                                            onChangeText={v => handleDigitChange(v, i, 'p2', setPartial2, partial2)}
                                                            keyboardType="numeric" maxLength={1} editable={!readyForNext}
                                                        />
                                                    </View>
                                                ) : null}
                                            </View>
                                        ))}
                                    </View>
                                </View>

                                {/* WYNIK KOŃCOWY */}
                                <View style={[styles.row, {marginTop: 5}]}>
                                    {finalRes.map((d, i) => (
                                        <View key={`f-${i}`} style={styles.cellWrapper}>
                                            <View style={[styles.inputCell, isCorrect === false && styles.errorFinalCell, isCorrect === true && styles.correctFinalCell]}>
                                                <TextInput
                                                    ref={(el) => { inputRefs.current[`f-${i}`] = el; }}
                                                    style={styles.mainInput}
                                                    value={d}
                                                    onChangeText={v => handleDigitChange(v, i, 'f', setFinalRes, finalRes)}
                                                    keyboardType="numeric" maxLength={1} editable={!readyForNext}
                                                />
                                            </View>
                                        </View>
                                    ))}
                                </View>

                            </View>

                            <View style={styles.buttonContainer}>
                                <Button title={readyForNext ? 'Dalej' : 'Sprawdź'} onPress={readyForNext ? nextTask : handleCheck} color="#007AFF" />
                            </View>
                            <Text style={styles.counterTextSmall}>Zadanie: {taskCount} / {TASKS_LIMIT}</Text>
                            {message ? <Text style={[styles.result, message.includes('Świetnie') ? styles.correctText : styles.errorText]}>{message}</Text> : null}
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
    centerContent: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 20,
        paddingHorizontal: 10,
        paddingBottom: 140 // Duży padding na dole, aby uniknąć kolizji z ikonami
    },
    topButtons: { position: 'absolute', top: 40, right: 20, flexDirection: 'row', alignItems: 'center', zIndex: 10 },
    topBtnItem: { alignItems: 'center', marginLeft: 15 },
    iconTop: { width: 70, height: 70, resizeMode: 'contain', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3 },
    buttonLabel: { fontSize: 14, fontWeight: 'bold', color: '#007AFF', marginTop: 2 },
    hintBox: { position: 'absolute', top: 120, right: 20, padding: 15, backgroundColor: 'rgba(255,255,255,0.98)', borderRadius: 15, maxWidth: 260, zIndex: 11, elevation: 5, borderWidth: 1, borderColor: '#007AFF' },
    hintTitle: { fontSize: 16, fontWeight: 'bold', color: '#007AFF', marginBottom: 5, textAlign: 'center' },
    hintText: { fontSize: 14, color: '#333', textAlign: 'center', lineHeight: 20 },
    card: { width: '95%', maxWidth: 480, borderRadius: 20, padding: 20, marginTop: 20, alignItems: 'center', alignSelf: 'center' },
    overlayBackground: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 20 },
    questionMain: { fontSize: 24, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 20 },

    columnContainer: { alignItems: 'center', marginBottom: 10 },
    numbersBox: { borderBottomWidth: 3, borderBottomColor: '#333', paddingBottom: 5, marginBottom: 5, width: '100%', alignItems: 'center' },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    cellWrapper: { width: CELL_WIDTH, height: 55, justifyContent: 'center', alignItems: 'center' },

    digit: { fontSize: 34, fontWeight: 'bold', width: 46, textAlign: 'center', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', color: '#222' },

    carryCell: { width: 46, height: 35, justifyContent: 'center', alignItems: 'center', marginHorizontal: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 4, backgroundColor: '#f9f9f9' },
    carryInput: { width: '100%', height: '100%', fontSize: 18, textAlign: 'center', color: '#888', padding: 0 },

    inputCell: { width: 46, height: 55, borderWidth: 2, borderColor: '#ccc', borderRadius: 8, marginHorizontal: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
    mainInput: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', color: '#007AFF', width: '100%', height: '100%', padding: 0 },

    correctFinalCell: { borderColor: '#28a745', backgroundColor: '#d4edda' },
    errorFinalCell: { borderColor: '#dc3545', backgroundColor: '#f8d7da' },

    buttonContainer: { marginTop: 25, width: '80%', borderRadius: 10, overflow: 'hidden' },
    result: { fontSize: 18, fontWeight: '700', marginTop: 15, textAlign: 'center' },
    correctText: { color: '#28a745' },
    errorText: { color: '#dc3545' },
    counterTextSmall: { fontSize: Math.max(12, screenWidth * 0.035), fontWeight: '400', color: '#555', textAlign: 'center', marginTop: 10 },
    iconsBottom: { position: 'absolute', bottom: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' },
    iconSame: { width: combinedIconSize, height: combinedIconSize, resizeMode: 'contain', marginHorizontal: 10 },
    counterTextIcons: { fontSize: Math.max(14, combinedIconSize * 0.28), marginHorizontal: 8, textAlign: 'center', color: '#333' }, // Zmieniono font na standardowy

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
});

export default WrittenMultiDigitMultiplicationTrainer;