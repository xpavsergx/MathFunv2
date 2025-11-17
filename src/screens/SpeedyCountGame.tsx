// src/screens/SpeedyCountGame.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, useColorScheme, ActivityIndicator, Alert } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS, FONT_SIZES, PADDING, MARGIN } from '../styles/theme';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { xpService } from '../services/xpService';

type Equation = {
    text: string;
    isCorrect: boolean;
};

const GAME_DURATION = 60; // 60 секунд

// (generateEquation - без змін)
const generateEquation = (): Equation => {
    const a = Math.floor(Math.random() * 10) + 1;
    const b = Math.floor(Math.random() * 10) + 1;
    const opVal = Math.random();
    let operation: string;
    let correctAnswer: number;
    if (opVal < 0.5) { operation = '+'; correctAnswer = a + b; }
    else { operation = '-'; correctAnswer = a - b; }
    const isCorrect = Math.random() < 0.5;
    let displayedAnswer: number;
    if (isCorrect) {
        displayedAnswer = correctAnswer;
    } else {
        let offset = Math.floor(Math.random() * 3) + 1;
        if (Math.random() < 0.5) offset = -offset;
        displayedAnswer = correctAnswer + offset;
        if (displayedAnswer === correctAnswer) displayedAnswer += 1;
    }
    return {
        text: `${a} ${operation} ${b} = ${displayedAnswer}`,
        isCorrect: displayedAnswer === correctAnswer,
    };
};

