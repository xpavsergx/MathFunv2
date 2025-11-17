// src/screens/ProfileScreen.tsx

import React, { useState, useEffect, useMemo } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView,
    FlatList, ActivityIndicator, useColorScheme, SafeAreaView, Image,
    Modal, Pressable
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ALL_ACHIEVEMENTS, Achievement, CriteriaType } from '../config/achievements';
import AchievementBadge from '../Components/AchievementBadge';
import { useNavigation } from '@react-navigation/native';
import { COLORS, FONT_SIZES, PADDING, MARGIN } from '../styles/theme';
import { getAvatarImage } from '../utils/avatarUtils';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

// Інтерфейс UserData (без змін)
interface UserData {
    firstName: string;
    email: string;
    avatar?: string;
    level: number;
    xp: number;
    xpToNextLevel: number;
    coins: number;
    earnedAchievementsMap?: {
        [achievementId: string]: {
            unlockedAt: FirebaseFirestoreTypes.Timestamp;
        };
    };
    duelsWon?: number;
    testsCompleted?: number;
    flawlessTests?: number;
    correctAnswersTotal?: number;
    friendsCount?: number;
}

// Інтерфейс DetailedAchievement (без змін)
interface DetailedAchievement extends Achievement {
    isUnlocked: boolean;
    unlockedAt?: FirebaseFirestoreTypes.Timestamp;
}

// Компонент StatBox (без змін)
const StatBox = ({ title, value, icon, themeStyles }) => (
    <View style={[styles.statBox, themeStyles.card]}>
        <Ionicons name={icon} size={28} color={themeStyles.menuIcon.color} />
        <Text style={[styles.statValue, themeStyles.levelCardText]}>{value}</Text>
        <Text style={[styles.statTitle, themeStyles.xpText]}>{title}</Text>
    </View>
);

// Компонент ProfileMenuItem (без змін)
const ProfileMenuItem = ({ icon, title, onPress, themeStyles }) => (
    <TouchableOpacity style={[styles.menuItem, themeStyles.menuItem]} onPress={onPress}>
        <Ionicons name={icon} size={24} color={themeStyles.menuIcon.color} style={styles.menuIcon} />
        <Text style={[styles.menuText, themeStyles.menuText]}>{title}</Text>
        <Ionicons name="chevron-forward-outline" size={22} color={themeStyles.menuChevron.color} />
    </TouchableOpacity>
);

// Компонент ProgressDisplay (без змін)
const ProgressDisplay = ({ current, total, themeStyles }) => {
    const cappedCurrent = Math.min(current, total);
    const progressPercent = total > 0 ? (cappedCurrent / total) * 100 : 0;
    return (
        <View style={styles.progressContainer}>
            <Text style={[styles.modalDate, themeStyles.modalDate, { textAlign: 'center', marginBottom: MARGIN.small }]}>
                Twój postęp: {cappedCurrent} / {total}
            </Text>
            <View style={[styles.modalXpBarBackground, themeStyles.xpBarBackground]}>
                <View style={[styles.modalXpBarForeground, { width: `${progressPercent}%` }]} />
            </View>
        </View>
    );
};


