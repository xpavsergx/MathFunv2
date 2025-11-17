// src/screens/ResultsScreen.tsx

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme, SafeAreaView, Platform } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { MainAppStackParamList } from '../../App';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { COLORS, FONT_SIZES, PADDING, MARGIN } from '../styles/theme';
import * as XpModule from '../services/xpService';
import auth from '@react-native-firebase/auth';

// --- ✅ 1. ІМПОРТУЄМО ПРАВИЛЬНИЙ СЕРВІС СТАТИСТИКИ ---
import { incrementUserStats } from '../services/userStatsService';

// --- ❌ 2. ВИДАЛЯЄМО СТАРИЙ ІМПОРТ ---
// import { checkAchievementsOnTestComplete } from '../services/achievementService'; // (ВИДАЛЕНО)

type ResultsScreenRouteProp = RouteProp<{
    params: {
        score: number;
        total: number;
        originalTestParams: MainAppStackParamList['Test'];
        isDoubleXp?: boolean;
    };
}, 'params'>;

export default function ResultsScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<ResultsScreenRouteProp>();

    const { score, total, originalTestParams, isDoubleXp = false } = route.params;

    const percentage = Math.round((score / total) * 100);
    const currentUser = auth().currentUser;

    const [xpGained, setXpGained] = useState(0);

    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';

    const themeStyles = {
        container: { backgroundColor: isDarkMode ? COLORS.backgroundDark : COLORS.backgroundLight },
        card: { backgroundColor: isDarkMode ? COLORS.cardDark : COLORS.white },
        text: { color: isDarkMode ? COLORS.textDark : COLORS.textLight },
        scoreText: { color: isDarkMode ? COLORS.primaryDarkTheme : COLORS.primary },
        xpText: { color: isDarkMode ? '#FFD700' : '#E6A23C' },
        button: { backgroundColor: isDarkMode ? COLORS.primaryDarkTheme : COLORS.primary },
        buttonText: { color: COLORS.white },
        secondaryButton: { backgroundColor: isDarkMode ? COLORS.cardDark : COLORS.white, borderWidth: 1, borderColor: isDarkMode ? COLORS.primaryDarkTheme : COLORS.primary },
        secondaryButtonText: { color: isDarkMode ? COLORS.primaryDarkTheme : COLORS.primary },
    };

    // --- ✅ 3. ОНОВЛЮЄМО useEffect ---
    useEffect(() => {
        if (currentUser) {

            // --- Логіка XP (залишається, вона правильна) ---
            // Вона АВТОМАТИЧНО перевірить досягнення за РІВЕНЬ
            let baseActiveXp = score * 5;
            let basePassiveXp = Math.round(percentage / 10);

            if (isDoubleXp) {
                baseActiveXp = baseActiveXp * 2;
                basePassiveXp = basePassiveXp * 2;
            }
            const totalXp = baseActiveXp + basePassiveXp;
            setXpGained(totalXp);
            XpModule.xpService.addXP(currentUser.uid, totalXp, baseActiveXp, basePassiveXp);

            // --- Логіка Статистики (НОВА) ---
            // Вона АВТОМАТИЧНО перевірить досягнення за СТАТИСТИКУ
            // (Ми оновлюємо статистику, лише якщо це не дуель,
            // або якщо ми хочемо, щоб дуелі теж зараховувались - тоді це правильно)
            incrementUserStats({
                testsCompleted: 1,
                correctAnswersTotal: score,
                // Додаємо 1 до "бездоганних тестів", лише якщо рахунок 100%
                flawlessTests: (score === total && total > 0) ? 1 : 0,
            });

            // --- ❌ 4. ВИДАЛЯЄМО СТАРИЙ КОД, ЩО СПРИЧИНЯВ ПОМИЛКУ ---
            // const topic = ... (ВИДАЛЕНО)
            // checkAchievementsOnTestComplete(...); // (ВИДАЛЕНО)
        }
    }, [currentUser, score, total, isDoubleXp, originalTestParams]); // (Залежності залишаємо)

    const handleRetry = () => {
        navigation.replace('Test', originalTestParams);
    };

    const handleFinish = () => {
        // Логіка повернення до списку підтем
        navigation.navigate('HomeStack', {
            screen: 'SubTopicList',
            params: {
                grade: originalTestParams.grade,
                topic: originalTestParams.topic
            },
        });
    };

    const getFeedback = () => {
        if (percentage === 100) return "Perfekcyjnie! 🌟";
        if (percentage >= 80) return "Świetna robota! 👍";
        if (percentage >= 50) return "Nieźle, tak trzymaj!";
        return "Poćwicz jeszcze trochę! 📚";
    };

    return (
        <SafeAreaView style={[styles.container, themeStyles.container]}>
            <View style={styles.content}>
                <View style={[styles.card, themeStyles.card]}>
                    <Text style={[styles.title, themeStyles.text]}>Test Ukończony!</Text>
                    <Text style={[styles.scoreText, themeStyles.scoreText]}>
                        {score} / {total}
                    </Text>
                    <Text style={[styles.percentageText, themeStyles.text]}>
                        ({percentage}%)
                    </Text>
                    <Text style={[styles.feedbackText, themeStyles.text]}>
                        {getFeedback()}
                    </Text>
                    <View style={styles.xpContainer}>
                        {isDoubleXp && (
                            <Text style={[styles.xpBonusText, themeStyles.xpText]}>
                                BONUS: PODWÓJNE XP! 🔥
                            </Text>
                        )}
                        <Text style={[styles.xpText, themeStyles.xpText]}>
                            + {xpGained} XP
                        </Text>
                    </View>
                </View>

                <View style={styles.buttonContainer}>
                    <TouchableOpacity style={[styles.button, themeStyles.button]} onPress={handleRetry}>
                        <Ionicons name="refresh-outline" size={20} color={COLORS.white} />
                        <Text style={[styles.buttonText, themeStyles.buttonText]}>Spróbuj ponownie</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.button, themeStyles.secondaryButton]}
                        onPress={handleFinish}
                    >
                        <Ionicons name="checkmark-done-outline" size={20} color={themeStyles.secondaryButtonText.color} />
                        <Text style={[styles.buttonText, themeStyles.secondaryButtonText]}>Zakończ</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

// (Стилі без змін)
const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
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
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
    },
    title: {
        fontSize: FONT_SIZES.title,
        fontWeight: 'bold',
        marginBottom: MARGIN.medium,
    },
    scoreText: {
        fontSize: 64,
        fontWeight: 'bold',
        marginBottom: MARGIN.small,
    },
    percentageText: {
        fontSize: FONT_SIZES.large,
        fontWeight: '500',
        marginBottom: MARGIN.large,
    },
    feedbackText: {
        fontSize: FONT_SIZES.xlarge,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: MARGIN.large,
    },
    xpContainer: {
        alignItems: 'center',
        marginTop: MARGIN.medium,
    },
    xpBonusText: {
        fontSize: FONT_SIZES.medium,
        fontWeight: 'bold',
        marginBottom: MARGIN.small,
    },
    xpText: {
        fontSize: FONT_SIZES.large,
        fontWeight: 'bold',
    },
    buttonContainer: {
        width: '100%',
        marginTop: MARGIN.large,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: PADDING.medium,
        borderRadius: 25,
        marginBottom: MARGIN.medium,
        elevation: 2,
    },
    buttonText: {
        fontSize: FONT_SIZES.medium,
        fontWeight: 'bold',
        marginLeft: MARGIN.small,
    },
});
