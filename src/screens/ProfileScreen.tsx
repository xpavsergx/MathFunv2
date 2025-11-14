// src/screens/ProfileScreen.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView,
    FlatList, ActivityIndicator, useColorScheme, SafeAreaView, Image
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import Ionicons from '@expo/vector-icons/Ionicons';
import { IAchievement, ACHIEVEMENTS } from '../config/achievements';
import AchievementBadge from '../Components/AchievementBadge';
import { useNavigation } from '@react-navigation/native';
import { COLORS, FONT_SIZES, PADDING, MARGIN } from '../styles/theme';
// --- ✅ 1. ІМПОРТУЄМО З НОВОГО ФАЙЛУ ---
import { getAvatarImage } from '../utils/avatarUtils';

// Інтерфейс для даних користувача
interface UserData {
    firstName: string;
    email: string;
    avatar?: string;
    level: number;
    xp: number;
    xpToNextLevel: number;
    coins: number;
}

// --- ❌ 2. ВИДАЛЯЄМО СТАРУ ФУНКЦІЮ getAvatarImage ---
// (Вона тепер у avatarUtils)

// Компонент рядка меню
const ProfileMenuItem = ({ icon, title, onPress, themeStyles }) => (
    <TouchableOpacity style={[styles.menuItem, themeStyles.menuItem]} onPress={onPress}>
        <Ionicons name={icon} size={24} color={themeStyles.menuIcon.color} style={styles.menuIcon} />
        <Text style={[styles.menuText, themeStyles.menuText]}>{title}</Text>
        <Ionicons name="chevron-forward-outline" size={22} color={themeStyles.menuChevron.color} />
    </TouchableOpacity>
);

function ProfileScreen() {
    const [userData, setUserData] = useState<UserData | null>(null);
    const [unlockedAchievements, setUnlockedAchievements] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);

    const currentUser = auth().currentUser;
    const navigation = useNavigation<any>();
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';

    // (themeStyles, useEffect, allAchievementsData, handleLogout, renderXpBar... - без змін)
    const themeStyles = {
        container: { backgroundColor: isDarkMode ? COLORS.backgroundDark : '#F0F4F8' },
        card: { backgroundColor: isDarkMode ? COLORS.cardDark : COLORS.white },
        levelCardText: { color: isDarkMode ? COLORS.textDark : COLORS.textLight },
        xpText: { color: isDarkMode ? COLORS.greyDarkTheme : COLORS.grey },
        coinText: { color: isDarkMode ? '#FFD700' : '#E6A23C' },
        menuItem: { backgroundColor: isDarkMode ? COLORS.cardDark : COLORS.white, borderBottomColor: isDarkMode ? '#333' : '#F0F0F0' },
        menuText: { color: isDarkMode ? COLORS.textDark : COLORS.textLight },
        menuIcon: { color: isDarkMode ? COLORS.primaryDarkTheme : COLORS.primary },
        menuChevron: { color: isDarkMode ? COLORS.greyDarkTheme : COLORS.grey },
        xpBarBackground: { backgroundColor: isDarkMode ? '#121212' : '#E0E0E0' },
    };

    useEffect(() => {
        if (!currentUser) {
            setLoading(false);
            return;
        }
        const userSub = firestore().collection('users').doc(currentUser.uid).onSnapshot(doc => {
            if (doc.exists) { setUserData(doc.data() as UserData); } else { setUserData(null); }
            setLoading(false);
        });
        const achSub = firestore().collection('users').doc(currentUser.uid).collection('achievements').onSnapshot(querySnapshot => {
            const unlockedIds = new Set<string>();
            querySnapshot.forEach(doc => { unlockedIds.add(doc.id); });
            setUnlockedAchievements(unlockedIds);
        });
        return () => { userSub(); achSub(); };
    }, [currentUser]);

    const allAchievementsData = useMemo(() => {
        return Object.keys(ACHIEVEMENTS).map(id => ({
            ...ACHIEVEMENTS[id],
            id: id,
            isUnlocked: unlockedAchievements.has(id),
        }));
    }, [unlockedAchievements]);

    const handleLogout = async () => {
        try {
            await auth().signOut();
        } catch (error) {
            console.error("Błąd wylogowania:", error);
            Alert.alert("Błąd", "Wystąpił błąd podczas wylogowywania.");
        }
    };

    const renderXpBar = () => {
        if (!userData || !userData.xpToNextLevel || userData.xpToNextLevel === 0) return null;
        const progress = (userData.xp / userData.xpToNextLevel) * 100;
        return (
            <View>
                <View style={[styles.xpBarBackground, themeStyles.xpBarBackground]}>
                    <View style={[styles.xpBarForeground, { width: `${progress}%` }]} />
                </View>
                <Text style={[styles.xpText, themeStyles.xpText]}>{userData.xp} / {userData.xpToNextLevel} XP</Text>
            </View>
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.safeArea, themeStyles.container]}>
                <ActivityIndicator size="large" color={COLORS.primary} style={{marginTop: 50}} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.safeArea, themeStyles.container]}>
            <ScrollView
                contentContainerStyle={styles.scrollContainer}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.contentWrapper}>
                    <View style={styles.mainContent}>
                        {userData && (
                            <View style={styles.headerContainer}>
                                <Image
                                    source={getAvatarImage(userData.avatar)} // <-- Використовуємо імпортовану функцію
                                    style={styles.avatar}
                                />
                                <Text style={[styles.userName, themeStyles.levelCardText]}>
                                    {userData.firstName || currentUser?.email}
                                </Text>
                            </View>
                        )}

                        {userData && (
                            <View style={[styles.levelCard, themeStyles.card]}>
                                <View style={styles.levelHeader}>
                                    <Text style={[styles.levelText, themeStyles.levelCardText]}>
                                        Poziom {userData.level}
                                    </Text>
                                    <View style={[styles.coinContainer, themeStyles.card]}>
                                        <Text style={[styles.coinText, themeStyles.coinText]}>🪙 {userData.coins}</Text>
                                    </View>
                                </View>
                                {renderXpBar()}
                            </View>
                        )}

                        <View style={[styles.menuGroup, themeStyles.card]}>
                            <ProfileMenuItem icon="person-outline" title="Dane użytkownika" onPress={() => navigation.navigate('UserDetails')} themeStyles={themeStyles} />
                            <ProfileMenuItem icon="stats-chart-outline" title="Statystyki Treningów" onPress={() => navigation.navigate('StatsScreen')} themeStyles={themeStyles} />
                            <ProfileMenuItem
                                icon="cart-outline"
                                title="Sklep"
                                onPress={() => navigation.navigate('Store')} // <-- Кнопка магазину
                                themeStyles={themeStyles}
                            />
                        </View>

                        <View style={[styles.achievementsGroup, themeStyles.card]}>
                            <Text style={[styles.sectionTitle, themeStyles.menuText]}>Osiągnięcia</Text>
                            <FlatList
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                data={allAchievementsData}
                                renderItem={({ item }) => <AchievementBadge badge={item} />}
                                keyExtractor={item => item.id}
                                contentContainerStyle={{ paddingHorizontal: PADDING.small, paddingTop: PADDING.small }}
                            />
                        </View>
                    </View>

                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                        <Ionicons name="log-out-outline" size={22} color={COLORS.white} />
                        <Text style={styles.logoutButtonText}>Wyloguj się</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

