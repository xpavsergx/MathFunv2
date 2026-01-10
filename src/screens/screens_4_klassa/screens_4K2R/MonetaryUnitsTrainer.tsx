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
    InteractionManager
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { awardXpAndCoins } from '../../../services/xpService';

const EXERCISE_ID = "monetaryUnitsTrainer_cl4";
const TASKS_LIMIT = 30;

const { width: screenWidth } = Dimensions.get('window');
const isSmallDevice = screenWidth < 380;
const combinedIconSize = screenWidth * 0.25; // ТОЧНО КАК В ЭТАЛОНЕ

// --- BRUDNOPIS ---
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

const MonetaryUnitsTrainer = () => {
    const [questionText, setQuestionText] = useState('');
    const [subQuestionText, setSubQuestionText] = useState('');
    const [correctAnswer, setCorrectAnswer] = useState('');
    const [hintText, setHintText] = useState('');
    const [userInput, setUserInput] = useState('');
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const [readyForNext, setReadyForNext] = useState(false);
    const [correctCount, setCorrectCount] = useState(0);
    const [wrongCount, setWrongCount] = useState(0);
    const [taskCount, setTaskCount] = useState(0);
    const [firstAttempt, setFirstAttempt] = useState(true);
    const [message, setMessage] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [showScratchpad, setShowScratchpad] = useState(false);
    const [showHint, setShowHint] = useState(false);
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);

    const backgroundColor = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const k1 = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
        const k2 = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
        nextTask();
        return () => { k1.remove(); k2.remove(); };
    }, []);

    const nextTask = () => {
        if (taskCount >= TASKS_LIMIT) {
            setMessage(`Gratulacje! 🎉 Ukończyłeś ${TASKS_LIMIT} zadań.`);
            setReadyForNext(false);
            return;
        }
        generateProblem();
        setUserInput('');
        setIsCorrect(null);
        setMessage('');
        setReadyForNext(false);
        setFirstAttempt(true);
        setShowHint(false);
        setIsProcessing(false);
        setTaskCount(prev => prev + 1);
        backgroundColor.setValue(0);
    };

    const generateProblem = () => {
        const typeRand = Math.random();
        let q = '', sub = '', ans = '', hint = '';

        if (typeRand < 0.25) {
            const zl = Math.floor(Math.random() * 15) + 1;
            const gr = [5, 20, 50, 80][Math.floor(Math.random() * 4)];
            q = "Ile to groszy?";
            sub = `${zl} zł ${gr} gr`;
            ans = (zl * 100 + gr).toString();
            hint = "Pamiętaj: 1 zł = 100 gr.";
        } else if (typeRand < 0.50) {
            const zl = Math.floor(Math.random() * 20) + 2;
            q = "Ile to złotych?";
            sub = `${zl * 100} gr`;
            ans = zl.toString();
            hint = "Podziel grosze przez 100, aby otrzymać złote.";
        } else if (typeRand < 0.75) {
            const qty = Math.floor(Math.random() * 4) + 2;
            const price = Math.floor(Math.random() * 5) + 2;
            q = `Ile zapłacisz za ${qty} sztuk?`;
            sub = `Cena za jedną: ${price} zł`;
            ans = (price * qty).toString();
            hint = "Pomnóż cenę przez liczbę przedmiotów.";
        } else {
            const nominal = [10, 20, 50, 100][Math.floor(Math.random() * 4)];
            const count = Math.floor(Math.random() * 5) + 2;
            q = "Jaka to kwota łączna?";
            sub = `${count} banknotów po ${nominal} zł`;
            ans = (nominal * count).toString();
            hint = "Pomnóż nominał przez liczbę banknotów.";
        }

        setQuestionText(q);
        setSubQuestionText(sub);
        setCorrectAnswer(ans);
        setHintText(hint);
    };

    const handleCheck = () => {
        Keyboard.dismiss();
        if (isProcessing) return;
        if (!userInput.trim()) return;

        const isOk = userInput.trim() === correctAnswer.trim();
        setIsCorrect(isOk);

        if (isOk) {
            Animated.timing(backgroundColor, { toValue: 1, duration: 500, useNativeDriver: false }).start();
            setCorrectCount(prev => prev + 1);
            setMessage('Świetnie! ✅');
            setReadyForNext(true);
            InteractionManager.runAfterInteractions(() => {
                awardXpAndCoins(5, 1);
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
            });
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
                setIsProcessing(true);
                setTimeout(() => {
                    setUserInput('');
                    setIsCorrect(null);
                    setIsProcessing(false);
                }, 1000);
                setFirstAttempt(false);
            } else {
                setMessage(`Prawidłowa odpowiedź: ${correctAnswer}`);
                setReadyForNext(true);
            }
            setWrongCount(prev => prev + 1);
        }
    };

    const bgInterpolation = backgroundColor.interpolate({
        inputRange: [-1, 0, 1],
        outputRange: ['rgba(255, 0, 0, 0.2)', 'rgba(255, 255, 255, 0)', 'rgba(0, 255, 0, 0.2)']
    });

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ flex: 1 }}>
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
                            <Text style={styles.hintTitle}>Podpowiedź:</Text>
                            <Text style={styles.hintText}>{hintText}</Text>
                        </View>
                    )}

                    <DrawingModal visible={showScratchpad} onClose={() => setShowScratchpad(false)} problemText={questionText} />

                    <ScrollView contentContainerStyle={styles.centerContent} keyboardShouldPersistTaps="handled">
                        <View style={styles.card}>
                            <View style={styles.overlayBackground} />
                            <Text style={styles.taskLabel}>JEDNOSTKI MONETARNE</Text>
                            <Text style={styles.questionMain}>{questionText}</Text>

                            <View style={styles.mainDisplayContainer}>
                                <Text style={styles.rangeText}>{subQuestionText}</Text>
                            </View>

                            <TextInput
                                style={isCorrect === true ? styles.correctFinal : (isCorrect === false ? styles.errorFinal : styles.finalInput)}
                                keyboardType="numeric"
                                value={userInput}
                                onChangeText={setUserInput}
                                placeholder="Wynik"
                                placeholderTextColor="#aaa"
                                editable={!readyForNext && !isProcessing}
                            />

                            <View style={styles.buttonContainer}>
                                <Button title={readyForNext ? 'Dalej' : 'Sprawdź'} onPress={readyForNext ? nextTask : handleCheck} color="#007AFF" />
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
    keyboardContainer: { flex: 1, justifyContent: 'center' },
    centerContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 20 },
    topButtons: { position: 'absolute', top: 40, right: 20, flexDirection: 'row', alignItems: 'center', zIndex: 10 },
    topBtnItem: { alignItems: 'center', marginLeft: 15 },
    iconTop: { width: 70, height: 70, resizeMode: 'contain', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3 },
    buttonLabel: { fontSize: 14, fontWeight: 'bold', color: '#007AFF', marginTop: 2, textShadowColor: 'rgba(255, 255, 255, 0.8)', textShadowRadius: 3 },
    hintBox: { position: 'absolute', top: 120, right: 20, padding: 15, backgroundColor: 'rgba(255,255,255,0.98)', borderRadius: 15, maxWidth: 260, zIndex: 11, elevation: 5, borderWidth: 1, borderColor: '#007AFF' },
    hintTitle: { fontSize: 16, fontWeight: 'bold', color: '#007AFF', marginBottom: 5, textAlign: 'center' },
    hintText: { fontSize: 14, color: '#333', textAlign: 'center' },
    card: { width: '95%', maxWidth: 480, borderRadius: 20, padding: 20, alignItems: 'center', marginTop: 20, alignSelf: 'center' },
    overlayBackground: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 20 },
    taskLabel: { fontSize: 18, fontWeight: '700', marginBottom: 15, color: '#007AFF', textAlign: 'center', textTransform: 'uppercase' },
    questionMain: { fontSize: 22, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 15 },
    mainDisplayContainer: { marginBottom: 20, alignItems: 'center' },
    rangeText: { fontSize: 32, fontWeight: 'bold', color: '#0056b3', textAlign: 'center' },
    finalInput: { width: 200, height: 60, borderWidth: 2, borderColor: '#ccc', borderRadius: 15, textAlign: 'center', fontSize: 28, backgroundColor: '#fafafa', color: '#333' },
    correctFinal: { width: 200, height: 60, borderWidth: 2, borderColor: '#28a745', borderRadius: 15, textAlign: 'center', fontSize: 28, backgroundColor: '#d4edda', color: '#155724' },
    errorFinal: { width: 200, height: 60, borderWidth: 2, borderColor: '#dc3545', borderRadius: 15, textAlign: 'center', fontSize: 28, backgroundColor: '#f8d7da', color: '#721c24' },
    buttonContainer: { marginTop: 25, width: '80%', borderRadius: 10, overflow: 'hidden' },
    result: { fontSize: 18, fontWeight: '700', marginTop: 15, textAlign: 'center' },
    correctText: { color: '#28a745' },
    errorText: { color: '#dc3545' },
    counterTextSmall: { fontSize: Math.max(12, screenWidth * 0.035), fontWeight: '400', color: '#555', textAlign: 'center', marginTop: 10 },

    // --- СЕКЦИЯ ИКОНОК (ОДИН В ОДИН ИЗ ЭТАЛОНА) ---
    iconsBottom: { position: 'absolute', bottom: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' },
    iconSame: { width: combinedIconSize, height: combinedIconSize, resizeMode: 'contain', marginHorizontal: 10 },
    counterTextIcons: { fontSize: Math.max(14, combinedIconSize * 0.28), marginHorizontal: 8, textAlign: 'center', color: '#333' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    drawingContainer: { width: '95%', height: '85%', backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden' },
    drawingHeader: { height: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, backgroundColor: '#f0f0f0' },
    drawingTitle: { fontSize: 18, fontWeight: 'bold' },
    headerButton: { padding: 5 },
    headerButtonText: { fontSize: 16, color: '#007AFF' },
    problemPreviewContainer: { backgroundColor: '#f9f9f9', padding: 10, alignItems: 'center', width: '100%' },
    problemPreviewLabel: { fontSize: 12, color: '#777', textTransform: 'uppercase' },
    problemPreviewTextSmall: { fontSize: 18, fontWeight: '600', color: '#007AFF', textAlign: 'center' },
    canvas: { flex: 1, backgroundColor: '#ffffff' },
});

export default MonetaryUnitsTrainer;