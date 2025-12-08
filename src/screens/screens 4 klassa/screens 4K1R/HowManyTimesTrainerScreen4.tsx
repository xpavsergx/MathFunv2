// Full updated code with random selection between two task types
// (1) "Znajdź liczbę ... razy większą/mniejszą niż ..."
// (2) "O ile razy liczba ... jest większa/mniejsza niż ..."

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
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { awardXpAndCoins } from '../../../services/xpService';

const EXERCISE_ID = "howManyTimesTrainer";
const TASKS_LIMIT = 100;
const screenWidth = Dimensions.get('window').width;
const iconSize = screenWidth * 0.28;

const HowManyTimesTrainerScreen4 = () => {
    const [baseNumber, setBaseNumber] = useState<number>(0);
    const [multiplier, setMultiplier] = useState<number>(0);
    const [type, setType] = useState<'więcej' | 'mniej'>('więcej');
    const [taskType, setTaskType] = useState<'znajdz' | 'ile_razy'>('znajdz');
    const [answer, setAnswer] = useState<string>('');
    const [resultMessage, setResultMessage] = useState<string>('');
    const [finalCorrect, setFinalCorrect] = useState<boolean>(false);
    const [readyForNext, setReadyForNext] = useState<boolean>(false);
    const [correctCount, setCorrectCount] = useState<number>(0);
    const [wrongCount, setWrongCount] = useState<number>(0);
    const [seconds, setSeconds] = useState<number>(0);
    const [startTime, setStartTime] = useState<number>(0);
    const [taskCount, setTaskCount] = useState<number>(0);
    const [isGameFinished, setIsGameFinished] = useState<boolean>(false);
    const [showResult, setShowResult] = useState<boolean>(false);
    const [hasAnsweredCurrent, setHasAnsweredCurrent] = useState<string | null>(null);
    const [showHint, setShowHint] = useState<boolean>(false);

    const backgroundColor = useRef(new Animated.Value(0)).current;

    // Updated nextTask to keep numbers and answers < 400
    const nextTask = () => {
        if (taskCount >= TASKS_LIMIT) {
            setIsGameFinished(true);
            setResultMessage(`Gratulacje! 🎉 Ukończyłeś ${TASKS_LIMIT} zadań.`);
            setReadyForNext(false);
            return;
        }

        const newMultiplier = Math.floor(Math.random() * 5) + 2; // 2..6
        let newBase: number;

        const newType: 'więcej' | 'mniej' = Math.random() > 0.5 ? 'więcej' : 'mniej';
        const newTaskType: 'znajdz' | 'ile_razy' = Math.random() > 0.5 ? 'znajdz' : 'ile_razy';

        // Ensure that numbers stay below 400
        if (newType === 'więcej') {
            newBase = Math.floor(Math.random() * Math.floor(399 / newMultiplier)) + 1; // 1..(399/multiplier)
        } else {
            newBase = Math.floor(Math.random() * 399) + 1; // 1..399
        }

        // Ensure integer division for "mniej"
        let adjustedBase = newBase;
        if (newType === 'mniej') {
            adjustedBase = newBase - (newBase % newMultiplier);
            if (adjustedBase === 0) adjustedBase = newMultiplier;
        }

        setBaseNumber(adjustedBase);
        setMultiplier(newMultiplier);
        setType(newType);
        setTaskType(newTaskType);
        setAnswer('');
        setResultMessage('');
        setFinalCorrect(false);
        setReadyForNext(false);
        setSeconds(0);
        setStartTime(Date.now());
        setShowResult(false);
        setHasAnsweredCurrent(null);
        setShowHint(false);
        backgroundColor.setValue(0);
        setTaskCount(prev => prev + 1);
    };

    useEffect(() => { nextTask(); }, []);

    const getHintText = () => {
        if (taskType === 'znajdz') {
            return type === 'więcej'
                ? `${baseNumber} × ${multiplier}`
                : `${baseNumber} : ${multiplier}`;
        }
        if (type === 'więcej') {
            const X = baseNumber * multiplier;
            const Y = baseNumber;
            return `${X} : ${Y}`;
        }
        const small = baseNumber;
        const big = baseNumber * multiplier;
        return `${big} : ${small}`;
    };

    const handleCheck = () => {
        Keyboard.dismiss();
        if (!answer) { setResultMessage('Wpisz odpowiedź!'); return; }

        const numAnswer = Number(answer.replace(',', '.'));
        let correctResult: number;

        if (taskType === 'znajdz') {
            if (type === 'więcej') {
                correctResult = baseNumber * multiplier;
            } else {
                correctResult = baseNumber / multiplier;
            }
        } else {
            correctResult = multiplier;
        }

        const isCorrect = Math.abs(numAnswer - correctResult) < 1e-9;

        setFinalCorrect(isCorrect);
        setSeconds(Math.floor((Date.now() - startTime) / 1000));
        setShowResult(true);

        const currentUser = auth().currentUser;
        const statsDocRef = currentUser
            ? firestore().collection('users').doc(currentUser.uid).collection('exerciseStats').doc(EXERCISE_ID)
            : null;

        if (isCorrect) {
            if (hasAnsweredCurrent !== answer) {
                setCorrectCount(prev => prev + 1);
                setHasAnsweredCurrent(answer);
                statsDocRef?.set({ totalCorrect: firestore.FieldValue.increment(1) }, { merge: true }).catch(console.error);
            }
            Animated.timing(backgroundColor, { toValue: 1, duration: 500, useNativeDriver: false }).start();
            setResultMessage('Świetnie! ✅');
            setReadyForNext(true);
            awardXpAndCoins(5, 1);
        } else {
            if (hasAnsweredCurrent !== answer) {
                setWrongCount(prev => prev + 1);
                setHasAnsweredCurrent(answer);
                statsDocRef?.set({ totalWrong: firestore.FieldValue.increment(1) }, { merge: true }).catch(console.error);
            }
            Animated.sequence([
                Animated.timing(backgroundColor, { toValue: -1, duration: 700, useNativeDriver: false }),
                Animated.timing(backgroundColor, { toValue: 0, duration: 500, useNativeDriver: false }),
            ]).start();
            setResultMessage('Błąd! Spróbuj ponownie!');
            setReadyForNext(false);
        }
    };

    const getValidationStyle = () => !showResult ? styles.input : finalCorrect ? styles.correctFinal : styles.errorFinal;

    const renderTaskText = () => {
        if (taskType === 'znajdz') {
            return type === 'więcej'
                ? `Znajdź liczbę ${multiplier} razy większą niż ${baseNumber}`
                : `Znajdź liczbę ${multiplier} razy mniejszą niż ${baseNumber}`;
        }

        if (type === 'więcej') {
            const X = baseNumber * multiplier;
            const Y = baseNumber;
            return `Ile razy liczba ${X} jest większa niż ${Y}?`;
        }
        const small = baseNumber;
        const big = baseNumber * multiplier;
        return `Ile razy liczba ${small} jest mniejsza niż ${big}?`;
    };

    return (
        <View style={{ flex: 1 }}>
            <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
            <ImageBackground source={require('../../../assets/background.jpg')} style={StyleSheet.absoluteFillObject} resizeMode="cover" />

            <KeyboardAwareScrollView contentContainerStyle={styles.container} enableOnAndroid extraScrollHeight={100} keyboardShouldPersistTaps="handled">
                <View style={{ position: 'absolute', top: 5, right: 5, alignItems: 'center', zIndex: 10 }}>
                    <TouchableOpacity onPress={() => setShowHint(!showHint)}>
                        <Image source={require('../../../assets/question.png')} style={{ width: 90, height: 90 }} />
                    </TouchableOpacity>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#007AFF', textAlign: 'center' }}>Pomoc</Text>
                    {showHint && (
                        <View style={{ marginTop: 5, padding: 10, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 10, maxWidth: 260 }}>
                            <Text style={{ textAlign: 'center', fontSize: 14 }}>{getHintText()}</Text>
                        </View>
                    )}
                </View>

                <Animated.View style={[styles.card, { backgroundColor: 'transparent' }]}>
                    <View style={styles.overlayBackground} />
                    <Text style={styles.title}>Trener</Text>
                    <Text style={styles.title}>Ile razy więcej, ile razy mniej</Text>

                    {!isGameFinished && (
                        <>
                            <Text style={styles.task}>{renderTaskText()}</Text>
                            <TextInput
                                style={[getValidationStyle(), styles.finalInput]}
                                keyboardType="numeric"
                                value={answer}
                                onChangeText={setAnswer}
                                placeholder="Odpowiedź"
                                placeholderTextColor="#aaa"
                            />
                            <View style={styles.buttonContainer}>
                                <Button title={readyForNext ? 'Dalej' : 'Sprawdź'} onPress={readyForNext ? nextTask : handleCheck} color="#007AFF" />
                            </View>
                            <Text style={styles.counterTextSmall}>Zadanie: {taskCount > TASKS_LIMIT ? TASKS_LIMIT : taskCount} / {TASKS_LIMIT} ⏱ {seconds}s</Text>
                        </>
                    )}

                    {showResult && resultMessage && (
                        <Text style={[styles.result, finalCorrect ? styles.correctText : styles.errorText]}>{resultMessage}</Text>
                    )}
                </Animated.View>

                <View style={styles.iconsBottom}>
                    <Image source={require('../../../assets/happy.png')} style={styles.iconSame} />
                    <Text style={styles.counterTextIcons}>{correctCount}</Text>
                    <Image source={require('../../../assets/sad.png')} style={styles.iconSame} />
                    <Text style={styles.counterTextIcons}>{wrongCount}</Text>
                </View>
            </KeyboardAwareScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    card: { width: '100%', maxWidth: 450, borderRadius: 20, padding: 30, alignItems: 'center' },
    overlayBackground: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 20 },
    title: { fontSize: 24, fontWeight: '700', marginBottom: 20, color: '#333', textAlign: 'center' },
    task: { fontSize: 22, fontWeight: '700', marginBottom: 10, color: '#007AFF', textAlign: 'center' },
    counterTextSmall: { fontSize: Math.max(12, screenWidth * 0.035), fontWeight: '400', color: '#555', textAlign: 'center', marginTop: 10 },
    input: { width: 220, height: 56, borderWidth: 2, borderColor: '#ccc', borderRadius: 10, textAlign: 'center', fontSize: 22, backgroundColor: '#fafafa', marginBottom: 15 },
    finalInput: { width: 220 },
    buttonContainer: { marginTop: 20, width: '80%', borderRadius: 10, overflow: 'hidden' },
    result: { fontSize: 18, fontWeight: '700', marginTop: 20, textAlign: 'center' },
    iconsBottom: { position: 'absolute', bottom: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' },
    iconSame: { width: iconSize, height: iconSize, resizeMode: 'contain', marginHorizontal: 10 },
    counterTextIcons: { fontSize: Math.max(14, iconSize * 0.28), marginHorizontal: 8, textAlign: 'center', color: '#333' },
    correctFinal: { width: 220, height: 56, borderWidth: 2, borderRadius: 10, textAlign: 'center', fontSize: 22, backgroundColor: '#d4edda', borderColor: '#28a745', color: '#155724', marginBottom: 15 },
    errorFinal: { width: 220, height: 56, borderWidth: 2, borderRadius: 10, textAlign: 'center', fontSize: 22, backgroundColor: '#f8d7da', borderColor: '#dc3545', color: '#721c24', marginBottom: 15 },
    correctText: { color: '#28a745' },
    errorText: { color: '#dc3545' },
});

export default HowManyTimesTrainerScreen4;
