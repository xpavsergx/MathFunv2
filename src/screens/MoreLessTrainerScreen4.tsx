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

const EXERCISE_ID = "moreLessTrainer";
const TASKS_LIMIT = 100;
const screenWidth = Dimensions.get('window').width;
const iconSize = screenWidth * 0.28; // размер картинок совёнков

const MoreLessTrainerScreen4 = () => {
    const [baseNumber, setBaseNumber] = useState<number>(0);
    const [difference, setDifference] = useState<number>(0);
    const [type, setType] = useState<'większa' | 'mniejsza'>('większa');
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

    const nextTask = () => {
        if (taskCount >= TASKS_LIMIT) {
            setIsGameFinished(true);
            setResultMessage(`Gratulacje! 🎉 Ukończyłeś ${TASKS_LIMIT} zadań.`);
            setReadyForNext(false);
            return;
        }

        let newBase = Math.floor(Math.random() * 90) + 10;
        let newDiff = Math.floor(Math.random() * 15) + 1;
        let newType: 'większa' | 'mniejsza' = Math.random() > 0.5 ? 'większa' : 'mniejsza';

        if (newType === 'większa' && newBase + newDiff > 100) newType = 'mniejsza';
        if (newType === 'mniejsza' && newBase - newDiff < 0) newType = 'większa';

        setBaseNumber(newBase);
        setDifference(newDiff);
        setType(newType);
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
        // Просто показываем действие, без вычисления
        return type === 'większa'
            ? `${baseNumber} + ${difference}`
            : `${baseNumber} - ${difference}`;
    };


    const handleCheck = () => {
        Keyboard.dismiss();

        if (!answer) {
            setResultMessage('Wpisz odpowiedź!');
            return;
        }

        const numAnswer = Number(answer);
        const correctResult = type === 'większa' ? baseNumber + difference : baseNumber - difference;
        const isCorrect = numAnswer === correctResult;
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

                if (statsDocRef)
                    statsDocRef.set({ totalCorrect: firestore.FieldValue.increment(1) }, { merge: true })
                        .catch(err => console.error(err));
            }
            Animated.timing(backgroundColor, { toValue: 1, duration: 500, useNativeDriver: false }).start();
            setResultMessage('Świetnie! ✅');
            setReadyForNext(true);

        } else {
            if (hasAnsweredCurrent !== answer) {
                setWrongCount(prev => prev + 1);
                setHasAnsweredCurrent(answer);

                if (statsDocRef)
                    statsDocRef.set({ totalWrong: firestore.FieldValue.increment(1) }, { merge: true })
                        .catch(err => console.error(err));
            }

            Animated.sequence([
                Animated.timing(backgroundColor, { toValue: -1, duration: 700, useNativeDriver: false }),
                Animated.timing(backgroundColor, { toValue: 0, duration: 500, useNativeDriver: false }),
            ]).start();

            setResultMessage('Błąd! Spróbuj ponownie!');
            setReadyForNext(false);
        }
    };

    const getValidationStyle = () => {
        if (!showResult) return styles.input;
        return finalCorrect ? styles.correctFinal : styles.errorFinal;
    };

    return (
        <View style={{ flex: 1 }}>
            <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
            <ImageBackground source={require('../assets/background.jpg')} style={StyleSheet.absoluteFillObject} resizeMode="cover" />

            <KeyboardAwareScrollView
                contentContainerStyle={styles.container}
                enableOnAndroid={true}
                extraScrollHeight={100}
                keyboardShouldPersistTaps="handled"
            >
                {/* Всплывающая подсказка с вопросом */}
                <View style={{ position: 'absolute', top: 20, right: 20, alignItems: 'center', zIndex: 10 }}>
                    <TouchableOpacity onPress={() => setShowHint(!showHint)}>
                        <Image source={require('../assets/question.png')} style={{ width:110, height: 110 }} />
                    </TouchableOpacity>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#007AFF', textAlign: 'center' }}>
                        Pomóc
                    </Text>

                    {showHint && (
                        <View style={{
                            marginTop: 5,
                            padding: 10,
                            backgroundColor: 'rgba(255,255,255,0.9)',
                            borderRadius: 10,
                            maxWidth: 200,
                        }}>
                            <Text style={{ textAlign: 'center', fontSize: 14 }}>{getHintText()}</Text>
                        </View>
                    )}
                </View>

                <Animated.View style={[styles.card, { backgroundColor: 'transparent' }]}>
                    <View style={styles.overlayBackground} />

                    <Text style={styles.title}>Trener „o ile więcej / mniej”</Text>

                    {!isGameFinished && (
                        <>
                            <Text style={styles.task}>Znajdź liczbę {'\n'}o {difference} {type} od {baseNumber}</Text>
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

                            <Text style={styles.counterTextSmall}>
                                Zadanie: {taskCount > TASKS_LIMIT ? TASKS_LIMIT : taskCount} / {TASKS_LIMIT}   ⏱ {seconds}s
                            </Text>
                        </>
                    )}

                    {showResult && resultMessage ? (
                        <Text style={[styles.result, finalCorrect ? styles.correctText : styles.errorText]}>
                            {resultMessage}
                        </Text>
                    ) : null}
                </Animated.View>

                {/* Картинки совёнков снизу */}
                <View style={styles.iconsBottom}>
                    <Image source={require('../assets/happy.png')} style={styles.iconSame} />
                    <Text style={styles.counterTextIcons}>{correctCount}</Text>
                    <Image source={require('../assets/sad.png')} style={styles.iconSame} />
                    <Text style={styles.counterTextIcons}>{wrongCount}</Text>
                </View>

            </KeyboardAwareScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    card: { width: '100%', maxWidth: 450, borderRadius: 20, padding: 30, alignItems: 'center' },
    overlayBackground: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: 20 },

    title: { fontSize: 28, fontWeight: 'bold', marginBottom: 20, color: '#333', textAlign: 'center' },
    task: { fontSize: 28, fontWeight: 'bold', marginBottom: 10, color: '#007AFF', textAlign: 'center' },
    counterTextSmall: { fontSize: screenWidth * 0.04, fontWeight: '400', color: '#555', textAlign: 'center', marginTop: 10 },

    input: { width: 200, height: 60, borderWidth: 2, borderColor: '#ccc', borderRadius: 10, textAlign: 'center', fontSize: 24, backgroundColor: '#fafafa', marginBottom: 15 },
    finalInput: { width: 200 },
    buttonContainer: { marginTop: 20, width: '80%', borderRadius: 10, overflow: 'hidden' },
    result: { fontSize: 20, fontWeight: 'bold', marginTop: 20, textAlign: 'center' },

    iconsBottom: { position: 'absolute', bottom: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' },
    iconSame: { width: iconSize, height: iconSize, resizeMode: 'contain', marginHorizontal: 10 },
    counterTextIcons: { fontSize: iconSize * 0.3, marginHorizontal: 5, textAlign: 'center', color: '#333' },

    correctFinal: { width: 200, height: 60, borderWidth: 2, borderRadius: 10, textAlign: 'center', fontSize: 24, backgroundColor: '#d4edda', borderColor: '#28a745', color: '#155724', marginBottom: 15 },
    errorFinal: { width: 200, height: 60, borderWidth: 2, borderRadius: 10, textAlign: 'center', fontSize: 24, backgroundColor: '#f8d7da', borderColor: '#dc3545', color: '#721c24', marginBottom: 15 },

    correctText: { color: '#28a745' },
    errorText: { color: '#dc3545' },
});

export default MoreLessTrainerScreen4;
