import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Button, ImageBackground, ScrollView } from 'react-native';

const MultiplicationTrainerScreen = () => {
    const [mode, setMode] = useState<'multiply'>('multiply');
    const [number, setNumber] = useState<number>(0);
    const [other, setOther] = useState<number>(0);
    const [tens, setTens] = useState<number>(0);
    const [ones, setOnes] = useState<number>(0);
    const [part1, setPart1] = useState<number | null>(null);
    const [part2, setPart2] = useState<number | null>(null);
    const [final, setFinal] = useState<number | null>(null);
    const [resultMessage, setResultMessage] = useState<string>('');

    // Генерация нового примера
    const nextTask = () => {
        const n = Math.floor(Math.random() * 90) + 10;
        const o = Math.floor(Math.random() * 9) + 1;
        setNumber(n);
        setOther(o);
        setTens(Math.floor(n / 10) * 10);
        setOnes(n % 10);
        setPart1(null);
        setPart2(null);
        setFinal(null);
        setResultMessage('');
    };

    useEffect(() => {
        nextTask();
    }, []);

    const checkAndNext = () => {
        const correctPart1 = tens * other;
        const correctPart2 = ones * other;
        const correctFinal = correctPart1 + correctPart2;

        let ok = true;
        if (part1 !== correctPart1) ok = false;
        if (part2 !== correctPart2) ok = false;
        if (final !== correctFinal) ok = false;

        setResultMessage(
            ok
                ? `Brawo! 🎉 Poprawna odpowiedź: ${correctFinal}`
                : `Spróbuj ponownie. Poprawna odpowiedź: ${correctFinal}`
        );
        if (ok) nextTask();
    };

    return (
        <ImageBackground source={require('../assets/background.jpg')} style={styles.background}>
            <ScrollView contentContainerStyle={styles.container}>
                <Text style={styles.title}>Trener matematyki</Text>
                <Text style={styles.task}>{number} × {other} = ?</Text>

                <View style={styles.row}>
                    <View style={styles.block}>
                        <Text style={styles.label}>Dziesiątki</Text>
                        <TextInput
                            style={[styles.input, part1 !== null && (part1 === tens*other ? styles.correct : styles.error)]}
                            keyboardType="numeric"
                            value={part1 !== null ? String(part1) : ''}
                            onChangeText={t => setPart1(Number(t))}
                        />
                    </View>
                    <View style={styles.block}>
                        <Text style={styles.label}>Jedności</Text>
                        <TextInput
                            style={[styles.input, part2 !== null && (part2 === ones*other ? styles.correct : styles.error)]}
                            keyboardType="numeric"
                            value={part2 !== null ? String(part2) : ''}
                            onChangeText={t => setPart2(Number(t))}
                        />
                    </View>
                </View>

                <Text style={styles.label}>Suma</Text>
                <TextInput
                    style={[styles.input, final !== null && (final === (tens*other + ones*other) ? styles.correct : styles.error)]}
                    keyboardType="numeric"
                    value={final !== null ? String(final) : ''}
                    onChangeText={t => setFinal(Number(t))}
                />

                <View style={{ marginVertical: 20 }}>
                    <Button title="Sprawdź i Dalej" onPress={checkAndNext} color="#4CAF50" />
                </View>

                {resultMessage ? <Text style={[styles.result, resultMessage.startsWith('Brawo') ? styles.correctText : styles.errorText]}>{resultMessage}</Text> : null}
            </ScrollView>
        </ImageBackground>
    );
};

const styles = StyleSheet.create({
    background: { flex: 1, resizeMode: 'cover' },
    container: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    title: { fontSize: 28, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    task: { fontSize: 26, marginBottom: 20 },
    row: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginBottom: 20 },
    block: { alignItems: 'center' },
    label: { fontSize: 18, marginBottom: 5 },
    input: { width: 100, height: 50, borderWidth: 2, borderColor: '#aaa', borderRadius: 5, textAlign: 'center', fontSize: 20, marginBottom: 10, backgroundColor: '#fff' },
    correct: { backgroundColor: '#d4edda', borderColor: 'green' },
    error: { backgroundColor: '#f8d7da', borderColor: 'red' },
    result: { fontSize: 20, fontWeight: 'bold', marginTop: 20 },
    correctText: { color: 'green' },
    errorText: { color: 'red' },
});

export default MultiplicationTrainerScreen;
