// src/screens/ResultsScreen.tsx

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, SafeAreaView, Platform } from 'react-native';
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
    const { score, total, originalTestParams, mode } = route.params;
    const hasSaved = useRef(false);

    const percentage = Math.round((score / total) * 100);
    const isPassed = percentage >= 50;

    const xpReward = mode === 'assess' ? score * 20 : score * 5;
    const coinsReward = mode === 'assess' ? score * 5 : score * 1;

    useEffect(() => {
        if (!hasSaved.current) {
            hasSaved.current = true;

            // Pobieramy aktualnego użytkownika
            const currentUser = auth().currentUser;

            const topicName = originalTestParams.subTopic || originalTestParams.topic || "Ogólne";

            // 1. Zapisujemy wyniki XP i monet
            saveTestResults(
                xpReward,
                coinsReward,
                total,
                score,
                topicName
            );

            // 2. Sprawdzamy odznaki
            if (currentUser) {
                setTimeout(() => {
                    checkAndGrantAchievements(currentUser.uid);
                    updateQuestProgress('TEST_COMPLETE');
                }, 1500);
            }
        }
    }, []);

    const handleRetry = () => {
        navigation.replace('Test', originalTestParams);
    };

    const handleBackToList = () => {
        if (originalTestParams.testType === 'duel') {
            navigation.popToTop();
        } else {
            navigation.goBack();
        }
    };

    const handleGoHome = () => {
        navigation.popToTop();
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.mainContainer}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.card}>
                        <Image
                            source={percentage > 80 ? require('../assets/happy.png') : require('../assets/sad.png')}
                            style={styles.mascot}
                        />

                        <Text style={styles.title}>
                            {mode === 'assess' ? (isPassed ? "Test Zakończony!" : "Spróbuj ponownie") : "Pojedynek skończony!"}
                        </Text>

                        <View style={styles.scoreContainer}>
                            <Text style={styles.scoreText}>{score} / {total}</Text>
                            <Text style={styles.percentageText}>{percentage}%</Text>
                        </View>

                        {xpReward > 0 && (
                            <View style={styles.rewardContainer}>
                                <Text style={styles.rewardLabel}>Twoja nagroda:</Text>
                                <Text style={styles.rewardValue}>+{xpReward} XP  |  +{coinsReward} Monet</Text>
                            </View>
                        )}
                    </View>
                </ScrollView>
            </View>

            <View style={styles.footer}>
                <View style={styles.buttonsContainer}>
                    <TouchableOpacity style={styles.actionButton} onPress={handleRetry}>
                        <Ionicons name="refresh" size={24} color="white" />
                        <Text style={styles.actionButtonText}>Powtórz</Text>
                    </TouchableOpacity>

                    <View style={styles.secondaryButtonsRow}>
                        <TouchableOpacity style={[styles.secondaryButton, {flex: 1, marginRight: 10}]} onPress={handleBackToList}>
                            <Ionicons name="list" size={20} color={COLORS.primary} />
                            <Text style={styles.secondaryButtonText} numberOfLines={1}>Lista</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.secondaryButton, {flex: 1}]} onPress={handleGoHome}>
                            <Ionicons name="home" size={20} color={COLORS.primary} />
                            <Text style={styles.secondaryButtonText} numberOfLines={1}>Menu</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: COLORS.backgroundLight },
    mainContainer: { flex: 1 },
    scrollContent: { flexGrow: 1, justifyContent: 'center', padding: PADDING.large, paddingBottom: 20 },
    card: { backgroundColor: COLORS.white, borderRadius: 20, padding: PADDING.large, alignItems: 'center', elevation: 4 },
    mascot: { width: 100, height: 100, marginBottom: MARGIN.medium, resizeMode: 'contain' },
    title: { fontSize: 22, fontWeight: 'bold', color: COLORS.text, marginBottom: MARGIN.medium, textAlign: 'center' },
    scoreContainer: { alignItems: 'center', marginBottom: MARGIN.medium },
    scoreText: { fontSize: 42, fontWeight: 'bold', color: COLORS.primary },
    percentageText: { fontSize: 18, color: COLORS.grey },
    rewardContainer: { backgroundColor: '#E8F5E9', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10, width: '100%', alignItems: 'center', marginTop: 5 },
    rewardLabel: { color: '#2E7D32', fontSize: 13 },
    rewardValue: { color: '#1B5E20', fontSize: 16, fontWeight: 'bold', marginTop: 3 },
    footer: { backgroundColor: COLORS.backgroundLight, paddingHorizontal: PADDING.large, paddingBottom: Platform.OS === 'ios' ? 0 : PADDING.large, paddingTop: PADDING.medium },
    buttonsContainer: { gap: 12, width: '100%' },
    secondaryButtonsRow: { flexDirection: 'row', justifyContent: 'space-between' },
    actionButton: { backgroundColor: COLORS.primary, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', elevation: 2, minHeight: 50 },
    actionButtonText: { color: 'white', fontWeight: 'bold', fontSize: 18, marginLeft: 10 },
    secondaryButton: { backgroundColor: 'white', paddingVertical: 10, paddingHorizontal: 10, borderRadius: 12, borderWidth: 2, borderColor: COLORS.primary, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', minHeight: 45 },
    secondaryButtonText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 14, marginLeft: 6 }
});

export default ResultsScreen;