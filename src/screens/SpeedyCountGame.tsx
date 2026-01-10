// src/screens/SpeedyCountGame.tsx

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
    useColorScheme, Animated, Alert, Dimensions
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS, FONT_SIZES, PADDING, MARGIN } from '../styles/theme';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { xpService } from '../services/xpService';
import { updateQuestProgress } from '../services/dailyQuestService';

type Equation = { text: string; isCorrect: boolean; };

const GAME_DURATION = 60;
const { width } = Dimensions.get('window');

// Генерація рівняння
const generateEquation = (currentScore: number): Equation => {
    let maxNum = 10;
    if (currentScore > 5) maxNum = 20;
    if (currentScore > 15) maxNum = 50;
    if (currentScore > 30) maxNum = 100;

    const a = Math.floor(Math.random() * maxNum) + 1;
    const b = Math.floor(Math.random() * maxNum) + 1;

    const opVal = Math.random();
    let operation: string;
    let correctAnswer: number;

    if (opVal < 0.5) {
        operation = '+';
        correctAnswer = a + b;
    } else {
        const max = Math.max(a, b);
        const min = Math.min(a, b);
        operation = '-';
        correctAnswer = max - min;
        return generateFormattedEquation(max, min, '-', correctAnswer);
    }

    return generateFormattedEquation(a, b, '+', correctAnswer);
};

