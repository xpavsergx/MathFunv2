import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView,
    FlatList, ActivityIndicator, useColorScheme // Dodano useColorScheme
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import Ionicons from '@expo/vector-icons/Ionicons';
// import { BarChart } from "react-native-gifted-charts"; // Nadal zakomentowane
import { IAchievement } from '../config/achievements';
import { TestResultData } from '../services/userStatsService';
import { useNavigation } from '@react-navigation/native';
import { COLORS, FONT_SIZES, PADDING, MARGIN } from '../styles/theme'; // Importuj THEME

function ProfileScreen() {
    // ... stany (achievements, stats, loadingTestStats, loadingAchievements) ...
    const [achievements, setAchievements] = useState<IAchievement[]>([]);
    const [stats, setStats] = useState<{ /* ... */ } | null>(null);
    const [loadingTestStats, setLoadingTestStats] = useState(true);
    const [loadingAchievements, setLoadingAchievements] = useState(true);

    const currentUser = auth().currentUser;
    const navigation = useNavigation<any>(); // Użyj dokładniejszego typu, jeśli to możliwe

    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';

    // Dynamiczne style
    const dynamicStyles = {
        scrollViewContainer: { backgroundColor: isDarkMode ? COLORS.backgroundDark : '#F0F4F8' },
        headerTitle: { color: isDarkMode ? COLORS.textDark : '#263238' },
        sectionContainer: { backgroundColor: isDarkMode ? COLORS.cardDark : COLORS.white },
        sectionTitle: { color: isDarkMode ? COLORS.textDark : '#37474F' },
        userInfoText: { color: isDarkMode ? COLORS.textDark : '#455A64' },
        placeholderText: { color: isDarkMode ? COLORS.grey : '#546E7A' },
        achievementName: { color: isDarkMode ? COLORS.textDark : '#333' },
        achievementDescription: { color: isDarkMode ? COLORS.grey : '#666' },
        statsText: { color: isDarkMode ? COLORS.textDark : '#455A64' },
        chartTitle: { color: isDarkMode ? COLORS.textDark : '#37474F' },
        sectionHeaderBorder: { borderBottomColor: isDarkMode ? COLORS.greyDarkTheme : '#f0f0f0' },
        achievementBorder: { borderBottomColor: isDarkMode ? COLORS.greyDarkTheme : '#eee' },
        iconColor: isDarkMode ? COLORS.primaryDarkTheme : '#00796B', // Kolor ikon w nagłówkach sekcji
        statsIconColor: isDarkMode ? COLORS.correct : '#4CAF50',
        trophyIconColor: isDarkMode ? COLORS.accent : '#FFC107',
        statsChartTextColor: isDarkMode ? COLORS.grey : 'gray',
    };

    // ... useEffect do ładowania danych ...
    useEffect(() => { /* ... logika ładowania ... */ }, [currentUser]);

    // ... handleLogout ...
    const handleLogout = async () => { /* ... */ };

    // ... renderAchievement ...
    const renderAchievement = ({ item }: { item: IAchievement }) => (
        <View style={[styles.achievementCard, dynamicStyles.achievementBorder]}>
            <Ionicons name={item.icon} size={36} color={dynamicStyles.trophyIconColor} />
            <View style={styles.achievementTextContainer}>
                <Text style={[styles.achievementName, dynamicStyles.achievementName]}>{item.name}</Text>
                <Text style={[styles.achievementDescription, dynamicStyles.achievementDescription]}>{item.description}</Text>
            </View>
        </View>
    );

    return (
        // Zastosowano dynamiczny styl tła
        <ScrollView contentContainerStyle={[styles.scrollViewContainer, dynamicStyles.scrollViewContainer]}>
            <View style={styles.container}>
                <Text style={[styles.headerTitle, dynamicStyles.headerTitle]}>Mój Profil</Text>

                {/* Sekcja "Dane użytkownika" */}
                <TouchableOpacity style={{ width: '100%' }} onPress={() => navigation.navigate('UserDetails')}>
                    {/* Zastosowano dynamiczny styl tła karty */}
                    <View style={[styles.sectionContainer, dynamicStyles.sectionContainer]}>
                        <View style={[styles.sectionHeader, dynamicStyles.sectionHeaderBorder]}>
                            <Ionicons name="person-circle-outline" size={28} color={dynamicStyles.iconColor} style={styles.sectionIcon} />
                            <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Dane użytkownika</Text>
                            <Ionicons name="chevron-forward-outline" size={22} color={dynamicStyles.placeholderText.color} style={{ marginLeft: 'auto' }} />
                        </View>
                        <Text style={[styles.userInfoText, dynamicStyles.userInfoText]}>
                            Nick: {currentUser?.displayName || 'Brak'}
                        </Text>
                        <Text style={[styles.userInfoText, dynamicStyles.userInfoText]}>
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

                {/* Karta "Statystyki Testów" */}
                <View style={[styles.sectionContainer, dynamicStyles.sectionContainer]}>
                    <View style={[styles.sectionHeader, dynamicStyles.sectionHeaderBorder]}>
                        <Ionicons name="stats-chart-outline" size={26} color={dynamicStyles.statsIconColor} style={styles.sectionIcon} />
                        <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Statystyki Testów</Text>
                    </View>
                    {loadingTestStats ? <ActivityIndicator color={COLORS.primary} /> : (
                        stats ? (
                            <>
                                <View style={styles.statsSummary}>
                                    <Text style={[styles.statsText, dynamicStyles.statsText]}>Ukończone testy: {stats.totalTests}</Text>
                                    <Text style={[styles.statsText, dynamicStyles.statsText]}>Średni wynik: {stats.avgScore}%</Text>
                                </View>
                                <Text style={[styles.chartTitle, dynamicStyles.chartTitle]}>Wyniki wg. działów:</Text>
                                <View style={{ paddingHorizontal: 10, paddingBottom: 10, alignItems: 'center' }}>
                                    {/* Wykres nadal zakomentowany */}
                                    <Text style={[styles.placeholderText, dynamicStyles.placeholderText]}>Wykres wymaga Development Build</Text>
                                    {/*
                                    <BarChart
                                        data={stats.topicPerformance}
                                        // ... props ...
                                        yAxisTextStyle={{ color: dynamicStyles.statsChartTextColor }}
                                        xAxisLabelTextStyle={{ color: dynamicStyles.statsChartTextColor, fontSize: 10, transform: [{ rotate: '-20deg' }], marginLeft: 15 }}
                                    />
                                     */}
                                </View>
                            </>
                        ) : <Text style={[styles.placeholderText, dynamicStyles.placeholderText]}>Ukończ swój pierwszy test, aby zobaczyć statystyki!</Text>
                    )}
                </View>

                {/* Karta-Przycisk "Statystyki Treningów" */}
                <TouchableOpacity
                    style={[styles.sectionContainer, dynamicStyles.sectionContainer]}
                    onPress={() => navigation.navigate('StatsScreen')}
                >
                    <View style={[styles.sectionHeader, dynamicStyles.sectionHeaderBorder]}>
                        <Ionicons name="barbell-outline" size={26} color={dynamicStyles.iconColor} style={styles.sectionIcon} />
                        <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Statystyki Treningów</Text>
                        <Ionicons name="chevron-forward-outline" size={22} color={dynamicStyles.placeholderText.color} style={{ marginLeft: 'auto' }} />
                    </View>
                    <Text style={[styles.placeholderText, dynamicStyles.placeholderText]}>
                        Zobacz podsumowanie swoich ćwiczeń (mnożenie, dzielenie...)
                    </Text>
                </TouchableOpacity>

                {/* Karta "Moje osiągnięcia" */}
                <View style={[styles.sectionContainer, dynamicStyles.sectionContainer]}>
                    <View style={[styles.sectionHeader, dynamicStyles.sectionHeaderBorder]}>
                        <Ionicons name="trophy-outline" size={26} color={dynamicStyles.trophyIconColor} style={styles.sectionIcon} />
                        <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Moje osiągnięcia</Text>
                    </View>
                    {loadingAchievements ? <ActivityIndicator color={COLORS.accent} /> : (
                        <FlatList
                            data={achievements}
                            renderItem={renderAchievement}
                            keyExtractor={item => item.id}
                            ListEmptyComponent={<Text style={[styles.placeholderText, dynamicStyles.placeholderText]}>Jeszcze nie zdobyłeś żadnych odznak. Ukończ test, aby zacząć!</Text>}
                            scrollEnabled={false}
                        />
                    )}
                </View>

                {/* Przycisk wylogowania (bez zmian stylu, kolor pasuje) */}
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={22} color={COLORS.white} />
                    <Text style={styles.logoutButtonText}>Wyloguj się</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

// Style (część pozostaje, część będzie nadpisana przez dynamicStyles)
const styles = StyleSheet.create({
    scrollViewContainer: { flexGrow: 1 }, // Kolor tła dynamiczny
    container: { flex: 1, alignItems: 'center', padding: PADDING.large }, // Używamy stałych
    headerTitle: { fontSize: FONT_SIZES.xlarge + 2, fontWeight: 'bold', marginTop: MARGIN.medium, marginBottom: MARGIN.large + MARGIN.small },
    sectionContainer: { borderRadius: 12, padding: PADDING.large, width: '100%', marginBottom: MARGIN.large + MARGIN.small, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: MARGIN.medium, borderBottomWidth: 1, paddingBottom: PADDING.small },
    sectionIcon: { marginRight: MARGIN.small },
    sectionTitle: { fontSize: FONT_SIZES.large, fontWeight: '600' },
    userInfoText: { fontSize: FONT_SIZES.medium, paddingLeft: PADDING.small / 2, marginBottom: MARGIN.small / 2 },
    placeholderText: { fontSize: FONT_SIZES.medium - 1, textAlign: 'center', padding: PADDING.small, lineHeight: 22 },
    logoutButton: { flexDirection: 'row', backgroundColor: COLORS.incorrect, paddingVertical: PADDING.medium - 4, paddingHorizontal: PADDING.large, borderRadius: 25, alignItems: 'center', justifyContent: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2, marginTop: MARGIN.medium },
    logoutButtonText: { color: COLORS.white, fontSize: FONT_SIZES.medium, fontWeight: 'bold', marginLeft: MARGIN.small },
    achievementCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: PADDING.small, borderBottomWidth: 1 },
    achievementTextContainer: { marginLeft: MARGIN.medium, flex: 1 },
    achievementName: { fontSize: FONT_SIZES.medium, fontWeight: 'bold' },
    achievementDescription: { fontSize: FONT_SIZES.small + 2, marginTop: 2 },
    statsSummary: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: MARGIN.medium },
    statsText: { fontSize: FONT_SIZES.medium },
    chartTitle: { fontSize: FONT_SIZES.medium, fontWeight: '600', marginTop: MARGIN.medium, marginBottom: MARGIN.small, textAlign: 'center' },
    verificationWarning: { backgroundColor: '#FFE0B2', padding: PADDING.small, borderRadius: 8, marginTop: MARGIN.small, flexDirection: 'row', alignItems: 'center' },
    verificationText: { color: '#BF360C', marginLeft: MARGIN.small, flex: 1 },
});

export default ProfileScreen;
