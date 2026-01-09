// src/screens/StatsScreen.tsx

import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, ActivityIndicator,
    Dimensions, Image, RefreshControl, useColorScheme
} from 'react-native';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { COLORS, PADDING } from '../styles/theme';
import Ionicons from '@expo/vector-icons/Ionicons';

const { width } = Dimensions.get('window');

const StatsScreen = () => {
    const user = auth().currentUser;
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [stats, setStats] = useState({
        xp: 0,
        coins: 0,
        streak: 0,
        totalQuestions: 0,
        correctAnswers: 0,
        testsCompleted: 0,
        duelsPlayed: 0,
        duelsWon: 0,
        duelsLost: 0,
        duelsDraw: 0,
        flawlessTests: 0,
        testsHistory: [] as any[]
    });

    // Dynamiczne style dla trybu ciemnego
    const themeStyles = {
        container: { backgroundColor: isDarkMode ? COLORS.backgroundDark : '#F5F7FA' },
        card: { backgroundColor: isDarkMode ? COLORS.cardDark : '#FFF' },
        text: { color: isDarkMode ? COLORS.textDark : '#333' },
        textSecondary: { color: isDarkMode ? COLORS.greyDarkTheme : '#666' },
        legendBg: { backgroundColor: isDarkMode ? '#1C1C1E' : '#F8F9FA' },
        coinBox: { backgroundColor: isDarkMode ? 'rgba(255,193,7,0.15)' : '#FFF8E1' }
    };

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
                    const testsToday = Math.max(0, Math.floor(todayXp / 50));

                    const mockTestsHistory = [
                        { value: 2, label: 'Pn', frontColor: isDarkMode ? '#5E92F3' : '#90CAF9' },
                        { value: 4, label: 'Wt', frontColor: isDarkMode ? '#5E92F3' : '#90CAF9' },
                        { value: 1, label: 'Śr', frontColor: isDarkMode ? '#5E92F3' : '#90CAF9' },
                        { value: 5, label: 'Cz', frontColor: isDarkMode ? '#5E92F3' : '#90CAF9' },
                        { value: 0, label: 'Pt', frontColor: isDarkMode ? '#5E92F3' : '#90CAF9' },
                        { value: 3, label: 'Sb', frontColor: isDarkMode ? '#5E92F3' : '#90CAF9' },
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

    const accuracy = stats.totalQuestions > 0 ? Math.round((stats.correctAnswers / stats.totalQuestions) * 100) : 0;

    return (
        <ScrollView
            style={[styles.container, themeStyles.container]}
            contentContainerStyle={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchStats} tintColor={COLORS.primary} />}
        >
            {/* Header XP z przywróconymi monetami */}
            <View style={[styles.headerCard, themeStyles.card]}>
                <View style={styles.xpCircle}>
                    <Text style={styles.xpValueHeader}>{stats.xp}</Text>
                    <Text style={styles.xpLabelHeader}>XP</Text>
                </View>
                <View style={styles.headerTexts}>
                    <Text style={[styles.welcomeText, themeStyles.text]}>Statystyki Mistrza!</Text>
                    <Text style={[styles.subWelcomeText, themeStyles.textSecondary]}>
                        Zacznij swoją serię nauki już dziś!
                    </Text>
                    {/* PRZYWRÓCONE MONETY W NAGŁÓWKU */}
                    <View style={[styles.coinHeaderBox, themeStyles.coinBox]}>
                        <Ionicons name="wallet" size={14} color="#FF9800" />
                        <Text style={styles.coinHeaderText}>{stats.coins} monet</Text>
                    </View>
                </View>
                <Image source={require('../assets/fox_mascot.png')} style={styles.mascotHeader} />
            </View>

            {/* Grid Statystyk */}
            <View style={styles.gridContainer}>
                <StatCard icon="school" color="#2196F3" bg={isDarkMode ? 'rgba(33,150,243,0.2)' : '#E3F2FD'} value={stats.testsCompleted} label="Testy" themeStyles={themeStyles} />
                <StatCard icon="checkmark-circle" color="#4CAF50" bg={isDarkMode ? 'rgba(76,175,80,0.2)' : '#E8F5E9'} value={stats.correctAnswers} label="Poprawne" themeStyles={themeStyles} />
                <StatCard icon="trophy" color="#FFC107" bg={isDarkMode ? 'rgba(255,193,7,0.2)' : '#FFF8E1'} value={stats.flawlessTests} label="Perfekcyjne" themeStyles={themeStyles} />
                <StatCard icon="flash" color="#9C27B0" bg={isDarkMode ? 'rgba(156,39,176,0.2)' : '#F3E5F5'} value={Math.round(stats.xp / (stats.testsCompleted || 1))} label="Śr. XP/Test" themeStyles={themeStyles} />
            </View>

            {/* Wykresy Kołowe */}
            <View style={styles.chartsRow}>
                <View style={[styles.chartCard, themeStyles.card]}>
                    <Text style={[styles.cardTitle, themeStyles.text]}>Skuteczność (Testy)</Text>
                    <PieChart
                        data={[
                            { value: accuracy, color: COLORS.correct },
                            { value: 100 - accuracy, color: isDarkMode ? '#3A3A3C' : '#EEEEEE' }
                        ]}
                        donut
                        radius={40}
                        innerRadius={30}
                        innerCircleColor={isDarkMode ? COLORS.cardDark : '#FFF'}
                        centerLabelComponent={() => <Text style={{fontSize: 12, fontWeight: 'bold', color: themeStyles.text.color}}>{accuracy}%</Text>}
                    />
                    <Text style={[styles.cardSub, themeStyles.textSecondary]}>{stats.totalQuestions} pytań</Text>
                </View>

                <View style={[styles.chartCard, themeStyles.card]}>
                    <Text style={[styles.cardTitle, themeStyles.text]}>Pojedynki</Text>
                    <PieChart
                        data={stats.duelsPlayed > 0 ? [
                            { value: stats.duelsWon, color: '#4CAF50' },
                            { value: stats.duelsLost, color: '#F44336' },
                            { value: stats.duelsDraw, color: '#FFC107' }
                        ] : [{ value: 1, color: isDarkMode ? '#3A3A3C' : '#E0E0E0' }]}
                        donut
                        radius={40}
                        innerRadius={30}
                        innerCircleColor={isDarkMode ? COLORS.cardDark : '#FFF'}
                    />
                    <View style={styles.duelLegendCompact}>
                        <Text style={[styles.duelStatsText, {color: '#4CAF50'}]}>W: {stats.duelsWon}</Text>
                        <Text style={[styles.duelStatsText, {color: '#F44336'}]}>L: {stats.duelsLost}</Text>
                        <Text style={[styles.duelStatsText, {color: '#FFC107'}]}>D: {stats.duelsDraw}</Text>
                    </View>
                </View>
            </View>

            {/* Wykres Aktywności */}
            <View style={[styles.bigChartCard, themeStyles.card]}>
                <Text style={[styles.cardTitle, themeStyles.text, {marginBottom: 15}]}>Twoja Aktywność (Testy)</Text>
                <BarChart
                    data={stats.testsHistory}
                    barWidth={18}
                    noOfSections={4}
                    frontColor={COLORS.primary}
                    yAxisTextStyle={{color: themeStyles.textSecondary.color, fontSize: 10}}
                    xAxisLabelTextStyle={{color: themeStyles.textSecondary.color, fontSize: 10}}
                    height={120}
                    width={width - 80}
                    isAnimated
                />
            </View>
        </ScrollView>
    );
};

