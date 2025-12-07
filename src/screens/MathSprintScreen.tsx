// src/screens/MathSprintScreen.tsx

import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    useColorScheme,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { xpService } from '../services/xpService';
import { useNavigation } from '@react-navigation/native';

const MathSprintScreen: React.FC = () => {
    const navigation = useNavigation();
    const [problemText, setProblemText] = useState<string>('');
    const [correctAnswer, setCorrectAnswer] = useState<number>(0);
    const [options, setOptions] = useState<number[]>([]);
    const [isRunning, setIsRunning] = useState<boolean>(false);
    const [timeLeft, setTimeLeft] = useState<number>(30);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [correctCount, setCorrectCount] = useState<number>(0);
    const [sprintDuration, setSprintDuration] = useState<number>(30);
    const [lastAnswerResult, setLastAnswerResult] = useState<string>('');
    const [showMainMenu, setShowMainMenu] = useState<boolean>(true);

    const [xpEarned, setXpEarned] = useState<number>(0);
    const [coinsEarned, setCoinsEarned] = useState<number>(0);

    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';

    // Все кнопки нежно-голубые
    const buttonColor = '#7EC8E3';

    const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

    // Таймер
    useEffect(() => {
        if (!isRunning) return;
        if (timeLeft <= 0) {
            setIsRunning(false);
            setProblemText('');
            setOptions([]);
            return;
        }

        timerRef.current = setInterval(() => setTimeLeft(t => t - 1), 1000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = null;
        };
    }, [isRunning, timeLeft]);

    const generateProblem = () => {
        const a = rand(1, 10);
        const b = rand(1, 10);
        const correct = a * b;
        setCorrectAnswer(correct);
        setProblemText(`${a} × ${b}`);

        const opts = new Set<number>();
        opts.add(correct);
        while (opts.size < 4) {
            let candidate = correct + (Math.random() > 0.5 ? rand(1, 5) : -rand(1, 5));
            if (candidate <= 0) candidate = Math.abs(candidate) + 1;
            opts.add(candidate);
        }

        const optsArr = Array.from(opts);
        for (let i = optsArr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [optsArr[i], optsArr[j]] = [optsArr[j], optsArr[i]];
        }
        setOptions(optsArr);
        setSelectedOption(null);
        setLastAnswerResult('');
    };

    const startGame = (duration?: number) => {
        const time = duration || sprintDuration;
        setSprintDuration(time);
        setTimeLeft(time);
        setCorrectCount(0);
        setXpEarned(0);
        setCoinsEarned(0);
        setIsRunning(true);
        setShowMainMenu(false);
        generateProblem();
    };

    const handleOptionPress = (value: number) => {
        if (!isRunning || selectedOption !== null) return;

        setSelectedOption(value);

        if (value === correctAnswer) {
            setCorrectCount(c => c + 1);
            setLastAnswerResult('Poprawnie!');
        } else {
            setLastAnswerResult('Błąd!');
        }

        setTimeout(() => {
            if (isRunning) generateProblem();
        }, 300);
    };

    const getButtonColor = (value: number) => {
        if (selectedOption === null) return buttonColor;
        if (value === correctAnswer) return '#2ecc71';
        if (value === selectedOption && value !== correctAnswer) return '#e74c3c';
        return buttonColor;
    };

    // Начисление наград
    useEffect(() => {
        if (!isRunning && timeLeft === 0 && correctCount > 0) {
            const currentUser = auth().currentUser;
            if (!currentUser) return;

            const handleRewards = async () => {
                const XP_PER_CORRECT = 5;
                const COINS_PER_CORRECT = 2;

                const calculatedXp = correctCount * XP_PER_CORRECT;
                const calculatedCoins = correctCount * COINS_PER_CORRECT;

                setXpEarned(calculatedXp);
                setCoinsEarned(calculatedCoins);

                xpService.addXP(currentUser.uid, calculatedXp, calculatedXp, 0);
                const userDocRef = firestore().collection('users').doc(currentUser.uid);
                await userDocRef.update({
                    coins: firestore.FieldValue.increment(calculatedCoins),
                });
            };

            handleRewards();
        }
    }, [isRunning, timeLeft, correctCount]);

    // Главное меню
    if (showMainMenu) {
        return (
            <View style={[styles.container, { backgroundColor: isDarkMode ? '#000' : '#fff' }]}>
                <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
                <Text style={[styles.title, { color: '#FFD700' }]}>Math Sprint</Text>
                <Text style={[styles.subtitle, { color: isDarkMode ? '#fff' : '#000', textAlign: 'center', marginBottom: 20 }]}>
                    To jest sprint tabliczki mnożenia. Odpowiadaj jak najszybciej na podawane działania.
                </Text>

                <Text style={[styles.subtitle, { color: isDarkMode ? '#fff' : '#000', marginBottom: 10 }]}>
                    Wybierz czas sprintu:
                </Text>

                <View style={styles.durationButtons}>
                    {[30, 45, 60].map((sec) => (
                        <TouchableOpacity
                            key={sec}
                            style={[styles.durationButton, { backgroundColor: sprintDuration === sec ? buttonColor : '#444' }]}
                            onPress={() => setSprintDuration(sec)}
                        >
                            <Text style={styles.durationText}>{sec}s</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <TouchableOpacity style={[styles.startButton, { backgroundColor: buttonColor }]} onPress={() => startGame()}>
                    <Text style={styles.startButtonText}>Zagraj</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.startButton, { backgroundColor: '#444', marginTop: 12 }]} onPress={() => navigation.goBack()}>
                    <Text style={styles.startButtonText}>Wróć do menu gier</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // Игровой экран
    return (
        <View style={[styles.container, { backgroundColor: isDarkMode ? '#000' : '#fff' }]}>
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

            {/* Верхний блок с текущим счётом */}
            <View style={styles.header}>
                <Text style={[styles.headerText, { color: isDarkMode ? '#fff' : '#000' }]}>Wynik: {correctCount}</Text>
            </View>

            {isRunning && (
                <View style={[styles.card, { backgroundColor: isDarkMode ? '#222' : '#eee' }]}>
                    <Text style={[styles.problem, { color: '#FFD700' }]}>{problemText}</Text>

                    <View style={styles.options}>
                        {options.map((opt) => (
                            <TouchableOpacity
                                key={opt}
                                style={[styles.optionButton, { backgroundColor: getButtonColor(opt) }]}
                                onPress={() => handleOptionPress(opt)}
                            >
                                <Text style={styles.optionText}>{opt}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {selectedOption !== null && (
                        <Text style={[
                            styles.answerResult,
                            { color: lastAnswerResult === 'Poprawnie!' ? '#2ecc71' : '#e74c3c' }
                        ]}>
                            {lastAnswerResult}
                        </Text>
                    )}

                    {/* Время внизу */}
                    <Text style={[
                        styles.timerText,
                        {
                            color: timeLeft <= 10 ? 'red' : isDarkMode ? '#fff' : '#000',
                            marginTop: 20,
                            fontSize: 24,
                            fontWeight: 'bold'
                        }
                    ]}>Czas: {timeLeft}s</Text>
                </View>
            )}

            {/* Game Over */}
            {!isRunning && timeLeft === 0 && (
                <View style={styles.gameOverBox}>
                    <Text style={[styles.gameOverText, { color: '#FFD700' }]}>Koniec sprintu!</Text>
                    <Text style={[styles.gameOverText, { color: '#FFD700' }]}>Twój wynik: {correctCount}</Text>

                    <View style={{ flexDirection: 'row', gap: 20, marginVertical: 10 }}>
                        <Text style={[styles.rewardText, { color: '#FFD700', fontSize: 36 }]}>{xpEarned} XP</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="cash-outline" size={36} color="#00FF00" />
                            <Text style={[styles.rewardText, { color: '#00FF00', fontSize: 36, marginLeft: 6 }]}>{coinsEarned}</Text>
                        </View>
                    </View>

                    <View style={styles.endButtonsColumn}>
                        <TouchableOpacity style={[styles.startButton, { backgroundColor: buttonColor }]} onPress={() => startGame()}>
                            <Text style={styles.startButtonText}>Zagraj ponownie</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.startButton, { backgroundColor: '#444', marginTop: 12 }]} onPress={() => navigation.goBack()}>
                            <Text style={styles.startButtonText}>Wróć do menu gier</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
    title: { fontSize: 36, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    subtitle: { fontSize: 18, marginBottom: 10, textAlign: 'center' },
    durationButtons: { flexDirection: 'row', marginBottom: 20 },
    durationButton: { marginHorizontal: 6, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
    durationText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
    startButton: { paddingVertical: 14, paddingHorizontal: 30, borderRadius: 8, alignItems: 'center', width: '70%' },
    startButtonText: { color: '#fff', fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
    card: { width: '90%', alignItems: 'center', padding: 16, borderRadius: 12 },
    problem: { fontSize: 36, fontWeight: 'bold', marginBottom: 20 },
    options: { flexDirection: 'column', justifyContent: 'center', width: '100%', marginBottom: 10 },
    optionButton: { width: '100%', marginVertical: 6, padding: 16, borderRadius: 8, alignItems: 'center' },
    optionText: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
    answerResult: { fontSize: 26, fontWeight: 'bold', marginTop: 10 },
    header: { position: 'absolute', top: 60, flexDirection: 'row', justifyContent: 'center', width: '90%' },
    headerText: { fontSize: 22, fontWeight: 'bold' },
    timerText: { fontSize: 24, fontWeight: 'bold' },
    gameOverBox: { alignItems: 'center', marginTop: 20 },
    gameOverText: { fontSize: 28, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
    rewardText: { fontWeight: 'bold' },
    endButtonsColumn: { marginTop: 20, width: '80%', justifyContent: 'center', alignItems: 'center' },
});

export default MathSprintScreen;
