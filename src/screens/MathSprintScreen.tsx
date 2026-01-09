// src/screens/MathSprintScreen.tsx

import React, { useEffect, useRef, useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, StatusBar, useColorScheme, ScrollView
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { xpService } from '../services/xpService';
import { useNavigation } from '@react-navigation/native';
import { COLORS, FONT_SIZES } from '../styles/theme';

type GameMode = 'multiply' | 'add' | 'mix';

const MathSprintScreen: React.FC = () => {
    const navigation = useNavigation();
    const [problemText, setProblemText] = useState<string>('');
    const [correctAnswer, setCorrectAnswer] = useState<number>(0);
    const [options, setOptions] = useState<number[]>([]);
    const [isRunning, setIsRunning] = useState<boolean>(false);
    const [timeLeft, setTimeLeft] = useState<number>(30);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [correctCount, setCorrectCount] = useState<number>(0);

    // Налаштування
    const [sprintDuration, setSprintDuration] = useState<number>(30);
    const [gameMode, setGameMode] = useState<GameMode>('multiply');

    const [showMainMenu, setShowMainMenu] = useState<boolean>(true);
    const [xpEarned, setXpEarned] = useState<number>(0);
    const [coinsEarned, setCoinsEarned] = useState<number>(0);

    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';

    const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

    useEffect(() => {
        if (!isRunning) return;
        if (timeLeft <= 0) {
            setIsRunning(false);
            return;
        }
        timerRef.current = setInterval(() => setTimeLeft(t => t - 1), 1000);
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [isRunning, timeLeft]);

    const generateProblem = () => {
        let a, b, correct, sign;
        let mode = gameMode;

        if (mode === 'mix') {
            mode = Math.random() < 0.5 ? 'multiply' : 'add';
        }

        if (mode === 'multiply') {
            a = rand(2, 9);
            b = rand(2, 9);
            correct = a * b;
            sign = '×';
        } else {
            a = rand(5, 50);
            b = rand(5, 50);
            correct = a + b;
            sign = '+';
        }

        setCorrectAnswer(correct);
        setProblemText(`${a} ${sign} ${b}`);

        const opts = new Set<number>();
        opts.add(correct);
        while (opts.size < 4) {
            let offset = rand(1, 10);
            let candidate = correct + (Math.random() > 0.5 ? offset : -offset);
            if (candidate > 0) opts.add(candidate);
        }

        setOptions(Array.from(opts).sort(() => Math.random() - 0.5));
        setSelectedOption(null);
    };

    const startGame = () => {
        setTimeLeft(sprintDuration);
        setCorrectCount(0);
        setIsRunning(true);
        setShowMainMenu(false);
        generateProblem();
    };

    const handleOptionPress = (value: number) => {
        if (!isRunning || selectedOption !== null) return;
        setSelectedOption(value);

        if (value === correctAnswer) {
            setCorrectCount(c => c + 1);
        }

        setTimeout(() => {
            if (isRunning) generateProblem();
        }, 200);
    };

    // Нагороди
    useEffect(() => {
        if (!isRunning && timeLeft === 0 && correctCount > 0) {
            const currentUser = auth().currentUser;
            if (!currentUser) return;
            const xp = correctCount * 5;
            const coins = correctCount * 2;
            setXpEarned(xp);
            setCoinsEarned(coins);
            xpService.addXP(currentUser.uid, xp, xp, 0);
            firestore().collection('users').doc(currentUser.uid).update({ coins: firestore.FieldValue.increment(coins) });
        }
    }, [isRunning, timeLeft]);

    const getBtnColor = (val: number) => {
        if (selectedOption === null) return isDarkMode ? '#333' : '#FFF';
        if (val === correctAnswer) return COLORS.correct;
        if (val === selectedOption) return COLORS.incorrect;
        return isDarkMode ? '#333' : '#FFF';
    };

    // --- ГОЛОВНЕ МЕНЮ ---
    if (showMainMenu) {
        return (
            <View style={[styles.container, { backgroundColor: isDarkMode ? '#121212' : '#F5F5F5' }]}>
                <Text style={styles.menuTitle}>Math Sprint</Text>

                <Text style={styles.label}>Tryb gry:</Text>
                <View style={styles.row}>
                    {(['multiply', 'add', 'mix'] as GameMode[]).map(m => (
                        <TouchableOpacity key={m}
                                          style={[styles.optionBtn, gameMode === m && styles.selectedOptionBtn]}
                                          onPress={() => setGameMode(m)}>
                            <Text style={[styles.optionText, gameMode === m && {color: 'white'}]}>
                                {m === 'multiply' ? 'Mnożenie' : m === 'add' ? 'Dodawanie' : 'Mix'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.label}>Czas:</Text>
                <View style={styles.row}>
                    {[30, 60].map(t => (
                        <TouchableOpacity key={t}
                                          style={[styles.optionBtn, sprintDuration === t && styles.selectedOptionBtn]}
                                          onPress={() => setSprintDuration(t)}>
                            <Text style={[styles.optionText, sprintDuration === t && {color: 'white'}]}>{t}s</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <TouchableOpacity style={styles.startBtn} onPress={startGame}>
                    <Text style={styles.startBtnText}>START</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Text style={{color: COLORS.grey}}>Wróć</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // --- ГРА ---
    return (
        <View style={[styles.container, { backgroundColor: isDarkMode ? '#000' : '#E0F7FA' }]}>
            <View style={styles.gameHeader}>
                <Text style={styles.timer}>{timeLeft}s</Text>
                <Text style={styles.score}>Wynik: {correctCount}</Text>
            </View>

            {timeLeft > 0 ? (
                <View style={styles.gameContent}>
                    {/* ZMIANA: Dodano dynamiczny kolor tekstu zadania */}
                    <Text style={[styles.problemText, { color: isDarkMode ? '#FFF' : '#333' }]}>
                        {problemText}
                    </Text>
                    <View style={styles.grid}>
                        {options.map(opt => (
                            <TouchableOpacity key={opt}
                                              style={[styles.gridBtn, {backgroundColor: getBtnColor(opt)}]}
                                              onPress={() => handleOptionPress(opt)}>
                                {/* ZMIANA: Dodano dynamiczny kolor tekstu odpowiedzi */}
                                <Text style={[styles.gridBtnText, { color: isDarkMode ? '#FFF' : '#333' }]}>
                                    {opt}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            ) : (
                <View style={styles.gameOver}>
                    {/* ZMIANA: Dodano dynamiczne kolory dla ekranu końca gry */}
                    <Text style={[styles.gameOverTitle, { color: isDarkMode ? '#FFF' : '#333' }]}>Koniec!</Text>
                    <Text style={[styles.gameOverScore, { color: isDarkMode ? '#EEE' : '#333' }]}>Wynik: {correctCount}</Text>
                    <Text style={styles.rewards}>+{xpEarned} XP  |  +{coinsEarned} Monet</Text>

                    <TouchableOpacity style={styles.startBtn} onPress={() => setShowMainMenu(true)}>
                        <Text style={styles.startBtnText}>Menu</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
    menuTitle: { fontSize: 40, fontWeight: 'bold', color: COLORS.primary, marginBottom: 40 },
    label: { fontSize: 18, color: COLORS.grey, marginBottom: 10, marginTop: 20 },
    row: { flexDirection: 'row', gap: 10 },
    optionBtn: { padding: 10, borderWidth: 1, borderColor: COLORS.primary, borderRadius: 8, minWidth: 80, alignItems: 'center' },
    selectedOptionBtn: { backgroundColor: COLORS.primary },
    optionText: { color: COLORS.primary, fontWeight: 'bold' },
    startBtn: { backgroundColor: COLORS.correct, paddingVertical: 15, paddingHorizontal: 50, borderRadius: 30, marginTop: 40, elevation: 5 },
    startBtnText: { color: 'white', fontSize: 24, fontWeight: 'bold' },
    backBtn: { marginTop: 20 },

    gameHeader: { position: 'absolute', top: 50, flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingHorizontal: 20 },
    timer: { fontSize: 24, fontWeight: 'bold', color: COLORS.error },
    score: { fontSize: 24, fontWeight: 'bold', color: COLORS.primary },

    gameContent: { alignItems: 'center', width: '100%' },
    problemText: { fontSize: 60, fontWeight: 'bold', marginBottom: 40, color: '#333' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 15, justifyContent: 'center' },
    gridBtn: { width: '45%', height: 100, justifyContent: 'center', alignItems: 'center', borderRadius: 15, elevation: 3 },
    gridBtnText: { fontSize: 32, fontWeight: 'bold', color: '#333' },

    gameOver: { alignItems: 'center' },
    gameOverTitle: { fontSize: 40, fontWeight: 'bold', color: '#333' },
    gameOverScore: { fontSize: 24, marginVertical: 10 },
    rewards: { fontSize: 20, color: COLORS.accent, fontWeight: 'bold', marginBottom: 30 }
});

export default MathSprintScreen;