function ProfileScreen() {
    // (Стани, хуки, стилі теми - все без змін)
    const [userData, setUserData] = useState<UserData | null>(null);
    const [earnedMap, setEarnedMap] = useState<UserData['earnedAchievementsMap']>({});
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedAchievement, setSelectedAchievement] = useState<DetailedAchievement | null>(null);

    const currentUser = auth().currentUser;
    const navigation = useNavigation<any>();
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';

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
        modalOverlay: { backgroundColor: 'rgba(0, 0, 0, 0.6)' },
        modalContent: { backgroundColor: isDarkMode ? '#222' : '#FFF' },
        modalTitle: { color: isDarkMode ? COLORS.textDark : COLORS.textLight },
        modalDesc: { color: isDarkMode ? COLORS.textDark : COLORS.textLight },
        modalDate: { color: isDarkMode ? COLORS.greyDarkTheme : COLORS.grey },
    };

    // (useEffect, useMemo - без змін)
    useEffect(() => {
        if (!currentUser) { setLoading(false); return; }
        const userSub = firestore().collection('users').doc(currentUser.uid).onSnapshot(doc => {
            if (doc.exists) {
                const data = doc.data() as UserData;
                setUserData(data);
                setEarnedMap(data.earnedAchievementsMap || {});
            } else {
                setUserData(null);
                setEarnedMap({});
            }
            setLoading(false);
        });
        return () => { userSub(); };
    }, [currentUser]);

    const allAchievementsData: DetailedAchievement[] = useMemo(() => {
        return ALL_ACHIEVEMENTS.map(config => {
            const earnedData = earnedMap ? earnedMap[config.id] : null;
            return {
                ...config,
                isUnlocked: !!earnedData,
                unlockedAt: earnedData?.unlockedAt,
            };
        });
    }, [earnedMap]);

    // (handleLogout, renderXpBar, getCurrentProgress, handleBadgePress - без змін)
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
            <View style={styles.xpBarContainer}>
                <View style={[styles.xpBarBackground, themeStyles.xpBarBackground]}>
                    <View style={[styles.xpBarForeground, { width: `${progress}%` }]} />
                </View>
                <Text style={[styles.xpText, themeStyles.xpText]}>{userData.xp} / {userData.xpToNextLevel} XP</Text>
            </View>
        );
    };

    const getCurrentProgress = (criteriaType: CriteriaType): number => {
        if (!userData) return 0;
        switch (criteriaType) {
            case 'testsCompleted': return userData.testsCompleted || 0;
            case 'correctAnswersTotal': return userData.correctAnswersTotal || 0;
            case 'flawlessTests': return userData.flawlessTests || 0;
            case 'duelsWon': return userData.duelsWon || 0;
            case 'friendsAdded': return userData.friendsCount || 0;
            case 'levelReached': return userData.level || 1;
            case 'trainersCompleted': return 0;
            default: return 0;
        }
    };

    const handleBadgePress = (achievement: DetailedAchievement) => {
        setSelectedAchievement(achievement);
        setModalVisible(true);
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.safeArea, themeStyles.container, { justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.safeArea, themeStyles.container]}>
            <ScrollView
                contentContainerStyle={styles.scrollContainer}
                showsVerticalScrollIndicator={false}
            >

                {/* 1. ВЕЛИКА КАРТКА (Інфо + Статистика) (Без змін) */}
                {userData && (
                    <View style={[styles.mainInfoCard, themeStyles.card]}>
                        <View style={styles.headerContainer}>
                            <Image
                                source={getAvatarImage(userData.avatar)}
                                style={styles.avatar}
                            />
                            <Text style={[styles.userName, themeStyles.levelCardText]}>
                                {userData.firstName || currentUser?.email}
                            </Text>
                        </View>
                        <View style={styles.levelHeader}>
                            <Text style={[styles.levelText, themeStyles.levelCardText]}>
                                Poziom {userData.level}
                            </Text>
                            <View style={[styles.coinContainer, themeStyles.card]}>
                                <Text style={[styles.coinText, themeStyles.coinText]}>🪙 {userData.coins || 0}</Text>
                            </View>
                        </View>
                        {renderXpBar()}
                        <View style={styles.statsGridContainer}>
                            <StatBox
                                title="Wygrane pojedynki"
                                value={userData.duelsWon || 0}
                                icon="flame-outline"
                                themeStyles={themeStyles}
                            />
                            <StatBox
                                title="Ukończone testy"
                                value={userData.testsCompleted || 0}
                                icon="checkmark-done-outline"
                                themeStyles={themeStyles}
                            />
                            <StatBox
                                title="Testy bezbłędne"
                                value={userData.flawlessTests || 0}
                                icon="shield-checkmark-outline"
                                themeStyles={themeStyles}
                            />
                            <StatBox
                                title="Poprawne odpowiedzi"
                                value={userData.correctAnswersTotal || 0}
                                icon="bulb-outline"
                                themeStyles={themeStyles}
                            />
                        </View>
                    </View>
                )}

                {/* 2. БЛОК ДОСЯГНЕНЬ (Без змін) */}
                <View style={[styles.achievementsGroup, themeStyles.card]}>
                    <Text style={[styles.sectionTitle, themeStyles.menuText]}>Osiągnięcia</Text>
                    <FlatList
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        data={allAchievementsData}
                        renderItem={({ item }) => (
                            <TouchableOpacity onPress={() => handleBadgePress(item)}>
                                <AchievementBadge badge={item} />
                            </TouchableOpacity>
                        )}
                        keyExtractor={item => item.id}
                        contentContainerStyle={{ paddingHorizontal: PADDING.small, paddingTop: PADDING.small }}
                    />
                </View>

                {/* --- ✅ 1. ВІДНОВЛЕНО КОД КНОПОК МЕНЮ --- */}
                <View style={[styles.menuGroup, themeStyles.card]}>
                    <ProfileMenuItem
                        icon="person-outline"
                        title="Dane użytkownika"
                        onPress={() => navigation.navigate('UserDetails')}
                        themeStyles={themeStyles}
                    />
                    <ProfileMenuItem
                        icon="stats-chart-outline"
                        title="Szczegółowe Statystyki"
                        onPress={() => navigation.navigate('StatsScreen')}
                        themeStyles={themeStyles}
                    />
                    <ProfileMenuItem
                        icon="cart-outline"
                        title="Sklep"
                        onPress={() => navigation.navigate('Store')}
                        themeStyles={themeStyles}
                    />
                </View>

                {/* --- ✅ 2. ВІДНОВЛЕНО КОД КНОПКИ ВИХОДУ --- */}
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={22} color={COLORS.white} />
                    <Text style={styles.logoutButtonText}>Wyloguj się</Text>
                </TouchableOpacity>

            </ScrollView>

            {/* МОДАЛЬНЕ ВІКНО (Без змін) */}
            {selectedAchievement && (
                <Modal
                    animationType="fade"
                    transparent={true}
                    visible={modalVisible}
                    onRequestClose={() => setModalVisible(false)}
                >
                    <Pressable
                        style={[styles.modalOverlay, themeStyles.modalOverlay]}
                        onPress={() => setModalVisible(false)}
                    >
                        <Pressable style={[styles.modalContent, themeStyles.modalContent]}>

                            <View style={[
                                styles.modalIconContainer,
                                {
                                    borderColor: selectedAchievement.isUnlocked ? COLORS.primary : COLORS.grey,
                                    backgroundColor: selectedAchievement.isUnlocked ? '#f0f0f0' : (isDarkMode ? '#333' : '#f9f9f9')
                                }
                            ]}>
                                <Ionicons
                                    name={selectedAchievement.isUnlocked ? selectedAchievement.iconName : "lock-closed-outline"}
                                    size={40}
                                    color={selectedAchievement.isUnlocked ? COLORS.primary : COLORS.grey}
                                />
                            </View>

                            <Text style={[styles.modalTitle, themeStyles.modalTitle]}>
                                {selectedAchievement.title}
                            </Text>

                            <Text style={[styles.modalDesc, themeStyles.modalDesc]}>
                                {selectedAchievement.description}
                            </Text>

                            {selectedAchievement.isUnlocked ? (
                                <Text style={[styles.modalDate, themeStyles.modalDate]}>
                                    Odblokowano: {
                                    selectedAchievement.unlockedAt
                                        ? format(
                                            selectedAchievement.unlockedAt.toDate(),
                                            'd MMMM yyyy, HH:mm',
                                            { locale: pl }
                                        )
                                        : '...'
                                }
                                </Text>
                            ) : (
                                <ProgressDisplay
                                    current={getCurrentProgress(selectedAchievement.criteriaType)}
                                    total={selectedAchievement.criteriaValue}
                                    themeStyles={themeStyles}
                                />
                            )}
                        </Pressable>
                    </Pressable>
                </Modal>
            )}
        </SafeAreaView>
    );
}

