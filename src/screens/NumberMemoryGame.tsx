// src/screens/NumberMemoryGame.tsx

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS, FONT_SIZES } from '../styles/theme';
import { awardXpAndCoins } from '../services/xpService';
import Ionicons from '@expo/vector-icons/Ionicons';

const NumberMemoryGame = () => {
    const navigation = useNavigation();
    const [level, setLevel] = useState(1);
    const [currentNumber, setCurrentNumber] = useState('');
    const [userAdswer, setUserAnswer] = useState('');
    const [status, setStatus] = useState<'memorize' | 'input' | 'result' | 'start'>('start');
    const [timeLeft, setTimeLeft] = useState(0);

    // Генерує число довжиною N
    const generateNumber = (len: number) => {
        let num = '';
        for (let i = 0; i < len; i++) {
            num += Math.floor(Math.random() * 10);
        }
        return num;
    };

    const startGame = () => {
        setLevel(1);
        startLevel(1);
    };

    const startLevel = (lvl: number) => {
        const num = generateNumber(lvl); // Довжина = рівень
        setCurrentNumber(num);
        setUserAnswer('');
        setStatus('memorize');

        // Час на запам'ятовування: 2с + 0.5с за кожну цифру
        let time = 2000 + (lvl * 500);

        // Таймер прогрес бару (спрощено)
        setTimeout(() => {
            setStatus('input');
        }, time);
    };

    const checkAnswer = () => {
        if (userAdswer === currentNumber) {
            setStatus('result');
            awardXpAndCoins(level * 5, 2); // Нагорода за рівень
            Alert.alert("Dobrze!", "Przechodzimy dalej!", [
                { text: "OK", onPress: () => {
                        setLevel(l => l + 1);
                        startLevel(level + 1);
                    }}
            ]);
        } else {
            Alert.alert("Błąd!", `Poprawna liczba to: ${currentNumber}\nTwój wynik: Poziom ${level}`, [
                { text: "Zagraj ponownie", onPress: startGame },
                { text: "Wyjdź", onPress: () => navigation.goBack() }
            ]);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.title}>Poziom {level}</Text>
                <View style={{width: 24}} />
            </View>

            <View style={styles.content}>
                {status === 'start' && (
                    <View style={styles.centerBox}>
                        <Ionicons name="brain" size={80} color="white" />
                        <Text style={styles.infoText}>Zapamiętaj liczbę, która pojawi się na ekranie.</Text>
                        <TouchableOpacity style={styles.btn} onPress={startGame}>
                            <Text style={styles.btnText}>Start</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {status === 'memorize' && (
                    <View style={styles.centerBox}>
                        <Text style={styles.numberText}>{currentNumber}</Text>
                        <Text style={styles.subText}>Zapamiętaj!</Text>
                    </View>
                )}

                {status === 'input' && (
                    <View style={styles.centerBox}>
                        <Text style={styles.infoText}>Wpisz liczbę:</Text>
                        <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            value={userAdswer}
                            onChangeText={setUserAnswer}
                            autoFocus
                        />
                        <TouchableOpacity style={styles.btn} onPress={checkAnswer}>
                            <Text style={styles.btnText}>Sprawdź</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#9C27B0' },
    header: { flexDirection: 'row', justifyContent: 'space-between', padding: 50, alignItems: 'center' },
    title: { fontSize: 24, fontWeight: 'bold', color: 'white' },
    content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    centerBox: { alignItems: 'center', width: '100%' },
    numberText: { fontSize: 60, fontWeight: 'bold', color: 'white', letterSpacing: 5 },
    subText: { color: 'rgba(255,255,255,0.8)', fontSize: 18, marginTop: 20 },
    infoText: { color: 'white', fontSize: 18, textAlign: 'center', marginBottom: 30 },
    input: { backgroundColor: 'white', width: '80%', fontSize: 30, textAlign: 'center', padding: 15, borderRadius: 10, marginBottom: 20 },
    btn: { backgroundColor: '#E040FB', paddingVertical: 15, paddingHorizontal: 40, borderRadius: 30, elevation: 5 },
    btnText: { color: 'white', fontSize: 20, fontWeight: 'bold' }
});

export default NumberMemoryGame;
