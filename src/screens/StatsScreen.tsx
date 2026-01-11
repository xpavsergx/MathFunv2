import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView,
    Dimensions, Image, RefreshControl, useColorScheme
} from 'react-native';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { COLORS } from '../styles/theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width } = Dimensions.get('window');
const scale = (size: number) => (width / 375) * size;

const StatsScreen = () => {
    const user = auth().currentUser;
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';
    const primaryTurquoise = '#00BDD6';

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [stats, setStats] = useState({
        xp: 0,
        coins: 0,
        totalQuestions: 0,
        correctAnswers: 0,
        testsCompleted: 0,
        duelsPlayed: 0,
        duelsWon: 0,
        duelsLost: 0,
        duelsDraw: 0,
        testsHistory: [] as any[]
    });

    const themeStyles = {
        container: { backgroundColor: isDarkMode ? COLORS.backgroundDark : '#F5F7FA' },
        card: { backgroundColor: isDarkMode ? COLORS.cardDark : '#FFF' },
        text: { color: isDarkMode ? '#FFFFFF' : '#333' },
        textSecondary: { color: isDarkMode ? '#CBD5E1' : '#666' },
        coinBox: { backgroundColor: isDarkMode ? 'rgba(255,193,7,0.15)' : '#FFF8E1' }
    };

    const fetchStats = () => {
        if (!user) return;
        setRefreshing(true);

        const unsubscribe = firestore()
            .collection('users')
            .doc(user.uid)
            .onSnapshot(doc => {
                if (doc && doc.exists) {
                    const d = doc.data() || {};
                    const activityValues = Object.values(d.dailyActivity || {}) as number[];
                    const totalFromActivity = activityValues.reduce((a, b) => a + b, 0);
                    const days = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb'];
                    const today = new Date();
                    const history = [];

                    // POBIERANIE REALNEJ AKTYWNOŚCI Z OSTATNICH 7 DNI
                    for (let i = 6; i >= 0; i--) {
                        const dDate = new Date();
                        dDate.setDate(today.getDate() - i);
                        const dayName = i === 0 ? 'Dziś' : days[dDate.getDay()];
                        const dateKey = dDate.toISOString().split('T')[0];

                        // Pobieramy wartość z dailyActivity lub 0 jeśli brak wpisu
                        const dayValue = d.dailyActivity?.[dateKey] || 0;

                        history.push({
                            value: dayValue,
                            label: dayName,
                            frontColor: i === 0 ? primaryTurquoise : (isDarkMode ? '#5E92F3' : '#90CAF9'),
                            topLabelComponent: () => (
                                dayValue > 0 ? <Text style={{fontSize: scale(9), color: themeStyles.textSecondary.color, fontWeight: 'bold'}}>{dayValue}</Text> : null
                            ),
                        });
                    }

                    setStats({
                        xp: d.xp || 0,
                        coins: d.coins || 0,
                        // Synchronizacja pól z obiektem 'stats' w bazie
                        totalQuestions: d.stats?.totalQuestionsSolved || 0,
                        correctAnswers: d.stats?.correctAnswersTotal || 0,
                        testsCompleted: totalFromActivity,
                        duelsPlayed: d.stats?.duelsPlayed || 0,
                        duelsWon: d.stats?.duelsWon || 0,
                        duelsLost: d.stats?.duelsLost || 0,
                        duelsDraw: d.stats?.duelsDraw || 0,
                        testsHistory: history
                    });
                }
                setLoading(false);
                setRefreshing(false);
            }, () => {
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
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchStats} tintColor={primaryTurquoise} />}
        >
            <View style={[styles.headerCard, themeStyles.card]}>
                <View style={[styles.xpCircle, { backgroundColor: primaryTurquoise }]}>
                    <Text style={styles.xpValueHeader}>{stats.xp}</Text>
                    <Text style={styles.xpLabelHeader}>XP</Text>
                </View>
                <View style={styles.headerTexts}>
                    <Text style={[styles.welcomeText, themeStyles.text]}>Statystyki Mistrza!</Text>
                    <View style={[styles.coinHeaderBox, themeStyles.coinBox]}>
                        <Icon name="wallet" size={scale(14)} color="#FF9800" />
                        <Text style={styles.coinHeaderText}>{stats.coins} monet</Text>
                    </View>
                </View>
                <Image
                    source={require('../assets/fox_mascot.png')} // Sprawdź czy ścieżka jest poprawna!
                    style={styles.mascotHeader}
                />
            </View>

            <View style={styles.gridContainer}>
                <StatCard icon="school" color="#2196F3" bg={isDarkMode ? 'rgba(33,150,243,0.2)' : '#E3F2FD'} value={stats.testsCompleted} label="Testy" themeStyles={themeStyles} />
                <StatCard icon="check-circle" color="#4CAF50" bg={isDarkMode ? 'rgba(76,175,80,0.2)' : '#E8F5E9'} value={stats.correctAnswers} label="Poprawne" themeStyles={themeStyles} />
                <StatCard icon="lightning-bolt" color="#9C27B0" bg={isDarkMode ? 'rgba(156,39,176,0.2)' : '#F3E5F5'} value={stats.testsCompleted > 0 ? Math.round(stats.xp / stats.testsCompleted) : 0} label="Śr. XP/Test" themeStyles={themeStyles} />
            </View>

            <View style={styles.chartsRow}>
                <View style={[styles.chartCard, themeStyles.card]}>
                    <Text style={[styles.cardTitle, themeStyles.text]}>Skuteczność (Testy)</Text>
                    <PieChart
                        data={[{ value: accuracy, color: primaryTurquoise }, { value: 100 - accuracy, color: isDarkMode ? '#3A3A3C' : '#EEEEEE' }]}
                        donut radius={scale(40)} innerRadius={scale(32)}
                        innerCircleColor={isDarkMode ? COLORS.cardDark : '#FFF'}
                        centerLabelComponent={() => <Text style={{fontSize: scale(14), fontWeight: '900', color: themeStyles.text.color}}>{accuracy}%</Text>}
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
                        donut radius={scale(40)} innerRadius={scale(32)}
                        innerCircleColor={isDarkMode ? COLORS.cardDark : '#FFF'}
                        centerLabelComponent={() => <Icon name="sword-cross" size={scale(20)} color={isDarkMode ? '#AAA' : '#666'} />}
                    />
                    <View style={styles.duelStatsUnder}>
                        <Text style={[styles.duelText, themeStyles.textSecondary]}>Gier: <Text style={styles.bold}>{stats.duelsPlayed}</Text></Text>
                        <Text style={[styles.duelText, {color: '#4CAF50'}]}>Wygrane: {stats.duelsWon}</Text>
                    </View>
                </View>
            </View>

            <View style={[styles.bigChartCard, themeStyles.card]}>
                <Text style={[styles.cardTitle, themeStyles.text, {marginBottom: scale(15)}]}>Aktywność (ukończone testy)</Text>
                <View style={styles.barChartWrapper}>
                    <BarChart
                        data={stats.testsHistory}
                        barWidth={scale(18)}
                        noOfSections={4}
                        capRadius={scale(4)}
                        frontColor={primaryTurquoise}
                        rulesType="solid"
                        rulesColor={isDarkMode ? '#333' : '#EEE'}
                        yAxisTextStyle={{color: themeStyles.textSecondary.color, fontSize: scale(10)}}
                        xAxisLabelTextStyle={{color: themeStyles.textSecondary.color, fontSize: scale(10)}}
                        height={scale(130)}
                        width={width - scale(110)}
                        isAnimated
                    />
                </View>
            </View>
        </ScrollView>
    );
};

