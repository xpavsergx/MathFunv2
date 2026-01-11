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
    TextInputKeyPressEventData
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { awardXpAndCoins } from '../../../services/xpService';

const EXERCISE_ID = "combinedDecompositionTrainer";
const TASKS_LIMIT = 50;

const { width: screenWidth } = Dimensions.get('window');
const isSmallDevice = screenWidth < 380;

const combinedIconSize = screenWidth * 0.25;
const combinedInputSize = isSmallDevice ? 70 : 90;

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
                    <View
                        style={styles.canvas}
                        onStartShouldSetResponder={() => true}
                        onMoveShouldSetResponder={() => true}
                        onResponderGrant={(evt) => {
                            const { locationX, locationY } = evt.nativeEvent;
                            setCurrentPath(`M${locationX},${locationY}`);
                        }}
                        onResponderMove={onTouchMove}
                        onResponderRelease={onTouchEnd}
                    >
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

const CombinedDecompositionTrainer = () => {
    const navigation = useNavigation();

    // --- REFS ---
    const decomp1Ref = useRef<TextInput>(null);
    const decomp2Ref = useRef<TextInput>(null);
    const partial1Ref = useRef<TextInput>(null);
    const partial2Ref = useRef<TextInput>(null);
    const finalRef = useRef<TextInput>(null);

    // --- STATE ---
    const [mode, setMode] = useState<'multiplication' | 'division'>('multiplication');
    const [mainNumber, setMainNumber] = useState<number>(0);
    const [operand, setOperand] = useState<number>(0);

    const [decomp1, setDecomp1] = useState<string>('');
    const [decomp2, setDecomp2] = useState<string>('');
    const [partial1, setPartial1] = useState<string>('');
    const [partial2, setPartial2] = useState<string>('');
    const [final, setFinal] = useState<string>('');

    // --- STATE UI ---
    const [validation, setValidation] = useState({
        decomp1: null as boolean | null,
        decomp2: null as boolean | null,
        partial1: null as boolean | null,
        partial2: null as boolean | null,
        final: null as boolean | null,
    });

    const [readyForNext, setReadyForNext] = useState<boolean>(false);
    const [correctCount, setCorrectCount] = useState<number>(0);
    const [wrongCount, setWrongCount] = useState<number>(0);
    const [taskCount, setTaskCount] = useState<number>(0);

    // ZAMIAST firstAttempt, MAMY LICZNIK PRÓB (0 = pierwsza, 1 = druga/ostatnia)
    const [attemptsUsed, setAttemptsUsed] = useState<number>(0);

    // --- RAPORTY ---
    const [showMilestone, setShowMilestone] = useState(false);
    const [isFinished, setIsFinished] = useState(false);
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
        generateNewTask();
        return () => { k1.remove(); k2.remove(); };
    }, []);

    const generateNewTask = () => {
        const newMode = Math.random() > 0.5 ? 'multiplication' : 'division';
        setMode(newMode);

        let n = 0, o = 0;
        let hint = '';

        if (newMode === 'multiplication') {
            n = Math.floor(Math.random() * 89) + 11;
            o = Math.floor(Math.random() * 8) + 2;
            hint = `Rozłóż ${n} na dziesiątki (${Math.floor(n / 10) * 10}) i jedności (${n % 10}).`;
        } else {
            const d = Math.floor(Math.random() * 8) + 2;
            const q1 = Math.floor(Math.random() * 10) + 1;
            const q2 = Math.floor(Math.random() * 10) + 1;
            n = d * (q1 + q2);
            o = d;
            hint = `Znajdź dwie liczby, które sumują się do ${n} i dzielą się przez ${o} (np. ${d * q1} i ${d * q2}).`;
        }

        setMainNumber(n);
        setOperand(o);
        setHintText(hint);

        // Reset pól
        setDecomp1(''); setDecomp2('');
        setPartial1(''); setPartial2('');
        setFinal('');

        setValidation({ decomp1: null, decomp2: null, partial1: null, partial2: null, final: null });
        setMessage('');
        setReadyForNext(false);
        setAttemptsUsed(0); // Reset prób
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

    const handleCheck = () => {
        Keyboard.dismiss();

        // 1. BLOKADA PUSTEGO POLA - naprawa błędu
        // Sprawdzamy, czy wypełniono chociaż wynik końcowy LUB (w trybie dzielenia) pola rozkładu jeśli są używane
        const isFinalEmpty = final.trim() === '';

        // Możemy być bardziej rygorystyczni: jeśli którekolwiek aktywne pole jest puste
        // Ale dla uproszczenia sprawdźmy kluczowe:
        if (isFinalEmpty) {
            setMessage('Uzupełnij brakujące pola!');
            return; // PRZERYWAMY - nie liczymy tego jako próby
        }

        requestAnimationFrame(() => {
            const d1 = Number(decomp1);
            const d2 = Number(decomp2);
            const p1 = Number(partial1);
            const p2 = Number(partial2);
            const fin = Number(final);

            // Obiekt walidacji
            let valState = {
                decomp1: null as boolean | null,
                decomp2: null as boolean | null,
                partial1: null as boolean | null,
                partial2: null as boolean | null,
                final: false
            };

            let isFinalCorrect = false;

            // LOGIKA SPRAWDZANIA
            if (mode === 'multiplication') {
                const correctTens = Math.floor(mainNumber / 10) * 10;
                const correctOnes = mainNumber % 10;
                const correctFinal = mainNumber * operand;

                valState.final = (fin === correctFinal);
                isFinalCorrect = valState.final;

                if (decomp1.trim() !== '') valState.decomp1 = (d1 === correctTens);
                if (decomp2.trim() !== '') valState.decomp2 = (d2 === correctOnes);
                if (partial1.trim() !== '') valState.partial1 = (p1 === correctTens * operand);
                if (partial2.trim() !== '') valState.partial2 = (p2 === correctOnes * operand);

            } else {
                // Division
                const correctFinal = mainNumber / operand;
                valState.final = (fin === correctFinal);
                isFinalCorrect = valState.final;

                if (decomp1.trim() !== '' && decomp2.trim() !== '') {
                    const isValidDecomp = (d1 + d2 === mainNumber) && (d1 % operand === 0) && (d2 % operand === 0) && d1 > 0 && d2 > 0;
                    valState.decomp1 = isValidDecomp;
                    valState.decomp2 = isValidDecomp;

                    if (isValidDecomp) {
                        if (partial1.trim() !== '') valState.partial1 = (p1 === d1 / operand);
                        if (partial2.trim() !== '') valState.partial2 = (p2 === d2 / operand);
                    } else {
                        if (partial1.trim() !== '') valState.partial1 = false;
                        if (partial2.trim() !== '') valState.partial2 = false;
                    }
                } else if (decomp1.trim() !== '' || decomp2.trim() !== '') {
                    // Częściowo wypełnione - błąd
                    if (decomp1.trim() !== '') valState.decomp1 = false;
                    if (decomp2.trim() !== '') valState.decomp2 = false;
                }
            }

            const hasErrors = Object.values(valState).includes(false);
            const isSuccess = isFinalCorrect && !hasErrors;

            // 2. LOGIKA PRÓB (ATTEMPTS)
            if (isSuccess) {
                // SUKCES
                setValidation(valState); // Pokaż zielone
                Animated.timing(backgroundColor, { toValue: 1, duration: 500, useNativeDriver: false }).start();
                setCorrectCount(prev => prev + 1);
                setSessionCorrect(prev => prev + 1);
                setMessage('Świetnie! ✅');
                setReadyForNext(true);
                setShowHint(false);

                // Zapis
                InteractionManager.runAfterInteractions(() => {
                    awardXpAndCoins(5, 1);
                    const currentUser = auth().currentUser;
                    if (currentUser) {
                        firestore().collection('users').doc(currentUser.uid).collection('exerciseStats').doc(EXERCISE_ID)
                            .set({ totalCorrect: firestore.FieldValue.increment(1) }, { merge: true }).catch(console.error);
                    }
                });

            } else {
                // BŁĄD
                if (attemptsUsed === 0) {
                    // --- PIERWSZA PRÓBA ---
                    setAttemptsUsed(1); // Zużywamy pierwszą próbę
                    setMessage('Błąd! Popraw czerwone pola.');

                    // Ustawiamy walidację, żeby pokazać co jest źle
                    setValidation(valState);

                    // CZYŚCIMY BŁĘDNE POLA (zostawiając poprawne)
                    // Opóźniamy minimalnie wyczyszczenie, żeby logika walidacji (kolory) zadziałała
                    // Ale w React State update jest asynchroniczny, więc robimy to w jednym cyklu

                    if (valState.decomp1 === false) setDecomp1('');
                    if (valState.decomp2 === false) setDecomp2('');
                    if (valState.partial1 === false) setPartial1('');
                    if (valState.partial2 === false) setPartial2('');
                    if (valState.final === false) setFinal('');

                    // Animacja błędu
                    Animated.sequence([
                        Animated.timing(backgroundColor, { toValue: -1, duration: 700, useNativeDriver: false }),
                        Animated.timing(backgroundColor, { toValue: 0, duration: 500, useNativeDriver: false }),
                    ]).start();

                } else {
                    // --- DRUGA PRÓBA (OSTATNIA) ---
                    setValidation(valState); // Pokazujemy co źle

                    const correctAns = mode === 'multiplication' ? mainNumber * operand : mainNumber / operand;
                    setMessage(`Koniec prób. Wynik: ${correctAns}`);
                    setReadyForNext(true); // Pozwalamy iść dalej

                    setWrongCount(prev => prev + 1);

                    // Zapis błędu
                    InteractionManager.runAfterInteractions(() => {
                        const currentUser = auth().currentUser;
                        if (currentUser) {
                            firestore().collection('users').doc(currentUser.uid).collection('exerciseStats').doc(EXERCISE_ID)
                                .set({ totalWrong: firestore.FieldValue.increment(1) }, { merge: true }).catch(console.error);
                        }
                    });
                }
            }
        });
    };

    const handleKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>, currentField: string) => {
        const key = e.nativeEvent.key;
        if (key === 'ArrowRight') {
            if (currentField === 'decomp1') decomp2Ref.current?.focus();
            if (currentField === 'partial1') partial2Ref.current?.focus();
        } else if (key === 'ArrowLeft') {
            if (currentField === 'decomp2') decomp1Ref.current?.focus();
            if (currentField === 'partial2') partial1Ref.current?.focus();
        } else if (key === 'ArrowDown') {
            if (currentField === 'decomp1') partial1Ref.current?.focus();
            if (currentField === 'decomp2') partial2Ref.current?.focus();
            if (currentField === 'partial1' || currentField === 'partial2') finalRef.current?.focus();
        } else if (key === 'ArrowUp') {
            if (currentField === 'partial1') decomp1Ref.current?.focus();
            if (currentField === 'partial2') decomp2Ref.current?.focus();
            if (currentField === 'final') partial1Ref.current?.focus();
        }
    };

    const getFieldStyle = (field: keyof typeof validation) => {
        // Jeśli pole jest puste, a mamy informację o błędzie, to znaczy że zostało wyczyszczone po błędzie
        // Chcemy, żeby nadal świeciło na czerwono, żeby użytkownik wiedział, że tu był błąd
        if (validation[field] === false) return styles.errorInput;
        if (validation[field] === true) return styles.correctInput;
        return styles.input;
    };

    const getFinalStyle = () => {
        if (validation.final === false) return styles.errorFinal;
        if (validation.final === true) return styles.correctFinal;
        return styles.finalInput;
    };

    const bgInterpolation = backgroundColor.interpolate({
        inputRange: [-1, 0, 1],
        outputRange: ['rgba(255, 0, 0, 0.2)', 'rgba(255, 255, 255, 0)', 'rgba(0, 255, 0, 0.2)']
    });

    const opSymbol = mode === 'multiplication' ? '×' : ':';
    const problemString = `${mainNumber} ${opSymbol} ${operand}`;
    const step2Op = mode === 'multiplication' ? '×' : ':';

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
                            <Text style={styles.hintTitle}>Podpowiedź:</Text>
                            <Text style={styles.hintText}>{hintText}</Text>
                        </View>
                    )}

                    <DrawingModal visible={showScratchpad} onClose={toggleScratchpad} problemText={problemString} />

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
                            <View style={styles.milestoneCard}>
                                <Text style={styles.milestoneTitle}>Gratulacje! 🏆</Text>
                                <Text style={styles.suggestionText}>Ukończyłeś wszystkie zadania!</Text>
                                <View style={styles.statsRow}>
                                    <Text style={styles.statsText}>Wynik końcowy:</Text>
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
                            <View style={styles.overlayBackground} />

                            <Text style={styles.taskLabel}>TRENER: ROZKŁADANIE</Text>
                            <Text style={styles.taskTextMain}>{problemString} = ?</Text>

                            <Text style={styles.subTitle}>
                                {mode === 'multiplication' ? 'Rozłóż liczbę i pomnóż (opcjonalnie)' : 'Rozłóż liczbę i podziel (opcjonalnie)'}
                            </Text>

                            <View style={styles.row}>
                                <View style={styles.col}>
                                    <Text style={styles.stepLabel}>Rozkład</Text>
                                    <TextInput
                                        ref={decomp1Ref}
                                        style={getFieldStyle('decomp1')}
                                        keyboardType="numeric"
                                        value={decomp1}
                                        onChangeText={setDecomp1}
                                        placeholder="?"
                                        placeholderTextColor="#aaa"
                                        editable={!readyForNext && (attemptsUsed === 0 || validation.decomp1 !== true)}
                                        blurOnSubmit={false}
                                        returnKeyType="next"
                                        onSubmitEditing={() => decomp2Ref.current?.focus()}
                                        onKeyPress={(e) => handleKeyPress(e, 'decomp1')}
                                    />
                                </View>
                                <Text style={styles.plusSign}>+</Text>
                                <View style={styles.col}>
                                    <Text style={styles.stepLabel}>Rozkład</Text>
                                    <TextInput
                                        ref={decomp2Ref}
                                        style={getFieldStyle('decomp2')}
                                        keyboardType="numeric"
                                        value={decomp2}
                                        onChangeText={setDecomp2}
                                        placeholder="?"
                                        placeholderTextColor="#aaa"
                                        editable={!readyForNext && (attemptsUsed === 0 || validation.decomp2 !== true)}
                                        blurOnSubmit={false}
                                        returnKeyType="next"
                                        onSubmitEditing={() => partial1Ref.current?.focus()}
                                        onKeyPress={(e) => handleKeyPress(e, 'decomp2')}
                                    />
                                </View>
                            </View>

                            <View style={styles.arrowRow}>
                                <Text style={styles.arrowText}>↓ {step2Op} {operand}</Text>
                                <Text style={styles.arrowText}>↓ {step2Op} {operand}</Text>
                            </View>

                            <View style={styles.row}>
                                <TextInput
                                    ref={partial1Ref}
                                    style={getFieldStyle('partial1')}
                                    keyboardType="numeric"
                                    value={partial1}
                                    onChangeText={setPartial1}
                                    placeholder="wynik"
                                    placeholderTextColor="#aaa"
                                    editable={!readyForNext && (attemptsUsed === 0 || validation.partial1 !== true)}
                                    blurOnSubmit={false}
                                    returnKeyType="next"
                                    onSubmitEditing={() => partial2Ref.current?.focus()}
                                    onKeyPress={(e) => handleKeyPress(e, 'partial1')}
                                />
                                <Text style={styles.plusSign}>+</Text>
                                <TextInput
                                    ref={partial2Ref}
                                    style={getFieldStyle('partial2')}
                                    keyboardType="numeric"
                                    value={partial2}
                                    onChangeText={setPartial2}
                                    placeholder="wynik"
                                    placeholderTextColor="#aaa"
                                    editable={!readyForNext && (attemptsUsed === 0 || validation.partial2 !== true)}
                                    blurOnSubmit={false}
                                    returnKeyType="next"
                                    onSubmitEditing={() => finalRef.current?.focus()}
                                    onKeyPress={(e) => handleKeyPress(e, 'partial2')}
                                />
                            </View>

                            <View style={styles.arrowRow}>
                                <Text style={styles.arrowText}>↘</Text>
                                <Text style={styles.arrowText}>↙</Text>
                            </View>

                            <TextInput
                                ref={finalRef}
                                style={getFinalStyle()}
                                keyboardType="numeric"
                                value={final}
                                onChangeText={setFinal}
                                placeholder="Wynik końcowy"
                                placeholderTextColor="#aaa"
                                editable={!readyForNext && (attemptsUsed === 0 || validation.final !== true)}
                                blurOnSubmit={true}
                                returnKeyType="done"
                                onSubmitEditing={handleCheck}
                                onKeyPress={(e) => handleKeyPress(e, 'final')}
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

