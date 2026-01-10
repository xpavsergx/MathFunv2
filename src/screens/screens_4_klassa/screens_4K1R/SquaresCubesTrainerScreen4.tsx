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
import { useNavigation } from '@react-navigation/native'; // DODANE

import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { awardXpAndCoins } from '../../../services/xpService';

const EXERCISE_ID = "squaresCubesTrainer";
const TASKS_LIMIT = 50;

const { width: screenWidth } = Dimensions.get('window');
const isSmallDevice = screenWidth < 380;

// --- KOMPONENT BRUDNOPISU ---
const DrawingModal = ({ visible, onClose, problemText }: { visible: boolean; onClose: () => void, problemText: string }) => {
    const [paths, setPaths] = useState<string[]>([]);
    const [currentPath, setCurrentPath] = useState('');

    const handleClear = () => { setPaths([]); setCurrentPath(''); };

    const onTouchMove = (evt: any) => {
        const { locationX, locationY } = evt.nativeEvent;
        if (!currentPath) setCurrentPath(`M${locationX},${locationY}`);
        else setCurrentPath(`${currentPath} L${locationX},${locationY}`);
    };

    const onTouchEnd = () => {
        if (currentPath) { setPaths([...paths, currentPath]); setCurrentPath(''); }
    };

    return (
        <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={styles.drawingContainer}>
                    <View style={styles.drawingHeader}>
                        <TouchableOpacity onPress={handleClear} style={styles.headerButton}>
                            <Text style={styles.headerButtonText}>🗑️ Wyczyść</Text>
                        </TouchableOpacity>
                        <Text style={styles.drawingTitle}>Brudnopis</Text>
                        <TouchableOpacity onPress={onClose} style={styles.headerButton}>
                            <Text style={styles.headerButtonText}>❌ Zamknij</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.problemPreviewContainer}>
                        <Text style={styles.problemPreviewLabel}>Zadanie:</Text>
                        <Text style={styles.problemPreviewTextSmall}>{problemText}</Text>
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

const SquaresCubesTrainerScreen4 = () => {
    const navigation = useNavigation(); // DODANE

    // --- STATE LOGIC ---
    const [baseNumber, setBaseNumber] = useState<number>(0);
    const [power, setPower] = useState<2 | 3>(2);
    const [answer, setAnswer] = useState<string>('');

    // --- STATE UI & VALIDATION ---
    const [correctInput, setCorrectInput] = useState<boolean | null>(null);
    const [readyForNext, setReadyForNext] = useState<boolean>(false);
    const [correctCount, setCorrectCount] = useState<number>(0);
    const [wrongCount, setWrongCount] = useState<number>(0);
    const [taskCount, setTaskCount] = useState<number>(0);
    const [firstAttempt, setFirstAttempt] = useState<boolean>(true);

    // --- NOWE STANY DLA RAPORTU ---
    const [showMilestone, setShowMilestone] = useState(false);
    const [sessionCorrect, setSessionCorrect] = useState(0);

    const [message, setMessage] = useState('');
    const [showScratchpad, setShowScratchpad] = useState(false);
    const [showHint, setShowHint] = useState(false);
    const [hintText, setHintText] = useState('');
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);

    const backgroundColor = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const k1 = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
        const k2 = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
        nextTask();
        return () => { k1.remove(); k2.remove(); };
    }, []);

    const nextTask = () => {
        // Blokada raportu co 10 zadań
        if (taskCount > 0 && taskCount % 10 === 0 && !showMilestone) {
            setShowMilestone(true);
            return;
        }

        if (taskCount >= TASKS_LIMIT) {
            setMessage(`Gratulacje! 🎉 Ukończyłeś ${TASKS_LIMIT} zadań.`);
            setReadyForNext(false);
            return;
        }

        const newPower: 2 | 3 = Math.random() > 0.5 ? 2 : 3;
        const newBase = newPower === 2
            ? Math.floor(Math.random() * 20) + 1
            : Math.floor(Math.random() * 5) + 1;

        setBaseNumber(newBase);
        setPower(newPower);

        let hint = "";
        if (newPower === 2) hint = `${newBase} · ${newBase}`;
        else hint = `${newBase} · ${newBase} · ${newBase}`;
        setHintText(hint);

        setAnswer('');
        setMessage('');
        setReadyForNext(false);
        setFirstAttempt(true);
        setCorrectInput(null);
        setShowHint(false);
        setTaskCount(prev => prev + 1);
        backgroundColor.setValue(0);
    };

    const toggleScratchpad = () => setShowScratchpad(prev => !prev);
    const toggleHint = () => setShowHint(prev => !prev);

    const handleCheck = () => {
        Keyboard.dismiss();

        requestAnimationFrame(() => {
            if (!answer) {
                setMessage('Wpisz odpowiedź!');
                return;
            }

            const numAnswer = Number(answer.replace(',', '.'));
            const correctResult = Math.pow(baseNumber, power);
            const isCorrect = Math.abs(numAnswer - correctResult) < 1e-9;

            setCorrectInput(isCorrect);

            if (isCorrect) {
                Animated.timing(backgroundColor, { toValue: 1, duration: 500, useNativeDriver: false }).start();
                setCorrectCount(prev => prev + 1);
                setSessionCorrect(prev => prev + 1); // LICZNIK SERII
                setMessage('Świetnie! ✅');
                setReadyForNext(true);
                setShowHint(false);

                InteractionManager.runAfterInteractions(() => {
                    awardXpAndCoins(5, 1);
                    const currentUser = auth().currentUser;
                    if (currentUser) {
                        firestore().collection('users').doc(currentUser.uid).collection('exerciseStats').doc(EXERCISE_ID)
                            .set({ totalCorrect: firestore.FieldValue.increment(1) }, { merge: true }).catch(console.error);
                    }
                });
            } else {
                Animated.sequence([
                    Animated.timing(backgroundColor, { toValue: -1, duration: 700, useNativeDriver: false }),
                    Animated.timing(backgroundColor, { toValue: 0, duration: 500, useNativeDriver: false }),
                ]).start();

                if (firstAttempt) {
                    setMessage('Błąd! Spróbuj ponownie.');
                    setAnswer('');
                    setFirstAttempt(false);
                } else {
                    setMessage(`Błąd! Poprawnie: ${correctResult}`);
                    setReadyForNext(true);
                }

                setWrongCount(prev => prev + 1);
                InteractionManager.runAfterInteractions(() => {
                    const currentUser = auth().currentUser;
                    if (currentUser) {
                        firestore().collection('users').doc(currentUser.uid).collection('exerciseStats').doc(EXERCISE_ID)
                            .set({ totalWrong: firestore.FieldValue.increment(1) }, { merge: true }).catch(console.error);
                    }
                });
            }
        });
    };

    const getValidationStyle = () => {
        if (correctInput === null) return styles.input;
        return correctInput ? styles.correctFinal : styles.errorFinal;
    };

    const bgInterpolation = backgroundColor.interpolate({
        inputRange: [-1, 0, 1],
        outputRange: ['rgba(255, 0, 0, 0.2)', 'rgba(255, 255, 255, 0)', 'rgba(0, 255, 0, 0.2)']
    });

    const problemString = `${baseNumber}${power === 2 ? '²' : '³'}`;

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ flex: 1 }}>
                <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
                <ImageBackground source={require('../../../assets/background.jpg')} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: bgInterpolation }]} pointerEvents="none" />

                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardContainer}>

                    {!isKeyboardVisible && (
                        <View style={styles.topButtons}>
                            <TouchableOpacity onPress={toggleScratchpad} style={styles.topBtnItem}>
                                <Image source={require('../../../assets/pencil.png')} style={styles.iconTop} />
                                <Text style={styles.buttonLabel}>Brudnopis</Text>
                            </TouchableOpacity>

                            <View style={styles.topBtnItem}>
                                <TouchableOpacity onPress={toggleHint}>
                                    <Image source={require('../../../assets/question.png')} style={styles.iconTop} />
                                </TouchableOpacity>
                                <Text style={styles.buttonLabel}>Pomoc</Text>
                            </View>
                        </View>
                    )}

                    {showHint && !isKeyboardVisible && (
                        <View style={styles.hintBox}>
                            <Text style={styles.hintTitle}>Rozpisanie:</Text>
                            <Text style={styles.hintText}>{hintText}</Text>
                        </View>
                    )}

                    <DrawingModal visible={showScratchpad} onClose={toggleScratchpad} problemText={problemString} />

                    {/* MODAL RAPORTU CO 10 ZADAŃ */}
                    <Modal visible={showMilestone} transparent={true} animationType="slide">
                        <View style={styles.modalOverlay}>
                            <View style={styles.milestoneCard}>
                                <Text style={styles.milestoneTitle}>Podsumowanie serii 📊</Text>
                                <View style={styles.statsRow}>
                                    <Text style={styles.statsText}>Poprawne: {sessionCorrect} / 10</Text>
                                    <Text style={[styles.statsText, { color: '#28a745', marginTop: 5 }]}>
                                        Skuteczność: {(sessionCorrect / 10 * 100).toFixed(0)}%
                                    </Text>
                                </View>
                                <Text style={styles.suggestionText}>
                                    {sessionCorrect >= 8 ? "Rewelacyjnie! Jesteś mistrzem!" : "Trenuj dalej, aby być jeszcze lepszym."}
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
                                            navigation.goBack();
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

                            <Text style={styles.taskLabel}>TRENER: POTĘGI</Text>

                            <View style={styles.mathDisplay}>
                                <Text style={styles.baseText}>{baseNumber}</Text>
                                <Text style={styles.powerText}>{power}</Text>
                            </View>

                            <Text style={styles.subTitle}>Wpisz wynik</Text>

                            <TextInput
                                style={getValidationStyle()}
                                keyboardType="numeric"
                                value={answer}
                                onChangeText={setAnswer}
                                placeholder="wynik"
                                placeholderTextColor="#aaa"
                                editable={!readyForNext}
                            />

                            <View style={styles.buttonContainer}>
                                <Button title={readyForNext ? 'Dalej' : 'Sprawdź'} onPress={readyForNext ? nextTask : handleCheck} color="#007AFF" />
                            </View>

                            <Text style={styles.counterTextSmall}>
                                Zadanie: {taskCount > TASKS_LIMIT ? TASKS_LIMIT : taskCount} / {TASKS_LIMIT}
                            </Text>

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

