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

const EXERCISE_ID = "squaresCubesTrainer";
const TASKS_LIMIT = 100;
const screenWidth = Dimensions.get('window').width;
const iconSize = screenWidth * 0.28;

const SquaresCubesTrainerScreen4 = () => {
    const [baseNumber, setBaseNumber] = useState<number>(0);
    const [power, setPower] = useState<2 | 3>(2);
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
    const [showHint, setShowHint] = useState<boolean>(false);
    const [firstAttempt, setFirstAttempt] = useState<boolean>(true);
    const [correctInput, setCorrectInput] = useState<boolean | null>(null);
    const [lastWrongAnswer, setLastWrongAnswer] = useState<string>(''); // сохраняем последний неправильный

    const backgroundColor = useRef(new Animated.Value(0)).current;

    const nextTask = () => {
        if (taskCount >= TASKS_LIMIT) {
            setIsGameFinished(true);
            setResultMessage(`Gratulacje! 🎉 Ukończyłeś ${TASKS_LIMIT} zadań.`);
            setReadyForNext(false);
            return;
        }

        const newPower: 2 | 3 = Math.random() > 0.5 ? 2 : 3;
        const newBase = newPower === 2
            ? Math.floor(Math.random() * 20) + 1
            : Math.floor(Math.random() * 5) + 1;

        setBaseNumber(newBase);
        setPower(newPower);
        setAnswer('');
        setResultMessage('');
        setFinalCorrect(false);
        setReadyForNext(false);
        setSeconds(0);
        setStartTime(Date.now());
        setFirstAttempt(true);
        setCorrectInput(null);
        setShowHint(false);
        setLastWrongAnswer('');

        setTaskCount(prev => prev + 1);
        backgroundColor.setValue(0);
    };

    useEffect(() => { nextTask(); }, []);

    const toggleHint = () => setShowHint(prev => !prev);

    const getHintText = () => {
        if (power === 2) return `${baseNumber} × ${baseNumber}`;
        if (power === 3) return `${baseNumber} × ${baseNumber} × ${baseNumber}`;
        return '';
    };

    const handleCheck = () => {
        Keyboard.dismiss();
        if (!answer) { setResultMessage('Wpisz odpowiedź!'); return; }

        const numAnswer = Number(answer);
        const correctResult = Math.pow(baseNumber, power);
        const isCorrect = numAnswer === correctResult;

        setFinalCorrect(isCorrect);
        setSeconds(Math.floor((Date.now() - startTime) / 1000));

        const currentUser = auth().currentUser;
        const statsDocRef = currentUser
            ? firestore().collection('users').doc(currentUser.uid).collection('exerciseStats').doc(EXERCISE_ID)
            : null;

        if (isCorrect) {
            setCorrectInput(true);
            setCorrectCount(prev => prev + 1);
            statsDocRef?.set({ totalCorrect: firestore.FieldValue.increment(1) }, { merge: true }).catch(console.error);
            Animated.timing(backgroundColor, { toValue: 1, duration: 500, useNativeDriver: false }).start();
            setResultMessage('Świetnie! ✅');
            setReadyForNext(true);
            awardXpAndCoins(5, 1);
        } else {
            setCorrectInput(false);
            setWrongCount(prev => prev + 1);
            statsDocRef?.set({ totalWrong: firestore.FieldValue.increment(1) }, { merge: true }).catch(console.error);

            if (firstAttempt) {
                setResultMessage('Błąd! Spróbuj ponownie!');
                setAnswer('');
                setFirstAttempt(false);
            } else {
                setResultMessage(`Błąd! Poprawne: ${correctResult}`);
                setLastWrongAnswer(answer); // сохраняем введённое
                setReadyForNext(true);
                setFirstAttempt(true);
            }

            Animated.sequence([
                Animated.timing(backgroundColor, { toValue: -1, duration: 700, useNativeDriver: false }),
                Animated.timing(backgroundColor, { toValue: 0, duration: 500, useNativeDriver: false }),
            ]).start();
        }
    };

    const getValidationStyle = () => correctInput === null
        ? styles.input
        : correctInput ? styles.correctFinal : styles.errorFinal;

    return (
        <View style={{ flex: 1 }}>
            <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
            <ImageBackground source={require('../../../assets/background.jpg')} style={StyleSheet.absoluteFillObject} resizeMode="cover" />

            <KeyboardAwareScrollView contentContainerStyle={styles.container} enableOnAndroid extraScrollHeight={100} keyboardShouldPersistTaps="handled">
                <View style={{ position: 'absolute', top: 5, right: 5, alignItems: 'center', zIndex: 10 }}>
                    <TouchableOpacity onPress={toggleHint}>
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
                    <Text style={styles.title}>Kwadraty i sześciany liczb</Text>

                    {!isGameFinished && (
                        <>
                            <Text style={styles.task}>Oblicz:</Text>
                            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', marginBottom: 15 }}>
                                <Text style={styles.baseNumber}>{baseNumber}</Text>
                                <Text style={styles.power}>{power}</Text>
                            </View>

                            <TextInput
                                style={[getValidationStyle(), styles.finalInput]}
                                keyboardType="numeric"
                                value={answer || lastWrongAnswer}
                                onChangeText={setAnswer}
                                placeholder="Odpowiedź"
                                placeholderTextColor="#aaa"
                            />

                            <View style={styles.buttonContainer}>
                                <Button title={readyForNext ? 'Dalej' : 'Sprawdź'} onPress={readyForNext ? nextTask : handleCheck} color="#007AFF" />
                            </View>

                            <Text style={styles.counterTextSmall}>Zadanie: {taskCount > TASKS_LIMIT ? TASKS_LIMIT : taskCount} / {TASKS_LIMIT} ⏱ {seconds}s</Text>

                            {resultMessage && (
                                <Text style={[styles.result, finalCorrect ? styles.correctText : styles.errorText]}>{resultMessage}</Text>
                            )}
                        </>
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
    baseNumber: { fontSize: 36, fontWeight: '700', color: '#007AFF', marginRight: 2 },
    power: { fontSize: 20, fontWeight: '700', color: '#007AFF', marginTop: 6 },
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

export default SquaresCubesTrainerScreen4;
