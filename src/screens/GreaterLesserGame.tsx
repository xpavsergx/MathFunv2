// src/screens/GreaterLesserGame.tsx

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../styles/theme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { awardXpAndCoins } from '../services/xpService';
import { updateQuestProgress } from '../services/dailyQuestService';

const GreaterLesserGame = () => {
    const navigation = useNavigation();
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(60);
    const [problem, setProblem] = useState({ left: 0, right: 0, leftText: '', rightText: '' });
    const [isPlaying, setIsPlaying] = useState(false);

    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const generateProblem = () => {
        // Генеруємо прості приклади або числа
        const type = Math.random();
        let lVal, rVal, lText, rText;

        const rnd = (max: number) => Math.floor(Math.random() * max) + 1;

        if (type < 0.3) {
            // Просто числа
            lVal = rnd(50);
            rVal = rnd(50);
            lText = lVal.toString();
            rText = rVal.toString();
        } else {
            // Вирази (додавання/віднімання)
            const a1 = rnd(20), b1 = rnd(20);
            const a2 = rnd(20), b2 = rnd(20);

            lVal = a1 + b1;
            lText = `${a1} + ${b1}`;

            // Щоб частіше були рівні, іноді форсуємо
            if (Math.random() < 0.3) {
                rVal = lVal;
                // Розбиваємо lVal на суму
                const sub = rnd(lVal - 1);
                rText = `${sub} + ${lVal - sub}`;
            } else {
                rVal = a2 + b2;
                rText = `${a2} + ${b2}`;
            }
        }
        setProblem({ left: lVal, right: rVal, leftText: lText, rightText: rText });
    };

    const startGame = () => {
        setScore(0);
        setTimeLeft(60);
        setIsPlaying(true);
        generateProblem();
        timerRef.current = setInterval(() => {
            setTimeLeft(t => {
                if (t <= 1) {
                    endGame();
                    return 0;
                }
                return t - 1;
            });
        }, 1000);
    };

    const endGame = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        setIsPlaying(false);
        const xp = score * 3;
        const coins = score;
        awardXpAndCoins(xp, coins);
        if (score > 0) {
            updateQuestProgress('GAMES_PLAYED');
        }
        Alert.alert("Koniec!", `Wynik: ${score}\nNagroda: +${xp} XP, +${coins} Monet`, [
            { text: "Menu", onPress: () => navigation.goBack() },
            { text: "Jeszcze raz", onPress: startGame }
        ]);
    };

    const handleAnswer = (sign: '>' | '<' | '=') => {
        let correctSign = '=';
        if (problem.left > problem.right) correctSign = '>';
        if (problem.left < problem.right) correctSign = '<';

        if (sign === correctSign) {
            setScore(s => s + 1);
        } else {
            // Штраф? Можна просто не додавати очки або віднімати час
            setTimeLeft(t => Math.max(0, t - 2));
        }
        generateProblem();
    };

    useEffect(() => {
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, []);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="close" size={30} color="white" />
                </TouchableOpacity>
                <View style={styles.scoreBadge}><Text style={styles.scoreText}>🏆 {score}</Text></View>
                <View style={styles.timerBadge}><Text style={styles.scoreText}>⏳ {timeLeft}</Text></View>
            </View>

            {isPlaying ? (
                <View style={styles.gameContent}>
                    <View style={styles.comparisonRow}>
                        <View style={styles.numberBox}>
                            <Text style={styles.numberText}>{problem.leftText}</Text>
                        </View>
                        <View style={styles.vsBox}>
                            <Text style={styles.vsText}>?</Text>
                        </View>
                        <View style={styles.numberBox}>
                            <Text style={styles.numberText}>{problem.rightText}</Text>
                        </View>
                    </View>

                    <View style={styles.controls}>
                        <TouchableOpacity style={styles.btn} onPress={() => handleAnswer('>')}>
                            <Text style={styles.btnText}>&gt;</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.btn} onPress={() => handleAnswer('=')}>
                            <Text style={styles.btnText}>=</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.btn} onPress={() => handleAnswer('<')}>
                            <Text style={styles.btnText}>&lt;</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            ) : (
                <View style={styles.menuContent}>
                    <Ionicons name="resize" size={80} color="white" />
                    <Text style={styles.title}>Większe czy Mniejsze?</Text>
                    <Text style={styles.subTitle}>Masz 60 sekund. Porównuj liczby najszybciej jak potrafisz!</Text>
                    <TouchableOpacity style={styles.startBtn} onPress={startGame}>
                        <Text style={styles.startBtnText}>START</Text>
                    </TouchableOpacity>
                </View>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#E91E63' }, // Рожевий
    header: { flexDirection: 'row', justifyContent: 'space-between', padding: 50, alignItems: 'center' },
    scoreBadge: { backgroundColor: 'rgba(0,0,0,0.2)', padding: 10, borderRadius: 15 },
    timerBadge: { backgroundColor: 'rgba(0,0,0,0.2)', padding: 10, borderRadius: 15 },
    scoreText: { color: 'white', fontWeight: 'bold', fontSize: 18 },

    gameContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    comparisonRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 50, gap: 10 },
    numberBox: { backgroundColor: 'white', padding: 20, borderRadius: 15, minWidth: 100, alignItems: 'center', elevation: 5 },
    numberText: { fontSize: 32, fontWeight: 'bold', color: '#E91E63' },
    vsBox: { width: 50, alignItems: 'center' },
    vsText: { color: 'white', fontSize: 40, fontWeight: 'bold' },

    controls: { flexDirection: 'row', gap: 20 },
    btn: { backgroundColor: 'white', width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', elevation: 5 },
    btnText: { fontSize: 40, fontWeight: 'bold', color: '#E91E63' },

    menuContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    title: { color: 'white', fontSize: 32, fontWeight: 'bold', marginVertical: 20, textAlign: 'center' },
    subTitle: { color: 'white', fontSize: 18, textAlign: 'center', marginBottom: 40 },
    startBtn: { backgroundColor: '#FFC107', paddingVertical: 15, paddingHorizontal: 50, borderRadius: 30, elevation: 5 },
    startBtnText: { fontSize: 24, fontWeight: 'bold', color: '#333' }
});

export default GreaterLesserGame;
