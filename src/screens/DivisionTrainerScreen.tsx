import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    Button,
    Platform,
    Keyboard,
    ImageBackground,
    Animated,
    StatusBar,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

const DivisionTrainerScreen = () => {
    const [number, setNumber] = useState<number>(0);
    const [divisor, setDivisor] = useState<number>(0);

    const [decomp1, setDecomp1] = useState<string>('');
    const [decomp2, setDecomp2] = useState<string>('');
    const [partial1, setPartial1] = useState<string>('');
    const [partial2, setPartial2] = useState<string>('');
    const [final, setFinal] = useState<string>('');

    const [resultMessage, setResultMessage] = useState<string>('');
    const [hintMessage, setHintMessage] = useState<string>('');
    const [showValidation, setShowValidation] = useState<boolean>(false);
    const [finalCorrect, setFinalCorrect] = useState<boolean>(false);

    const [readyForNext, setReadyForNext] = useState<boolean>(false);
    const [correctCount, setCorrectCount] = useState<number>(0);
    const [wrongCount, setWrongCount] = useState<number>(0);
    const [seconds, setSeconds] = useState<number>(0);
    const [startTime, setStartTime] = useState<number>(0);

    const backgroundColor = useRef(new Animated.Value(0)).current;
    const arrowOpacity1 = useRef(new Animated.Value(0)).current;
    const arrowOpacity2 = useRef(new Animated.Value(0)).current;

    const nextTask = () => {
        const d = Math.floor(Math.random() * 8) + 2;
        const q1 = Math.floor(Math.random() * 10) + 1;
        const q2 = Math.floor(Math.random() * 10) + 1;
        const n = d * (q1 + q2);

        setNumber(n);
        setDivisor(d);

        setDecomp1('');
        setDecomp2('');
        setPartial1('');
        setPartial2('');
        setFinal('');
        setResultMessage('');
        setHintMessage('');
        setShowValidation(false);
        setFinalCorrect(false);
        setReadyForNext(false);
        setSeconds(0);

        setStartTime(Date.now());
        backgroundColor.setValue(0);
        arrowOpacity1.setValue(0);
        arrowOpacity2.setValue(0);
    };

    useEffect(() => {
        nextTask();
    }, []);

    const handleButton = () => {
        Keyboard.dismiss();

        if (!final) {
            setResultMessage('Wpisz wynik końcowy!');
            setHintMessage('');
            setShowValidation(false);
            return;
        }

        const numFinal = Number(final);
        const correctFinal = number / divisor;
        const isCorrect = numFinal === correctFinal;

        setFinalCorrect(isCorrect);
        setShowValidation(true);

        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setSeconds(elapsed);

        if (isCorrect) {
            Animated.timing(backgroundColor, {
                toValue: 1,
                duration: 500,
                useNativeDriver: false,
            }).start();

            // Анимация стрелок, если ребёнок правильно делит число на части
            if (decomp1) Animated.timing(arrowOpacity1, { toValue: 1, duration: 500, useNativeDriver: true }).start();
            if (decomp2) Animated.timing(arrowOpacity2, { toValue: 1, duration: 500, useNativeDriver: true }).start();

            setResultMessage('Świetnie! ✅');
            setHintMessage('');
            setCorrectCount(prev => prev + 1);
            setReadyForNext(true);
        } else {
            Animated.sequence([
                Animated.timing(backgroundColor, { toValue: -1, duration: 700, useNativeDriver: false }),
                Animated.timing(backgroundColor, { toValue: 0, duration: 500, useNativeDriver: false }),
            ]).start();

            setResultMessage('Błąd! Spróbuj ponownie.');

            const firstPartHint = Math.floor(number / 2 / divisor) * divisor;
            const secondPartHint = number - firstPartHint;
            setHintMessage(
                `Podpowiedź: Spróbuj rozłożyć ${number} na dwie liczby, np. ${firstPartHint} i ${secondPartHint}, które można podzielić przez ${divisor}.`
            );

            setWrongCount(prev => prev + 1);
        }
    };

    const getValidationStyle = () => {
        if (!showValidation) return styles.input;
        return finalCorrect ? styles.correct : styles.error;
    };

    useEffect(() => {
        if (Platform.OS === 'android') {
            StatusBar.setTranslucent(true);
            StatusBar.setBackgroundColor('transparent');
        }
    }, []);

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
                enableOnAndroid={true}
                extraScrollHeight={100}
                keyboardShouldPersistTaps="handled"
            >
                <Animated.View style={[styles.card]}>
                    <View
                        style={{
                            ...StyleSheet.absoluteFillObject,
                            backgroundColor: 'rgba(255,255,255,0.4)',
                            borderRadius: 20,
                        }}
                    />

                    <Text style={styles.title}>Trener dzielenia</Text>
                    <Text style={styles.task}>{number} ÷ {divisor} = ?</Text>

                    <Text style={styles.label}>Rozłóż liczbę {number} na dwie części (opcjonalnie)</Text>

                    <View style={styles.inputRow}>
                        <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            value={decomp1}
                            onChangeText={setDecomp1}
                            placeholder="część 1"
                            placeholderTextColor="#aaa"
                        />
                        <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            value={decomp2}
                            onChangeText={setDecomp2}
                            placeholder="część 2"
                            placeholderTextColor="#aaa"
                        />
                    </View>

                    <Text style={styles.multiplyBy}> ÷ {divisor}</Text>

                    <View style={styles.arrowRow}>
                        <Animated.Text style={[styles.arrow, { opacity: arrowOpacity1 }]}>↓</Animated.Text>
                        <Animated.Text style={[styles.arrow, { opacity: arrowOpacity2 }]}>↓</Animated.Text>
                    </View>

                    <View style={styles.inputRow}>
                        <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            value={partial1}
                            onChangeText={setPartial1}
                            placeholder={`wynik 1`}
                            placeholderTextColor="#aaa"
                        />
                        <Text style={styles.operator}> + </Text>
                        <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            value={partial2}
                            onChangeText={setPartial2}
                            placeholder={`wynik 2`}
                            placeholderTextColor="#aaa"
                        />
                    </View>

                    <View style={styles.arrowRow}>
                        <Text style={styles.arrow}>↘</Text>
                        <Text style={styles.arrow}>↙</Text>
                    </View>

                    <TextInput
                        style={[getValidationStyle(), styles.finalInput]}
                        keyboardType="numeric"
                        value={final}
                        onChangeText={setFinal}
                        placeholder="wynik końcowy"
                        placeholderTextColor="#aaa"
                    />

                    <View style={styles.buttonContainer}>
                        <Button
                            title={readyForNext ? "Dalej" : "Sprawdź"}
                            onPress={readyForNext ? nextTask : handleButton}
                            color="#007AFF"
                        />
                    </View>

                    {resultMessage ? (
                        <Text style={[styles.result, finalCorrect ? styles.correctText : styles.errorText]}>
                            {resultMessage}
                        </Text>
                    ) : null}

                    {hintMessage ? (
                        <Text style={styles.hintText}>{hintMessage}</Text>
                    ) : null}

                    <Text style={styles.counter}>
                        ✅ {correctCount}   ❌ {wrongCount}   ⏱ {seconds}s
                    </Text>
                </Animated.View>
            </KeyboardAwareScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    card: {
        width: '100%',
        maxWidth: 450,
        borderRadius: 20,
        padding: 30,
        alignItems: 'center',
    },
    title: { fontSize: 28, fontWeight: 'bold', marginBottom: 20, color: '#333' },
    task: { fontSize: 32, fontWeight: 'bold', marginBottom: 20, color: '#007AFF' },
    label: { fontSize: 18, marginBottom: 15, color: '#555', textAlign: 'center' },
    inputRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', width: '100%', marginBottom: 10 },
    input: {
        width: 120, height: 60, borderWidth: 2, borderColor: '#ccc', borderRadius: 10,
        textAlign: 'center', fontSize: 22, backgroundColor: '#fafafa', marginHorizontal: 10,
    },
    finalInput: { width: 150, marginTop: 10 },
    operator: { fontSize: 24, fontWeight: 'bold', marginHorizontal: 10 },
    multiplyBy: { fontSize: 24, fontWeight: 'bold', color: '#555', marginVertical: 5 },
    arrowRow: { flexDirection: 'row', justifyContent: 'space-around', width: '80%', marginVertical: -5 },
    arrow: { fontSize: 30, fontWeight: 'bold', color: '#aaa' },
    buttonContainer: { marginTop: 25, width: '80%', borderRadius: 10, overflow: 'hidden' },
    result: { fontSize: 18, fontWeight: 'bold', marginTop: 20, textAlign: 'center' },
    hintText: { fontSize: 16, color: '#111', marginTop: 10, textAlign: 'center' },
    counter: { fontSize: 18, marginTop: 10, color: '#555', textAlign: 'center' },
    correct: {
        width: 150, height: 60, borderWidth: 2, borderRadius: 10, textAlign: 'center', fontSize: 22,
        backgroundColor: '#d4edda', borderColor: '#28a745', color: '#155724',
    },
    error: {
        width: 150, height: 60, borderWidth: 2, borderRadius: 10, textAlign: 'center', fontSize: 22,
        backgroundColor: '#f8d7da', borderColor: '#dc3545', color: '#721c24',
    },
    correctText: { color: '#28a745' },
    errorText: { color: '#dc3545' },
});

export default DivisionTrainerScreen;
