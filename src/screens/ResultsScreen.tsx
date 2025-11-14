// src/screens/ResultsScreen.tsx
import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import { MainAppStackParamList } from '../../App';
import { saveTestResult } from '../services/userStatsService';
import { checkAchievementsOnTestComplete } from '../services/achievementService';
// ✅ 1. Імпортуємо сервіс XP
import { awardXpAndCoins } from '../services/xpService';

type ResultsScreenProps = NativeStackScreenProps<MainAppStackParamList, 'Results'>;

function ResultsScreen({ route, navigation }: ResultsScreenProps) {
    const { score, total, originalTestParams } = route.params;

    const percentage = useMemo(() => {
        return total > 0 ? Math.round((score / total) * 100) : 0;
    }, [score, total]);

    useEffect(() => {
        console.log('[ResultsScreen] Saving result and checking achievements...');

        // Зберігаємо результат тесту
        saveTestResult(originalTestParams, score, total);

        // Перевіряємо досягнення
        checkAchievementsOnTestComplete(score, total, originalTestParams.topic);

        // ✅ 2. Нараховуємо XP та монети за тест
        // (Наприклад, 10 XP та 2 монети за кожну правильну відповідь)
        const xpGained = score * 10;
        const coinsGained = score * 2;

        // Викликаємо сервіс (він сам покаже Toast)
        awardXpAndCoins(xpGained, coinsGained);

    }, [score, total, originalTestParams]); // Додаємо залежності

    const getFeedback = () => {
        // ... (Логіка getFeedback без змін) ...
        if (percentage === 100) {
            return { message: 'Genialnie! Jesteś mistrzem!', icon: 'ribbon', color: '#FFC107' };
        }
        if (percentage >= 80) {
            return { message: 'Świetna robota! Tak trzymać!', icon: 'thumbs-up', color: '#4CAF50' };
        }
        if (percentage >= 50) {
            return { message: 'Dobrze Ci idzie! Poćwicz jeszcze trochę.', icon: 'rocket', color: '#00BCD4' };
        }
        return { message: 'Nie martw się, praktyka czyni mistrza!', icon: 'barbell', color: '#F44336' };
    };

    const feedback = getFeedback();

    const handleRetry = () => {
        navigation.replace('Test', originalTestParams);
    };

    const handleFinish = () => {
        navigation.popToTop();
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Wyniki Testu</Text>
                </View>

                <View style={styles.card}>
                    {/* ... (решта JSX без змін) ... */}
                    <Ionicons name={feedback.icon as any} size={80} color={feedback.color} />
                    <Text style={[styles.feedbackMessage, { color: feedback.color }]}>
                        {feedback.message}
                    </Text>
                    <Text style={styles.scoreText}>
                        Twój wynik to:
                    </Text>
                    <Text style={styles.scoreValue}>
                        {score} / {total}
                    </Text>
                    <Text style={styles.percentageText}>
                        ({percentage}%)
                    </Text>
                </View>

                <TouchableOpacity style={styles.buttonRetry} onPress={handleRetry}>
                    <Ionicons name="refresh-outline" size={24} color="#FFFFFF" />
                    <Text style={styles.buttonText}>Spróbuj jeszcze raz</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.buttonFinish} onPress={handleFinish}>
                    <Ionicons name="home-outline" size={24} color="#00796B" />
                    <Text style={[styles.buttonText, { color: '#00796B' }]}>Zakończ</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

// ... (Стилі 'styles' залишаються без змін) ...
const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#F0F4F8', },
    container: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20, },
    header: { marginBottom: 30, },
    headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#263238', },
    card: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 30, alignItems: 'center', width: '100%', marginBottom: 40, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, },
    feedbackMessage: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginTop: 15, marginBottom: 25, },
    scoreText: { fontSize: 18, color: '#546E7A', },
    scoreValue: { fontSize: 52, fontWeight: 'bold', color: '#37474F', marginVertical: 5, },
    percentageText: { fontSize: 20, color: '#78909C', },
    buttonRetry: { flexDirection: 'row', backgroundColor: '#00BCD4', paddingVertical: 15, paddingHorizontal: 30, borderRadius: 30, alignItems: 'center', justifyContent: 'center', width: '90%', marginBottom: 15, elevation: 3, },
    buttonFinish: { flexDirection: 'row', backgroundColor: '#B2EBF2', paddingVertical: 15, paddingHorizontal: 30, borderRadius: 30, alignItems: 'center', justifyContent: 'center', width: '90%', },
    buttonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', marginLeft: 10, },
});

export default ResultsScreen;
