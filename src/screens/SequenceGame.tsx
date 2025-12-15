// src/screens/SequenceGame.tsx

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../styles/theme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { awardXpAndCoins } from '../services/xpService';

type Sequence = {
    seq: (number | string)[]; // [2, 4, 6, '?']
    correct: number;
    options: number[];
    rule: string;
};

const SequenceGame = () => {
    const navigation = useNavigation();
    const [score, setScore] = useState(0);
    const [lives, setLives] = useState(3);
    const [currentSeq, setCurrentSeq] = useState<Sequence | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    const generateSequence = (): Sequence => {
        const type = Math.floor(Math.random() * 3); // 0: add, 1: mult, 2: complex
        const start = Math.floor(Math.random() * 10) + 1;
        const step = Math.floor(Math.random() * 5) + 2;

        let arr: number[] = [];
        let rule = '';

        if (type === 0) {
            // Арифметична (+step)
            for(let i=0; i<4; i++) arr.push(start + (i*step));
            rule = `Dodawanie ${step}`;
        } else if (type === 1) {
            // Геометрична (*step, limit step to 2 or 3 to avoid huge nums)
            const mStep = Math.random() < 0.5 ? 2 : 3;
            let val = start;
            for(let i=0; i<4; i++) {
                arr.push(val);
                val *= mStep;
            }
            rule = `Mnożenie przez ${mStep}`;
        } else {
            // Змішана (n + n) або (n + index)
            let val = start;
            for(let i=0; i<4; i++) {
                arr.push(val);
                val += (i + 1) * step; // +2, +4, +6...
            }
            rule = "Rosnący krok";
        }

        const correct = arr[3];
        arr[3] = '?'; // Hide last

        // Generate options
        let opts = new Set<number>();
        opts.add(correct);
        while(opts.size < 4) {
            let fake = correct + Math.floor(Math.random() * 10) - 5;
            if (fake !== correct && fake > 0) opts.add(fake);
        }

        return {
            seq: arr,
            correct: correct,
            options: Array.from(opts).sort(() => Math.random() - 0.5),
            rule
        };
    };

    const startGame = () => {
        setScore(0);
        setLives(3);
        setIsPlaying(true);
        setCurrentSeq(generateSequence());
    };

    const handleAnswer = (val: number) => {
        if (!currentSeq) return;

        if (val === currentSeq.correct) {
            setScore(s => s + 1);
            setCurrentSeq(generateSequence());
        } else {
            setLives(l => {
                const newLives = l - 1;
                if (newLives <= 0) {
                    endGame(score);
                }
                return newLives;
            });
            Alert.alert("Błąd!", `To nie to. Poprawna odpowiedź: ${currentSeq.correct} (${currentSeq.rule})`);
            setCurrentSeq(generateSequence());
        }
    };

    const endGame = (finalScore: number) => {
        setIsPlaying(false);
        const xp = finalScore * 10;
        const coins = finalScore * 3;
        awardXpAndCoins(xp, coins);
        Alert.alert("Koniec gry!", `Wynik: ${finalScore}\n+${xp} XP`, [
            { text: "Menu", onPress: () => navigation.goBack() },
            { text: "Jeszcze raz", onPress: startGame }
        ]);
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <View style={styles.stats}>
                    <Text style={styles.statText}>❤️ {lives}</Text>
                    <Text style={styles.statText}>🏆 {score}</Text>
                </View>
            </View>

            {isPlaying && currentSeq ? (
                <View style={styles.gameContent}>
                    <Text style={styles.ruleHint}>Jaka jest kolejna liczba?</Text>

                    <View style={styles.seqRow}>
                        {currentSeq.seq.map((item, idx) => (
                            <View key={idx} style={[styles.seqBox, item === '?' && styles.questionBox]}>
                                <Text style={[styles.seqText, item === '?' && {color: 'white'}]}>{item}</Text>
                            </View>
                        ))}
                    </View>

                    <View style={styles.optionsGrid}>
                        {currentSeq.options.map((opt, idx) => (
                            <TouchableOpacity key={idx} style={styles.optionBtn} onPress={() => handleAnswer(opt)}>
                                <Text style={styles.optionText}>{opt}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            ) : (
                <View style={styles.menuContent}>
                    <Ionicons name="git-commit" size={80} color="white" />
                    <Text style={styles.title}>Sekwencje</Text>
                    <Text style={styles.subTitle}>Odkryj zasadę i wskaż kolejną liczbę. Masz 3 życia.</Text>
                    <TouchableOpacity style={styles.startBtn} onPress={startGame}>
                        <Text style={styles.startBtnText}>START</Text>
                    </TouchableOpacity>
                </View>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#009688' }, // Teal
    header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, alignItems: 'center' },
    stats: { flexDirection: 'row', gap: 20 },
    statText: { color: 'white', fontSize: 20, fontWeight: 'bold' },

    gameContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    ruleHint: { color: 'white', fontSize: 22, marginBottom: 30 },
    seqRow: { flexDirection: 'row', gap: 10, marginBottom: 50 },
    seqBox: { backgroundColor: 'white', width: 60, height: 60, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    questionBox: { backgroundColor: '#004D40' },
    seqText: { fontSize: 24, fontWeight: 'bold', color: '#009688' },

    optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 15, justifyContent: 'center' },
    optionBtn: { backgroundColor: '#E0F2F1', width: '40%', padding: 20, borderRadius: 15, alignItems: 'center', elevation: 3 },
    optionText: { fontSize: 28, fontWeight: 'bold', color: '#00796B' },

    menuContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    title: { color: 'white', fontSize: 32, fontWeight: 'bold', marginVertical: 20 },
    subTitle: { color: 'white', fontSize: 16, textAlign: 'center', marginBottom: 40 },
    startBtn: { backgroundColor: 'white', paddingVertical: 15, paddingHorizontal: 50, borderRadius: 30, elevation: 5 },
    startBtnText: { fontSize: 24, fontWeight: 'bold', color: '#009688' }
});

export default SequenceGame;
