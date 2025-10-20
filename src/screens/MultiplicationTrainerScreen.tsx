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

const MultiplicationTrainerScreen = () => {
    const [number, setNumber] = useState<number>(0);
    const [other, setOther] = useState<number>(0);

    const [correctTens, setCorrectTens] = useState<number>(0);
    const [correctOnes, setCorrectOnes] = useState<number>(0);

    const [decomp1, setDecomp1] = useState<string>('');
    const [decomp2, setDecomp2] = useState<string>('');
    const [partial1, setPartial1] = useState<string>('');
    const [partial2, setPartial2] = useState<string>('');
    const [final, setFinal] = useState<string>('');

    const [resultMessage, setResultMessage] = useState<string>('');
    const [showValidation, setShowValidation] = useState<boolean>(false);
    const [validationState, setValidationState] = useState({
        decomp1: false,
        decomp2: false,
        partial1: false,
        partial2: false,
        final: false,
    });

    const [readyForNext, setReadyForNext] = useState<boolean>(false);
    const [correctCount, setCorrectCount] = useState<number>(0);
    const [wrongCount, setWrongCount] = useState<number>(0);
    const [seconds, setSeconds] = useState<number>(0);
    const [startTime, setStartTime] = useState<number>(0);

    const backgroundColor = useRef(new Animated.Value(0)).current;
    const arrowOpacity1 = useRef(new Animated.Value(0)).current;
    const arrowOpacity2 = useRef(new Animated.Value(0)).current;

    const nextTask = () => {
        const n = Math.floor(Math.random() * 89) + 11;
        const o = Math.floor(Math.random() * 8) + 2;

        setNumber(n);
        setOther(o);
        setCorrectTens(Math.floor(n / 10) * 10);
        setCorrectOnes(n % 10);

        setDecomp1('');
        setDecomp2('');
        setPartial1('');
        setPartial2('');
        setFinal('');
        setResultMessage('');
        setShowValidation(false);
        setValidationState({
            decomp1: false,
            decomp2: false,
            partial1: false,
            partial2: false,
            final: false,
        });
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

        const numDecomp1 = decomp1 ? Number(decomp1) : null;
        const numDecomp2 = decomp2 ? Number(decomp2) : null;
        const numPartial1 = partial1 ? Number(partial1) : null;
        const numPartial2 = partial2 ? Number(partial2) : null;
        const numFinal = final ? Number(final) : null;

        const elapsed = Math.floor((Date.now() - startTime) / 1000);

        if (numFinal === null) {
            setResultMessage('Musisz wprowadzić wynik!');
            setShowValidation(false);
            return;
        }

        const correctPart1 = correctTens * other;
        const correctPart2 = correctOnes * other;
        const correctFinal = correctPart1 + correctPart2;

        const vState = {
            decomp1: numDecomp1 !== null ? numDecomp1 === correctTens : false,
            decomp2: numDecomp2 !== null ? numDecomp2 === correctOnes : false,
            partial1: numPartial1 !== null ? numPartial1 === correctPart1 : false,
            partial2: numPartial2 !== null ? numPartial2 === correctPart2 : false,
            final: numFinal === correctFinal,
        };

        setValidationState(vState);
        setShowValidation(true);

        const allOk =
            vState.final &&
            (numDecomp1 === null || vState.decomp1) &&
            (numDecomp2 === null || vState.decomp2) &&
            (numPartial1 === null || vState.partial1) &&
            (numPartial2 === null || vState.partial2);

        if (allOk) {
            setSeconds(elapsed);

            Animated.timing(backgroundColor, {
                toValue: 1,
                duration: 500,
                useNativeDriver: false,
            }).start();

            if (vState.decomp1)
                Animated.timing(arrowOpacity1, { toValue: 1, duration: 500, useNativeDriver: true }).start();
            if (vState.decomp2)
                Animated.timing(arrowOpacity2, { toValue: 1, duration: 500, useNativeDriver: true }).start();

            setResultMessage(`Brawo! 🎉 Poprawna odpowiedź: ${correctFinal}`);
            setCorrectCount(prev => prev + 1);
            setReadyForNext(true);
        } else {
            Animated.sequence([
                Animated.timing(backgroundColor, { toValue: -1, duration: 700, useNativeDriver: false }),
                Animated.timing(backgroundColor, { toValue: 0, duration: 500, useNativeDriver: false }),
            ]).start();
            setResultMessage('Coś się nie zgadza. Spróbuj ponownie!');
            setWrongCount(prev => prev + 1);
        }

        if (readyForNext) nextTask();
    };

    const getValidationStyle = (fieldKey: keyof typeof validationState) => {
        if (!showValidation) return styles.input;
        return validationState[fieldKey] ? styles.correct : styles.error;
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

            {/* ✅ Исправленный блок */}
            <KeyboardAwareScrollView
                contentContainerStyle={styles.container}
                enableOnAndroid={true}
                extraScrollHeight={100}
                keyboardShouldPersistTaps="handled"
            >
                <Animated.View style={[styles.card, { backgroundColor: 'transparent' }]}>
                    <View
                        style={{
                            ...StyleSheet.absoluteFillObject,
                            backgroundColor: 'rgba(255,255,255,0.4)',
                            borderRadius: 20,
                        }}
                    />

                    <Text style={styles.title}>Trener mnożenia</Text>
                    <Text style={styles.task}>{number} × {other} = ?</Text>

                    <Text style={styles.label}>Liczba do rozłożenia: {number}</Text>

                    <View style={styles.inputRow}>
                        <TextInput style={getValidationStyle('decomp1')} keyboardType="numeric" value={decomp1} onChangeText={setDecomp1} placeholder="dziesiątki" placeholderTextColor="#aaa" />
                        <TextInput style={getValidationStyle('decomp2')} keyboardType="numeric" value={decomp2} onChangeText={setDecomp2} placeholder="jedności" placeholderTextColor="#aaa" />
                    </View>

                    <Text style={styles.multiplyBy}> × {other}</Text>

                    <View style={styles.arrowRow}>
                        <Animated.Text style={[styles.arrow, { opacity: arrowOpacity1 }]}>↓</Animated.Text>
                        <Animated.Text style={[styles.arrow, { opacity: arrowOpacity2 }]}>↓</Animated.Text>
                    </View>

                    <View style={styles.inputRow}>
                        <TextInput style={getValidationStyle('partial1')} keyboardType="numeric" value={partial1} onChangeText={setPartial1} placeholder={`×${other}`} placeholderTextColor="#aaa" />
                        <Text style={styles.operator}> + </Text>
                        <TextInput style={getValidationStyle('partial2')} keyboardType="numeric" value={partial2} onChangeText={setPartial2} placeholder={`×${other}`} placeholderTextColor="#aaa" />
                    </View>

                    <View style={styles.arrowRow}>
                        <Text style={styles.arrow}>↘</Text>
                        <Text style={styles.arrow}>↙</Text>
                    </View>

                    <TextInput
                        style={[getValidationStyle('final'), styles.finalInput]}
                        keyboardType="numeric"
                        value={final}
                        onChangeText={setFinal}
                        placeholder="wynik"
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
    label: { fontSize: 18, marginBottom: 15, color: '#555' },
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
    counter: { fontSize: 18, marginTop: 10, color: '#555', textAlign: 'center' },
    correct: {
        width: 120, height: 60, borderWidth: 2, borderRadius: 10, textAlign: 'center', fontSize: 22,
        backgroundColor: '#d4edda', borderColor: '#28a745', color: '#155724', marginHorizontal: 10,
    },
    error: {
        width: 120, height: 60, borderWidth: 2, borderRadius: 10, textAlign: 'center', fontSize: 22,
        backgroundColor: '#f8d7da', borderColor: '#dc3545', color: '#721c24', marginHorizontal: 10,
    },
    correctText: { color: '#28a745' },
    errorText: { color: '#dc3545' },
});

export default MultiplicationTrainerScreen;
