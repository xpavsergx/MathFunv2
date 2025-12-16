// src/screens/StatsScreen.tsx

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Dimensions, Image } from 'react-native';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { COLORS, PADDING, MARGIN } from '../styles/theme';
import Ionicons from '@expo/vector-icons/Ionicons';

const { width } = Dimensions.get('window');

const StatsScreen = () => {
    const user = auth().currentUser;
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        xp: 0,
        coins: 0,
        streak: 0,
        totalQuestions: 0,
        correctAnswers: 0,
        testsCompleted: 0,
        xpHistory: [0,0,0,0,0,0,0]
    });

    useEffect(() => {
        if (!user) return;
        const unsubscribe = firestore()
            .collection('users')
            .doc(user.uid)
            .onSnapshot(doc => {
                if (doc.exists) {
                    const d = doc.data();
                    setStats({
                        xp: d?.xp || 0,
                        coins: d?.coins || 0,
                        streak: d?.streakDays || 0,
                        totalQuestions: d?.stats?.totalQuestionsSolved || 0,
                        correctAnswers: d?.stats?.correctAnswers || 0,
                        testsCompleted: d?.stats?.testsCompleted || 0,
                        // Заглушка для історії (можна реалізувати saving daily XP)
                        xpHistory: [15, 30, 45, 20, 60, 80, d?.xpToday || 0]
                    });
                }
                setLoading(false);
            });
        return () => unsubscribe();
    }, [user]);

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

    // 1. Дані для PIE CHART (Точність)
    const accuracy = stats.totalQuestions > 0 ? Math.round((stats.correctAnswers / stats.totalQuestions) * 100) : 0;
    const pieData = [
        { value: accuracy, color: '#4CAF50', text: `${accuracy}%` },
        { value: 100 - accuracy, color: '#E0E0E0' }
    ];

    // 2. Дані для BAR CHART (Тижнева активність)
    const barData = stats.xpHistory.map((val, i) => ({
        value: val,
        label: ['Pn','Wt','Śr','Cz','Pt','Sb','Nd'][i],
        frontColor: i === 6 ? COLORS.primary : '#90CAF9',
    }));

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>

            {/* --- МАСКОТ --- */}
            <View style={styles.mascotSection}>
                <Image source={require('../assets/fox_mascot.png')} style={styles.mascotImage} />
                <View style={styles.bubble}>
                    <Text style={styles.bubbleText}>
                        {stats.streak > 2
                            ? `Ogień! 🔥 ${stats.streak} dni z rzędu! Tak trzymaj!`
                            : "Hej! Spójrz na statystyki. Możemy je poprawić!"}
                    </Text>
                </View>
            </View>

            {/* --- ПЛИТКИ --- */}
            <View style={styles.grid}>
                <View style={[styles.card, {backgroundColor: '#E3F2FD'}]}>
                    <Ionicons name="school" size={24} color="#2196F3" />
                    <Text style={styles.val}>{stats.testsCompleted}</Text>
                    <Text style={styles.label}>Testy</Text>
                </View>
                <View style={[styles.card, {backgroundColor: '#E8F5E9'}]}>
                    <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                    <Text style={styles.val}>{stats.totalQuestions}</Text>
                    <Text style={styles.label}>Zadania</Text>
                </View>
                <View style={[styles.card, {backgroundColor: '#FFF3E0'}]}>
                    <Ionicons name="flame" size={24} color="#FF9800" />
                    <Text style={styles.val}>{stats.streak}</Text>
                    <Text style={styles.label}>Seria</Text>
                </View>
                <View style={[styles.card, {backgroundColor: '#F3E5F5'}]}>
                    <Ionicons name="wallet" size={24} color="#9C27B0" />
                    <Text style={styles.val}>{stats.coins}</Text>
                    <Text style={styles.label}>Monety</Text>
                </View>
            </View>

            {/* --- ГРАФІКИ --- */}
            <View style={styles.chartsRow}>
                {/* Кругова діаграма */}
                <View style={[styles.chartBox, {flex: 1, marginRight: 5}]}>
                    <Text style={styles.chartTitle}>Poprawność</Text>
                    <View style={{alignItems: 'center', marginTop: 10}}>
                        <PieChart
                            data={pieData}
                            donut
                            radius={50}
                            innerRadius={35}
                            textColor="black"
                            textSize={12}
                            fontWeight="bold"
                        />
                    </View>
                </View>

                {/* Текст про XP */}
                <View style={[styles.chartBox, {flex: 1, marginLeft: 5, justifyContent: 'center', alignItems: 'center'}]}>
                    <Text style={styles.xpBig}>{stats.xp}</Text>
                    <Text style={styles.xpLabel}>Całkowite XP</Text>
                    <View style={{height: 10}}/>
                    <Text style={{fontSize: 12, color: '#666', textAlign: 'center'}}>
                        Jesteś w górnym 20% swojej klasy!
                    </Text>
                </View>
            </View>

            <View style={styles.chartBox}>
                <Text style={styles.chartTitle}>Aktywność (Ostatnie 7 dni)</Text>
                <BarChart
                    data={barData}
                    barWidth={20}
                    noOfSections={3}
                    barBorderRadius={4}
                    yAxisThickness={0}
                    xAxisThickness={0}
                    height={150}
                    width={width - 80}
                />
            </View>

            {/* --- СПИСОК ТЕМ (Mockup) --- */}
            <Text style={styles.sectionHeader}>Twoje postępy w działach</Text>
            <View style={styles.topicsList}>
                <View style={styles.topicRow}>
                    <Text style={styles.topicName}>Dodawanie i Odejmowanie</Text>
                    <Text style={[styles.topicScore, {color: COLORS.correct}]}>95%</Text>
                </View>
                <View style={styles.topicRow}>
                    <Text style={styles.topicName}>Mnożenie</Text>
                    <Text style={[styles.topicScore, {color: '#FFC107'}]}>70%</Text>
                </View>
                <View style={styles.topicRow}>
                    <Text style={styles.topicName}>Geometria</Text>
                    <Text style={[styles.topicScore, {color: COLORS.error}]}>45%</Text>
                </View>
            </View>

        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F7FA' },
    content: { padding: PADDING.medium, paddingBottom: 50 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    mascotSection: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    mascotImage: { width: 80, height: 80, resizeMode: 'contain' },
    bubble: { flex: 1, backgroundColor: '#FFF', padding: 15, borderRadius: 16, borderBottomLeftRadius: 0, marginLeft: 10, elevation: 2 },
    bubbleText: { fontSize: 13, color: '#333' },

    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
    card: { width: '48%', padding: 15, borderRadius: 12, alignItems: 'center', marginBottom: 10, elevation: 1 },
    val: { fontSize: 20, fontWeight: 'bold', marginVertical: 5 },
    label: { fontSize: 12, color: '#555' },

    chartsRow: { flexDirection: 'row', marginBottom: 15 },
    chartBox: { backgroundColor: '#FFF', padding: 15, borderRadius: 16, elevation: 2, marginBottom: 15 },
    chartTitle: { fontSize: 14, fontWeight: 'bold', color: '#555', marginBottom: 5 },

    xpBig: { fontSize: 32, fontWeight: 'bold', color: COLORS.primary },
    xpLabel: { fontSize: 14, color: COLORS.grey },

    sectionHeader: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, marginTop: 10 },
    topicsList: { backgroundColor: '#FFF', borderRadius: 12, padding: 10, elevation: 1 },
    topicRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    topicName: { fontSize: 14, color: '#333' },
    topicScore: { fontWeight: 'bold' }
});

export default StatsScreen;