const StatCard = ({ icon, color, bg, value, label, themeStyles }: any) => (
    <View style={[styles.miniCard, themeStyles.card]}>
        <View style={[styles.iconBox, { backgroundColor: bg }]}>
            <Ionicons name={icon} size={18} color={color} />
        </View>
        <Text style={[styles.miniVal, themeStyles.text]}>{value}</Text>
        <Text style={[styles.miniLabel, themeStyles.textSecondary]}>{label}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: PADDING.medium, paddingBottom: 50 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    headerCard: { borderRadius: 20, padding: 15, flexDirection: 'row', alignItems: 'center', marginBottom: 20, elevation: 3 },
    xpCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    xpValueHeader: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
    xpLabelHeader: { color: 'rgba(255,255,255,0.8)', fontSize: 10 },
    headerTexts: { flex: 1 },
    welcomeText: { fontSize: 18, fontWeight: 'bold' },
    subWelcomeText: { fontSize: 12, marginTop: 2 },
    coinHeaderBox: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginTop: 5 },
    coinHeaderText: { fontSize: 12, fontWeight: 'bold', color: '#FF9800', marginLeft: 4 },
    mascotHeader: { width: 50, height: 50, resizeMode: 'contain' },
    gridContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
    miniCard: { width: '23%', alignItems: 'center', padding: 10, borderRadius: 15, elevation: 2 },
    iconBox: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 5 },
    miniVal: { fontSize: 16, fontWeight: 'bold' },
    miniLabel: { fontSize: 9, textAlign: 'center' },
    chartsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    chartCard: { width: '48%', borderRadius: 15, padding: 12, elevation: 2, alignItems: 'center' },
    cardTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 10 },
    cardSub: { fontSize: 11, marginTop: 5 },
    duelLegendCompact: { flexDirection: 'row', gap: 10, marginTop: 10 },
    duelStatsText: { fontSize: 11, fontWeight: 'bold' },
    bigChartCard: { borderRadius: 20, padding: 20, elevation: 3 }
});

export default StatsScreen;