// Styles
const iconSize = screenWidth * 0.25;
const inputWidth = isSmallDevice ? screenWidth * 0.5 : 220;
const inputFontSize = 22;

const styles = StyleSheet.create({
    keyboardContainer: { flex: 1, justifyContent: 'center' },
    centerContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 20 },

    // Top Buttons
    topButtons: { position: 'absolute', top: 40, right: 20, flexDirection: 'row', alignItems: 'center', zIndex: 10 },
    topBtnItem: { alignItems: 'center', marginLeft: 15 },
    iconTop: { width: 70, height: 70, resizeMode: 'contain', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3 },
    buttonLabel: { fontSize: 14, fontWeight: 'bold', color: '#007AFF', marginTop: 2, textShadowColor: 'rgba(255, 255, 255, 0.8)', textShadowRadius: 3 },

    // Hint Box
    hintBox: {
        position: 'absolute', top: 120, right: 20, padding: 15, backgroundColor: 'rgba(255,255,255,0.98)', borderRadius: 15, maxWidth: 260, zIndex: 11, elevation: 5, borderWidth: 1, borderColor: '#007AFF'
    },
    hintTitle: { fontSize: 16, fontWeight: 'bold', color: '#007AFF', marginBottom: 5, textAlign: 'center' },
    hintText: { fontSize: 16, color: '#333', lineHeight: 22, textAlign: 'center' },

    // Card
    card: { width: '95%', maxWidth: 480, borderRadius: 20, padding: 20, alignItems: 'center', marginTop: 20, alignSelf: 'center' },
    overlayBackground: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 20 },

    // Headings & Math Display
    taskLabel: { fontSize: 18, fontWeight: '700', marginBottom: 15, color: '#007AFF', textAlign: 'center', textTransform: 'uppercase' },

    mathDisplay: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', marginBottom: 15 },
    baseText: { fontSize: 50, fontWeight: 'bold', color: '#333' },
    powerText: { fontSize: 26, fontWeight: 'bold', color: '#333', marginTop: 6 },

    subTitle: { fontSize: 16, marginBottom: 20, color: '#555', textAlign: 'center' },

    // Inputs
    input: { width: inputWidth, height: 56, borderWidth: 2, borderColor: '#ccc', borderRadius: 10, textAlign: 'center', fontSize: inputFontSize, backgroundColor: '#fafafa', marginBottom: 15, color: '#333' },
    correctFinal: { width: inputWidth, height: 56, borderWidth: 2, borderColor: '#28a745', borderRadius: 10, textAlign: 'center', fontSize: inputFontSize, backgroundColor: '#d4edda', marginBottom: 15, color: '#155724' },
    errorFinal: { width: inputWidth, height: 56, borderWidth: 2, borderColor: '#dc3545', borderRadius: 10, textAlign: 'center', fontSize: inputFontSize, backgroundColor: '#f8d7da', marginBottom: 15, color: '#721c24' },

    buttonContainer: { marginTop: 10, width: '80%', borderRadius: 10, overflow: 'hidden' },
    result: { fontSize: 18, fontWeight: '700', marginTop: 20, textAlign: 'center' },
    correctText: { color: '#28a745' },
    errorText: { color: '#dc3545' },

    // Counter
    counterTextSmall: { fontSize: Math.max(12, screenWidth * 0.035), fontWeight: '400', color: '#555', textAlign: 'center', marginTop: 10 },

    // Bottom Icons
    iconsBottom: { position: 'absolute', bottom: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' },
    iconSame: { width: iconSize, height: iconSize, resizeMode: 'contain', marginHorizontal: 10 },
    counterTextIcons: { fontSize: Math.max(14, iconSize * 0.28), marginHorizontal: 8, textAlign: 'center', color: '#333' },

    // Modal
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

    // MILESTONE STYLES
    milestoneCard: { width: '90%', backgroundColor: '#fff', borderRadius: 20, padding: 25, alignItems: 'center', elevation: 10 },
    milestoneTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 15 },
    statsRow: { marginVertical: 10, alignItems: 'center', backgroundColor: '#f8f9fa', padding: 15, borderRadius: 15, width: '100%' },
    statsText: { fontSize: 18, color: '#333', fontWeight: 'bold' },
    suggestionText: { fontSize: 15, color: '#666', textAlign: 'center', marginVertical: 20, lineHeight: 22 },
    milestoneButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
    mButton: { paddingVertical: 12, paddingHorizontal: 15, borderRadius: 12, width: '48%', alignItems: 'center' },
    mButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 }
});

export default SquaresCubesTrainerScreen4;