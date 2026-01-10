import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TextInput, Button, Keyboard, ImageBackground,
    Animated, StatusBar, Image, Dimensions, TouchableOpacity, Modal,
    Platform, KeyboardAvoidingView, TouchableWithoutFeedback, ScrollView, InteractionManager
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native'; // Dodane dla nawigacji
import { awardXpAndCoins } from '../../../services/xpService';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

const EXERCISE_ID = "calendarTrainer_Final_v2";
const TASKS_LIMIT = 30;
const { width: screenWidth } = Dimensions.get('window');
const combinedIconSize = screenWidth * 0.25;

const daysOfWeek = ['poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota', 'niedziela'];
const monthsInfo = [
    { n: 'styczeń', d: 31 }, { n: 'luty', d: 28 }, { n: 'marzec', d: 31 },
    { n: 'kwiecień', d: 30 }, { n: 'maj', d: 31 }, { n: 'czerwiec', d: 30 },
    { n: 'lipiec', d: 31 }, { n: 'sierpień', d: 31 }, { n: 'wrzesień', d: 30 },
    { n: 'październik', d: 31 }, { n: 'listopad', d: 30 }, { n: 'grudzień', d: 31 }
];

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

const CalendarTrainer = () => {
    const navigation = useNavigation(); // Dodane
    const [questionText, setQuestionText] = useState('');
    const [subQuestionText, setSubQuestionText] = useState('');
    const [correctAnswer, setCorrectAnswer] = useState('');
    const [options, setOptions] = useState<string[]>([]);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [userInput, setUserInput] = useState('');
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const [readyForNext, setReadyForNext] = useState<boolean>(false);
    const [correctCount, setCorrectCount] = useState<number>(0);
    const [wrongCount, setWrongCount] = useState<number>(0);
    const [taskCount, setTaskCount] = useState<number>(0);
    const [firstAttempt, setFirstAttempt] = useState<boolean>(true);
    const [message, setMessage] = useState('');
    const [showScratchpad, setShowScratchpad] = useState(false);
    const [showHint, setShowHint] = useState(false);
    const [hintText, setHintText] = useState('');
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);
    const [isInputWrong, setIsInputWrong] = useState<boolean | null>(null);

    // Nowe stany raportu
    const [showMilestone, setShowMilestone] = useState(false);
    const [sessionCorrect, setSessionCorrect] = useState(0);

    const backgroundColor = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const k1 = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
        const k2 = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
        nextTask();
        return () => { k1.remove(); k2.remove(); };
    }, []);

    const generateProblem = () => {
        setMessage('');
        const typeRoll = Math.random();
        let q = ''; let sub = ''; let ans = ''; let hint = ''; let opts: string[] = [];

        if (typeRoll < 0.25) {
            const todayIdx = Math.floor(Math.random() * 7);
            const futureDays = (Math.floor(Math.random() * 3) + 1) * 7 + (Math.floor(Math.random() * 6) + 1);
            const targetIdx = (todayIdx + futureDays) % 7;
            ans = daysOfWeek[targetIdx];
            q = `Dzisiaj jest ${daysOfWeek[todayIdx]}.`;
            sub = `Jaki dzień tygodnia będzie za ${futureDays} dni?`;
            opts = [...daysOfWeek].sort(() => Math.random() - 0.5).slice(0, 4);
            if (!opts.includes(ans)) opts[0] = ans;
            opts.sort(() => Math.random() - 0.5);
            hint = "Tydzień ma 7 dni. Policz, ile pełnych tygodni minie.";
        }
        else if (typeRoll < 0.50) {
            if (Math.random() > 0.5) {
                const years = Math.floor(Math.random() * 4) + 1;
                const extraMonths = Math.floor(Math.random() * 11) + 1;
                ans = (years * 12 + extraMonths).toString();
                q = "Przelicz na miesiące:";
                sub = `${years} lat i ${extraMonths} miesięcy = ...`;
                hint = "1 rok to 12 miesięcy.";
            } else {
                const weeks = Math.floor(Math.random() * 5) + 1;
                const extraDays = Math.floor(Math.random() * 6) + 1;
                ans = (weeks * 7 + extraDays).toString();
                q = "Przelicz na dni:";
                sub = `${weeks} tygodni i ${extraDays} dni = ...`;
                hint = "1 tydzień to 7 dni.";
            }
        }
        else if (typeRoll < 0.75) {
            const year = Math.floor(Math.random() * 2024) + 1;
            const century = Math.ceil(year / 100);
            ans = century.toString();
            q = "Określ wiek (użyj liczb):";
            sub = `Rok ${year} to wiek...`;
            hint = "Pamiętaj: rok 100 to jeszcze 1 wiek, ale 101 to już 2 wiek.";
        }
        else {
            const monthObj = monthsInfo[Math.floor(Math.random() * 12)];
            ans = monthObj.d.toString();
            q = "Ile dni ma ten miesiąc?";
            sub = `Miesiąc: ${monthObj.n.toUpperCase()}`;
            opts = ['28', '30', '31'].sort(() => Math.random() - 0.5);
            if (!opts.includes(ans)) opts[0] = ans;
            opts.sort(() => Math.random() - 0.5);
            hint = "Styczeń(31), Luty(28/29), Marzec(31), Kwiecień(30)...";
        }

        setQuestionText(q); setSubQuestionText(sub); setCorrectAnswer(ans);
        setHintText(hint); setOptions(opts); setSelectedOption(null);
        setIsInputWrong(null); setUserInput('');
    };

    const handleCheck = (selectedVal?: string) => {
        const val = (selectedVal || userInput).trim().toLowerCase();
        if (selectedVal) setSelectedOption(selectedVal);
        if (!val) { setMessage('Wpisz odpowiedź!'); return; }

        const isOk = val === correctAnswer.toLowerCase();
        setIsInputWrong(!isOk);

        if (isOk) {
            Animated.timing(backgroundColor, { toValue: 1, duration: 500, useNativeDriver: false }).start();
            setCorrectCount(prev => prev + 1);
            setSessionCorrect(prev => prev + 1); // Licznik serii
            setMessage('Świetnie! ✅'); setReadyForNext(true);
            setIsCorrect(true);
            InteractionManager.runAfterInteractions(() => { awardXpAndCoins(5, 1);
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
            setIsCorrect(false);
            if (!selectedVal) setUserInput('');
            if (firstAttempt) { setMessage('Błąd. Spróbuj jeszcze raz.'); setFirstAttempt(false); }
            else { setMessage(`Poprawny wynik: ${correctAnswer}`); setReadyForNext(true); }
            setWrongCount(prev => prev + 1);
        }
    };

    const nextTask = () => {
        // Blokada raportu co 10 zadań
        if (taskCount > 0 && taskCount % 10 === 0 && !showMilestone) {
            setShowMilestone(true);
            return;
        }

        if (taskCount >= TASKS_LIMIT) { setMessage('Koniec! 🏆'); return; }
        generateProblem();
        setReadyForNext(false); setFirstAttempt(true); setShowHint(false); setTaskCount(prev => prev + 1);
        backgroundColor.setValue(0);
        setIsCorrect(null);
        setSelectedOption(null);
    };

    const bgInterpolation = backgroundColor.interpolate({ inputRange: [-1, 0, 1], outputRange: ['rgba(255,0,0,0.2)', 'rgba(255,255,255,0)', 'rgba(0,255,0,0.2)'] });

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ flex: 1 }}>
                <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
                <ImageBackground source={require('../../../assets/background.jpg')} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: bgInterpolation }]} pointerEvents="none" />
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardContainer}>
                    {!isKeyboardVisible && (
                        <View style={styles.topButtons}>
                            <TouchableOpacity onPress={() => setShowScratchpad(true)} style={styles.topBtnItem}><Image source={require('../../../assets/pencil.png')} style={styles.iconTop} /><Text style={styles.buttonLabel}>Brudnopis</Text></TouchableOpacity>
                            <TouchableOpacity onPress={() => setShowHint(!showHint)} style={styles.topBtnItem}><Image source={require('../../../assets/question.png')} style={styles.iconTop} /><Text style={styles.buttonLabel}>Pomoc</Text></TouchableOpacity>
                        </View>
                    )}
                    {showHint && !isKeyboardVisible && (
                        <View style={styles.hintBox}><Text style={styles.hintTitle}>Podpowiedź:</Text><Text style={styles.hintText}>{hintText}</Text></View>
                    )}
                    <DrawingModal visible={showScratchpad} onClose={() => setShowScratchpad(false)} problemText={subQuestionText} />

                    {/* MODAL MILESTONE */}
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
                                    <TouchableOpacity style={[styles.mButton, { backgroundColor: '#28a745' }]}
                                                      onPress={() => {
                                                          setShowMilestone(false);
                                                          setSessionCorrect(0);
                                                          nextTask();
                                                      }}>
                                        <Text style={styles.mButtonText}>Kontynuuj</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.mButton, { backgroundColor: '#007AFF' }]}
                                                      onPress={() => {
                                                          setShowMilestone(false);
                                                          navigation.goBack();
                                                      }}>
                                        <Text style={styles.mButtonText}>Inny temat</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>

                    <ScrollView contentContainerStyle={styles.centerContent} keyboardShouldPersistTaps="handled">
                        <View style={styles.card}>
                            <View style={styles.overlayBackground} />
                            <Text style={styles.questionMain}>{questionText}</Text>
                            <Text style={styles.subQuestion}>{subQuestionText}</Text>

                            {options.length > 0 ? (
                                <View style={styles.testContainer}>
                                    {options.map((opt, index) => {
                                        const isThisSelected = selectedOption === opt;
                                        const isCorrectOpt = opt === correctAnswer;
                                        const showGreen = (readyForNext && isCorrectOpt) || (isCorrect && isThisSelected && isCorrectOpt);
                                        const showRed = isInputWrong && isThisSelected;
                                        return (
                                            <TouchableOpacity key={index} style={[styles.testOption, showGreen && styles.testCorrect, showRed && styles.testError]} onPress={() => !readyForNext && handleCheck(opt)}>
                                                <Text style={[styles.testOptionText, (showGreen || showRed) && {color: '#fff'}]}>{opt}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            ) : (
                                <View style={{ width: '100%', alignItems: 'center' }}>
                                    <TextInput
                                        style={[styles.finalInput, isCorrect === true && styles.correctFinal, isInputWrong && styles.errorFinal]}
                                        keyboardType="numeric" value={userInput} onChangeText={setUserInput} editable={!readyForNext} placeholder="?"
                                    />
                                </View>
                            )}

                            {(options.length === 0 || readyForNext) && (
                                <View style={styles.buttonContainer}><Button title={readyForNext ? 'Dalej' : 'Sprawdź'} onPress={readyForNext ? nextTask : () => handleCheck()} color="#007AFF" /></View>
                            )}

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
    questionMain: { fontSize: 24, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 10 },
    subQuestion: { fontSize: 24, color: '#0056b3', textAlign: 'center', marginBottom: 20, fontWeight: 'bold' },
    testContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', width: '100%' },
    testOption: { width: '42%', margin: '2%', padding: 15, backgroundColor: '#fff', borderRadius: 15, borderWidth: 2, borderColor: '#007AFF', alignItems: 'center' },
    testCorrect: { borderColor: '#28a745', backgroundColor: '#28a745' },
    testError: { borderColor: '#dc3545', backgroundColor: '#dc3545' },
    testOptionText: { fontSize: 18, fontWeight: 'bold', color: '#007AFF', textAlign: 'center' },
    finalInput: { width: '80%', height: 60, borderWidth: 2, borderColor: '#ccc', borderRadius: 15, textAlign: 'center', fontSize: 24, backgroundColor: '#fafafa', marginTop: 10, color: '#333', fontWeight: 'bold' },
    correctFinal: { borderColor: '#28a745', backgroundColor: '#d4edda' },
    errorFinal: { borderColor: '#dc3545', backgroundColor: '#f8d7da' },
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

export default CalendarTrainer;