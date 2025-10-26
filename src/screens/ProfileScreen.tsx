import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, FlatList, ActivityIndicator } from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BarChart } from "react-native-gifted-charts";
import { IAchievement } from '../config/achievements';
import { TestResultData } from '../services/userStatsService';
import { useNavigation } from '@react-navigation/native';

function ProfileScreen() {
    const [achievements, setAchievements] = useState<IAchievement[]>([]);
    const [stats, setStats] = useState<{
        totalTests: number;
        avgScore: number;
        topicPerformance: { value: number; label: string; frontColor: string }[];
    } | null>(null);

    // ✅ ZMIANA: Zmieniliśmy nazwę 'loading' na 'loadingTestStats' dla jasności
    const [loadingTestStats, setLoadingTestStats] = useState(true);
    // ✅ ZMIANA: Dodajemy oddzielne ładowanie dla osiągnięć
    const [loadingAchievements, setLoadingAchievements] = useState(true);

    const currentUser = auth().currentUser;
    const navigation = useNavigation();

    useEffect(() => {
        if (!currentUser) {
            setLoadingTestStats(false);
            setLoadingAchievements(false); // ✅ Ustawiamy ładowanie
            return;
        }

        console.log(`[Profile] Setting up Firestore listeners for user ${currentUser.uid}...`);

        // Listener dla Statystyk Testów (testResults) - zostaje bez zmian
        const unsubscribeStats = firestore()
            .collection('users')
            .doc(currentUser.uid)
            .collection('testResults')
            .onSnapshot(querySnapshot => {
                const results: TestResultData[] = [];
                querySnapshot.forEach(doc => {
                    results.push(doc.data() as TestResultData);
                });

                if (results.length > 0) {
                    const totalTests = results.length;
                    const avgScore = Math.round(results.reduce((sum, r) => sum + r.percentage, 0) / totalTests);
                    const performanceByTopic: { [key: string]: { sum: number; count: number } } = {};
                    results.forEach(res => {
                        if (!performanceByTopic[res.topic]) {
                            performanceByTopic[res.topic] = { sum: 0, count: 0 };
                        }
                        performanceByTopic[res.topic].sum += res.percentage;
                        performanceByTopic[res.topic].count += 1;
                    });
                    const chartData = Object.keys(performanceByTopic).map(topic => ({
                        value: Math.round(performanceByTopic[topic].sum / performanceByTopic[topic].count),
                        label: topic.length > 8 ? topic.substring(0, 8) + '...' : topic,
                        frontColor: '#00BCD4',
                    }));
                    setStats({ totalTests, avgScore, topicPerformance: chartData });
                } else {
                    setStats(null);
                }
                setLoadingTestStats(false); // ✅ ZMIANA
            }, error => {
                console.error("[Profile] STATS_LISTENER_ERROR:", error);
                setLoadingTestStats(false); // ✅ ZMIANA
            });

        // Listener dla Osiągnięć (achievements) - zostaje bez zmian
        const unsubscribeAchievements = firestore()
            .collection('users')
            .doc(currentUser.uid)
            .collection('achievements')
            .orderBy('awardedAt', 'desc')
            .onSnapshot(querySnapshot => {
                const userAchievements: IAchievement[] = [];
                querySnapshot.forEach(documentSnapshot => {
                    userAchievements.push(documentSnapshot.data() as IAchievement);
                });
                setAchievements(userAchievements);
                setLoadingAchievements(false); // ✅ Ustawiamy ładowanie
            }, error => {
                console.error("[Profile] ACHIEVEMENTS_LISTENER_ERROR:", error);
                setLoadingAchievements(false); // ✅ Ustawiamy ładowanie
            });

        return () => {
            unsubscribeStats();
            unsubscribeAchievements();
        };
    }, [currentUser]);

    const handleLogout = async () => {
        // ... (bez zmian)
        try {
            await auth().signOut();
        } catch (error: any) {
            console.error('Błąd podczas wylogowywania: ', error);
            Alert.alert('Błąd', 'Wystąpił problem podczas wylogowywania.');
        }
    };

    const renderAchievement = ({ item }: { item: IAchievement }) => (
        // ... (bez zmian)
        <View style={styles.achievementCard}>
            <Ionicons name={item.icon} size={36} color="#FFC107" />
            <View style={styles.achievementTextContainer}>
                <Text style={styles.achievementName}>{item.name}</Text>
                <Text style={styles.achievementDescription}>{item.description}</Text>
            </View>
        </View>
    );

    return (
        <ScrollView contentContainerStyle={styles.scrollViewContainer}>
            <View style={styles.container}>
                <Text style={styles.headerTitle}>Mój Profil</Text>

                {/* Sekcja "Dane użytkownika" (bez zmian) */}
                <TouchableOpacity style={{ width: '100%' }} onPress={() => navigation.navigate('UserDetails')}>
                    <View style={styles.sectionContainer}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="person-circle-outline" size={28} color="#00796B" style={styles.sectionIcon} />
                            <Text style={styles.sectionTitle}>Dane użytkownika</Text>
                            {/* ✅ Dodajemy strzałkę w prawo dla spójności */}
                            <Ionicons name="chevron-forward-outline" size={22} color="#546E7A" style={{ marginLeft: 'auto' }} />
                        </View>
                        <Text style={styles.userInfoText}>
                            Nick: {currentUser?.displayName || 'Brak'}
                        </Text>
                        <Text style={styles.userInfoText}>
                            Email: {currentUser?.email || 'Brak danych'}
                        </Text>
                        {currentUser && !currentUser.emailVerified && (
                            <View style={styles.verificationWarning}>
                                <Ionicons name="alert-circle-outline" size={24} color="#D84315" />
                                <Text style={styles.verificationText}>
                                    Twój email nie został potwierdzony.
                                </Text>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>

                {/* Karta "Statystyki Testów" (bez zmian) */}
                <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="stats-chart-outline" size={26} color="#4CAF50" style={styles.sectionIcon} />
                        <Text style={styles.sectionTitle}>Statystyki Testów</Text>
                    </View>
                    {loadingTestStats ? <ActivityIndicator color="#00BCD4" /> : ( // ✅ ZMIANA
                        stats ? (
                            <>
                                <View style={styles.statsSummary}>
                                    <Text style={styles.statsText}>Ukończone testy: {stats.totalTests}</Text>
                                    <Text style={styles.statsText}>Średni wynik: {stats.avgScore}%</Text>
                                </View>
                                <Text style={styles.chartTitle}>Wyniki wg. działów:</Text>
                                <View style={{ paddingHorizontal: 10, paddingBottom: 10, alignItems: 'center' }}>
                                    <BarChart
                                        data={stats.topicPerformance}
                                        barWidth={22}
                                        initialSpacing={10}
                                        spacing={30}
                                        barBorderRadius={4}
                                        yAxisTextStyle={{ color: 'gray' }}
                                        xAxisLabelTextStyle={{ color: 'gray', fontSize: 10, transform: [{ rotate: '-20deg' }], marginLeft: 15 }}
                                        noOfSections={5}
                                        maxValue={100}
                                        yAxisLabelSuffix="%"
                                        isAnimated
                                    />
                                </View>
                            </>
                        ) : <Text style={styles.placeholderText}>Ukończ swój pierwszy test, aby zobaczyć statystyki!</Text>
                    )}
                </View>

                {/* ✅ ZMIANA: DODANA NOWA KARTA-PRZYCISK DLA STATYSTYK TRENINGÓW */}
                <TouchableOpacity
                    style={styles.sectionContainer}
                    onPress={() => navigation.navigate('StatsScreen')} // Nawiguje do 'StatsScreen'
                >
                    <View style={styles.sectionHeader}>
                        <Ionicons name="barbell-outline" size={26} color="#00796B" style={styles.sectionIcon} />
                        <Text style={styles.sectionTitle}>Statystyki Treningów</Text>
                        {/* Strzałka sugerująca, że można kliknąć */}
                        <Ionicons name="chevron-forward-outline" size={22} color="#546E7A" style={{ marginLeft: 'auto' }} />
                    </View>
                    <Text style={styles.placeholderText}>
                        Zobacz podsumowanie swoich ćwiczeń (mnożenie, dzielenie...)
                    </Text>
                </TouchableOpacity>

                {/* Karta "Moje osiągnięcia" (bez zmian) */}
                <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="trophy-outline" size={26} color="#FFC107" style={styles.sectionIcon} />
                        <Text style={styles.sectionTitle}>Moje osiągnięcia</Text>
                    </View>
                    {loadingAchievements ? <ActivityIndicator color="#FFC107" /> : ( // ✅ ZMIANA
                        <FlatList
                            data={achievements}
                            renderItem={renderAchievement}
                            keyExtractor={item => item.id}
                            ListEmptyComponent={<Text style={styles.placeholderText}>Jeszcze nie zdobyłeś żadnych odznak. Ukończ test, aby zacząć!</Text>}
                            scrollEnabled={false}
                        />
                    )}
                </View>

                {/* Przycisk wylogowania (bez zmian) */}
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={22} color="#FFFFFF" />
                    <Text style={styles.logoutButtonText}>Wyloguj się</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    // ... (wszystkie style pozostają bez zmian)
    scrollViewContainer: { flexGrow: 1, backgroundColor: '#F0F4F8' },
    container: { flex: 1, alignItems: 'center', padding: 20 },
    headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#263238', marginTop: 20, marginBottom: 30 },
    sectionContainer: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 20, width: '100%', marginBottom: 25, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingBottom: 10 },
    sectionIcon: { marginRight: 10 },
    sectionTitle: { fontSize: 18, fontWeight: '600', color: '#37474F' },
    userInfoText: { fontSize: 16, color: '#455A64', paddingLeft: 5, marginBottom: 5 },
    placeholderText: { fontSize: 15, color: '#546E7A', textAlign: 'center', padding: 10, lineHeight: 22 },
    logoutButton: { flexDirection: 'row', backgroundColor: '#d9534f', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 25, alignItems: 'center', justifyContent: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2, marginTop: 20 },
    logoutButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
    achievementCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee', },
    achievementTextContainer: { marginLeft: 15, flex: 1 },
    achievementName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    achievementDescription: { fontSize: 14, color: '#666', marginTop: 2 },
    statsSummary: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 15 },
    statsText: { fontSize: 16, color: '#455A64' },
    chartTitle: { fontSize: 16, fontWeight: '600', color: '#37474F', marginTop: 15, marginBottom: 10, textAlign: 'center' },
    verificationWarning: {
        backgroundColor: '#FFE0B2',
        padding: 10,
        borderRadius: 8,
        marginTop: 10,
        flexDirection: 'row',
        alignItems: 'center',
    },
    verificationText: {
        color: '#BF360C',
        marginLeft: 10,
        flex: 1,
    },
});

export default ProfileScreen;