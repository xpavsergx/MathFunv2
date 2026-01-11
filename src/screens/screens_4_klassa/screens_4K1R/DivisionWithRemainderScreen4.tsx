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
    NativeSyntheticEvent,
    TextInputKeyPressEventData,
    useColorScheme
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { awardXpAndCoins } from '../../../services/xpService';

const EXERCISE_ID = "divisionWithRemainder";
const TASKS_LIMIT = 30;

const { width: screenWidth } = Dimensions.get('window');
const isSmallDevice = screenWidth < 380;

// --- BRUDNOPIS ---
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

    const onTouchEnd = () => {
        if (currentPath) { setPaths([...paths, currentPath]); setCurrentPath(''); }
    };

    return (
        <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={[styles.drawingContainer, { backgroundColor: theme.bg }]}>
                    <View style={[styles.drawingHeader, { backgroundColor: theme.headerBg, borderBottomColor: theme.border }]}>
                        <TouchableOpacity onPress={handleClear} style={styles.headerButton}>
                            <Text style={styles.headerButtonText}>🗑️ Wyczyść</Text>
                        </TouchableOpacity>
                        <Text style={[styles.drawingTitle, { color: theme.text }]}>Brudnopis</Text>
                        <TouchableOpacity onPress={onClose} style={styles.headerButton}>
                            <Text style={styles.headerButtonText}>❌ Zamknij</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={[styles.problemPreviewContainer, { backgroundColor: theme.previewBg, borderBottomColor: theme.border }]}>
                        <Text style={styles.problemPreviewLabel}>Zadanie:</Text>
                        <Text style={styles.problemPreviewTextSmall}>{problemText}</Text>
                    </View>
                    <View
                        style={[styles.canvas, { backgroundColor: theme.canvas }]}
                        onStartShouldSetResponder={() => true}
                        onMoveShouldSetResponder={() => true}
                        onResponderGrant={(evt) => { const { locationX, locationY } = evt.nativeEvent; setCurrentPath(`M${locationX},${locationY}`); }}
                        onResponderMove={onTouchMove}
                        onResponderRelease={onTouchEnd}
                    >
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

const DivisionWithRemainderScreen = () => {
    const navigation = useNavigation();
    const isDarkMode = useColorScheme() === 'dark';

    const theme = {
        bgImage: require('../../../assets/background.jpg'),
        bgOverlay: isDarkMode ? 'rgba(0, 0, 0, 0.7)' : 'transparent',

        // ✅ ИСПРАВЛЕНО: Цвет текста кнопок сверху (без тени)
        topBtnText: isDarkMode ? '#FFFFFF' : '#007AFF',

        textMain: isDarkMode ? '#FFFFFF' : '#333333',
        textSub: isDarkMode ? '#CBD5E1' : '#555555',
        labelColor: isDarkMode ? '#94A3B8' : '#888888',
        rTextColor: isDarkMode ? '#FFFFFF' : '#555555',

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
    };

    const quotientInputRef = useRef<TextInput>(null);
    const remainderInputRef = useRef<TextInput>(null);
    const [dividend, setDividend] = useState<number>(0);
    const [divisor, setDivisor] = useState<number>(0);
    const [quotient, setQuotient] = useState<string>('');
    const [remainder, setRemainder] = useState<string>('');
    const [correctQuotientInput, setCorrectQuotientInput] = useState<boolean | null>(null);
    const [correctRemainderInput, setCorrectRemainderInput] = useState<boolean | null>(null);
    const [readyForNext, setReadyForNext] = useState<boolean>(false);
    const [correctCount, setCorrectCount] = useState<number>(0);
    const [wrongCount, setWrongCount] = useState<number>(0);
    const [taskCount, setTaskCount] = useState<number>(0);
    const [firstAttempt, setFirstAttempt] = useState<boolean>(true);
    const [showMilestone, setShowMilestone] = useState(false);
    const [isFinished, setIsFinished] = useState(false);
    const [sessionCorrect, setSessionCorrect] = useState(0);
    const [message, setMessage] = useState('');
    const [showScratchpad, setShowScratchpad] = useState(false);
    const [showHint, setShowHint] = useState(false);
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);
    const backgroundColor = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const k1 = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
        const k2 = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
        generateNewTask();
        return () => { k1.remove(); k2.remove(); };
    }, []);

    const generateNewTask = () => {
        const newDivisor = Math.floor(Math.random() * 9) + 2;
        const newDividend = Math.floor(Math.random() * 91) + 10;
        setDividend(newDividend);
        setDivisor(newDivisor);
        setQuotient('');
        setRemainder('');
        setMessage('');
        setReadyForNext(false);
        setFirstAttempt(true);
        setCorrectQuotientInput(null);
        setCorrectRemainderInput(null);
        setShowHint(false);
        setTaskCount(prev => prev + 1);
        backgroundColor.setValue(0);
    };

    const nextTask = () => {
        if (taskCount >= TASKS_LIMIT) {
            setIsFinished(true);
            return;
        }
        if (taskCount > 0 && taskCount % 10 === 0 && !showMilestone) {
            setShowMilestone(true);
            return;
        }
        generateNewTask();
    };

    const handleContinueMilestone = () => {
        setShowMilestone(false);
        setSessionCorrect(0);
        generateNewTask();
    };

    const handleRestart = () => {
        setIsFinished(false);
        setShowMilestone(false);
        setCorrectCount(0);
        setWrongCount(0);
        setSessionCorrect(0);
        setTaskCount(0);
        generateNewTask();
    };

    const toggleScratchpad = () => setShowScratchpad(prev => !prev);
    const toggleHint = () => setShowHint(prev => !prev);
    const getHintText = () => `${dividend} = ${divisor} × ? + reszta`;

    const handleCheck = () => {
        Keyboard.dismiss();
        requestAnimationFrame(() => {
            if (quotient === '' || remainder === '') {
                setMessage('Wpisz wynik i resztę!');
                return;
            }
            const numQuotient = Number(quotient);
            const numRemainder = Number(remainder);
            const correctQuotient = Math.floor(dividend / divisor);
            const correctRemainder = dividend % divisor;
            const isQuotientCorrect = numQuotient === correctQuotient;
            const isRemainderCorrect = numRemainder === correctRemainder;
            const isCorrect = isQuotientCorrect && isRemainderCorrect;

            setCorrectQuotientInput(isQuotientCorrect);
            setCorrectRemainderInput(isRemainderCorrect);

            if (isCorrect) {
                Animated.timing(backgroundColor, { toValue: 1, duration: 500, useNativeDriver: false }).start();
                setCorrectCount(prev => prev + 1);
                setSessionCorrect(prev => prev + 1);
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
                    if (!isQuotientCorrect) setQuotient('');
                    if (!isRemainderCorrect) setRemainder('');
                    setFirstAttempt(false);
                } else {
                    setMessage(`Błąd! Poprawne: ${correctQuotient} r ${correctRemainder}`);
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

    const handleKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>, currentField: 'quotient' | 'remainder') => {
        if (e.nativeEvent.key === 'ArrowRight' && currentField === 'quotient') {
            remainderInputRef.current?.focus();
        }
        if (e.nativeEvent.key === 'ArrowLeft' && currentField === 'remainder') {
            quotientInputRef.current?.focus();
        }
    };

    const getValidationStyle = (field: 'quotient' | 'remainder') => {
        const isCorrect = field === 'quotient' ? correctQuotientInput : correctRemainderInput;
        const baseStyle = {
            backgroundColor: theme.inputBg,
            borderColor: theme.inputBorder,
            color: theme.inputText
        };
        if (isCorrect === null) return [styles.input, baseStyle];
        return isCorrect
            ? [styles.correctFinal, { backgroundColor: theme.correctBg, borderColor: theme.correctBorder, color: theme.correctText }]
            : [styles.errorFinal, { backgroundColor: theme.errorBg, borderColor: theme.errorBorder, color: theme.errorText }];
    };

    const bgInterpolation = backgroundColor.interpolate({
        inputRange: [-1, 0, 1],
        outputRange: ['rgba(255, 0, 0, 0.2)', 'rgba(255, 255, 255, 0)', 'rgba(0, 255, 0, 0.2)']
    });

    const problemString = `${dividend} : ${divisor}`;

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
                                {/* ✅ ИСПРАВЛЕНО: Теперь цвет задается динамически, без теней */}
                                <Text style={[styles.buttonLabel, { color: theme.topBtnText }]}>Brudnopis</Text>
                            </TouchableOpacity>

                            <View style={styles.topBtnItem}>
                                <TouchableOpacity onPress={toggleHint}>
                                    <Image source={require('../../../assets/question.png')} style={styles.iconTop} />
                                </TouchableOpacity>
                                {/* ✅ ИСПРАВЛЕНО */}
                                <Text style={[styles.buttonLabel, { color: theme.topBtnText }]}>Pomoc</Text>
                            </View>
                        </View>
                    )}

                    {showHint && !isKeyboardVisible && (
                        <View style={[styles.hintBox, { backgroundColor: theme.modalContent, borderColor: '#007AFF' }]}>
                            <Text style={styles.hintTitle}>Podpowiedź:</Text>
                            <Text style={[styles.hintText, { color: theme.textMain }]}>{getHintText()}</Text>
                        </View>
                    )}

                    <DrawingModal visible={showScratchpad} onClose={toggleScratchpad} problemText={problemString} />

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
                                <Text style={[styles.suggestionText, { color: theme.textSub }]}>
                                    {sessionCorrect >= 8 ? "Rewelacyjnie! Jesteś mistrzem!" : "Trenuj dalej, aby być jeszcze lepszym."}
                                </Text>
                                <View style={styles.milestoneButtons}>
                                    <TouchableOpacity style={[styles.mButton, { backgroundColor: '#28a745' }]} onPress={handleContinueMilestone}>
                                        <Text style={styles.mButtonText}>Kontynuuj</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.mButton, { backgroundColor: '#007AFF' }]} onPress={() => { setShowMilestone(false); navigation.goBack(); }}>
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
                                    <Text style={[styles.statsText, { color: theme.textMain }]}>Wynik końcowy:</Text>
                                    <Text style={[styles.statsText, { fontSize: 24, color: '#28a745', marginTop: 5 }]}>
                                        {correctCount} / {TASKS_LIMIT}
                                    </Text>
                                </View>
                                <View style={styles.milestoneButtons}>
                                    <TouchableOpacity style={[styles.mButton, { backgroundColor: '#28a745' }]} onPress={handleRestart}>
                                        <Text style={styles.mButtonText}>Zagraj jeszcze raz</Text>
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

                            <Text style={styles.taskLabel}>Trener Dzielenia z resztą</Text>
                            <Text style={[styles.taskTextMain, { color: theme.textMain }]}>{problemString} = ?</Text>

                            <Text style={[styles.subTitle, { color: theme.textSub }]}>Wpisz wynik i resztę</Text>

                            <View style={styles.mathContainer}>
                                <View style={styles.inputGroup}>
                                    <TextInput
                                        ref={quotientInputRef}
                                        style={getValidationStyle('quotient')}
                                        keyboardType="numeric"
                                        value={quotient}
                                        onChangeText={setQuotient}
                                        placeholder="wynik"
                                        placeholderTextColor={theme.inputPlaceholder}
                                        editable={!readyForNext}
                                        blurOnSubmit={false}
                                        returnKeyType="next"
                                        onSubmitEditing={() => remainderInputRef.current?.focus()}
                                        onKeyPress={(e) => handleKeyPress(e, 'quotient')}
                                    />
                                    <Text style={[styles.labelBottom, { color: theme.labelColor }]}>wynik</Text>
                                </View>

                                <Text style={[styles.rText, { color: theme.rTextColor }]}>r</Text>

                                <View style={styles.inputGroup}>
                                    <TextInput
                                        ref={remainderInputRef}
                                        style={getValidationStyle('remainder')}
                                        keyboardType="numeric"
                                        value={remainder}
                                        onChangeText={setRemainder}
                                        placeholder="reszta"
                                        placeholderTextColor={theme.inputPlaceholder}
                                        editable={!readyForNext}
                                        blurOnSubmit={true}
                                        returnKeyType="done"
                                        onSubmitEditing={handleCheck}
                                        onKeyPress={(e) => handleKeyPress(e, 'remainder')}
                                    />
                                    <Text style={[styles.labelBottom, { color: theme.labelColor }]}>reszta</Text>
                                </View>
                            </View>

                            <View style={styles.buttonContainer}>
                                <Button title={readyForNext ? 'Dalej' : 'Sprawdź'} onPress={readyForNext ? nextTask : handleCheck} color="#007AFF" />
                            </View>

                            <Text style={[styles.counterTextSmall, { color: theme.textSub }]}>
                                Zadanie: {taskCount > TASKS_LIMIT ? TASKS_LIMIT : taskCount} / {TASKS_LIMIT}
                            </Text>

                            {message ? (
                                <Text style={[
                                    styles.result,
                                    message.includes('Świetnie') ? { color: theme.correctText } : { color: theme.errorText }
                                ]}>
                                    {message}
                                </Text>
                            ) : null}
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

