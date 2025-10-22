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
    const [onesInput, setOnesInput] = useState<string>('');

    const [lowerTens, setLowerTens] = useState<string>('');
    const [lowerOnes, setLowerOnes] = useState<string>('');
    const [lowerPartial, setLowerPartial] = useState<string>('');
    const [lowerFinal, setLowerFinal] = useState<string>('');

    const [showValidation, setShowValidation] = useState<boolean>(false);
    const [validationState, setValidationState] = useState({
        tens: false,
        ones: false,
        partial: false,
        final: false,
    });

    const [resultMessage, setResultMessage] = useState<string>('');
    const [readyForNext, setReadyForNext] = useState<boolean>(false);

    const nextTask = () => {
        const a = Math.floor(Math.random() * 90) + 10;
        const b = Math.floor(Math.random() * 90) + 10;

        setNumberA(a);
        setNumberB(b);

        setTensInput('');
        setOnesInput('');
        setLowerTens('');
        setLowerOnes('');
        setLowerPartial('');
        setLowerFinal('');
        setShowValidation(false);
        setValidationState({ tens: false, ones: false, partial: false, final: false });
        setResultMessage('');
        setReadyForNext(false);
    };

    useEffect(() => {
        nextTask();
    }, []);

    const handleCheck = () => {
        Keyboard.dismiss();

        if (!lowerTens || !lowerOnes || !lowerPartial || !lowerFinal) {
            setResultMessage('Wypełnij wszystkie pola!');
            return;
        }

        const tensNum = Number(lowerTens);
        const onesNum = Number(lowerOnes);
        const partialNum = Number(lowerPartial);
        const finalNum = Number(lowerFinal);

        const correctTens = Math.floor(numberB / 10) * 10;
        const correctOnes = numberB % 10;
        const correctPartial = numberA + correctTens;
        const correctFinal = numberA + numberB;

        const vState = {
            tens: tensNum === correctTens,
            ones: onesNum === correctOnes,
            partial: partialNum === correctPartial,
            final: finalNum === correctFinal,
        };

        setValidationState(vState);
        setShowValidation(true);

        if (vState.tens && vState.ones && vState.partial && vState.final) {
            setResultMessage(`Brawo! Poprawna odpowiedź: ${correctFinal}`);
            setReadyForNext(true);
        } else {
            setResultMessage('Coś się nie zgadza. Spróbuj ponownie!');
        }
    };

    const getStyle = (field: keyof typeof validationState) => {
        if (!showValidation) return styles.input;
        return validationState[field] ? styles.correct : styles.error;
    };

    return (
        <View style={{ flex: 1 }}>
            <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
            <ImageBackground source={require('../assets/background.jpg')} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
            <KeyboardAwareScrollView contentContainerStyle={styles.container} enableOnAndroid extraScrollHeight={100} keyboardShouldPersistTaps="handled">
                <View style={styles.card}>
                    <Text style={styles.title}>Trener dodawania</Text>

                    <Text style={styles.task}>{numberA} + {numberB} = ?</Text>
                    <Text style={styles.label}>Rozkład liczby {numberB}:</Text>

                    <>
                        {/* Верхний ряд */}
                        <View style={[styles.row, styles.spacingRow]}>
                            <TextInput
                                style={getStyle('tens')}
                                keyboardType="numeric"
                                value={tensInput}
                                onChangeText={setTensInput}
                                placeholder="dziesiątki"
                                placeholderTextColor="#aaa"
                            />
                            <Text style={styles.operator}>+</Text>
                            <TextInput
                                style={getStyle('ones')}
                                keyboardType="numeric"
                                value={onesInput}
                                onChangeText={setOnesInput}
                                placeholder="jedności"
                                placeholderTextColor="#aaa"
                            />
                        </View>

                        {/* Пробел между верхним и нижним */}
                        <View style={{ height: 20 }} />

                        {/* Нижний пример */}
                        <View style={[styles.row, styles.spacingRow]}>
                            <Text style={styles.number}>{numberA}</Text>
                            <Text style={styles.operator}> + </Text>
                            <TextInput
                                style={styles.input}
                                keyboardType="numeric"
                                value={lowerTens}
                                onChangeText={setLowerTens}
                                placeholder="dziesiątki"
                                placeholderTextColor="#aaa"
                            />
                            <Text style={styles.operator}>=</Text>
                            <TextInput
                                style={styles.input}
                                keyboardType="numeric"
                                value={lowerPartial}
                                onChangeText={setLowerPartial}
                                placeholder=""
                                placeholderTextColor="#aaa"
                            />
                            <Text style={styles.operator}>+</Text>
                        </View>

                        <View style={[styles.row, styles.spacingRow]}>
                            <Text style={styles.operator}>+</Text>
                            <TextInput
                                style={styles.input}
                                keyboardType="numeric"
                                value={lowerOnes}
                                onChangeText={setLowerOnes}
                                placeholder="jedności"
                                placeholderTextColor="#aaa"
                            />
                            <Text style={styles.operator}>=</Text>
                            <TextInput
                                style={styles.input}
                                keyboardType="numeric"
                                value={lowerFinal}
                                onChangeText={setLowerFinal}
                                placeholder="wynik"
                                placeholderTextColor="#aaa"
                            />
                        </View>
                    </>





                    <View style={styles.buttonContainer}>
                        <Button title={readyForNext ? "Dalej" : "Sprawdź"} onPress={readyForNext ? nextTask : handleCheck} color="#007AFF" />
                    </View>

                    {resultMessage ? (
                        <Text style={[styles.result, resultMessage.startsWith('Brawo') ? styles.correctText : styles.errorText]}>
                            {resultMessage}
                        </Text>
                    ) : null}
                </View>
            </KeyboardAwareScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    card: { width: '100%', maxWidth: 550, borderRadius: 20, padding: 30, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.7)' },
    title: { fontSize: 28, fontWeight: 'bold', marginBottom: 20, color: '#333' },
    task: { fontSize: 32, fontWeight: 'bold', marginBottom: 20, color: '#007AFF' },
    label: { fontSize: 20, marginBottom: 15, color: '#555' },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' },
    spacingRow: { marginTop: 10 },
    number: { fontSize: 26, marginHorizontal: 5 },
    operator: { fontSize: 26, fontWeight: 'bold', marginHorizontal: 5 },
    input: { width: 120, height: 60, borderWidth: 2, borderColor: '#ccc', borderRadius: 12, textAlign: 'center', fontSize: 22, marginHorizontal: 8, backgroundColor: '#fafafa' },
    correct: { width: 120, height: 60, borderWidth: 2, borderColor: '#28a745', borderRadius: 12, textAlign: 'center', fontSize: 22, marginHorizontal: 8, backgroundColor: '#d4edda', color: '#155724' },
    error: { width: 120, height: 60, borderWidth: 2, borderColor: '#dc3545', borderRadius: 12, textAlign: 'center', fontSize: 22, marginHorizontal: 8, backgroundColor: '#f8d7da', color: '#721c24' },
    buttonContainer: { marginTop: 25, width: '80%', borderRadius: 10, overflow: 'hidden' },
    result: { fontSize: 18, fontWeight: 'bold', marginTop: 20, textAlign: 'center' },
    correctText: { color: '#28a745' },
    errorText: { color: '#dc3545' },
});

export default AdditionTrainerScreen;
