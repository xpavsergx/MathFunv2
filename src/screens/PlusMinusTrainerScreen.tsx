import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    Button,
    Keyboard,
    ImageBackground,
    StatusBar,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

const AdditionTrainerScreen = () => {
    const [numberA, setNumberA] = useState<number>(0);
    const [numberB, setNumberB] = useState<number>(0);

    const [tensInput, setTensInput] = useState<string>('');
    const [partialResult, setPartialResult] = useState<string>('');
    const [onesInput, setOnesInput] = useState<string>('');
    const [finalResult, setFinalResult] = useState<string>('');

    const [showValidation, setShowValidation] = useState<boolean>(false);
    const [validationState, setValidationState] = useState({
        tensInput: false,
        partialResult: false,
        onesInput: false,
        finalResult: false,
    });

    const [resultMessage, setResultMessage] = useState<string>('');
    const [readyForNext, setReadyForNext] = useState<boolean>(false);

    // Подсчет правильных/неправильных ответов и времени
    const [correctCount, setCorrectCount] = useState<number>(0);
    const [wrongCount, setWrongCount] = useState<number>(0);
    const [startTime, setStartTime] = useState<number>(0);
    const [seconds, setSeconds] = useState<number>(0);

    const nextTask = () => {
        const a = Math.floor(Math.random() * 90) + 10;
        const b = Math.floor(Math.random() * 90) + 10;

        setNumberA(a);
        setNumberB(b);

        setTensInput('');
        setPartialResult('');
        setOnesInput('');
        setFinalResult('');
        setShowValidation(false);
        setValidationState({
            tensInput: false,
            partialResult: false,
            onesInput: false,
            finalResult: false,
        });
        setResultMessage('');
        setReadyForNext(false);

        // Сброс времени для новой задачи
        setSeconds(0);
        setStartTime(Date.now());
    };

    useEffect(() => {
        nextTask();
    }, []);

    const handleCheck = () => {
        Keyboard.dismiss();

        const correctTens = Math.floor(numberB / 10) * 10;
        const correctPartial = numberA + correctTens;
        const correctOnes = numberB % 10;
        const correctFinal = numberA + numberB;

        const vState = {
            tensInput: tensInput ? Number(tensInput) === correctTens : false,
            partialResult: partialResult ? Number(partialResult) === correctPartial : false,
            onesInput: onesInput ? Number(onesInput) === correctOnes : false,
            finalResult: finalResult ? Number(finalResult) === correctFinal : false,
        };

        setValidationState(vState);
        setShowValidation(true);

        const anyFilled = tensInput || partialResult || onesInput || finalResult;
        if (!anyFilled) {
            setResultMessage('Wpisz przynajmniej jedną wartość!');
            return;
        }

        const onlyFilled = Object.entries(vState).filter(([key]) => {
            const val =
                key === 'tensInput' ? tensInput :
                    key === 'partialResult' ? partialResult :
                        key === 'onesInput' ? onesInput :
                            key === 'finalResult' ? finalResult : '';
            return val !== '';
        });

        const allCorrect = onlyFilled.every(([key]) => vState[key as keyof typeof vState]);

        if (allCorrect) {
            // фиксируем время выполнения задачи
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            setSeconds(elapsed);

            setResultMessage(`Brawo! Poprawna odpowiedź: ${correctFinal} (⏱ ${elapsed}s)`);
            setCorrectCount(prev => prev + 1);
            setReadyForNext(true);
        } else {
            setResultMessage('Nie wszystkie odpowiedzi są poprawne. Spróbuj ponownie!');
            setWrongCount(prev => prev + 1);
        }
    };

    const getStyle = (field: keyof typeof validationState) => {
        if (!showValidation) return styles.input;
        return field === 'finalResult'
            ? validationState[field] ? styles.correctFinal : styles.errorFinal
            : validationState[field] ? styles.correct : styles.error;
    };

    return (
        <View style={{ flex: 1 }}>
            <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
            <ImageBackground
                source={require('../assets/background.jpg')}
                style={StyleSheet.absoluteFillObject}
                resizeMode="cover"
            />
            <KeyboardAwareScrollView
                contentContainerStyle={styles.container}
                enableOnAndroid
                extraScrollHeight={100}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.card}>
                    <Text style={styles.title}>Trener dodawania</Text>

                    <Text style={styles.task}>{numberA} + {numberB}</Text>

                    <Text style={styles.subTitle}>
                        Rozłóż liczbę <Text style={styles.highlight}>{numberB}</Text> na dziesiątki i jedności
                    </Text>

                    <View style={{ height: 20 }} />

                    <View style={styles.row}>
                        <Text style={styles.number}>{numberA}</Text>
                        <Text style={styles.operator}> + </Text>
                        <TextInput
                            style={getStyle('tensInput')}
                            keyboardType="numeric"
                            value={tensInput}
                            onChangeText={setTensInput}
                            placeholder="dziesiątki"
                            placeholderTextColor="#aaa"
                        />
                        <Text style={styles.operator}> = </Text>
                        <TextInput
                            style={getStyle('partialResult')}
                            keyboardType="numeric"
                            value={partialResult}
                            onChangeText={setPartialResult}
                            placeholder="wynik"
                            placeholderTextColor="#aaa"
                        />
                    </View>

                    <View style={styles.row}>
                        <Text style={styles.operator}>+</Text>
                        <TextInput
                            style={getStyle('onesInput')}
                            keyboardType="numeric"
                            value={onesInput}
                            onChangeText={setOnesInput}
                            placeholder="jedności"
                            placeholderTextColor="#aaa"
                        />
                        <Text style={styles.operator}> = </Text>
                        <TextInput
                            style={[getStyle('finalResult'), { width: 240 }]}
                            keyboardType="numeric"
                            value={finalResult}
                            onChangeText={setFinalResult}
                            placeholder="wynik końcowy"
                            placeholderTextColor="#aaa"
                        />
                    </View>

                    <View style={styles.buttonContainer}>
                        <Button
                            title={readyForNext ? "Dalej" : "Sprawdź"}
                            onPress={readyForNext ? nextTask : handleCheck}
                            color="#007AFF"
                        />
                    </View>

                    {resultMessage ? (
                        <Text
                            style={[
                                styles.result,
                                resultMessage.startsWith('Brawo')
                                    ? styles.correctText
                                    : styles.errorText,
                            ]}
                        >
                            {resultMessage}
                        </Text>
                    ) : null}

                    <Text style={styles.counter}>
                        ✅ {correctCount}   ❌ {wrongCount}   ⏱ {seconds}s
                    </Text>
                </View>
            </KeyboardAwareScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    card: {
        width: '100%',
        maxWidth: 550,
        borderRadius: 20,
        padding: 30,
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.7)',
    },
    title: { fontSize: 28, fontWeight: 'bold', marginBottom: 10, color: '#333' },
    subTitle: { fontSize: 20, marginBottom: 15, color: '#444', textAlign: 'center' },
    highlight: { color: '#007AFF', fontWeight: 'bold' },
    task: { fontSize: 32, fontWeight: 'bold', marginBottom: 10, color: '#007AFF' },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 10,
        flexWrap: 'wrap',
    },
    number: { fontSize: 26, marginHorizontal: 5 },
    operator: { fontSize: 26, fontWeight: 'bold', marginHorizontal: 5 },
    input: {
        width: 130,
        height: 60,
        borderWidth: 2,
        borderColor: '#ccc',
        borderRadius: 12,
        textAlign: 'center',
        fontSize: 22,
        marginHorizontal: 8,
        backgroundColor: '#fafafa',
    },
    correct: {
        width: 130,
        height: 60,
        borderWidth: 2,
        borderColor: '#28a745',
        borderRadius: 12,
        textAlign: 'center',
        fontSize: 22,
        marginHorizontal: 8,
        backgroundColor: '#d4edda',
        color: '#155724',
    },
    error: {
        width: 130,
        height: 60,
        borderWidth: 2,
        borderColor: '#dc3545',
        borderRadius: 12,
        textAlign: 'center',
        fontSize: 22,
        marginHorizontal: 8,
        backgroundColor: '#f8d7da',
        color: '#721c24',
    },
    correctFinal: {
        width: 240,
        height: 60,
        borderWidth: 2,
        borderColor: '#28a745',
        borderRadius: 12,
        textAlign: 'center',
        fontSize: 22,
        marginHorizontal: 8,
        backgroundColor: '#d4edda',
        color: '#155724',
    },
    errorFinal: {
        width: 240,
        height: 60,
        borderWidth: 2,
        borderColor: '#dc3545',
        borderRadius: 12,
        textAlign: 'center',
        fontSize: 22,
        marginHorizontal: 8,
        backgroundColor: '#f8d7da',
        color: '#721c24',
    },
    buttonContainer: { marginTop: 25, width: '80%', borderRadius: 10, overflow: 'hidden' },
    result: { fontSize: 18, fontWeight: 'bold', marginTop: 20, textAlign: 'center' },
    counter: { fontSize: 18, marginTop: 10, color: '#555', textAlign: 'center' },
    correctText: { color: '#28a745' },
    errorText: { color: '#dc3545' },
});

export default AdditionTrainerScreen;
