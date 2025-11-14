// src/screens/ResultsScreen.tsx

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme, SafeAreaView, Platform } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { MainAppStackParamList } from '../../App';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { COLORS, FONT_SIZES, PADDING, MARGIN } from '../styles/theme';
// --- ✅ 1. ВИПРАВЛЕНИЙ ІМПОРТ ---
// Ми імпортуємо *як модуль*, щоб уникнути помилок 'undefined'
import * as XpModule from '../services/xpService';
import auth from '@react-native-firebase/auth';

// --- ✅ 2. ОНОВЛЮЄМО ТИП ---
type ResultsScreenRouteProp = RouteProp<{
    params: {
        score: number;
        total: number;
        originalTestParams: MainAppStackParamList['Test'];
        isDoubleXp?: boolean; // <-- 'isDoubleXp' ПОВЕРНУВСЯ
    };
}, 'params'>;

export default function ResultsScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<ResultsScreenRouteProp>();

    // --- ✅ 3. ОТРИМУЄМО 'isDoubleXp' ---
    const { score, total, originalTestParams, isDoubleXp = false } = route.params;

    const percentage = Math.round((score / total) * 100);
    const currentUser = auth().currentUser;

    // --- ✅ 4. ПОВЕРТАЄМО 'xpGained' ---
    const [xpGained, setXpGained] = useState(0);

    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';

    // Динамічні стилі (з вашого файлу)
    const themeStyles = {
        container: { backgroundColor: isDarkMode ? COLORS.backgroundDark : COLORS.backgroundLight },
        card: { backgroundColor: isDarkMode ? COLORS.cardDark : COLORS.white },
        text: { color: isDarkMode ? COLORS.textDark : COLORS.textLight },
        scoreText: { color: isDarkMode ? COLORS.primaryDarkTheme : COLORS.primary },
        // ✅ 5. ПОВЕРТАЄМО СТИЛЬ 'xpText' ---
        xpText: { color: isDarkMode ? '#FFD700' : '#E6A23C' },
        button: { backgroundColor: isDarkMode ? COLORS.primaryDarkTheme : COLORS.primary },
        buttonText: { color: COLORS.white },
        secondaryButton: { backgroundColor: isDarkMode ? COLORS.cardDark : COLORS.white, borderWidth: 1, borderColor: isDarkMode ? COLORS.primaryDarkTheme : COLORS.primary },
        secondaryButtonText: { color: isDarkMode ? COLORS.primaryDarkTheme : COLORS.primary },
    };

    // --- ✅ 6. ПОВЕРТАЄМО ЛОГІКУ XP ---
    useEffect(() => {
        if (currentUser) {
            let baseActiveXp = score * 5;
            let basePassiveXp = Math.round(percentage / 10);

            if (isDoubleXp) {
                baseActiveXp = baseActiveXp * 2;
                basePassiveXp = basePassiveXp * 2;
            }

            const totalXp = baseActiveXp + basePassiveXp;
            setXpGained(totalXp);

            // --- ✅ 7. ВИПРАВЛЕНИЙ ВИКЛИК ФУНКЦІЇ ---
            // Використовуємо 'XpModule.xpService.addXP'
            XpModule.xpService.addXP(currentUser.uid, totalXp, baseActiveXp, basePassiveXp);
        }
    }, [currentUser, score, total, isDoubleXp]); // (Залежності виправлено)

    const handleRetry = () => {
        navigation.replace('Test', originalTestParams);
    };

    const handleFinish = () => {
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

                    {/* --- ✅ 8. ПОВЕРТАЄМО БЛОК XP --- */}
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

// --- ✅ 9. ПОВЕРТАЄМО СТИЛІ ДЛЯ XP ---
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
    // (Стилі XP додано сюди)
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