// (Стилі - без змін, вони вже включають все необхідне)
const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    scrollContainer: {
        flexGrow: 1,
        padding: PADDING.medium,
    },
    mainInfoCard: {
        width: '100%',
        borderRadius: 12,
        padding: PADDING.large,
        marginBottom: MARGIN.large,
        elevation: 3,
    },
    headerContainer: {
        alignItems: 'center',
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
    levelHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: MARGIN.medium,
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
    xpBarContainer: {
        marginBottom: MARGIN.medium,
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
    statsGridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginTop: MARGIN.medium,
    },
    statBox: {
        width: '48%',
        borderRadius: 12,
        padding: PADDING.medium,
        alignItems: 'center',
        marginBottom: MARGIN.medium,
        elevation: 3,
    },
    statValue: {
        fontSize: FONT_SIZES.xlarge,
        fontWeight: 'bold',
        marginVertical: MARGIN.small / 2,
    },
    statTitle: {
        fontSize: FONT_SIZES.small,
        fontWeight: '500',
        textAlign: 'center',
    },
    achievementsGroup: {
        width: '100%',
        borderRadius: 12,
        padding: PADDING.medium,
        elevation: 3,
        minHeight: 150,
        marginBottom: MARGIN.large,
    },
    sectionTitle: {
        fontSize: FONT_SIZES.large,
        fontWeight: 'bold',
        paddingHorizontal: PADDING.small,
        marginBottom: MARGIN.small,
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
    logoutButton: {
        flexDirection: 'row',
        backgroundColor: COLORS.incorrect,
        paddingVertical: PADDING.medium - 2,
        paddingHorizontal: PADDING.large,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
        marginTop: MARGIN.medium,
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
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        margin: 20,
        borderRadius: 20,
        padding: 35,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        width: '90%',
    },
    modalIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: FONT_SIZES.xlarge,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
    },
    modalDesc: {
        fontSize: FONT_SIZES.medium,
        textAlign: 'center',
        marginBottom: 20,
    },
    modalDate: {
        fontSize: FONT_SIZES.small,
        fontWeight: '500',
    },
    progressContainer: {
        width: '100%',
        alignItems: 'center',
    },
    modalXpBarBackground: {
        height: 12,
        borderRadius: 6,
        width: '90%',
        overflow: 'hidden',
    },
    modalXpBarForeground: {
        height: '100%',
        backgroundColor: COLORS.primary,
        borderRadius: 6,
    },
});

export default ProfileScreen;
