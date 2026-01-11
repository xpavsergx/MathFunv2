// src/screens/ResultsScreen.tsx

import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    ScrollView,
    SafeAreaView,
    Platform,
    useColorScheme,
    StatusBar
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainAppStackParamList } from '../../src/navigation/types';
import { COLORS, PADDING, MARGIN } from '../styles/theme';
import Ionicons from '@expo/vector-icons/Ionicons';

import { saveTestResults } from '../services/xpService';
import { checkAndGrantAchievements } from '../services/achievementService';
import auth from '@react-native-firebase/auth';
import { updateQuestProgress } from '../services/dailyQuestService';

type ResultsProps = NativeStackScreenProps<MainAppStackParamList, 'Results'>;

function ResultsScreen({ route, navigation }: ResultsProps) {
    // mode będzie teraz zawierać 'learn', 'assess' lub 'duel'
    const { score, total, originalTestParams, mode, isDoubleXp } = route.params;
    const hasSaved = useRef(false);

    // --- TEMATYKA (DARK MODE) ---
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';

    const theme = {
        bg: isDarkMode ? COLORS.backgroundDark : COLORS.backgroundLight,
        card: isDarkMode ? COLORS.cardDark : COLORS.white,
        text: isDarkMode ? COLORS.textDark : '#1F2937',
        subText: isDarkMode ? COLORS.greyDarkTheme : COLORS.grey,
        rewardBg: isDarkMode ? 'rgba(16, 185, 129, 0.15)' : '#E8F5E9',
        rewardText: isDarkMode ? '#34D399' : '#1B5E20',
        secondaryBtnBg: isDarkMode ? 'rgba(255,255,255,0.05)' : 'white',
    };

    const percentage = Math.round((score / total) * 100);
    const isPassed = percentage >= 50;

    // Obliczanie nagród na podstawie trybu
    const xpReward = mode === 'assess' ? score * 20 : score * 5;
    const coinsReward = mode === 'assess' ? score * 5 : score * 1;

    useEffect(() => {
        if (!hasSaved.current) {
            hasSaved.current = true;
            const currentUser = auth().currentUser;
            const topicName = originalTestParams.subTopic || originalTestParams.topic || "Ogólne";

            // Zapisujemy wyniki
            saveTestResults(xpReward, coinsReward, total, score, topicName);

            if (currentUser) {
                setTimeout(() => {
                    checkAndGrantAchievements(currentUser.uid);
                    updateQuestProgress('TEST_COMPLETE');
                }, 1500);
            }
        }
    }, []);

    // ❗ NAPRAWIONA LOGIKA TYTUŁU
    const getResultTitle = () => {
        if (originalTestParams.duelId) return "Pojedynek zakończony!";
        if (mode === 'assess') {
            return isPassed ? "Sprawdzian zaliczony!" : "Spróbuj ponownie";
        }
        return "Trening zakończony!";
    };

    const handleRetry = () => navigation.replace('Test', originalTestParams);
    const handleGoHome = () => navigation.popToTop();
    const handleBackToList = () => {
        if (originalTestParams.testType === 'duel') navigation.popToTop();
        else navigation.goBack();
    };

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg }]}>
            <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />

            <View style={styles.mainContainer}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={[styles.card, { backgroundColor: theme.card }]}>
                        <Image
                            source={percentage >= 50 ? require('../assets/happy.png') : require('../assets/sad.png')}
                            style={styles.mascot}
                        />

                        {/* Wyświetlanie poprawnego tytułu */}
                        <Text style={[styles.title, { color: theme.text }]}>
                            {getResultTitle()}
                        </Text>

                        <View style={styles.scoreContainer}>
                            <Text style={[styles.scoreText, { color: COLORS.primary }]}>{score} / {total}</Text>
                            <Text style={[styles.percentageText, { color: theme.subText }]}>{percentage}% poprawnych</Text>
                        </View>

                        {xpReward > 0 && (
                            <View style={[styles.rewardContainer, { backgroundColor: theme.rewardBg }]}>
                                <Text style={[styles.rewardLabel, { color: theme.rewardText }]}>Twoja nagroda:</Text>
                                <Text style={[styles.rewardValue, { color: theme.rewardText }]}>
                                    +{isDoubleXp ? xpReward * 2 : xpReward} XP {isDoubleXp ? '(2x!)' : ''}  |  +{coinsReward} Monet
                                </Text>
                            </View>
                        )}
                    </View>
                </ScrollView>
            </View>

            <View style={[styles.footer, { backgroundColor: theme.bg }]}>
                <View style={styles.buttonsContainer}>
                    <TouchableOpacity style={styles.actionButton} onPress={handleRetry}>
                        <Ionicons name="refresh" size={24} color="white" />
                        <Text style={styles.actionButtonText}>Powtórz</Text>
                    </TouchableOpacity>

                    <View style={styles.secondaryButtonsRow}>
                        <TouchableOpacity
                            style={[styles.secondaryButton, { flex: 1, marginRight: 10, backgroundColor: theme.secondaryBtnBg }]}
                            onPress={handleBackToList}
                        >
                            <Ionicons name="list" size={20} color={COLORS.primary} />
                            <Text style={styles.secondaryButtonText} numberOfLines={1}>Działy</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.secondaryButton, { flex: 1, backgroundColor: theme.secondaryBtnBg }]}
                            onPress={handleGoHome}
                        >
                            <Ionicons name="home" size={20} color={COLORS.primary} />
                            <Text style={styles.secondaryButtonText} numberOfLines={1}>Home</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    mainContainer: { flex: 1 },
    scrollContent: { flexGrow: 1, justifyContent: 'center', padding: PADDING.large, paddingBottom: 20 },
    card: {
        borderRadius: 28,
        padding: PADDING.large,
        alignItems: 'center',
        elevation: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
    },
    mascot: { width: 120, height: 120, marginBottom: MARGIN.medium, resizeMode: 'contain' },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: MARGIN.medium, textAlign: 'center' },
    scoreContainer: { alignItems: 'center', marginBottom: MARGIN.medium },
    scoreText: { fontSize: 48, fontWeight: '900' },
    percentageText: { fontSize: 18, fontWeight: '600' },
    rewardContainer: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 16, width: '100%', alignItems: 'center', marginTop: 5 },
    rewardLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    rewardValue: { fontSize: 16, fontWeight: 'bold', marginTop: 4 },
    footer: { paddingHorizontal: PADDING.large, paddingBottom: Platform.OS === 'ios' ? 30 : 20, paddingTop: PADDING.medium },
    buttonsContainer: { gap: 12, width: '100%' },
    secondaryButtonsRow: { flexDirection: 'row', justifyContent: 'space-between' },
    actionButton: { backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', elevation: 4 },
    actionButtonText: { color: 'white', fontWeight: 'bold', fontSize: 18, marginLeft: 10 },
    secondaryButton: { paddingVertical: 12, borderRadius: 16, borderWidth: 2, borderColor: COLORS.primary, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', minHeight: 50 },
    secondaryButtonText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 15, marginLeft: 6 }
});

export default ResultsScreen;
