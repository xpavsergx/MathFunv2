// src/screens/StatsScreen.tsx

import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, ActivityIndicator,
    Dimensions, Image, RefreshControl
} from 'react-native';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { COLORS, PADDING } from '../styles/theme';
import Ionicons from '@expo/vector-icons/Ionicons';

const { width } = Dimensions.get('window');

const StatsScreen = () => {
    const user = auth().currentUser;
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Стан статистики
    const [stats, setStats] = useState({
        xp: 0,
        coins: 0,
        streak: 0,
        totalQuestions: 0,
        correctAnswers: 0,
        testsCompleted: 0,

        // Дуелі
        duelsPlayed: 0,
        duelsWon: 0,
        duelsLost: 0,
        duelsDraw: 0,

        // Додатково
        flawlessTests: 0,

        // Історія тестів (замість XP)
        testsHistory: [] as any[]
    });

    const fetchStats = () => {
        if (!user) return;
        setRefreshing(true);

        const unsubscribe = firestore()
            .collection('users')
            .doc(user.uid)
            .onSnapshot(doc => {
                if (doc.exists) {
                    const d = doc.data() || {};

                    const todayXp = d.xpToday || 0;
                    // Приблизний розрахунок тестів на основі XP для "Сьогодні"
                    // (або просто мок-дані для демонстрації)
                    const testsToday = Math.max(0, Math.floor(todayXp / 50));

                    // ✅ MOCK-дані для історії ТЕСТІВ (маленькі числа)
                    const mockTestsHistory = [
                        { value: 2, label: 'Pn', frontColor: '#90CAF9' },
                        { value: 4, label: 'Wt', frontColor: '#90CAF9' },
                        { value: 1, label: 'Śr', frontColor: '#90CAF9' },
                        { value: 5, label: 'Cz', frontColor: '#90CAF9' },
                        { value: 0, label: 'Pt', frontColor: '#90CAF9' },
                        { value: 3, label: 'Sb', frontColor: '#90CAF9' },
                        { value: testsToday, label: 'Dzisiaj', frontColor: COLORS.primary },
                    ];

                    setStats({
                        xp: d.xp || 0,
                        coins: d.coins || 0,
                        streak: d.streakDays || 0,

                        totalQuestions: d.totalQuestionsSolved || d.stats?.totalQuestionsSolved || 0,
                        correctAnswers: d.correctAnswersTotal || d.stats?.correctAnswers || 0,
                        testsCompleted: d.testsCompleted || d.stats?.testsCompleted || 0,

                        duelsPlayed: d.duelsPlayed || 0,
                        duelsWon: d.duelsWon || 0,
                        duelsLost: d.duelsLost || 0,
                        duelsDraw: d.duelsDraw || 0,

                        flawlessTests: d.flawlessTests || 0,

                        testsHistory: mockTestsHistory
                    });
                }
                setLoading(false);
                setRefreshing(false);
            });

        return unsubscribe;
    };

    useEffect(() => {
        const unsub = fetchStats();
        return () => { if(unsub) unsub(); };
    }, [user]);

    // --- ОБЧИСЛЕННЯ ДАНИХ ДЛЯ ГРАФІКІВ ---

    // 1. Точність
    const accuracy = stats.totalQuestions > 0
        ? Math.round((stats.correctAnswers / stats.totalQuestions) * 100)
        : 0;

    const accuracyPieData = stats.totalQuestions > 0 ? [
        { value: accuracy, color: COLORS.correct, text: `${accuracy}%` },
        { value: 100 - accuracy, color: '#EEEEEE' }
    ] : [{ value: 100, color: '#EEEEEE', text: '0%' }];

    // 2. Статистика Дуелей
    const duelPieData = stats.duelsPlayed > 0 ? [
        { value: stats.duelsWon, color: '#4CAF50', text: 'W' },
        { value: stats.duelsLost, color: '#F44336', text: 'L' },
        { value: stats.duelsDraw, color: '#FFC107', text: 'D' }
    ] : [{ value: 1, color: '#E0E0E0', text: '-' }];

    // 3. Середній XP
    const avgXpPerTest = stats.testsCompleted > 0
        ? Math.round(stats.xp / stats.testsCompleted)
        : 0;

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchStats} />}
        >

            {/* --- ПРИВІТАННЯ --- */}
            <View style={styles.headerCard}>
                <View style={styles.xpCircle}>
                    <Text style={styles.xpValueHeader}>{stats.xp}</Text>
                    <Text style={styles.xpLabelHeader}>XP</Text>
                </View>
                <View style={styles.headerTexts}>
                    <Text style={styles.welcomeText}>Statystyki Mistrza!</Text>
                    <Text style={styles.subWelcomeText}>
                        {stats.streak > 0
                            ? `🔥 ${stats.streak} dni z rzędu! Nie przerywaj!`
                            : "Zacznij swoją serię nauki już dziś!"}
                    </Text>
                    <View style={styles.coinBadge}>
                        <Ionicons name="wallet" size={16} color="#FF9800" />
                        <Text style={styles.coinText}>{stats.coins} monet</Text>
                    </View>
                </View>
                <Image source={require('../assets/fox_mascot.png')} style={styles.mascotHeader} />
            </View>

            {/* --- ОСНОВНІ ПОКАЗНИКИ (GRID) --- */}
            <View style={styles.gridContainer}>
                <StatCard
                    icon="school" color="#2196F3" bg="#E3F2FD"
                    value={stats.testsCompleted} label="Testy"
                />
                <StatCard
                    icon="checkmark-circle" color="#4CAF50" bg="#E8F5E9"
                    value={stats.correctAnswers} label="Poprawne"
                />
                <StatCard
                    icon="trophy" color="#FFC107" bg="#FFF8E1"
                    value={stats.flawlessTests} label="Perfekcyjne"
                />
                <StatCard
                    icon="flash" color="#9C27B0" bg="#F3E5F5"
                    value={avgXpPerTest} label="Śr. XP/Test"
                />
            </View>

            {/* --- ДІАГРАМИ --- */}
            <View style={styles.chartsRow}>

                {/* ТОЧНІСТЬ */}
                <View style={styles.chartCard}>
                    <Text style={styles.cardTitle}>Skuteczność</Text>
                    <View style={{alignItems: 'center', marginVertical: 10}}>
                        <PieChart
                            data={accuracyPieData}
                            donut
                            radius={45}
                            innerRadius={32}
                            textColor="#333"
                            textSize={12}
                            fontWeight="bold"
                            centerLabelComponent={() => (
                                <Text style={{fontSize: 14, fontWeight: 'bold'}}>{accuracy}%</Text>
                            )}
                        />
                    </View>
                    <Text style={styles.cardSub}>{stats.totalQuestions} pytań</Text>
                </View>

                {/* ДУЕЛІ */}
                <View style={styles.chartCard}>
                    <Text style={styles.cardTitle}>Pojedynki</Text>
                    {stats.duelsPlayed > 0 ? (
                        <View style={{alignItems: 'center', marginVertical: 10}}>
                            <PieChart
                                data={duelPieData}
                                donut
                                radius={45}
                                innerRadius={32}
                                textColor="#FFF"
                                textSize={10}
                                fontWeight="bold"
                            />
                        </View>
                    ) : (
                        <View style={[styles.center, {height: 100}]}>
                            <Ionicons name="people-outline" size={30} color="#CCC" />
                            <Text style={{fontSize: 12, color: '#999', marginTop: 5}}>Brak gier</Text>
                        </View>
                    )}
                    <View style={styles.duelLegend}>
                        <Text style={{fontSize: 10, color: '#4CAF50'}}>W: {stats.duelsWon}</Text>
                        <Text style={{fontSize: 10, color: '#F44336', marginHorizontal:5}}>L: {stats.duelsLost}</Text>
                        <Text style={{fontSize: 10, color: '#FFC107'}}>D: {stats.duelsDraw}</Text>
                    </View>
                </View>
            </View>

            {/* --- ✅ ГРАФІК АКТИВНОСТІ (TESTY) --- */}
            <View style={styles.bigChartCard}>
                <View style={{flexDirection:'row', justifyContent:'space-between', marginBottom: 10}}>
                    {/* Змінено заголовок */}
                    <Text style={styles.cardTitle}>Twoja Aktywność (Testy)</Text>
                    <Ionicons name="stats-chart" size={20} color={COLORS.primary} />
                </View>
                <BarChart
                    data={stats.testsHistory}
                    barWidth={20}
                    noOfSections={4}
                    barBorderRadius={4}
                    frontColor={COLORS.primary}
                    yAxisThickness={0}
                    xAxisThickness={0}
                    height={150}
                    width={width - 90}
                    isAnimated
                    renderTooltip={(item: any) => (
                        <View style={styles.tooltip}>
                            {/* Змінено підпис тултіпа */}
                            <Text style={{color: '#fff', fontSize: 10}}>{item.value} testów</Text>
                        </View>
                    )}
                />
            </View>

        </ScrollView>
    );
};