const fontSizeInput = 20;

const styles = StyleSheet.create({
    keyboardContainer: { flex: 1, justifyContent: 'center' },
    centerContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 20 },
    topButtons: { position: 'absolute', top: 40, right: 20, flexDirection: 'row', alignItems: 'center', zIndex: 10 },
    topBtnItem: { alignItems: 'center', marginLeft: 15 },
    iconTop: { width: 70, height: 70, resizeMode: 'contain', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3 },
    buttonLabel: { fontSize: 14, fontWeight: 'bold', color: '#007AFF', marginTop: 2, textShadowColor: 'rgba(255, 255, 255, 0.8)', textShadowRadius: 3 },
    hintBox: { position: 'absolute', top: 120, right: 20, padding: 15, backgroundColor: 'rgba(255,255,255,0.98)', borderRadius: 15, maxWidth: 260, zIndex: 11, elevation: 5, borderWidth: 1, borderColor: '#007AFF' },
    hintTitle: { fontSize: 16, fontWeight: 'bold', color: '#007AFF', marginBottom: 5, textAlign: 'center' },
    hintText: { fontSize: 14, color: '#333', lineHeight: 20, textAlign: 'center' },
    card: { width: '95%', maxWidth: 480, borderRadius: 20, padding: 20, alignItems: 'center', marginTop: 20, alignSelf: 'center' },
    overlayBackground: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 20 },
    taskLabel: { fontSize: 18, fontWeight: '700', marginBottom: 5, color: '#007AFF', textAlign: 'center', textTransform: 'uppercase' },
    taskTextMain: { fontSize: isSmallDevice ? 28 : 36, fontWeight: 'bold', marginBottom: 5, color: '#333', textAlign: 'center' },
    subTitle: { fontSize: 16, marginBottom: 20, color: '#555', textAlign: 'center' },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
    col: { alignItems: 'center' },
    stepLabel: { fontSize: 12, color: '#777', marginBottom: 4 },
    plusSign: { fontSize: 24, fontWeight: 'bold', color: '#555', marginHorizontal: 10, marginTop: 15 },
    arrowRow: { flexDirection: 'row', justifyContent: 'space-around', width: '60%', marginBottom: 10 },
    arrowText: { fontSize: 16, fontWeight: 'bold', color: '#007AFF' },
    input: { width: combinedInputSize, height: 50, borderWidth: 2, borderColor: '#ccc', borderRadius: 10, textAlign: 'center', fontSize: fontSizeInput, backgroundColor: '#fafafa', color: '#333' },
    correctInput: { width: combinedInputSize, height: 50, borderWidth: 2, borderColor: '#28a745', borderRadius: 10, textAlign: 'center', fontSize: fontSizeInput, backgroundColor: '#d4edda', color: '#155724' },
    errorInput: { width: combinedInputSize, height: 50, borderWidth: 2, borderColor: '#dc3545', borderRadius: 10, textAlign: 'center', fontSize: fontSizeInput, backgroundColor: '#f8d7da', color: '#721c24' },
    finalInput: { width: 180, height: 56, borderWidth: 2, borderColor: '#ccc', borderRadius: 10, textAlign: 'center', fontSize: 24, backgroundColor: '#fafafa', marginTop: 10, color: '#333' },
    correctFinal: { width: 180, height: 56, borderWidth: 2, borderColor: '#28a745', borderRadius: 10, textAlign: 'center', fontSize: 24, backgroundColor: '#d4edda', marginTop: 10, color: '#155724' },
    errorFinal: { width: 180, height: 56, borderWidth: 2, borderColor: '#dc3545', borderRadius: 10, textAlign: 'center', fontSize: 24, backgroundColor: '#f8d7da', marginTop: 10, color: '#721c24' },
    buttonContainer: { marginTop: 20, width: '80%', borderRadius: 10, overflow: 'hidden' },
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

export default CombinedDecompositionTrainer;