const generateFormattedEquation = (a: number, b: number, op: string, correct: number): Equation => {
    const isCorrect = Math.random() < 0.5;
    let displayedAnswer = correct;

    if (!isCorrect) {
        let offset = Math.floor(Math.random() * 5) + 1;
        if (Math.random() < 0.5) offset = -offset;
        displayedAnswer = correct + offset;
        if (displayedAnswer === correct) displayedAnswer += 1;
        if (displayedAnswer < 0) displayedAnswer = 0;
    }

    return {
        text: `${a} ${op} ${b} = ${displayedAnswer}`,
        isCorrect: displayedAnswer === correct,
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

    const bgAnim = useRef(new Animated.Value(0)).current;

    const currentUser = auth().currentUser;
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';

    const resetGame = useCallback(() => {
        setScore(0);
        setXpEarned(0);
        setCoinsEarned(0);
        setTimeLeft(GAME_DURATION);
        setCurrentEquation(generateEquation(0));
        setGameState('idle');
        bgAnim.setValue(0);
    }, []);

    useFocusEffect(useCallback(() => { resetGame(); }, [resetGame]));

    useEffect(() => {
        if (gameState !== 'running' || timeLeft === 0) {
            if (timeLeft === 0 && gameState === 'running') setGameState('over');
            return;
        }
        const timerId = setInterval(() => setTimeLeft(p => p - 1), 1000);
        return () => clearInterval(timerId);
    }, [gameState, timeLeft]);

    useEffect(() => {
        if (gameState === 'over' && currentUser && score > 0) {
            const xp = score * 5;
            const coins = score * 2;
            setXpEarned(xp);
            setCoinsEarned(coins);
            xpService.addXP(currentUser.uid, xp, xp, 0);
            firestore().collection('users').doc(currentUser.uid).update({ coins: firestore.FieldValue.increment(coins) });
            updateQuestProgress('GAMES_PLAYED');
        }
    }, [gameState, currentUser]);

    const startGame = useCallback(() => {
        setScore(0);
        setCurrentEquation(generateEquation(0));
        setGameState('running');
    }, []);

    const flashBackground = (correct: boolean) => {
        bgAnim.setValue(correct ? 1 : -1);
        Animated.timing(bgAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: false
        }).start();
    };

    const handleAnswer = useCallback((userAnswer: boolean) => {
        if (gameState !== 'running' || !currentEquation) return;

        const isCorrect = userAnswer === currentEquation.isCorrect;
        flashBackground(isCorrect);

        if (isCorrect) {
            setScore(prev => {
                const newScore = prev + 1;
                setCurrentEquation(generateEquation(newScore));
                return newScore;
            });
        } else {
            setTimeLeft(prev => Math.max(0, prev - 3));
            setCurrentEquation(generateEquation(score));
        }
    }, [gameState, currentEquation, score]);

    const bgColorInterpolation = bgAnim.interpolate({
        inputRange: [-1, 0, 1],
        outputRange: ['rgba(255, 0, 0, 0.2)', isDarkMode ? COLORS.backgroundDark : COLORS.backgroundLight, 'rgba(0, 255, 0, 0.2)']
    });

    const themeStyles = {
        text: { color: isDarkMode ? COLORS.textDark : COLORS.textLight },
        card: { backgroundColor: isDarkMode ? COLORS.cardDark : COLORS.white },
        correctButton: { backgroundColor: COLORS.correct },
        incorrectButton: { backgroundColor: COLORS.incorrect },
    };

    if (gameState === 'over') {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: themeStyles.card.backgroundColor }]}>
                <View style={[styles.card, themeStyles.card]}>
                    <Text style={[styles.title, themeStyles.text]}>Czas minął!</Text>
                    <Ionicons name="stopwatch-outline" size={80} color={COLORS.primary} />
                    <Text style={[styles.equationText, themeStyles.text]}>Wynik: {score}</Text>
                    <Text style={[styles.rewardText, { color: COLORS.accent }]}>+ {xpEarned} XP</Text>
                    <Text style={[styles.rewardText, { color: '#FFD700' }]}>+ {coinsEarned} Monet</Text>
                    <TouchableOpacity style={[styles.button, {marginTop: 30}]} onPress={resetGame}>
                        <Text style={styles.buttonText}>Zagraj ponownie</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.menuButton} onPress={() => navigation.goBack()}>
                        <Text style={styles.menuButtonText}>Menu</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    if (gameState === 'idle') {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: themeStyles.card.backgroundColor }]}>
                <View style={[styles.card, themeStyles.card]}>
                    <Text style={[styles.title, themeStyles.text]}>Szybkie Liczenie</Text>
                    <Ionicons name="speedometer-outline" size={80} color={COLORS.accent} />
                    <Text style={[styles.rulesText, themeStyles.text]}>
                        60 sekund. Tak czy Nie?{"\n"}Im dalej, tym trudniej!
                    </Text>
                    <TouchableOpacity style={styles.button} onPress={startGame}>
                        <Text style={styles.buttonText}>START</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <Animated.View style={[styles.container, { backgroundColor: bgColorInterpolation }]}>
            <SafeAreaView style={{flex: 1, width: '100%', alignItems: 'center'}}>
                <View style={styles.header}>
                    <View style={styles.pill}><Text style={styles.pillText}>⏳ {timeLeft}s</Text></View>
                    <View style={styles.pill}><Text style={styles.pillText}>🏆 {score}</Text></View>
                </View>

                <View style={styles.gameArea}>
                    {/* ✅ ВИПРАВЛЕНО: Додано adjustsFontSizeToFit та numberOfLines */}
                    <Text
                        style={[styles.equationText, themeStyles.text]}
                        adjustsFontSizeToFit
                        numberOfLines={1}
                        minimumFontScale={0.5}
                    >
                        {currentEquation?.text}
                    </Text>
                </View>

                <View style={styles.controls}>
                    <TouchableOpacity style={[styles.controlButton, themeStyles.correctButton]} onPress={() => handleAnswer(true)}>
                        <Ionicons name="checkmark" size={60} color="white" />
                        <Text style={styles.controlText}>TAK</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.controlButton, themeStyles.incorrectButton]} onPress={() => handleAnswer(false)}>
                        <Ionicons name="close" size={60} color="white" />
                        <Text style={styles.controlText}>NIE</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', padding: PADDING.medium },
    card: { width: '100%', borderRadius: 20, padding: PADDING.large, alignItems: 'center', elevation: 5, gap: MARGIN.medium },
    title: { fontSize: FONT_SIZES.title, fontWeight: 'bold' },
    rulesText: { fontSize: FONT_SIZES.medium, textAlign: 'center', marginTop: 20, lineHeight: 24 },
    button: { backgroundColor: COLORS.primary, paddingVertical: 15, paddingHorizontal: 40, borderRadius: 30, elevation: 3 },
    buttonText: { color: 'white', fontSize: 20, fontWeight: 'bold' },
    menuButton: { marginTop: 20 },
    menuButtonText: { color: COLORS.grey, fontSize: 16 },
    rewardText: { fontSize: 24, fontWeight: 'bold', marginTop: 5 },

    // ✅ ОНОВЛЕНО: Зменшено базовий шрифт і додано паддінг
    equationText: {
        fontSize: 52, // Було 56 (або більше)
        fontWeight: 'bold',
        textAlign: 'center',
        paddingHorizontal: 10,
        width: '100%' // Щоб займати всю ширину для масштабування
    },

    header: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 20, paddingHorizontal: 20 },
    pill: { backgroundColor: 'rgba(0,0,0,0.1)', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 },
    pillText: { fontSize: 18, fontWeight: 'bold' },
    gameArea: { flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' },
    controls: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginBottom: 40 },
    controlButton: { width: 140, height: 140, borderRadius: 70, justifyContent: 'center', alignItems: 'center', elevation: 5 },
    controlText: { color: 'white', fontSize: 24, fontWeight: 'bold', marginTop: 5 }
});

export default SpeedyCountGame;
