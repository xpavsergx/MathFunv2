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
    InteractionManager,
    useColorScheme
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';

import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { awardXpAndCoins } from '../../../services/xpService';

const EXERCISE_ID = "mentalMathLargeNumbers_cl4";
const TASKS_LIMIT = 50;

const { width: screenWidth } = Dimensions.get('window');
const combinedIconSize = screenWidth * 0.25;

const formatNumber = (num: number | string) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

// --- BRUDNOPIS COMPONENT ---
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
                        <Text style={styles.problemPreviewTextSmall}>{problemText}</Text>
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

const MentalMathLargeNumbers = () => {
    const navigation = useNavigation();
    const isDarkMode = useColorScheme() === 'dark';

    const theme = {
        bgOverlay: isDarkMode ? 'rgba(0, 0, 0, 0.7)' : 'transparent',
        topBtnText: isDarkMode ? '#FFFFFF' : '#007AFF',
        textMain: isDarkMode ? '#FFFFFF' : '#333333',
        textSub: isDarkMode ? '#CBD5E1' : '#555555',
        labelColor: isDarkMode ? '#94A3B8' : '#007AFF',
        cardOverlay: isDarkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255,255,255,0.85)',
        modalContent: isDarkMode ? '#1E293B' : '#fff',
        statsRow: isDarkMode ? '#0F172A' : '#f8f9fa',
        inputBg: isDarkMode ? '#334155' : '#fafafa',
        inputBorder: isDarkMode ? '#475569' : '#ccc',
        inputText: isDarkMode ? '#FFFFFF' : '#333',
        inputPlaceholder: isDarkMode ? '#94A3B8' : '#aaa',
        correctBg: isDarkMode ? 'rgba(21, 87, 36, 0.5)' : '#d4edda',
        correctBorder: isDarkMode ? '#4ADE80' : '#28a745',
        correctText: isDarkMode ? '#86EFAC' : '#155724',
        errorBg: isDarkMode ? 'rgba(114, 28, 36, 0.5)' : '#f8d7da',
        errorBorder: isDarkMode ? '#F87171' : '#dc3545',
        errorText: isDarkMode ? '#FCA5A5' : '#721c24',
        optionBtnBg: isDarkMode ? '#334155' : '#fff',
    };

    const [questionText, setQuestionText] = useState('');
    const [mainDisplay, setMainDisplay] = useState<React.ReactNode>(null);
    const [options, setOptions] = useState<string[]>([]);
    const [correctAnswer, setCorrectAnswer] = useState<string>('');
    const [hintText, setHintText] = useState('');
    const [userInput, setUserInput] = useState('');
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

    const [showMilestone, setShowMilestone] = useState(false);
    const [isFinished, setIsFinished] = useState(false);
    const [sessionCorrect, setSessionCorrect] = useState(0);

    const backgroundColor = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const k1 = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
        const k2 = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
        nextTask();
        return () => { k1.remove(); k2.remove(); };
    }, []);

    const nextTask = () => {
        if (taskCount >= TASKS_LIMIT) {
            setIsFinished(true);
            return;
        }
        if (taskCount > 0 && taskCount % 10 === 0 && !showMilestone && taskCount < TASKS_LIMIT) {
            setShowMilestone(true);
            return;
        }
        generateProblem();
        setUserInput('');
        setIsCorrect(null);
        setMessage('');
        setReadyForNext(false);
        setFirstAttempt(true);
        setShowHint(false);
        setTaskCount(prev => prev + 1);
        backgroundColor.setValue(0);
    };

    const handleRestart = () => {
        setIsFinished(false);
        setTaskCount(0);
        setCorrectCount(0);
        setWrongCount(0);
        setSessionCorrect(0);
        nextTask();
    };

    const generateProblem = () => {
        const typeRand = Math.random();
        let qText = '';
        let hint = '';
        let ans = '';
        let currentOptions: string[] = [];
        let display: React.ReactNode = null;

        if (typeRand < 0.20) {
            const unitsArr = ["tys.", "mln", "mld"];
            const selectedUnit = unitsArr[Math.floor(Math.random() * unitsArr.length)];
            const baseValue = [1, 10, 100, 150][Math.floor(Math.random() * 4)];
            const isMultiply = Math.random() > 0.5;
            const factor = isMultiply ? 10 : 100;
            qText = isMultiply ? `Zapisz cyframi liczbę ${factor} razy większą niż:` : `Zapisz cyframi liczbę ${factor} razy mniejszą niż:`;
            display = <Text style={[styles.rangeText, { color: theme.textMain }]}>{baseValue} {selectedUnit}</Text>;
            let numericValue = baseValue;
            if (selectedUnit === "tys.") numericValue *= 1000;
            if (selectedUnit === "mln") numericValue *= 1000000;
            if (selectedUnit === "mld") numericValue *= 1000000000;
            ans = (isMultiply ? numericValue * factor : numericValue / factor).toString();
            hint = isMultiply ? "Dopisz odpowiednią liczbę zer." : "Skreśl odpowiednią liczbę zer.";
        } else if (typeRand < 0.40) {
            const a = [11, 12, 13, 15, 21, 25, 80][Math.floor(Math.random() * 7)];
            const b = [2, 3, 4, 5, 9][Math.floor(Math.random() * 5)];
            const zerosA = [10, 100, 1000][Math.floor(Math.random() * 3)];
            const zerosB = [1, 10, 100][Math.floor(Math.random() * 3)];
            const valA = a * zerosA;
            const valB = b * zerosB;
            qText = "Oblicz iloczyn (pomnóż cyfry i dopisz zera):";
            display = <Text style={[styles.rangeText, { color: theme.textMain }]}>{formatNumber(valA)} · {formatNumber(valB)}</Text>;
            ans = (valA * valB).toString();
            hint = `Pomnóż ${a} · ${b}, a potem dopisz wszystkie zera z obu liczb.`;
        } else if (typeRand < 0.60) {
            const divisors = [20, 30, 40, 50, 700, 800, 4000];
            const div = divisors[Math.floor(Math.random() * divisors.length)];
            const baseRes = [12, 15, 20, 30, 40, 60][Math.floor(Math.random() * 6)];
            const num = div * baseRes;
            qText = "Oblicz iloraz (możesz skreślić zera):";
            display = <Text style={[styles.rangeText, { color: theme.textMain }]}>{formatNumber(num)} : {formatNumber(div)}</Text>;
            ans = baseRes.toString();
            hint = "Skreśl taką samą liczbę zer w obu liczbach przed dzieleniem.";
        } else if (typeRand < 0.80) {
            const base = Math.floor(Math.random() * 500) + 300;
            const mod1 = Math.floor(Math.random() * 50) + 10;
            const mod2 = mod1 + (Math.random() > 0.5 ? 10 : -10);
            const isAddition = Math.random() > 0.5;
            qText = "Wstaw znak bez obliczania:";
            display = (
                <View style={styles.comparisonRow}>
                    <Text style={[styles.bigNumberSmall, { color: theme.textMain }]}>{base} {isAddition ? '+' : '-'} {mod1}</Text>
                    <View style={[styles.placeholderBox, { borderColor: theme.labelColor }]}><Text style={[styles.placeholderText, { color: theme.labelColor }]}>?</Text></View>
                    <Text style={[styles.bigNumberSmall, { color: theme.textMain }]}>{base} {isAddition ? '+' : '-'} {mod2}</Text>
                </View>
            );
            if (isAddition) ans = mod1 > mod2 ? '>' : '<';
            else ans = mod1 > mod2 ? '<' : '>';
            currentOptions = ['<', '>', '='];
            hint = isAddition ? "Większy składnik daje większą sumę." : "Większa odejmowana liczba daje mniejszy wynik.";
        } else {
            const num = [570, 900, 1350, 2100, 10481][Math.floor(Math.random() * 5)];
            const diff = 200;
            const isMore = Math.random() > 0.5;
            qText = isMore ? `Liczba o ${diff} większa to:` : `Liczba o ${diff} mniejsza to:`;
            display = <Text style={[styles.rangeText, { color: theme.textMain }]}>{formatNumber(num)}</Text>;
            ans = (isMore ? num + diff : num - diff).toString();
            hint = `Wykonaj ${isMore ? 'dodawanie' : 'odejmowanie'}: ${num} ${isMore ? '+' : '-'} ${diff}.`;
        }
        setQuestionText(qText);
        setMainDisplay(display);
        setCorrectAnswer(ans);
        setOptions(currentOptions);
        setHintText(hint);
    };

    const handleCheck = (selectedOption?: string) => {
        const val = (selectedOption || userInput).trim();
        if (!val) {
            setMessage('Wpisz odpowiedź!');
            return;
        }

        const isOk = val === correctAnswer.trim();

        if (isOk) {
            setIsCorrect(true);
            Animated.timing(backgroundColor, { toValue: 1, duration: 500, useNativeDriver: false }).start();
            setCorrectCount(prev => prev + 1);
            setSessionCorrect(prev => prev + 1);
            setMessage('Świetnie! ✅');
            setReadyForNext(true);
            InteractionManager.runAfterInteractions(() => {
                awardXpAndCoins(5, 1);
                const currentUser = auth().currentUser;
                if (currentUser) {
                    firestore().collection('users').doc(currentUser.uid).collection('exerciseStats').doc(EXERCISE_ID)
                        .set({ totalCorrect: firestore.FieldValue.increment(1) }, { merge: true }).catch(console.error);
                }
            });
        } else {
            setIsCorrect(false);
            Animated.sequence([
                Animated.timing(backgroundColor, { toValue: -1, duration: 500, useNativeDriver: false }),
                Animated.timing(backgroundColor, { toValue: 0, duration: 500, useNativeDriver: false }),
            ]).start();

            if (firstAttempt) {
                setMessage('Błąd! Spróbuj jeszcze raz ✍️');
                if (options.length === 0) setUserInput('');
                setFirstAttempt(false);
            } else {
                setWrongCount(prev => prev + 1);
                setMessage(`Błąd! Poprawna odpowiedź: ${formatNumber(correctAnswer)}`);
                setReadyForNext(true);
                InteractionManager.runAfterInteractions(() => {
                    const currentUser = auth().currentUser;
                    if (currentUser) {
                        firestore().collection('users').doc(currentUser.uid).collection('exerciseStats').doc(EXERCISE_ID)
                            .set({ totalWrong: firestore.FieldValue.increment(1) }, { merge: true }).catch(console.error);
                    }
                });
            }
        }
    };

    const getValidationStyle = () => {
        const base = {
            backgroundColor: theme.inputBg,
            borderColor: theme.inputBorder,
            color: theme.inputText
        };
        if (isCorrect === null) return [styles.finalInput, base];
        if (isCorrect) return [styles.correctFinal, { backgroundColor: theme.correctBg, borderColor: theme.correctBorder, color: theme.correctText }];
        return [styles.errorFinal, { backgroundColor: theme.errorBg, borderColor: theme.errorBorder, color: theme.errorText }];
    };

    const bgInterpolation = backgroundColor.interpolate({
        inputRange: [-1, 0, 1],
        outputRange: ['rgba(255, 0, 0, 0.2)', 'rgba(255, 255, 255, 0)', 'rgba(0, 255, 0, 0.2)']
    });

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ flex: 1 }}>
                <StatusBar translucent backgroundColor="transparent" barStyle={isDarkMode ? "light-content" : "dark-content"} />
                <ImageBackground source={require('../../../assets/background.jpg')} style={StyleSheet.absoluteFillObject} resizeMode="cover">
                    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.bgOverlay }]} pointerEvents="none" />
                </ImageBackground>
                <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: bgInterpolation }]} pointerEvents="none" />

                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardContainer}>
                    {!isKeyboardVisible && (
                        <View style={styles.topButtons}>
                            <TouchableOpacity onPress={() => setShowScratchpad(true)} style={styles.topBtnItem}>
                                <Image source={require('../../../assets/pencil.png')} style={styles.iconTop} />
                                <Text style={[styles.buttonLabel, { color: theme.topBtnText }]}>Brudnopis</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setShowHint(!showHint)} style={styles.topBtnItem}>
                                <Image source={require('../../../assets/question.png')} style={styles.iconTop} />
                                <Text style={[styles.buttonLabel, { color: theme.topBtnText }]}>Pomoc</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {showHint && !isKeyboardVisible && (
                        <View style={[styles.hintBox, { backgroundColor: theme.modalContent, borderColor: theme.labelColor }]}>
                            <Text style={styles.hintTitle}>Podpowiedź:</Text>
                            <Text style={[styles.hintText, { color: theme.textMain }]}>{hintText}</Text>
                        </View>
                    )}

                    <DrawingModal visible={showScratchpad} onClose={() => setShowScratchpad(false)} problemText={questionText} />

                    <Modal visible={showMilestone} transparent={true} animationType="slide">
                        <View style={styles.modalOverlay}>
                            <View style={[styles.milestoneCard, { backgroundColor: theme.modalContent }]}>
                                <Text style={[styles.milestoneTitle, { color: theme.textMain }]}>Podsumowanie serii 📊</Text>
                                <View style={[styles.statsRow, { backgroundColor: theme.statsRow }]}>
                                    <Text style={[styles.statsText, { color: theme.textMain }]}>Poprawne: {sessionCorrect} / 10</Text>
                                    <Text style={[styles.statsText, { color: '#28a745', marginTop: 5 }]}>
                                        Skuteczność: {(sessionCorrect / 10 * 100).toFixed(0)}%
                                    </Text>
                                </View>
                                <View style={styles.milestoneButtons}>
                                    <TouchableOpacity
                                        style={[styles.mButton, { backgroundColor: '#28a745' }]}
                                        onPress={() => { setShowMilestone(false); setSessionCorrect(0); nextTask(); }}
                                    >
                                        <Text style={styles.mButtonText}>Kontynuuj</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.mButton, { backgroundColor: '#007AFF' }]}
                                        onPress={() => { setShowMilestone(false); navigation.goBack(); }}
                                    >
                                        <Text style={styles.mButtonText}>Inny temat</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>

                    <Modal visible={isFinished} transparent={true} animationType="fade">
                        <View style={styles.modalOverlay}>
                            <View style={[styles.milestoneCard, { backgroundColor: theme.modalContent }]}>
                                <Text style={[styles.milestoneTitle, { color: theme.textMain }]}>Gratulacje! 🏆</Text>
                                <Text style={[styles.suggestionText, { color: theme.textSub }]}>Ukończyłeś wszystkie zadania!</Text>
                                <View style={[styles.statsRow, { backgroundColor: theme.statsRow }]}>
                                    <Text style={[styles.statsText, { color: theme.textMain }]}>Wynik: {correctCount} / {TASKS_LIMIT}</Text>
                                </View>
                                <View style={styles.milestoneButtons}>
                                    <TouchableOpacity style={[styles.mButton, { backgroundColor: '#28a745' }]} onPress={handleRestart}>
                                        <Text style={styles.mButtonText}>Od nowa</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.mButton, { backgroundColor: '#dc3545' }]} onPress={() => { setIsFinished(false); navigation.goBack(); }}>
                                        <Text style={styles.mButtonText}>Wyjdź</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>

                    <ScrollView contentContainerStyle={styles.centerContent} keyboardShouldPersistTaps="handled">
                        <View style={styles.card}>
                            <View style={[styles.overlayBackground, { backgroundColor: theme.cardOverlay }]} />
                            <Text style={[styles.taskLabel, { color: theme.labelColor }]}>RACHUNKI PAMIĘCIOWE</Text>
                            <Text style={[styles.questionMain, { color: theme.textMain }]}>{questionText}</Text>

                            <View style={styles.mainDisplayContainer}>{mainDisplay}</View>

                            {options.length > 0 ? (
                                <View style={styles.optionsContainer}>
                                    {options.map((opt, idx) => {
                                        const isSelected = userInput === opt;
                                        return (
                                            <TouchableOpacity
                                                key={idx}
                                                onPress={() => !readyForNext && (setUserInput(opt), setIsCorrect(null))}
                                                style={[
                                                    styles.optionButton,
                                                    { backgroundColor: theme.optionBtnBg, borderColor: theme.labelColor },
                                                    isSelected && { backgroundColor: theme.labelColor },
                                                    readyForNext && opt === correctAnswer && { backgroundColor: theme.correctBorder, borderColor: theme.correctBorder },
                                                    isSelected && isCorrect === false && { backgroundColor: theme.errorBorder, borderColor: theme.errorBorder }
                                                ]}
                                                disabled={readyForNext}
                                            >
                                                <Text style={[styles.optionText, { color: isSelected ? '#fff' : theme.labelColor }]}>{opt}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            ) : (
                                <TextInput
                                    style={getValidationStyle()}
                                    keyboardType="numeric"
                                    value={userInput}
                                    onChangeText={(t) => { setUserInput(t); if(isCorrect === false) setIsCorrect(null); }}
                                    placeholder="Wynik"
                                    placeholderTextColor={theme.inputPlaceholder}
                                    editable={!readyForNext}
                                />
                            )}

                            <View style={styles.buttonContainer}>
                                <Button title={readyForNext ? 'Dalej' : 'Sprawdź'} onPress={readyForNext ? nextTask : () => handleCheck()} color="#007AFF" />
                            </View>

                            <Text style={[styles.counterTextSmall, { color: theme.textSub }]}>Zadanie: {taskCount} / {TASKS_LIMIT}</Text>
                            {message ? <Text style={[styles.result, isCorrect ? { color: theme.correctText } : { color: theme.errorText }]}>{message}</Text> : null}
                        </View>
                    </ScrollView>

                    {!isKeyboardVisible && (
                        <View style={styles.iconsBottom}>
                            <Image source={require('../../../assets/happy.png')} style={styles.iconSame} />
                            <Text style={[styles.counterTextIcons, { color: theme.textMain }]}>{correctCount}</Text>
                            <Image source={require('../../../assets/sad.png')} style={styles.iconSame} />
                            <Text style={[styles.counterTextIcons, { color: theme.textMain }]}>{wrongCount}</Text>
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
    topButtons: { position: 'absolute', top: 40, right: 20, flexDirection: 'row', zIndex: 10 },
    topBtnItem: { alignItems: 'center', marginLeft: 15 },
    iconTop: { width: 70, height: 70, resizeMode: 'contain', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3 },
    buttonLabel: { fontSize: 14, fontWeight: 'bold', marginTop: 2 },
    hintBox: { position: 'absolute', top: 120, right: 20, padding: 15, borderRadius: 15, maxWidth: 260, zIndex: 11, elevation: 5, borderWidth: 1 },
    hintTitle: { fontSize: 16, fontWeight: 'bold', color: '#007AFF', marginBottom: 5, textAlign: 'center' },
    hintText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
    card: { width: '95%', maxWidth: 480, borderRadius: 20, padding: 20, alignItems: 'center', alignSelf: 'center' },
    overlayBackground: { ...StyleSheet.absoluteFillObject, borderRadius: 20 },
    taskLabel: { fontSize: 18, fontWeight: '700', marginBottom: 15, textAlign: 'center', textTransform: 'uppercase' },
    questionMain: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 15 },
    mainDisplayContainer: { marginBottom: 20, alignItems: 'center' },
    rangeText: { fontSize: 32, fontWeight: 'bold', textAlign: 'center' },
    comparisonRow: { flexDirection: 'row', alignItems: 'center' },
    bigNumberSmall: { fontSize: 22, fontWeight: 'bold' },
    placeholderBox: { width: 45, height: 45, borderWidth: 2, marginHorizontal: 10, justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
    placeholderText: { fontSize: 24, fontWeight: 'bold' },
    finalInput: { width: 240, height: 60, borderWidth: 2, borderRadius: 15, textAlign: 'center', fontSize: 24 },
    correctFinal: { width: 240, height: 60, borderWidth: 2, borderRadius: 15, textAlign: 'center', fontSize: 24 },
    errorFinal: { width: 240, height: 60, borderWidth: 2, borderRadius: 15, textAlign: 'center', fontSize: 24 },
    optionsContainer: { width: '100%', flexDirection: 'row', justifyContent: 'center', marginVertical: 10 },
    optionButton: { width: 70, height: 70, marginHorizontal: 10, borderWidth: 2, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
    optionText: { fontSize: 28, fontWeight: 'bold' },
    buttonContainer: { marginTop: 25, width: '80%', borderRadius: 10, overflow: 'hidden' },
    result: { fontSize: 18, fontWeight: '700', marginTop: 15, textAlign: 'center' },
    counterTextSmall: { fontSize: 14, marginTop: 10 },
    iconsBottom: { position: 'absolute', bottom: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' },
    iconSame: { width: combinedIconSize, height: combinedIconSize, resizeMode: 'contain', marginHorizontal: 10 },
    counterTextIcons: { fontSize: Math.max(14, combinedIconSize * 0.28), fontWeight: 'bold' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    drawingContainer: { width: '95%', height: '85%', borderRadius: 20, overflow: 'hidden' },
    drawingHeader: { height: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15 },
    drawingTitle: { fontSize: 18, fontWeight: 'bold' },
    headerButton: { padding: 5 },
    headerButtonText: { fontSize: 16, color: '#007AFF' },
    problemPreviewContainer: { padding: 10, alignItems: 'center', borderBottomWidth: 1 },
    problemPreviewLabel: { fontSize: 12, color: '#777', textTransform: 'uppercase' },
    problemPreviewTextSmall: { fontSize: 18, fontWeight: '600', color: '#007AFF' },
    canvas: { flex: 1 },
    milestoneCard: { width: '90%', borderRadius: 20, padding: 25, alignItems: 'center', elevation: 10 },
    milestoneTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 15 },
    statsRow: { marginVertical: 10, alignItems: 'center', padding: 15, borderRadius: 15, width: '100%' },
    statsText: { fontSize: 18, fontWeight: 'bold' },
    suggestionText: { fontSize: 15, textAlign: 'center', marginVertical: 20 },
    milestoneButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
    mButton: { paddingVertical: 12, paddingHorizontal: 15, borderRadius: 12, width: '48%', alignItems: 'center' },
    mButtonText: { color: '#fff', fontWeight: 'bold' }
});

export default MentalMathLargeNumbers;