import React, { useState, useEffect, useMemo } from 'react'; // ✅ ZMIANA: Dodano useMemo
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    TextInput, // ✅ ZMIANA: Dodano TextInput
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BarChart } from "react-native-gifted-charts";

// ... (Typy TestStatGroup i TrainerStat bez zmian) ...
type TestStatGroup = {
    topic: string;
    totalTests: number;
    avgScore: number;
    chartData: { value: number; label: string; frontColor: string }[];
};
type TrainerStat = {
    id: string;
    totalCorrect: number;
    totalWrong: number;
};

// Funkcja pomocnicza (bez zmian)
const getTrainerName = (id: string) => {
    switch (id) {
        case 'multiplicationTrainer':
            return 'Trener Mnożenia';
        case 'divisionTrainer':
            return 'Trener Dzielenia';
        case 'addSubtractTrainer':
            return 'Dodawanie i Odejmowanie';
        default:
            return id;
    }
};

function StatsScreen() {
    const [testStats, setTestStats] = useState<TestStatGroup[]>([]);
    const [trainerStats, setTrainerStats] = useState<TrainerStat[]>([]);
    const [loading, setLoading] = useState(true);

    // ✅ ZMIANA: Dodajemy stan dla paska wyszukiwania
    const [searchQuery, setSearchQuery] = useState('');

    const currentUser = auth().currentUser;

    useEffect(() => {
        // ... (Cała funkcja useEffect do pobierania danych zostaje BEZ ZMIAN) ...
        if (!currentUser) {
            setLoading(false);
            return;
        }

        const fetchAllStats = async () => {
            setLoading(true);
            try {
                // --- 1. Pobieranie statystyk TESTÓW (testResults) ---
                const testResultsRef = firestore()
                    .collection('users')
                    .doc(currentUser.uid)
                    .collection('testResults');

                const testSnapshot = await testResultsRef.get();

                const performanceByTopic: { [key: string]: { sum: number; count: number; results: any[] } } = {};
                testSnapshot.forEach(doc => {
                    const res = doc.data();
                    if (!performanceByTopic[res.topic]) {
                        performanceByTopic[res.topic] = { sum: 0, count: 0, results: [] };
                    }
                    performanceByTopic[res.topic].sum += res.percentage;
                    performanceByTopic[res.topic].count += 1;
                    performanceByTopic[res.topic].results.push(res);
                });

                const groupedTestStats: TestStatGroup[] = Object.keys(performanceByTopic).map(topic => {
                    const data = performanceByTopic[topic];
                    const chartData = [{
                        value: Math.round(data.sum / data.count),
                        label: 'Średnia',
                        frontColor: '#00BCD4',
                    }];
                    return {
                        topic: topic,
                        totalTests: data.count,
                        avgScore: Math.round(data.sum / data.count),
                        chartData: chartData,
                    };
                });
                setTestStats(groupedTestStats);

                // --- 2. Pobieranie statystyk TRENINGÓW (exerciseStats) ---
                const trainerStatsRef = firestore()
                    .collection('users')
                    .doc(currentUser.uid)
                    .collection('exerciseStats');

                const trainerSnapshot = await trainerStatsRef.get();

                const fetchedTrainerStats: TrainerStat[] = [];
                trainerSnapshot.forEach(doc => {
                    fetchedTrainerStats.push({
                        id: doc.id,
                        ...doc.data(),
                    } as TrainerStat);
                });
                setTrainerStats(fetchedTrainerStats);

            } catch (error) {
                console.error("Błąd pobierania statystyk:", error);
            } finally {
                setLoading(false);
            }
        };

        const unsubTest = firestore().collection('users').doc(currentUser.uid).collection('testResults').onSnapshot(fetchAllStats);
        const unsubTrainer = firestore().collection('users').doc(currentUser.uid).collection('exerciseStats').onSnapshot(fetchAllStats);

        return () => {
            unsubTest();
            unsubTrainer();
        };
    }, [currentUser]);

    // ✅ ZMIANA: Używamy useMemo do filtrowania statystyk treningów na żywo
    const filteredTrainerStats = useMemo(() => {
        if (!searchQuery) {
            return trainerStats; // Jeśli wyszukiwarka jest pusta, pokaż wszystko
        }
        // Filtrujemy na podstawie nazwy treningu
        return trainerStats.filter(stat =>
            getTrainerName(stat.id)
                .toLowerCase()
                .includes(searchQuery.toLowerCase())
        );
    }, [searchQuery, trainerStats]); // Przelicz tylko, gdy zmieni się tekst lub dane


    // Renderowanie pojedynczej karty dla statystyk TRENINGU
    const renderTrainerStatCard = (item: TrainerStat) => {
        // ... (Ta funkcja zostaje bez zmian) ...
        const total = item.totalCorrect + item.totalWrong;
        const accuracy = total > 0 ? Math.floor((item.totalCorrect / total) * 100) : 0;

        return (
            <View key={item.id} style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                    <Ionicons name="barbell-outline" size={26} color="#00796B" style={styles.sectionIcon} />
                    <Text style={styles.sectionTitle}>{getTrainerName(item.id)}</Text>
                </View>
                <View style={styles.statsContainer}>
                    <Text style={styles.statRow}>
                        ✅ Poprawne:
                        <Text style={styles.statValueGood}> {item.totalCorrect}</Text>
                    </Text>
                    <Text style={styles.statRow}>
                        ❌ Błędne:
                        <Text style={styles.statValueBad}> {item.totalWrong}</Text>
                    </Text>
                    <Text style={styles.statRow}>
                        📊 Dokładność:
                        <Text style={styles.statValue}> {accuracy}%</Text>
                    </Text>
                </View>
            </View>
        );
    };

    // Renderowanie pojedynczej karty dla statystyk TESTU
    const renderTestStatCard = (item: TestStatGroup) => {
        // ... (Ta funkcja zostaje bez zmian) ...
        return (
            <View key={item.topic} style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                    <Ionicons name="stats-chart-outline" size={26} color="#4CAF50" style={styles.sectionIcon} />
                    <Text style={styles.sectionTitle}>{item.topic}</Text>
                </View>
                <View style={styles.statsSummary}>
                    <Text style={styles.statsText}>Ukończone testy: {item.totalTests}</Text>
                    <Text style={styles.statsText}>Średni wynik: {item.avgScore}%</Text>
                </View>

                <View style={{ paddingHorizontal: 10, paddingBottom: 10, alignItems: 'center' }}>
                    <BarChart
                        data={item.chartData}
                        barWidth={50}
                        initialSpacing={10}
                        spacing={30}
                        barBorderRadius={4}
                        yAxisTextStyle={{ color: 'gray' }}
                        xAxisLabelTextStyle={{ color: 'gray', fontSize: 10 }}
                        noOfSections={5}
                        maxValue={100}
                        yAxisLabelSuffix="%"
                        isAnimated
                    />
                </View>
            </View>
        );
    };


    if (loading) {
        return <View style={styles.centered}><ActivityIndicator size="large" color="#007AFF" /></View>;
    }

    return (
        <ScrollView contentContainerStyle={styles.container}>

            {/* ✅ ZMIANA: Ta linia została USUNIĘTA
            <Text style={styles.headerTitle}>Moje Statystyki</Text>
            */}

            {/* Sekcja Treningów */}
            <Text style={styles.bigSectionTitle}>Treningi (Ćwiczenia)</Text>

            {/* ✅ ZMIANA: Dodano pasek wyszukiwania */}
            <TextInput
                style={styles.searchInput}
                placeholder="Szukaj treningu..."
                placeholderTextColor="#666"
                value={searchQuery}
                onChangeText={setSearchQuery} // Aktualizuje stan searchQuery przy każdym naciśnięciu klawisza
            />

            {/* ✅ ZMIANA: Używamy 'filteredTrainerStats' zamiast 'trainerStats' */}
            {filteredTrainerStats.length > 0 ? (
                filteredTrainerStats.map(renderTrainerStatCard)
            ) : (
                <View style={styles.sectionContainer}>
                    {/* ✅ ZMIANA: Lepszy komunikat, gdy nic nie znaleziono */}
                    <Text style={styles.placeholderText}>
                        {searchQuery ? 'Nie znaleziono treningu.' : 'Brak statystyk z treningów.'}
                    </Text>
                </View>
            )}

            {/* Sekcja Testów (bez zmian) */}
            <Text style={styles.bigSectionTitle}>Testy (Quizy)</Text>
            {testStats.length > 0 ? (
                testStats.map(renderTestStatCard)
            ) : (
                <View style={styles.sectionContainer}>
                    <Text style={styles.placeholderText}>Brak statystyk z testów.</Text>
                </View>
            )}

        </ScrollView>
    );
}