// Styles
const iconSize = screenWidth * 0.25;
const inputWidth = isSmallDevice ? screenWidth * 0.35 : 120;
const inputFontSize = 22;

const styles = StyleSheet.create({
    keyboardContainer: { flex: 1, justifyContent: 'center' },
    centerContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 20 },

    topButtons: { position: 'absolute', top: 40, right: 20, flexDirection: 'row', alignItems: 'center', zIndex: 10 },
    topBtnItem: { alignItems: 'center', marginLeft: 15 },
    iconTop: { width: 70, height: 70, resizeMode: 'contain', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3 },

    // ✅ ИСПРАВЛЕНО: Убрана тень и фиксированный цвет
    buttonLabel: { fontSize: 14, fontWeight: 'bold', marginTop: 2 },

    hintBox: {
        position: 'absolute', top: 120, right: 20, padding: 15, borderRadius: 15, maxWidth: 260, zIndex: 11, elevation: 5, borderWidth: 1
    },
    hintTitle: { fontSize: 16, fontWeight: 'bold', color: '#007AFF', marginBottom: 5, textAlign: 'center' },
    hintText: { fontSize: 16, lineHeight: 22, textAlign: 'center' },

    card: { width: '95%', maxWidth: 480, borderRadius: 20, padding: 20, alignItems: 'center', marginTop: 20, alignSelf: 'center' },
    overlayBackground: { ...StyleSheet.absoluteFillObject, borderRadius: 20 },

    taskLabel: { fontSize: 18, fontWeight: '700', marginBottom: 5, color: '#007AFF', textAlign: 'center', textTransform: 'uppercase' },
    taskTextMain: { fontSize: isSmallDevice ? 32 : 40, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
    subTitle: { fontSize: 16, marginBottom: 20, textAlign: 'center' },

    mathContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20, width: '100%' },
    inputGroup: { alignItems: 'center' },
    rText: { fontSize: 24, fontWeight: 'bold', marginHorizontal: 10, marginTop: -20 },
    labelBottom: { fontSize: 12, marginTop: 4 },

    input: { width: inputWidth, height: 56, borderWidth: 2, borderRadius: 10, textAlign: 'center', fontSize: inputFontSize },
    correctFinal: { width: inputWidth, height: 56, borderWidth: 2, borderRadius: 10, textAlign: 'center', fontSize: inputFontSize },
    errorFinal: { width: inputWidth, height: 56, borderWidth: 2, borderRadius: 10, textAlign: 'center', fontSize: inputFontSize },

    buttonContainer: { marginTop: 10, width: '80%', borderRadius: 10, overflow: 'hidden' },
    result: { fontSize: 18, fontWeight: '700', marginTop: 20, textAlign: 'center' },

    counterTextSmall: { fontSize: Math.max(12, screenWidth * 0.035), fontWeight: '400', textAlign: 'center', marginTop: 10 },

    iconsBottom: { position: 'absolute', bottom: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' },
    iconSame: { width: iconSize, height: iconSize, resizeMode: 'contain', marginHorizontal: 10 },
    counterTextIcons: { fontSize: Math.max(14, iconSize * 0.28), marginHorizontal: 8, textAlign: 'center' },

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

export default DivisionWithRemainderScreen;