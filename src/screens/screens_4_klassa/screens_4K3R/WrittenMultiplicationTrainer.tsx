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

const EXERCISE_ID = "WrittenMultiplicationTrainer";

const { width: screenWidth } = Dimensions.get('window');
const TASKS_LIMIT = 50;
const combinedIconSize = screenWidth * 0.25;

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
                            {paths.map((d, index) => (<Path key={index} d={d} stroke="#000" strokeWidth={3} fill="none" />))}
                            <Path d={currentPath} stroke="#000" strokeWidth={3} fill="none" />
                        </Svg>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const WrittenMultiplicationTrainer = () => {
    const [num1, setNum1] = useState<string>('');
    const [num2, setNum2] = useState<string>('');
    const [fullResult, setFullResult] = useState<number>(0);
    const [userDigits, setUserDigits] = useState<string[]>([]);
    const [carries, setCarries] = useState<string[]>([]);

    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const [readyForNext, setReadyForNext] = useState<boolean>(false);
    const [correctCount, setCorrectCount] = useState<number>(0);
    const [wrongCount, setWrongCount] = useState<number>(0);
    const [taskCount, setTaskCount] = useState<number>(0);
    const [firstAttempt, setFirstAttempt] = useState<boolean>(true);
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
        setMessage('');
        setIsCorrect(null);
        setReadyForNext(false);
        setFirstAttempt(true);
        backgroundColor.setValue(0);

        // Losowanie typu: 2x1, 3x1 lub 4x1
        const lengths = [2, 3, 3, 4];
        const l1 = lengths[Math.floor(Math.random() * lengths.length)];
        const n1 = Math.floor(Math.pow(10, l1-1) + Math.random() * (Math.pow(10, l1) - Math.pow(10, l1-1)));
        const n2 = Math.floor(2 + Math.random() * 8); // Liczba jednocyfrowa (2-9)

        const prod = n1 * n2;
        const prodStr = prod.toString();

        setNum1(n1.toString());
        setNum2(n2.toString());
        setFullResult(prod);

        // Przygotowanie komórek
        const displayLen = prodStr.length;
        setUserDigits(new Array(displayLen).fill(''));
        setCarries(new Array(displayLen).fill(''));

        setTimeout(() => {
            if (inputRefs.current[displayLen - 1]) {
                inputRefs.current[displayLen - 1]?.focus();
            }
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
            setMessage('Wpisz cały wynik!');
            return;
        }

        if (userRes === fullResult) {
            Animated.timing(backgroundColor, { toValue: 1, duration: 500, useNativeDriver: false }).start();
            setCorrectCount(c => c + 1);
            setMessage('Świetnie! ✅');
            setReadyForNext(true);
            setIsCorrect(true);
            InteractionManager.runAfterInteractions(() => awardXpAndCoins(5, 1));
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
                setUserDigits(new Array(userDigits.length).fill(''));
                setTimeout(() => inputRefs.current[userDigits.length - 1]?.focus(), 100);
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
        setTaskCount(t => t + 1);
        generateProblem();
    };

    const bgInterpolation = backgroundColor.interpolate({
        inputRange: [-1, 0, 1],
        outputRange: ['rgba(255,0,0,0.2)', 'rgba(255,255,255,0)', 'rgba(0,255,0,0.2)']
    });

    const displayLen = userDigits.length || 4;
    const n1Padded = num1.padStart(displayLen, ' ');
    const n2Padded = num2.padStart(displayLen, ' ');

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.container}>
                <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
                <ImageBackground source={require('../../../assets/background.jpg')} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: bgInterpolation }]} pointerEvents="none" />

                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardContainer}>
                    {!isKeyboardVisible && (
                        <View style={styles.topButtons}>
                            <TouchableOpacity onPress={() => setShowScratchpad(true)} style={styles.topBtnItem}>
                                <Image source={require('../../../assets/pencil.png')} style={styles.iconTop} />
                                <Text style={styles.buttonLabel}>Brudnopis</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setShowHint(!showHint)} style={styles.topBtnItem}>
                                <Image source={require('../../../assets/question.png')} style={styles.iconTop} />
                                <Text style={styles.buttonLabel}>Pomoc</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {showHint && !isKeyboardVisible && (
                        <View style={styles.hintBox}>
                            <Text style={styles.hintTitle}>Jak mnożyć?</Text>
                            <Text style={styles.hintText}>Mnożymy dolną cyfrę przez każdą cyfrę u góry (od prawej). Jedności zapisz na dole, a dziesiątki w małym okienku u góry.</Text>
                        </View>
                    )}

                    <DrawingModal visible={showScratchpad} onClose={() => setShowScratchpad(false)} problemText={`${num1} × ${num2}`} />

                    <ScrollView contentContainerStyle={styles.centerContent} keyboardShouldPersistTaps="handled">
                        <View style={styles.card}>
                            <View style={styles.overlayBackground} />
                            <Text style={styles.questionMain}>Mnożenie pisemne</Text>

                            <View style={styles.columnContainer}>
                                {/* Przeniesienia (Carries) */}
                                <View style={[styles.row, { marginBottom: 5 }]}>
                                    <View style={styles.opSpace} />
                                    {carries.map((c, i) => (
                                        <View key={`c-${i}`} style={styles.carryCell}>
                                            <TextInput
                                                style={styles.carryInput}
                                                keyboardType="numeric"
                                                maxLength={1}
                                                value={c}
                                                onChangeText={v => { const n = [...carries]; n[i]=v; setCarries(n); }}
                                                editable={!readyForNext}
                                            />
                                        </View>
                                    ))}
                                </View>

                                <View style={styles.numbersBox}>
                                    <View style={styles.row}>
                                        <View style={styles.opSpace} />
                                        {n1Padded.split('').map((d, i) => <Text key={`n1-${i}`} style={styles.digit}>{d}</Text>)}
                                    </View>
                                    <View style={styles.row}>
                                        <View style={styles.opSpace}><Text style={styles.digit}>×</Text></View>
                                        {n2Padded.split('').map((d, i) => <Text key={`n2-${i}`} style={styles.digit}>{d}</Text>)}
                                    </View>
                                </View>

                                {/* Wynik końcowy */}
                                <View style={styles.row}>
                                    <View style={styles.opSpace} />
                                    {userDigits.map((d, i) => (
                                        <View key={`ans-${i}`} style={[
                                            styles.inputCell,
                                            isCorrect === false && styles.errorFinalCell,
                                            isCorrect === true && styles.correctFinalCell
                                        ]}>
                                            <TextInput
                                                ref={(el) => { inputRefs.current[i] = el; }}
                                                style={styles.mainInput}
                                                keyboardType="numeric"
                                                maxLength={1}
                                                value={d}
                                                onChangeText={v => handleDigitChange(v, i)}
                                                editable={!readyForNext}
                                            />
                                        </View>
                                    ))}
                                </View>
                            </View>

                            <View style={styles.buttonContainer}>
                                <Button
                                    title={readyForNext ? 'Dalej' : 'Sprawdź'}
                                    onPress={readyForNext ? nextTask : handleCheck}
                                    color="#007AFF"
                                />
                            </View>

                            <Text style={styles.counterTextSmall}>Zadanie: {taskCount} / {TASKS_LIMIT}</Text>
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
    container: { flex: 1 },
    keyboardContainer: { flex: 1, justifyContent: 'center' },
    centerContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 20 },
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
    numbersBox: { borderBottomWidth: 3, borderBottomColor: '#333', paddingBottom: 5, marginBottom: 10 },
    row: { flexDirection: 'row', alignItems: 'center' },
    opSpace: { width: 40, alignItems: 'center' },
    carryCell: { width: 46, height: 35, justifyContent: 'center', alignItems: 'center', marginHorizontal: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 4, backgroundColor: '#f9f9f9' },
    carryInput: { width: '100%', height: '100%', fontSize: 18, textAlign: 'center', color: '#888', padding: 0 },
    digit: { fontSize: 34, fontWeight: 'bold', width: 46, textAlign: 'center', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', color: '#222' },
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
    counterTextIcons: { fontSize: Math.max(14, combinedIconSize * 0.28), marginHorizontal: 8, textAlign: 'center', color: '#333' },
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

export default WrittenMultiplicationTrainer;