// (Стилі 'styles' залишаються без змін)
const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    scrollContainer: {
        flexGrow: 1,
        padding: PADDING.medium,
    },
    contentWrapper: {
        flex: 1,
        justifyContent: 'space-between',
        minHeight: '100%',
    },
    mainContent: {
        width: '100%',
        alignItems: 'center',
    },
    headerContainer: {
        alignItems: 'center',
        marginBottom: MARGIN.medium,
        width: '100%',
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 3,
        borderColor: COLORS.white,
        elevation: 4,
        marginBottom: MARGIN.small,
    },
    userName: {
        fontSize: FONT_SIZES.large,
        fontWeight: 'bold',
    },
    levelCard: {
        width: '100%',
        borderRadius: 12,
        padding: PADDING.large,
        marginBottom: MARGIN.large,
        elevation: 3,
    },
    levelHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: MARGIN.medium,
    },
    levelText: {
        fontSize: FONT_SIZES.xlarge,
        fontWeight: 'bold',
    },
    coinContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: PADDING.medium,
        paddingVertical: PADDING.small,
        borderRadius: 20,
    },
    coinText: {
        fontSize: FONT_SIZES.medium,
        fontWeight: 'bold',
    },
    xpBarBackground: {
        height: 10,
        borderRadius: 5,
        width: '100%',
        overflow: 'hidden',
    },
    xpBarForeground: {
        height: '100%',
        backgroundColor: COLORS.correct,
        borderRadius: 5,
    },
    xpText: {
        fontSize: FONT_SIZES.small,
        textAlign: 'right',
        marginTop: MARGIN.small / 2,
    },
    menuGroup: {
        width: '100%',
        borderRadius: 12,
        overflow: 'hidden',
        elevation: 3,
        marginBottom: MARGIN.large,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: PADDING.medium + 2,
        paddingHorizontal: PADDING.medium,
        borderBottomWidth: 1,
    },
    menuIcon: {
        marginRight: MARGIN.medium,
    },
    menuText: {
        flex: 1,
        fontSize: FONT_SIZES.medium,
        fontWeight: '500',
    },
    achievementsGroup: {
        width: '100%',
        borderRadius: 12,
        padding: PADDING.medium,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: FONT_SIZES.large,
        fontWeight: 'bold',
        paddingHorizontal: PADDING.small,
        marginBottom: MARGIN.small,
    },
    logoutButton: {
        flexDirection: 'row',
        backgroundColor: COLORS.incorrect,
        paddingVertical: PADDING.medium - 2,
        paddingHorizontal: PADDING.large,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
        marginTop: MARGIN.large,
        marginBottom: MARGIN.small,
        alignSelf: 'center',
        width: '80%',
    },
    logoutButtonText: {
        color: COLORS.white,
        fontSize: FONT_SIZES.medium,
        fontWeight: 'bold',
        marginLeft: MARGIN.small,
    },
});

export default ProfileScreen;
