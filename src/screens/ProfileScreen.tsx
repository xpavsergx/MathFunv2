import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, Image, TouchableOpacity,
    SafeAreaView, ScrollView, ActivityIndicator, Alert, FlatList, Modal, Dimensions
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { useNavigation } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';

// Імпорти теми та утиліт
import { COLORS, PADDING, MARGIN, FONT_SIZES } from '../styles/theme';
import { getAvatarImage } from '../utils/avatarUtils';

// Імпорти для досягнень
import { ALL_ACHIEVEMENTS, Achievement } from '../config/achievements';
import AchievementBadge from '../Components/AchievementBadge';

const { width } = Dimensions.get('window');

const ProfileScreen = () => {
    const navigation = useNavigation<any>();
    const user = auth().currentUser;
    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState<any>(null);

    // Стейт для модального вікна досягнень
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedAchievement, setSelectedAchievement] = useState<any>(null);

    useEffect(() => {
        if (!user) return;

        // Слухаємо зміни профілю в реальному часі
        const unsubscribe = firestore()
            .collection('users')
            .doc(user.uid)
            .onSnapshot(doc => {
                if (doc.exists) {
                    setUserData(doc.data());
                }
                setLoading(false);
            }, (error) => {
                console.error("Profile snapshot error:", error);
                setLoading(false);
            });

        return () => unsubscribe();
    }, [user]);

    const handleLogout = () => {
        Alert.alert("Wyloguj", "Czy na pewno chcesz się wylogować?", [
            { text: "Anuluj", style: "cancel" },
            { text: "Tak", style: "destructive", onPress: () => auth().signOut() }
        ]);
    };

    // --- ЛОГІКА ДОСЯГНЕНЬ ---
    const getAchievementsData = () => {
        const earnedMap = userData?.earnedAchievementsMap || {};

        const list = ALL_ACHIEVEMENTS.map(ach => ({
            ...ach,
            isUnlocked: !!earnedMap[ach.id],
        }));

        return list.sort((a, b) => {
            if (a.isUnlocked === b.isUnlocked) return 0;
            return a.isUnlocked ? -1 : 1;
        });
    };

    // Обчислення прогресу для конкретного досягнення
    const getProgress = (ach: Achievement) => {
        if (!userData) return { current: 0, target: ach.criteriaValue, percent: 0 };

        let current = 0;
        // Вибираємо правильне поле зі статистики
        switch (ach.criteriaType) {
            case 'testsCompleted': current = userData.stats?.testsCompleted || 0; break;
            case 'correctAnswersTotal': current = userData.stats?.correctAnswers || 0; break;
            case 'flawlessTests': current = userData.flawlessTests || 0; break; // Треба переконатись, що це поле пишеться
            case 'duelsWon': current = userData.duelsWon || 0; break;
            case 'friendsAdded': current = userData.friendsCount || 0; break; // Або перевірити довжину масиву friends
            case 'levelReached': current = Math.floor((userData.xp || 0) / 1000) + 1; break;
            default: current = 0;
        }

        const target = ach.criteriaValue;
        const percent = Math.min(100, (current / target) * 100);

        return { current, target, percent };
    };

    const handlePressAchievement = (item: any) => {
        setSelectedAchievement(item);
        setModalVisible(true);
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

    // Розрахунок рівня
    const xp = userData?.xp || 0;
    const level = Math.floor(xp / 1000) + 1;
    const currentLevelProgress = xp % 1000;
    const progressPercent = (currentLevelProgress / 1000) * 100;

    const achievementsList = getAchievementsData();
    const activeProgress = selectedAchievement ? getProgress(selectedAchievement) : { current: 0, target: 1, percent: 0 };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>

                {/* 1. КАРТКА ПРОФІЛЮ */}
                <View style={styles.profileHeader}>
                    <View style={styles.avatarContainer}>
                        <Image
                            source={getAvatarImage(userData?.avatar)}
                            style={styles.avatar}
                        />
                        <TouchableOpacity style={styles.editAvatarBtn} onPress={() => navigation.navigate('UserDetails')}>
                            <Ionicons name="camera" size={16} color="white" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.userName}>{userData?.displayName || userData?.firstName || "Uczeń"}</Text>
                    <Text style={styles.userEmail}>{user?.email}</Text>

                    <View style={styles.classBadge}>
                        <Text style={styles.classText}>Klasa {userData?.className || userData?.userClass || "?"}</Text>
                    </View>
                </View>

                {/* 2. РІВЕНЬ */}
                <View style={styles.levelCard}>
                    <View style={styles.levelRow}>
                        <Text style={styles.levelLabel}>Poziom {level}</Text>
                        <Text style={styles.xpLabel}>{xp} XP</Text>
                    </View>
                    <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
                    </View>
                    <Text style={styles.nextLevelText}>Brakuje {1000 - currentLevelProgress} XP do poziomu {level + 1}</Text>
                </View>

                {/* 3. СЕКЦІЯ ДОСЯГНЕНЬ */}
                <View style={styles.achievementsSection}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionTitle}>Osiągnięcia</Text>
                        <Text style={styles.sectionSubtitle}>
                            {achievementsList.filter(a => a.isUnlocked).length} / {ALL_ACHIEVEMENTS.length}
                        </Text>
                    </View>

                    <FlatList
                        data={achievementsList}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingHorizontal: 10 }}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <TouchableOpacity onPress={() => handlePressAchievement(item)} activeOpacity={0.7}>
                                <AchievementBadge badge={item} />
                            </TouchableOpacity>
                        )}
                    />
                </View>

                {/* 4. МЕНЮ ДІЙ */}
                <View style={styles.menuContainer}>
                    <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('StatsScreen')}>
                        <View style={[styles.iconBox, { backgroundColor: '#E3F2FD' }]}>
                            <Ionicons name="bar-chart" size={24} color="#2196F3" />
                        </View>
                        <View style={styles.menuTextContainer}>
                            <Text style={styles.menuTitle}>Moje Statystyki</Text>
                            <Text style={styles.menuSub}>Zobacz postępy i wykresy</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={24} color="#CCC" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('UserDetails')}>
                        <View style={[styles.iconBox, { backgroundColor: '#F3E5F5' }]}>
                            <Ionicons name="person" size={24} color="#9C27B0" />
                        </View>
                        <View style={styles.menuTextContainer}>
                            <Text style={styles.menuTitle}>Edytuj Dane</Text>
                            <Text style={styles.menuSub}>Imię, klasa, awatar</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={24} color="#CCC" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Store')}>
                        <View style={[styles.iconBox, { backgroundColor: '#FFF8E1' }]}>
                            <Ionicons name="cart" size={24} color="#FFC107" />
                        </View>
                        <View style={styles.menuTextContainer}>
                            <Text style={styles.menuTitle}>Sklep</Text>
                            <Text style={styles.menuSub}>Wydaj swoje monety</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={24} color="#CCC" />
                    </TouchableOpacity>
                </View>

                {/* 5. ВИХІД */}
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={24} color={COLORS.error} />
                    <Text style={styles.logoutText}>Wyloguj się</Text>
                </TouchableOpacity>

                <Text style={styles.versionText}>Wersja aplikacji 1.0.3</Text>

            </ScrollView>

            {/* --- МОДАЛЬНЕ ВІКНО ДЛЯ ДОСЯГНЕНЬ --- */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        {selectedAchievement && (
                            <>
                                <View style={[styles.modalIconContainer, { backgroundColor: selectedAchievement.isUnlocked ? '#E0F7FA' : '#F5F5F5', borderColor: selectedAchievement.isUnlocked ? COLORS.primary : '#CCC' }]}>
                                    <Ionicons
                                        name={selectedAchievement.isUnlocked ? selectedAchievement.iconName : "lock-closed"}
                                        size={50}
                                        color={selectedAchievement.isUnlocked ? COLORS.primary : '#AAA'}
                                    />
                                </View>

                                <Text style={styles.modalTitle}>{selectedAchievement.title}</Text>
                                <Text style={styles.modalDesc}>{selectedAchievement.description}</Text>

                                {/* Прогрес бар */}
                                <View style={styles.modalProgressContainer}>
                                    <View style={styles.modalProgressBarBg}>
                                        <View style={[styles.modalProgressBarFill, { width: `${selectedAchievement.isUnlocked ? 100 : activeProgress.percent}%`, backgroundColor: selectedAchievement.isUnlocked ? COLORS.correct : COLORS.primary }]} />
                                    </View>
                                    <Text style={styles.modalProgressText}>
                                        {selectedAchievement.isUnlocked
                                            ? "Wykonano!"
                                            : `${activeProgress.current} / ${activeProgress.target}`}
                                    </Text>
                                </View>

                                <TouchableOpacity
                                    style={styles.modalCloseBtn}
                                    onPress={() => setModalVisible(false)}
                                >
                                    <Text style={styles.modalCloseText}>Zamknij</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>
            </Modal>

        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F7FA' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scrollContent: { paddingBottom: 40 },

    // Header
    profileHeader: {
        backgroundColor: '#FFF',
        alignItems: 'center',
        paddingVertical: 30,
        marginTop: 60,
        marginHorizontal: 15,
        borderRadius: 30,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        elevation: 4,
        shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10,
        marginBottom: 20,
    },
    avatarContainer: { position: 'relative', marginBottom: 15 },
    avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: COLORS.primary, backgroundColor: '#FFF' },
    editAvatarBtn: {
        position: 'absolute', bottom: 0, right: 0,
        backgroundColor: COLORS.primary, padding: 8, borderRadius: 20,
        borderWidth: 2, borderColor: '#FFF'
    },
    userName: { fontSize: 24, fontWeight: 'bold', color: '#333' },
    userEmail: { fontSize: 14, color: '#888', marginBottom: 10 },
    classBadge: {
        backgroundColor: '#E8F5E9', paddingHorizontal: 15, paddingVertical: 5, borderRadius: 20,
        borderWidth: 1, borderColor: '#C8E6C9'
    },
    classText: { color: '#2E7D32', fontWeight: 'bold' },

    // Level Card
    levelCard: {
        backgroundColor: '#FFF', marginHorizontal: PADDING.medium, padding: 20, borderRadius: 16,
        elevation: 2, marginBottom: 20
    },
    levelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    levelLabel: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary },
    xpLabel: { fontSize: 14, color: '#666' },
    progressBarBg: { height: 10, backgroundColor: '#F0F0F0', borderRadius: 5, overflow: 'hidden' },
    progressBarFill: { height: '100%', backgroundColor: COLORS.primary },
    nextLevelText: { fontSize: 12, color: '#999', marginTop: 8, textAlign: 'center' },

    // Achievements Section
    achievementsSection: {
        marginBottom: 20,
        paddingVertical: 10,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: PADDING.medium,
        marginBottom: 10,
    },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginLeft: 5 },
    sectionSubtitle: { fontSize: 14, color: '#888', fontWeight: '600' },

    // Menu
    menuContainer: { paddingHorizontal: PADDING.medium },
    menuItem: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF',
        padding: 15, borderRadius: 16, marginBottom: 12, elevation: 1
    },
    iconBox: { width: 50, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    menuTextContainer: { flex: 1 },
    menuTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    menuSub: { fontSize: 12, color: '#888' },

    // Logout
    logoutButton: {
        flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
        marginTop: 20, padding: 15, borderRadius: 12,
        backgroundColor: '#FFF0F0', marginHorizontal: PADDING.medium
    },
    logoutText: { color: COLORS.error, fontWeight: 'bold', fontSize: 16, marginLeft: 10 },
    versionText: { textAlign: 'center', color: '#CCC', marginTop: 20, fontSize: 12 },

    // --- Modal Styles ---
    modalOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center'
    },
    modalContent: {
        width: width * 0.85, backgroundColor: '#FFF', borderRadius: 20, padding: 25, alignItems: 'center', elevation: 5
    },
    modalIconContainer: {
        width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center',
        marginBottom: 15, borderWidth: 2
    },

    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 10, textAlign: 'center' },
    modalDesc: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20 },
    modalProgressContainer: { width: '100%', marginBottom: 20 },
    modalProgressBarBg: { height: 10, backgroundColor: '#F0F0F0', borderRadius: 5, overflow: 'hidden', marginBottom: 5 },
    modalProgressBarFill: { height: '100%' },
    modalProgressText: { textAlign: 'center', fontSize: 12, color: '#888', fontWeight: '600' },
    modalCloseBtn: {
        backgroundColor: COLORS.primary, paddingVertical: 10, paddingHorizontal: 30, borderRadius: 20
    },
    modalCloseText: { color: '#FFF', fontWeight: 'bold' }
});

export default ProfileScreen;
