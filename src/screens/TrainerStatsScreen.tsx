// src/screens/TrainerStatsScreen.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    TextInput,
    useColorScheme,
    Dimensions
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS } from '../styles/theme';

const { width } = Dimensions.get('window');

const getTrainerName = (id: string) => {
    const names: {[key: string]: string} = {
        'multiplicationTrainer': 'Trener Mnożenia',
        'divisionTrainer': 'Trener Dzielenia',
        'addSubtractTrainer': 'Dodawanie i Odejmowanie',
        'moreLessTrainer': 'O ile więcej, o ile mniej',
        'howManyTimesTrainer': 'Ile razy więcej, ile razy mniej',
        'divisionWithRemainder': 'Dzielenie z resztą',
        'squaresCubesTrainer': 'Kwadraty i sześciany liczb',
    };
    return names[id] || id;
};

const TrainerStatsScreen = () => {
    const [trainerStats, setTrainerStats] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';

    const themeStyles = {
        container: { backgroundColor: isDarkMode ? COLORS.backgroundDark : '#F5F7FA' },
        card: { backgroundColor: isDarkMode ? COLORS.cardDark : '#FFF' },
        text: { color: isDarkMode ? COLORS.textDark : '#1F2937' },
        textSecondary: { color: isDarkMode ? COLORS.greyDarkTheme : '#4B5563' }, // Nieco ciemniejszy dla lepszej czytelności
        input: {
            backgroundColor: isDarkMode ? COLORS.cardDark : '#FFF',
            color: isDarkMode ? '#FFF' : '#000',
            borderColor: isDarkMode ? '#4B5563' : '#D1D5DB'
        },
        progressBg: { backgroundColor: isDarkMode ? '#374151' : '#E5E7EB' }
    };

    useEffect(() => {
        const user = auth().currentUser;
        if (!user) return;

        const unsubscribe = firestore()
            .collection('users')
            .doc(user.uid)
            .collection('exerciseStats')
            .onSnapshot(snapshot => {
                const stats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setTrainerStats(stats);
                setLoading(false);
            });

        return () => unsubscribe();
    }, []);

    const filteredStats = useMemo(() =>
            trainerStats.filter(s => getTrainerName(s.id).toLowerCase().includes(searchQuery.toLowerCase())),
        [searchQuery, trainerStats]);

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

    return (
        <ScrollView style={[styles.container, themeStyles.container]}>
            {/* Wyszukiwarka */}
            <View style={styles.searchWrapper}>
                <Ionicons name="search" size={24} color="#999" style={styles.searchIcon} />
                <TextInput
                    style={[styles.searchInput, themeStyles.input]}
                    placeholder="Szukaj treningu..."
                    placeholderTextColor="#999"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {filteredStats.length > 0 ? (
                filteredStats.map((item) => {
                    const total = (item.totalCorrect || 0) + (item.totalWrong || 0);
                    const acc = total > 0 ? Math.floor((item.totalCorrect / total) * 100) : 0;
                    const statusColor = acc < 50 ? '#EF4444' : acc < 75 ? '#F59E0B' : '#10B981';
                    const iconBg = isDarkMode ? 'rgba(34, 211, 238, 0.2)' : 'rgba(6, 182, 212, 0.15)';

                    return (
                        <View key={item.id} style={[styles.card, themeStyles.card]}>
                            {/* Nagłówek - WIĘKSZA CZCIONKA */}
                            <View style={styles.cardHeader}>
                                <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
                                    <Ionicons name="barbell" size={28} color={isDarkMode ? '#22D3EE' : '#0891B2'} />
                                </View>
                                <Text style={[styles.cardTitle, themeStyles.text]}>{getTrainerName(item.id)}</Text>
                            </View>

                            {/* Statystyki - WIĘKSZE WARTOŚCI */}
                            <View style={styles.statsRow}>
                                <View style={styles.statBox}>
                                    <Ionicons name="checkmark-circle" size={22} color="#10B981" />
                                    <View>
                                        <Text style={[styles.statLabel, themeStyles.textSecondary]}>Poprawne</Text>
                                        <Text style={[styles.statValue, { color: '#10B981' }]}>{item.totalCorrect}</Text>
                                    </View>
                                </View>
                                <View style={styles.statBox}>
                                    <Ionicons name="close-circle" size={22} color="#EF4444" />
                                    <View>
                                        <Text style={[styles.statLabel, themeStyles.textSecondary]}>Błędne</Text>
                                        <Text style={[styles.statValue, { color: '#EF4444' }]}>{item.totalWrong}</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Sekcja Procentów - WYRAŹNIEJSZA */}
                            <View style={styles.progressSection}>
                                <View style={styles.progressLabels}>
                                    <Text style={[styles.progressInfo, themeStyles.textSecondary]}>Skuteczność</Text>
                                    <Text style={[styles.percentage, { color: statusColor }]}>{acc}%</Text>
                                </View>
                                <View style={[styles.progressBg, themeStyles.progressBg]}>
                                    <View style={[styles.progressFill, { width: `${acc}%`, backgroundColor: statusColor }]} />
                                </View>
                            </View>
                        </View>
                    );
                })
            ) : (
                <View style={styles.emptyContainer}>
                    <Ionicons name="search-outline" size={60} color="#CCC" />
                    <Text style={[styles.emptyText, themeStyles.textSecondary]}>Nie znaleziono treningu</Text>
                </View>
            )}
            <View style={{ height: 40 }} />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    searchWrapper: { position: 'relative', marginBottom: 24 },
    searchIcon: { position: 'absolute', left: 15, top: 16, zIndex: 1 },
    searchInput: {
        paddingVertical: 14,
        paddingLeft: 50,
        paddingRight: 15,
        borderRadius: 16,
        borderWidth: 1.5,
        fontSize: 18 // Powiększony tekst wyszukiwania
    },
    card: {
        padding: 24,
        borderRadius: 28,
        marginBottom: 20,
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 10
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
    iconContainer: {
        width: 52,
        height: 52,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16
    },
    cardTitle: {
        fontSize: 22, // Duży nagłówek
        fontWeight: 'bold',
        flex: 1
    },
    statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
    statBox: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    statLabel: { fontSize: 14, fontWeight: '600' },
    statValue: {
        fontSize: 20, // Duże liczby wyników
        fontWeight: '900'
    },
    progressSection: { marginTop: 4 },
    progressLabels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    progressInfo: { fontSize: 15, fontWeight: '700' },
    percentage: {
        fontSize: 20, // Duży procent
        fontWeight: '900'
    },
    progressBg: { height: 14, borderRadius: 7, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 7 },
    emptyContainer: { alignItems: 'center', marginTop: 100 },
    emptyText: { marginTop: 15, fontSize: 18, fontWeight: '500' }
});

export default TrainerStatsScreen;