// Компонент маленької картки
const StatCard = ({ icon, color, bg, value, label }: any) => (
    <View style={[styles.miniCard, { backgroundColor: '#FFF' }]}>
        <View style={[styles.iconBox, { backgroundColor: bg }]}>
            <Ionicons name={icon} size={18} color={color} />
        </View>
        <Text style={styles.miniVal}>{value}</Text>
        <Text style={styles.miniLabel}>{label}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F7FA' },
    content: { padding: PADDING.medium, paddingBottom: 50 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // Header
    headerCard: {
        backgroundColor: '#FFF', borderRadius: 20, padding: 15, flexDirection: 'row', alignItems: 'center',
        marginBottom: 20, elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5
    },
    xpCircle: {
        width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.primary,
        justifyContent: 'center', alignItems: 'center', marginRight: 15
    },
    xpValueHeader: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
    xpLabelHeader: { color: 'rgba(255,255,255,0.8)', fontSize: 10 },
    headerTexts: { flex: 1 },
    welcomeText: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    subWelcomeText: { fontSize: 12, color: '#666', marginTop: 2 },
    coinBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 5, backgroundColor: '#FFF8E1', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
    coinText: { fontSize: 12, fontWeight: 'bold', color: '#FFA000', marginLeft: 5 },
    mascotHeader: { width: 50, height: 50, resizeMode: 'contain' },

    // Grid
    gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 15 },
    miniCard: { width: '23%', alignItems: 'center', padding: 10, borderRadius: 15, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05 },
    iconBox: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 5 },
    miniVal: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    miniLabel: { fontSize: 10, color: '#888', textAlign: 'center' },

    // Charts
    chartsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    chartCard: { width: '48%', backgroundColor: '#FFF', borderRadius: 15, padding: 15, elevation: 2, alignItems: 'center' },
    cardTitle: { fontSize: 14, fontWeight: 'bold', color: '#444', marginBottom: 5 },
    cardSub: { fontSize: 11, color: '#999' },
    duelLegend: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginTop: 5 },

    // Big Chart
    bigChartCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, elevation: 3, marginBottom: 20 },
    tooltip: { marginBottom: 5, marginLeft: -10, backgroundColor: '#333', padding: 4, borderRadius: 4 }
});

export default StatsScreen;
