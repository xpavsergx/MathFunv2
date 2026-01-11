import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TextInput, Button, Keyboard, ImageBackground,
    Animated, StatusBar, Image, Dimensions, TouchableOpacity, Modal,
    Platform, KeyboardAvoidingView, TouchableWithoutFeedback, ScrollView, InteractionManager,
    useColorScheme // Добавлено
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';

import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { awardXpAndCoins } from '../../../services/xpService';

const EXERCISE_ID = "comparingNumbersTrainer_cl4";
const TASKS_LIMIT = 40;

const { width: screenWidth } = Dimensions.get('window');
const isSmallDevice = screenWidth < 380;
const combinedIconSize = screenWidth * 0.25;

const formatNumber = (num: number | string) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

// --- KOMPONENT BRUDNOPISU ---
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

const ComparingNumbersTrainer = () => {
    const navigation = useNavigation();
    const isDarkMode = useColorScheme() === 'dark';

    const theme = {
        bgImage: require('../../../assets/background.jpg'),
        bgOverlay: isDarkMode ? 'rgba(0, 0, 0, 0.7)' : 'transparent',
        topBtnText: isDarkMode ? '#FFFFFF' : '#007AFF',
        textMain: isDarkMode ? '#FFFFFF' : '#333333',
        textSub: isDarkMode ? '#CBD5E1' : '#555555',
        cardOverlay: isDarkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255,255,255,0.85)',
        modalContent: isDarkMode ? '#1E293B' : '#fff',
        statsRow: isDarkMode ? '#0F172A' : '#f8f9fa',
        inputBg: isDarkMode ? '#334155' : '#fafafa',
        inputBorder: isDarkMode ? '#475569' : '#ccc',
        inputText: isDarkMode ? '#FFFFFF' : '#333',
        placeholderColor: isDarkMode ? '#94A3B8' : '#aaa',
        correctBg: isDarkMode ? 'rgba(21, 87, 36, 0.5)' : '#d4edda',
        errorBg: isDarkMode ? 'rgba(114, 28, 36, 0.5)' : '#f8d7da',
    };

    const [taskType, setTaskType] = useState<'symbols' | 'findExtremum' | 'rangeInput' | 'symbols'>('symbols');
    const [questionText, setQuestionText] = useState('');
    const [mainDisplay, setMainDisplay] = useState<React.ReactNode>(null);
    const [options, setOptions] = useState<any[]>([]);
    const [correctAnswer, setCorrectAnswer] = useState<string | number>('');
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

    const getRandomNumber = (difficulty: number) => {
        if (difficulty === 1) return Math.floor(Math.random() * 900) + 100;
        if (difficulty === 2) return Math.floor(Math.random() * 9000) + 1000;
        if (difficulty === 3) return Math.floor(Math.random() * 900000) + 100000;
        return Math.floor(Math.random() * 900000000) + 1000000;
    };

    const nextTask = () => {
        if (taskCount >= TASKS_LIMIT) {
            setIsFinished(true);
            return;
        }

        if (taskCount > 0 && taskCount % 10 === 0 && !showMilestone && taskCount < TASKS_LIMIT) {
            setShowMilestone(true);
            return;
        }

        const rand = Math.random();
        let type: 'symbols' | 'findExtremum' | 'rangeInput' = 'symbols';
        if (rand < 0.45) type = 'symbols';
        else if (rand < 0.75) type = 'findExtremum';
        else type = 'rangeInput';

        setTaskType(type);
        generateProblem(type);
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

    const handleRestart = () => {
        setIsFinished(false);
        setTaskCount(0);
        setCorrectCount(0);
        setWrongCount(0);
        setSessionCorrect(0);
        nextTask();
    };

    const generateProblem = (type: string) => {
        const difficulty = Math.random() < 0.3 ? 1 : (Math.random() < 0.7 ? 2 : 3);
        if (type === 'symbols') {
            const baseNum = getRandomNumber(difficulty);
            let num1 = baseNum; let num2 = baseNum;
            const strategy = Math.random();
            if (strategy < 0.4) {
                const diff = Math.floor(Math.random() * 5) + 1;
                num2 = num1 + (Math.random() > 0.5 ? 1 : -1) * diff;
            } else if (strategy < 0.8) {
                const power = Math.pow(10, Math.floor(Math.random() * (num1.toString().length - 1)));
                num2 = num1 + (Math.random() > 0.5 ? 1 : -1) * power;
            } else { num2 = num1; }
            if (num2 < 0) num2 = Math.abs(num2);
            setQuestionText("Wstaw odpowiedni znak:");
            setMainDisplay(
                <View style={styles.comparisonRow}>
                    <Text style={[styles.bigNumber, {color: theme.textMain}]}>{formatNumber(num1)}</Text>
                    <View style={[styles.placeholderBox, {backgroundColor: theme.inputBg, borderColor: '#007AFF'}]}><Text style={styles.placeholderText}>?</Text></View>
                    <Text style={[styles.bigNumber, {color: theme.textMain}]}>{formatNumber(num2)}</Text>
                </View>
            );
            if (num1 > num2) setCorrectAnswer('>');
            else if (num1 < num2) setCorrectAnswer('<');
            else setCorrectAnswer('=');
            setOptions(['<', '=', '>']);
            setHintText("Sprawdź dokładnie cyfry od największego rzędu (lewej strony).");
        } else if (type === 'findExtremum') {
            const isFindMax = Math.random() > 0.5;
            const count = 3; let nums = [];
            const baseLen = getRandomNumber(difficulty).toString().length;
            const minVal = Math.pow(10, baseLen - 1);
            const maxVal = Math.pow(10, baseLen) - 1;
            const pivot = Math.floor(Math.random() * (maxVal - minVal)) + minVal;
            for(let i=0; i<count; i++) {
                const variance = Math.floor(pivot * 0.2);
                let n = pivot + Math.floor(Math.random() * variance) - (variance/2);
                if (n < minVal) n = minVal + Math.floor(Math.random() * 100);
                if (n > maxVal) n = maxVal - Math.floor(Math.random() * 100);
                nums.push(Math.floor(n));
            }
            nums = [...new Set(nums)];
            while(nums.length < 3) { nums.push(nums[0] + nums.length + 1); }
            const correctVal = isFindMax ? Math.max(...nums) : Math.min(...nums);
            setQuestionText(isFindMax ? "Wybierz NAJWIĘKSZĄ liczbę:" : "Wybierz NAJMNIEJSZĄ liczbę:");
            setMainDisplay(null);
            const shuffledNums = nums.sort(() => 0.5 - Math.random());
            setOptions(shuffledNums.map(n => n.toString()));
            setCorrectAnswer(correctVal.toString());
            setHintText("Wszystkie liczby mają tyle samo cyfr. Porównuj je od lewej strony.");
        } else {
            const start = getRandomNumber(difficulty);
            const gap = Math.floor(Math.random() * 2) + 2;
            const end = start + gap;
            const puzzleStyle = Math.random();
            if (puzzleStyle < 0.5) {
                setQuestionText("Wpisz liczbę pasującą do nierówności:");
                setMainDisplay(<Text style={[styles.rangeText, {color: isDarkMode ? '#60A5FA' : '#0056b3'}]}>{formatNumber(start)} {' < x < '} {formatNumber(end)}</Text>);
                setCorrectAnswer(`RANGE:${start + 1}:${end - 1}`);
                setHintText(`Liczba musi być większa od ${formatNumber(start)}, ale mniejsza od ${formatNumber(end)}.`);
            } else {
                setQuestionText("Jaka liczba jest o 1 większa?");
                setMainDisplay(<Text style={[styles.rangeText, {color: isDarkMode ? '#60A5FA' : '#0056b3'}]}>{formatNumber(start)} {' < ?'}</Text>);
                setCorrectAnswer((start + 1).toString());
                setHintText(`Dodaj 1 do liczby ${formatNumber(start)}.`);
            }
            setOptions([]);
        }
    };

    const handleCheck = () => {
        if (isProcessing) return;
        if (!userInput.trim()) { setMessage('Wybierz lub wpisz odpowiedź!'); return; }

        Keyboard.dismiss();
        let isOk = false;
        const correctStr = correctAnswer.toString();

        if (correctStr.startsWith('RANGE:')) {
            const parts = correctStr.split(':');
            const min = parseInt(parts[1]); const max = parseInt(parts[2]);
            const userNum = parseInt(userInput.replace(/\s/g, ''));
            if (!isNaN(userNum) && userNum >= min && userNum <= max) isOk = true;
        } else {
            isOk = userInput.trim() === correctStr;
        }

        setIsCorrect(isOk);
        if (isOk) {
            Animated.timing(backgroundColor, { toValue: 1, duration: 500, useNativeDriver: false }).start();
            setCorrectCount(prev => prev + 1);
            setSessionCorrect(prev => prev + 1);
            setMessage('Świetnie! ✅'); setReadyForNext(true); setShowHint(false);
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
                Animated.timing(backgroundColor, { toValue: -1, duration: 400, useNativeDriver: false }),
                Animated.timing(backgroundColor, { toValue: 0, duration: 400, useNativeDriver: false }),
            ]).start();

            if (firstAttempt) {
                setMessage('Błąd! Spróbuj jeszcze raz ✍️');
                setFirstAttempt(false);
                setIsProcessing(true);
                setTimeout(() => {
                    if (taskType !== 'symbols' && taskType !== 'findExtremum') setUserInput('');
                    setIsCorrect(null);
                    setIsProcessing(false);
                }, 1000);
            } else {
                setWrongCount(prev => prev + 1);
                if (correctStr.startsWith('RANGE:')) {
                    const parts = correctStr.split(':'); setMessage(`Przykładowa poprawna: ${formatNumber(parts[1])}`);
                } else {
                    const displayAns = ['<','>','='].includes(correctStr) ? correctStr : formatNumber(correctStr);
                    setMessage(`Błąd! Poprawna odpowiedź: ${displayAns}`);
                }
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

    const toggleScratchpad = () => setShowScratchpad(prev => !prev);
    const toggleHint = () => setShowHint(prev => !prev);

    const getFieldStyle = () => {
        const base = [styles.finalInput, {backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.inputText}];
        if (isCorrect === true) return [styles.correctFinal, {backgroundColor: theme.correctBg, borderColor: '#28a745'}];
        if (isCorrect === false) return [styles.errorFinal, {backgroundColor: theme.errorBg, borderColor: '#dc3545'}];
        return base;
    };

    const bgInterpolation = backgroundColor.interpolate({ inputRange: [-1, 0, 1], outputRange: ['rgba(255, 0, 0, 0.2)', 'rgba(255, 255, 255, 0)', 'rgba(0, 255, 0, 0.2)'] });

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ flex: 1 }}>
                <StatusBar translucent backgroundColor="transparent" barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
                <ImageBackground source={theme.bgImage} style={StyleSheet.absoluteFillObject} resizeMode="cover">
                    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.bgOverlay }]} pointerEvents="none" />
                </ImageBackground>
                <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: bgInterpolation }]} pointerEvents="none" />
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardContainer}>
                    {!isKeyboardVisible && (
                        <View style={styles.topButtons}>
                            <TouchableOpacity onPress={toggleScratchpad} style={styles.topBtnItem}>
                                <Image source={require('../../../assets/pencil.png')} style={styles.iconTop} />
                                <Text style={[styles.buttonLabel, {color: theme.topBtnText}]}>Brudnopis</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={toggleHint} style={styles.topBtnItem}>
                                <Image source={require('../../../assets/question.png')} style={styles.iconTop} />
                                <Text style={[styles.buttonLabel, {color: theme.topBtnText}]}>Pomoc</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                    {showHint && !isKeyboardVisible && (
                        <View style={[styles.hintBox, {backgroundColor: theme.modalContent, borderColor: '#007AFF'}]}>
                            <Text style={styles.hintTitle}>Podpowiedź:</Text>
                            <Text style={[styles.hintText, {color: theme.textMain}]}>{hintText}</Text>
                        </View>
                    )}
                    <DrawingModal visible={showScratchpad} onClose={toggleScratchpad} problemText={questionText} />

                    <Modal visible={showMilestone} transparent={true} animationType="slide">
                        <View style={styles.modalOverlay}>
                            <View style={[styles.milestoneCard, {backgroundColor: theme.modalContent}]}>
                                <Text style={[styles.milestoneTitle, {color: theme.textMain}]}>Podsumowanie serii 📊</Text>
                                <View style={[styles.statsRow, {backgroundColor: theme.statsRow}]}>
                                    <Text style={[styles.statsText, {color: theme.textMain}]}>Poprawne: {sessionCorrect} / 10</Text>
                                    <Text style={[styles.statsText, { color: '#28a745', marginTop: 5 }]}>Skuteczność: {(sessionCorrect / 10 * 100).toFixed(0)}%</Text>
                                </View>
                                <View style={styles.milestoneButtons}>
                                    <TouchableOpacity style={[styles.mButton, { backgroundColor: '#28a745' }]} onPress={() => { setShowMilestone(false); setSessionCorrect(0); nextTask(); }}><Text style={styles.mButtonText}>Kontynuuj</Text></TouchableOpacity>
                                    <TouchableOpacity style={[styles.mButton, { backgroundColor: '#007AFF' }]} onPress={() => { setShowMilestone(false); navigation.goBack(); }}><Text style={styles.mButtonText}>Inny temat</Text></TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>

                    <Modal visible={isFinished} transparent={true} animationType="fade">
                        <View style={styles.modalOverlay}>
                            <View style={[styles.milestoneCard, {backgroundColor: theme.modalContent}]}>
                                <Text style={[styles.milestoneTitle, {color: theme.textMain}]}>Gratulacje! 🏆</Text>
                                <Text style={[styles.suggestionText, {color: theme.textSub}]}>Ukończyłeś wszystkie zadania!</Text>
                                <View style={[styles.statsRow, {backgroundColor: theme.statsRow}]}>
                                    <Text style={[styles.statsText, {color: theme.textMain}]}>Wynik: {correctCount} / {TASKS_LIMIT}</Text>
                                </View>
                                <View style={styles.milestoneButtons}>
                                    <TouchableOpacity style={[styles.mButton, { backgroundColor: '#28a745' }]} onPress={handleRestart}><Text style={styles.mButtonText}>Od nowa</Text></TouchableOpacity>
                                    <TouchableOpacity style={[styles.mButton, { backgroundColor: '#dc3545' }]} onPress={() => { setIsFinished(false); navigation.goBack(); }}><Text style={styles.mButtonText}>Wyjdź</Text></TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>

                    <ScrollView contentContainerStyle={styles.centerContent} keyboardShouldPersistTaps="handled">
                        <View style={styles.card}>
                            <View style={[styles.overlayBackground, {backgroundColor: theme.cardOverlay}]} />
                            <Text style={styles.taskLabel}>PORÓWNYWANIE LICZB</Text>
                            <Text style={[styles.questionMain, {color: theme.textMain}]}>{questionText}</Text>
                            <View style={styles.mainDisplayContainer}>{mainDisplay}</View>

                            {options.length > 0 ? (
                                <View style={styles.optionsContainer}>
                                    {options.map((opt, idx) => {
                                        const isSelected = userInput === opt;
                                        const displayOpt = ['<','>','='].includes(opt) ? opt : formatNumber(opt);
                                        const isSymbol = ['<','>','='].includes(opt);
                                        return (
                                            <TouchableOpacity
                                                key={idx}
                                                onPress={() => !readyForNext && !isProcessing && (setUserInput(opt), setIsCorrect(null))}
                                                style={[
                                                    styles.optionButton,
                                                    isSymbol ? styles.symbolButton : styles.numberButton,
                                                    {backgroundColor: isDarkMode ? '#1E293B' : '#fff'},
                                                    isSelected && styles.optionButtonSelected,
                                                    (readyForNext && opt === correctAnswer.toString()) && styles.optionButtonCorrect,
                                                    isSelected && isCorrect === false && styles.optionButtonWrong
                                                ]}
                                                disabled={readyForNext || isProcessing}
                                            >
                                                <Text style={[
                                                    isSymbol ? styles.symbolText : styles.numberOptionText,
                                                    {color: isDarkMode ? '#FFF' : '#333'},
                                                    isSelected && { color: '#fff' }
                                                ]}>{displayOpt}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            ) : (
                                <TextInput
                                    style={getFieldStyle()}
                                    keyboardType="numeric"
                                    value={userInput}
                                    onChangeText={(t) => { setUserInput(t); if(isCorrect === false) setIsCorrect(null); }}
                                    placeholder="Wpisz liczbę"
                                    placeholderTextColor={theme.placeholderColor}
                                    editable={!readyForNext && !isProcessing}
                                />
                            )}

                            <View style={styles.buttonContainer}>
                                <Button title={readyForNext ? 'Dalej' : 'Sprawdź'} onPress={readyForNext ? nextTask : handleCheck} color={readyForNext ? "#28a745" : "#007AFF"} />
                            </View>

                            <Text style={[styles.counterTextSmall, {color: theme.textSub}]}>Zadanie: {taskCount} / {TASKS_LIMIT}</Text>
                            {message ? <Text style={[styles.result, isCorrect ? styles.correctText : styles.errorText]}>{message}</Text> : null}
                        </View>
                    </ScrollView>

                    {!isKeyboardVisible && (
                        <View style={styles.iconsBottom}>
                            <Image source={require('../../../assets/happy.png')} style={styles.iconSame} />
                            <Text style={[styles.counterTextIcons, {color: theme.textMain}]}>{correctCount}</Text>
                            <Image source={require('../../../assets/sad.png')} style={styles.iconSame} />
                            <Text style={[styles.counterTextIcons, {color: theme.textMain}]}>{wrongCount}</Text>
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
    iconTop: { width: 70, height: 70, resizeMode: 'contain' },
    buttonLabel: { fontSize: 14, fontWeight: 'bold', marginTop: 2 },
    hintBox: { position: 'absolute', top: 120, right: 20, padding: 15, borderRadius: 15, maxWidth: 260, zIndex: 11, elevation: 5, borderWidth: 1 },
    hintTitle: { fontSize: 16, fontWeight: 'bold', color: '#007AFF', marginBottom: 5, textAlign: 'center' },
    hintText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
    card: { width: '95%', maxWidth: 480, borderRadius: 20, padding: 20, alignItems: 'center', marginTop: 20, alignSelf: 'center' },
    overlayBackground: { ...StyleSheet.absoluteFillObject, borderRadius: 20 },
    taskLabel: { fontSize: 16, fontWeight: '700', marginBottom: 15, color: '#007AFF', textAlign: 'center', textTransform: 'uppercase' },
    questionMain: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 15 },
    mainDisplayContainer: { marginBottom: 20, alignItems: 'center' },
    comparisonRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' },
    bigNumber: { fontSize: isSmallDevice ? 24 : 30, fontWeight: 'bold', marginHorizontal: 5 },
    placeholderBox: { width: 45, height: 45, borderWidth: 2, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginHorizontal: 10 },
    placeholderText: { fontSize: 24, fontWeight: 'bold', color: '#007AFF' },
    rangeText: { fontSize: 26, fontWeight: 'bold', textAlign: 'center', letterSpacing: 1 },
    finalInput: { width: 200, height: 60, borderWidth: 2, borderRadius: 15, textAlign: 'center', fontSize: 28 },
    correctFinal: { width: 200, height: 60, borderWidth: 3, borderRadius: 15, textAlign: 'center', fontSize: 28, color: '#155724' },
    errorFinal: { width: 200, height: 60, borderWidth: 3, borderRadius: 15, textAlign: 'center', fontSize: 28, color: '#721c24' },
    optionsContainer: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginVertical: 10 },
    optionButton: { paddingVertical: 12, paddingHorizontal: 15, margin: 6, borderWidth: 2, borderColor: '#007AFF', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    symbolButton: { width: 65, height: 65 },
    numberButton: { minWidth: '42%' },
    optionButtonSelected: { backgroundColor: '#007AFF' },
    optionButtonCorrect: { backgroundColor: '#28a745', borderColor: '#28a745' },
    optionButtonWrong: { backgroundColor: '#dc3545', borderColor: '#dc3545' },
    symbolText: { fontSize: 30, fontWeight: 'bold' },
    numberOptionText: { fontSize: 18, fontWeight: 'bold' },
    buttonContainer: { marginTop: 20, width: '80%', borderRadius: 10, overflow: 'hidden' },
    result: { fontSize: 18, fontWeight: '700', marginTop: 15, textAlign: 'center' },
    correctText: { color: '#28a745' },
    errorText: { color: '#dc3545' },
    counterTextSmall: { fontSize: 14, textAlign: 'center', marginTop: 10 },
    iconsBottom: { position: 'absolute', bottom: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' },
    iconSame: { width: combinedIconSize, height: combinedIconSize, resizeMode: 'contain', marginHorizontal: 10 },
    counterTextIcons: { fontSize: 22, marginHorizontal: 8, fontWeight: 'bold' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    drawingContainer: { width: '95%', height: '85%', borderRadius: 20, overflow: 'hidden' },
    drawingHeader: { height: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, borderBottomWidth: 1 },
    drawingTitle: { fontSize: 18, fontWeight: 'bold' },
    headerButton: { padding: 5 },
    headerButtonText: { fontSize: 16, color: '#007AFF' },
    problemPreviewContainer: { padding: 10, alignItems: 'center', borderBottomWidth: 1, width: '100%' },
    problemPreviewLabel: { fontSize: 12, color: '#777', textTransform: 'uppercase', marginBottom: 4 },
    problemPreviewTextSmall: { fontSize: 16, fontWeight: '600', color: '#007AFF', textAlign: 'center' },
    canvas: { flex: 1 },
    milestoneCard: { width: '90%', borderRadius: 20, padding: 25, alignItems: 'center', elevation: 10 },
    milestoneTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 15 },
    statsRow: { marginVertical: 10, alignItems: 'center', padding: 15, borderRadius: 15, width: '100%' },
    statsText: { fontSize: 18, fontWeight: 'bold' },
    suggestionText: { fontSize: 15, textAlign: 'center', marginVertical: 20, lineHeight: 22 },
    milestoneButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
    mButton: { paddingVertical: 12, paddingHorizontal: 15, borderRadius: 12, width: '48%', alignItems: 'center' },
    mButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 }
});

export default ComparingNumbersTrainer;