const StatCard = ({ icon, color, bg, value, label, themeStyles }: any) => (
    <View style={[styles.miniCard, themeStyles.card]}>
        <View style={[styles.iconBox, { backgroundColor: bg }]}>
            <Icon name={icon} size={scale(18)} color={color} />
        </View>
        <Text style={[styles.miniVal, themeStyles.text]}>{value}</Text>
        <Text style={[styles.miniLabel, themeStyles.textSecondary]}>{label}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: scale(15), paddingBottom: scale(50) },
    headerCard: { borderRadius: scale(20), padding: scale(15), flexDirection: 'row', alignItems: 'center', marginBottom: scale(20), elevation: 3 },
    xpCircle: { width: scale(60), height: scale(60), borderRadius: scale(30), justifyContent: 'center', alignItems: 'center', marginRight: scale(15) },
    xpValueHeader: { color: '#FFF', fontSize: scale(18), fontWeight: 'bold' },
    xpLabelHeader: { color: 'rgba(255,255,255,0.8)', fontSize: scale(10) },
    headerTexts: { flex: 1 },
    welcomeText: { fontSize: scale(18), fontWeight: 'bold' },
    coinHeaderBox: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: scale(8), paddingVertical: scale(4), borderRadius: scale(8), marginTop: scale(5) },
    coinHeaderText: { fontSize: scale(12), fontWeight: 'bold', color: '#FF9800', marginLeft: scale(4) },
    mascotHeader: {
        width: scale(85),   // Zwiększono z 50 na 85
        height: scale(85),  // Zwiększono z 50 na 85
        resizeMode: 'contain',
        position: 'absolute', // Dodaj to, żeby zwierzak mógł lekko "wystawać" i nie przesuwać tekstu
        right: scale(10),     // Odstęp od prawej krawędzi karty
        bottom: scale(5),     // Ustawienie na dole karty
    },
    gridContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: scale(15) },
    miniCard: { width: '31%', alignItems: 'center', padding: scale(10), borderRadius: scale(15), elevation: 2 },
    iconBox: { width: scale(32), height: scale(32), borderRadius: scale(16), justifyContent: 'center', alignItems: 'center', marginBottom: scale(5) },
    miniVal: { fontSize: scale(16), fontWeight: 'bold' },
    miniLabel: { fontSize: scale(10), textAlign: 'center' },
    chartsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: scale(20) },
    chartCard: { width: '48%', borderRadius: scale(15), padding: scale(12), elevation: 2, alignItems: 'center' },
    cardTitle: { fontSize: scale(14), fontWeight: 'bold', marginBottom: scale(10) },
    cardSub: { fontSize: scale(11), marginTop: scale(5) },
    duelStatsUnder: { marginTop: scale(10), alignItems: 'center' },
    duelText: { fontSize: scale(11) },
    bold: { fontWeight: 'bold' },
    bigChartCard: { borderRadius: scale(20), padding: scale(20), elevation: 3 },
    barChartWrapper: { alignItems: 'center', marginLeft: scale(-20) }
});

export default StatsScreen;