const styles = StyleSheet.create({
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F0F4F8'
    },
    container: {
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#F0F4F8',
    },
    // ✅ ZMIANA: Usunęliśmy styl 'headerTitle'

    bigSectionTitle: {
        fontSize: 22,
        fontWeight: '600',
        color: '#37474F',
        alignSelf: 'flex-start',
        marginBottom: 15,
        marginTop: 10,
    },

    // ✅ ZMIANA: Dodano styl dla paska wyszukiwania
    searchInput: {
        width: '100%',
        height: 50,
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        paddingHorizontal: 15,
        fontSize: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        color: '#000',
        elevation: 2, // Lekki cień na Androidzie
    },

    sectionContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 20,
        width: '100%',
        marginBottom: 25,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        paddingBottom: 10
    },
    sectionIcon: {
        marginRight: 10
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#37474F'
    },
    placeholderText: {
        fontSize: 15,
        color: '#546E7A',
        textAlign: 'center',
        padding: 10,
        lineHeight: 22
    },
    statsSummary: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 15
    },
    statsText: {
        fontSize: 16,
        color: '#455A64'
    },
    statsContainer: {
        width: '100%',
        marginTop: 10,
    },
    statRow: {
        fontSize: 16,
        color: '#333',
        marginBottom: 8,
        paddingLeft: 5,
    },
    statValue: {
        fontWeight: 'bold',
        color: '#000',
    },
    statValueGood: {
        fontWeight: 'bold',
        color: '#28a745',
    },
    statValueBad: {
        fontWeight: 'bold',
        color: '#dc3545',
    },
});

export default StatsScreen;