function SpeedyCountGame() {
    const navigation = useNavigation();
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
    const [currentEquation, setCurrentEquation] = useState<Equation | null>(null);
    const [gameState, setGameState] = useState<'idle' | 'running' | 'over'>('idle');
    const [xpEarned, setXpEarned] = useState(0);
    const [coinsEarned, setCoinsEarned] = useState(0);

    const currentUser = auth().currentUser;
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';

    // (Стилі теми - без змін)
    const themeStyles = {
        container: { backgroundColor: isDarkMode ? COLORS.backgroundDark : COLORS.backgroundLight },
        text: { color: isDarkMode ? COLORS.textDark : COLORS.textLight },
        card: { backgroundColor: isDarkMode ? COLORS.cardDark : COLORS.white },
        correctButton: { backgroundColor: COLORS.correct },
        incorrectButton: { backgroundColor: COLORS.incorrect },
    };

    // --- ✅ 1. 'resetGame' тепер обгорнута в useCallback ---
    const resetGame = useCallback(() => {
        setScore(0);
        setXpEarned(0);
        setCoinsEarned(0);
        setTimeLeft(GAME_DURATION);
        setCurrentEquation(generateEquation());
        setGameState('idle');
    }, []); // Порожній масив залежностей, оскільки вона не залежить від пропсів

    // --- ✅ 2. 'useFocusEffect' тепер безпечно залежить від 'resetGame' ---
    useFocusEffect(
        useCallback(() => {
            resetGame();
        }, [resetGame]) // Додано resetGame як залежність
    );

    // (Таймер гри - без змін)
    useEffect(() => {
        if (gameState !== 'running' || timeLeft === 0) {
            if (timeLeft === 0) {
                setGameState('over');
            }
            return;
        }
        const timerId = setInterval(() => {
            setTimeLeft(prev => prev - 1);
        }, 1000);
        return () => clearInterval(timerId);
    }, [gameState, timeLeft]);


    // (Логіка нагороди - без змін)
    useEffect(() => {
        if (gameState === 'over' && currentUser && score > 0) {

            const handleGameEnd = async () => {
                const calculatedXp = score * 5;
                const calculatedCoins = score * 2;

                setXpEarned(calculatedXp);
                setCoinsEarned(calculatedCoins);

                xpService.addXP(currentUser.uid, calculatedXp, calculatedXp, 0);

                const userDocRef = firestore().collection('users').doc(currentUser.uid);
                await userDocRef.update({
                    coins: firestore.FieldValue.increment(calculatedCoins),
                });
            };

            handleGameEnd();
        }
    }, [gameState, currentUser, score]);

    // --- ✅ 3. 'startGame' тепер теж обгорнута в useCallback ---
    const startGame = useCallback(() => {
        setScore(0);
        setCurrentEquation(generateEquation());
        setGameState('running');
    }, []); // Порожній масив

    // --- ✅ 4. 'handleAnswer' теж обгорнута в useCallback ---
    const handleAnswer = useCallback((userAnswer: boolean) => {
        if (gameState !== 'running' || !currentEquation) return;

        if (userAnswer === currentEquation.isCorrect) {
            setScore(prev => prev + 1);
        } else {
            setTimeLeft(prev => Math.max(0, prev - 2));
        }

        if (timeLeft > 0) {
            setCurrentEquation(generateEquation());
        }
    }, [gameState, currentEquation, timeLeft]); // Залежить від цих станів


    // --- Рендеринг станів гри ---

    if (gameState === 'over') {
        return (
            <SafeAreaView style={[styles.container, themeStyles.container]}>
                <View style={[styles.card, themeStyles.card]}>
                    <Text style={[styles.title, themeStyles.text]}>Czas minął!</Text>
                    <Ionicons name="stopwatch-outline" size={80} color={COLORS.primary} />
                    <Text style={[styles.equationText, themeStyles.text]}>Twój wynik:</Text>
                    <Text style={[styles.finalScore, themeStyles.text]}>{score}</Text>

                    <Text style={[styles.rewardText, { color: COLORS.accent }]}>+ {xpEarned} XP</Text>
                    <Text style={[styles.rewardText, { color: COLORS.primaryDarkTheme }]}>+ {coinsEarned} 🪙</Text>

                    <TouchableOpacity style={[styles.button, themeStyles.button]} onPress={resetGame}>
                        <Text style={styles.buttonText}>Zagraj ponownie</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.menuButton} onPress={() => navigation.goBack()}>
                        <Text style={styles.menuButtonText}>Menu Gier</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    if (gameState === 'idle') {
        return (
            <SafeAreaView style={[styles.container, themeStyles.container]}>
                <View style={[styles.card, themeStyles.card]}>
                    <Text style={[styles.title, themeStyles.text]}>Szybkie Liczenie</Text>
                    <Ionicons name="speedometer-outline" size={80} color={COLORS.accent} />
                    <Text style={[styles.rulesText, themeStyles.text]}>
                        Masz 60 sekund. Odpowiedz "Tak" lub "Nie" na jak najwięcej równań.
                    </Text>
                    <Text style={[styles.rulesText, themeStyles.text, { color: COLORS.incorrect }]}>
                        Błędna odpowiedź kosztuje 2 sekundy!
                    </Text>

                    <TouchableOpacity
                        style={[styles.button, themeStyles.button]}
                        onPress={startGame}
                    >
                        <Text style={styles.buttonText}>Start!</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    // (gameState === 'running')
    return (
        <SafeAreaView style={[styles.container, themeStyles.container]}>
            <View style={styles.header}>
                <Text style={[styles.headerText, themeStyles.text]}>Czas: {timeLeft}</Text>
                <Text style={[styles.headerText, themeStyles.text]}>Wynik: {score}</Text>
            </View>
            <View style={styles.gameArea}>
                <Text style={[styles.equationText, themeStyles.text]}>{currentEquation?.text}</Text>
            </View>
            <View style={styles.controls}>
                <TouchableOpacity style={[styles.controlButton, themeStyles.correctButton]} onPress={() => handleAnswer(true)}>
                    <Ionicons name="checkmark-outline" size={50} color={COLORS.white} />
                    <Text style={styles.buttonText}>Tak</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.controlButton, themeStyles.incorrectButton]} onPress={() => handleAnswer(false)}>
                    <Ionicons name="close-outline" size={50} color={COLORS.white} />
                    <Text style={styles.buttonText}>Nie</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

// (Стилі - без змін)
const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: PADDING.medium,
    },
    card: {
        width: '100%',
        borderRadius: 20,
        padding: PADDING.large,
        alignItems: 'center',
        elevation: 5,
        gap: MARGIN.medium,
    },
    title: {
        fontSize: FONT_SIZES.title,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    rulesText: {
        fontSize: FONT_SIZES.medium,
        textAlign: 'center',
        lineHeight: 24,
    },
    button: {
        backgroundColor: COLORS.primary,
        paddingVertical: PADDING.medium,
        paddingHorizontal: PADDING.large,
        borderRadius: 25,
        marginTop: MARGIN.medium,
    },
    buttonText: {
        color: COLORS.white,
        fontSize: FONT_SIZES.large,
        fontWeight: 'bold',
    },
    menuButton: {
        marginTop: MARGIN.small,
    },
    menuButtonText: {
        color: COLORS.grey,
        fontSize: FONT_SIZES.medium,
    },
    finalScore: {
        fontSize: 64,
        fontWeight: 'bold',
        color: COLORS.primary,
        marginVertical: MARGIN.small,
    },
    rewardText: {
        fontSize: FONT_SIZES.large,
        fontWeight: 'bold',
    },
    header: {
        position: 'absolute',
        top: 60,
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        paddingHorizontal: PADDING.large,
    },
    headerText: {
        fontSize: FONT_SIZES.large,
        fontWeight: 'bold',
    },
    gameArea: {
        flex: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    equationText: {
        fontSize: 48,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    controls: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        width: '100%',
    },
    controlButton: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        gap: 5,
    },
});

export default SpeedyCountGame;
