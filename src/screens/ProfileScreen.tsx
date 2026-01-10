import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, Image, TouchableOpacity,
    SafeAreaView, ScrollView, ActivityIndicator, Alert, FlatList, Modal, Dimensions, useColorScheme
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { useNavigation } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { COLORS, PADDING, MARGIN, FONT_SIZES } from '../styles/theme';
import { getAvatarImage } from '../utils/avatarUtils';
import { ALL_ACHIEVEMENTS, Achievement } from '../config/achievements';
import AchievementBadge from '../Components/AchievementBadge';

const { width } = Dimensions.get('window');
// Funkcja skalująca dla zachowania proporcji na każdym telefonie
const scale = (size: number) => (width / 375) * size;

const ProfileScreen = () => {
    const navigation = useNavigation<any>();
    const user = auth().currentUser;

    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';

    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState<any>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedAchievement, setSelectedAchievement] = useState<any>(null);

    const themeStyles = {
        background: { backgroundColor: isDarkMode ? COLORS.backgroundDark : '#F0F4F8' },
        card: { backgroundColor: isDarkMode ? COLORS.cardDark : '#FFF' },
        text: { color: isDarkMode ? COLORS.textDark : '#111827' },
        textSecondary: { color: isDarkMode ? COLORS.greyDarkTheme : '#6B7280' },
        progressBarBg: { backgroundColor: isDarkMode ? '#374151' : '#F3F4F6' },
        iconBoxStats: { backgroundColor: isDarkMode ? 'rgba(76, 175, 80, 0.15)' : '#E8F5E9' },
        iconBoxTrainers: { backgroundColor: isDarkMode ? 'rgba(33, 150, 243, 0.15)' : '#E3F2FD' },
        iconBoxStore: { backgroundColor: isDarkMode ? 'rgba(255, 193, 7, 0.15)' : '#FFF8E1' },
    };

    useEffect(() => {
        if (!user) return;
        const unsubscribe = firestore()
            .collection('users')
            .doc(user.uid)
            .onSnapshot(doc => {
                if (doc.exists) {
                    setUserData(doc.data());
                }
                setLoading(false);
            }, (error) => {
                console.error("Profile error:", error);
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

    const getAchievementsData = () => {
        const earnedMap = userData?.earnedAchievementsMap || {};
        const list = ALL_ACHIEVEMENTS.map(ach => ({
            ...ach,
            isUnlocked: !!earnedMap[ach.id],
        }));
        return list.sort((a, b) => (a.isUnlocked === b.isUnlocked ? 0 : a.isUnlocked ? -1 : 1));
    };

    if (loading) return <View style={[styles.center, themeStyles.background]}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

    const xp = userData?.xp || 0;
    const level = Math.floor(xp / 1000) + 1;
    const currentLevelProgress = xp % 1000;
    const progressPercent = (currentLevelProgress / 1000) * 100;

    return (
        <SafeAreaView style={[styles.container, themeStyles.background]}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* 1. KARTA PROFILU */}
                <View style={[styles.profileHeader, themeStyles.card]}>
                    <View style={styles.avatarContainer}>
                        <View style={[styles.avatarOuterRing, { borderColor: COLORS.primary }]}>
                            <View style={[styles.avatarInnerCircle, { backgroundColor: isDarkMode ? '#1F2937' : '#F5F7FA' }]}>
                                <Image
                                    source={getAvatarImage(userData?.avatar)}
                                    style={styles.avatarImage}
                                />
                            </View>
                        </View>
                        <TouchableOpacity
                            style={styles.editAvatarBtn}
                            onPress={() => navigation.navigate('UserDetails')}
                        >
                            <Ionicons name="pencil" size={scale(16)} color="white" />
                        </TouchableOpacity>
                    </View>

                    <Text style={[styles.userName, themeStyles.text]}>{userData?.firstName || "Uczeń"}</Text>
                    <Text style={[styles.userEmail, themeStyles.textSecondary]}>{user?.email}</Text>

                    <View style={[styles.classBadge, { backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.2)' : '#EFF6FF', borderColor: isDarkMode ? '#3B82F6' : '#DBEAFE' }]}>
                        <Text style={[styles.classText, { color: isDarkMode ? '#60A5FA' : COLORS.primary }]}>Klasa {userData?.userClass || "?"}</Text>
                    </View>
                </View>

                {/* 2. POZIOM */}
                <View style={[styles.levelCard, themeStyles.card]}>
                    <View style={styles.levelRow}>
                        <View style={styles.levelInfo}>
                            <Ionicons name="star" size={scale(20)} color={COLORS.accent} />
                            <Text style={[styles.levelLabel, themeStyles.text]}>Poziom {level}</Text>
                        </View>
                        <Text style={[styles.xpLabel, themeStyles.textSecondary]}>{xp} XP</Text>
                    </View>
                    <View style={[styles.progressBarBg, themeStyles.progressBarBg]}>
                        <View style={[styles.progressBarFill, { width: `${progressPercent}%`, backgroundColor: COLORS.primary }]} />
                    </View>
                    <Text style={[styles.nextLevelText, themeStyles.textSecondary]}>Zdobądź jeszcze {1000 - currentLevelProgress} XP do poziomu {level + 1}</Text>
                </View>

                {/* 3. OSIĄGNIĘCIA */}
                <View style={styles.sectionHeaderRow}>
                    <Text style={[styles.sectionTitle, themeStyles.text]}>Osiągnięcia</Text>
                    <Text style={[styles.countText, { color: COLORS.primary }]}>{getAchievementsData().filter(a => a.isUnlocked).length} / {ALL_ACHIEVEMENTS.length}</Text>
                </View>
                <FlatList
                    data={getAchievementsData()}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: scale(20), paddingBottom: scale(10) }}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <TouchableOpacity onPress={() => { setSelectedAchievement(item); setModalVisible(true); }}>
                            <AchievementBadge badge={item as any} />
                        </TouchableOpacity>
                    )}
                />

                {/* 4. MENU Działania */}
                <View style={styles.menuContainer}>
                    <TouchableOpacity style={[styles.menuItem, themeStyles.card]} onPress={() => navigation.navigate('StatsScreen')}>
                        <View style={[styles.iconBox, themeStyles.iconBoxStats]}>
                            <Ionicons name="stats-chart" size={scale(24)} color="#4CAF50" />
                        </View>
                        <View style={styles.menuTextContainer}>
                            <Text style={[styles.menuTitle, themeStyles.text]}>Statystyki</Text>
                            <Text style={[styles.menuSub, themeStyles.textSecondary]}>Twoje postępy w nauce</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={scale(20)} color={isDarkMode ? '#4B5563' : '#CCC'} />
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.menuItem, themeStyles.card]} onPress={() => navigation.navigate('TrainerStats')}>
                        <View style={[styles.iconBox, themeStyles.iconBoxTrainers]}>
                            <Ionicons name="medal" size={scale(24)} color="#2196F3" />
                        </View>
                        <View style={styles.menuTextContainer}>
                            <Text style={[styles.menuTitle, themeStyles.text]}>Postępy Trenerów</Text>
                            <Text style={[styles.menuSub, themeStyles.textSecondary]}>Szczegółowe wyniki ćwiczeń</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={scale(20)} color={isDarkMode ? '#4B5563' : '#CCC'} />
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.menuItem, themeStyles.card]} onPress={() => navigation.navigate('Store')}>
                        <View style={[styles.iconBox, themeStyles.iconBoxStore]}>
                            <Ionicons name="cart" size={scale(24)} color="#FFC107" />
                        </View>
                        <View style={styles.menuTextContainer}>
                            <Text style={[styles.menuTitle, themeStyles.text]}>Sklep</Text>
                            <Text style={[styles.menuSub, themeStyles.textSecondary]}>Wykorzystaj zdobyte monety</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={scale(20)} color={isDarkMode ? '#4B5563' : '#CCC'} />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={[styles.logoutButton, { backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2' }]} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={scale(22)} color={COLORS.error} />
                    <Text style={styles.logoutText}>Wyloguj się</Text>
                </TouchableOpacity>

                <Text style={[styles.versionText, themeStyles.textSecondary]}>MathFun v1.0.3</Text>
            </ScrollView>

            <Modal animationType="fade" transparent visible={modalVisible}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, themeStyles.card]}>
                        {selectedAchievement && (
                            <>
                                <View style={styles.modalIconContainer}>
                                    <Ionicons name={selectedAchievement.isUnlocked ? selectedAchievement.iconName : "lock-closed"} size={scale(50)} color={COLORS.primary} />
                                </View>
                                <Text style={[styles.modalTitle, themeStyles.text]}>{selectedAchievement.title}</Text>
                                <Text style={[styles.modalDesc, themeStyles.textSecondary]}>{selectedAchievement.description}</Text>
                                <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setModalVisible(false)}>
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
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scrollContent: { paddingBottom: scale(40) },
    profileHeader: {
        alignItems: 'center',
        paddingVertical: scale(25),
        marginHorizontal: scale(15),
        marginTop: scale(50),
        borderRadius: scale(25),
        elevation: 5,
        shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10,
    },
    avatarContainer: { position: 'relative', marginBottom: scale(15) },
    avatarOuterRing: {
        width: scale(120), height: scale(120), borderRadius: scale(60), borderWidth: scale(4),
        justifyContent: 'center', alignItems: 'center'
    },
    avatarInnerCircle: {
        width: scale(106), height: scale(106), borderRadius: scale(53),
        overflow: 'hidden', justifyContent: 'center', alignItems: 'center'
    },
    avatarImage: { width: scale(85), height: scale(85), resizeMode: 'contain' },
    editAvatarBtn: {
        position: 'absolute', bottom: scale(2), right: scale(2),
        backgroundColor: COLORS.primary, padding: scale(8), borderRadius: scale(20),
        borderWidth: scale(3), borderColor: '#FFF'
    },
    userName: { fontSize: scale(22), fontWeight: 'bold' },
    userEmail: { fontSize: scale(14), marginBottom: scale(12) },
    classBadge: {
        paddingHorizontal: scale(18), paddingVertical: scale(6), borderRadius: scale(20),
        borderWidth: 1,
    },
    classText: { fontWeight: '700', fontSize: scale(13) },
    levelCard: {
        marginHorizontal: scale(15), padding: scale(20), borderRadius: scale(20),
        marginTop: scale(20), elevation: 2
    },
    levelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: scale(12) },
    levelInfo: { flexDirection: 'row', alignItems: 'center' },
    levelLabel: { fontSize: scale(17), fontWeight: 'bold', marginLeft: scale(8) },
    xpLabel: { fontSize: scale(13), fontWeight: '600' },
    progressBarBg: { height: scale(12), borderRadius: scale(6), overflow: 'hidden' },
    progressBarFill: { height: '100%', borderRadius: scale(6) },
    nextLevelText: { fontSize: scale(12), marginTop: scale(10), textAlign: 'center' },
    sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: scale(25), marginTop: scale(25), marginBottom: scale(15) },
    sectionTitle: { fontSize: scale(18), fontWeight: 'bold' },
    countText: { fontWeight: '700' },
    menuContainer: { paddingHorizontal: scale(15), marginTop: scale(10) },
    menuItem: {
        flexDirection: 'row', alignItems: 'center',
        padding: scale(16), borderRadius: scale(18), marginBottom: scale(12), elevation: 1
    },
    iconBox: { width: scale(48), height: scale(48), borderRadius: scale(14), justifyContent: 'center', alignItems: 'center', marginRight: scale(16) },
    menuTextContainer: { flex: 1 },
    menuTitle: { fontSize: scale(16), fontWeight: '700' },
    menuSub: { fontSize: scale(12), marginTop: scale(2) },
    logoutButton: {
        flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
        marginTop: scale(20), padding: scale(16), borderRadius: scale(15),
        marginHorizontal: scale(15)
    },
    logoutText: { color: COLORS.error, fontWeight: 'bold', fontSize: scale(16), marginLeft: scale(10) },
    versionText: { textAlign: 'center', marginTop: scale(25), fontSize: scale(12) },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '85%', borderRadius: scale(25), padding: scale(30), alignItems: 'center' },
    modalIconContainer: { marginBottom: scale(20) },
    modalTitle: { fontSize: scale(22), fontWeight: 'bold', textAlign: 'center' },
    modalDesc: { fontSize: scale(15), textAlign: 'center', marginVertical: scale(15) },
    modalCloseBtn: { backgroundColor: COLORS.primary, paddingVertical: scale(12), paddingHorizontal: scale(40), borderRadius: scale(20), marginTop: scale(10) },
    modalCloseText: { color: '#FFF', fontWeight: 'bold' }
});

export default ProfileScreen;