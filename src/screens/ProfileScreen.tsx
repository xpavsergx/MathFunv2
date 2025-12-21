import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, Image, TouchableOpacity,
    SafeAreaView, ScrollView, ActivityIndicator, Alert
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { useNavigation } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS, PADDING, MARGIN, FONT_SIZES } from '../styles/theme';

const ProfileScreen = () => {
    const navigation = useNavigation<any>();
    const user = auth().currentUser;
    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState<any>(null);

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
            });
        return () => unsubscribe();
    }, [user]);

    const handleLogout = () => {
        Alert.alert("Wyloguj", "Czy na pewno chcesz się wylogować?", [
            { text: "Anuluj", style: "cancel" },
            { text: "Tak", style: "destructive", onPress: () => auth().signOut() }
        ]);
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

    // Розрахунок рівня (проста формула: кожні 1000 XP = 1 рівень)
    const xp = userData?.xp || 0;
    const level = Math.floor(xp / 1000) + 1;
    const nextLevelXp = level * 1000;
    const currentLevelProgress = xp % 1000;
    const progressPercent = (currentLevelProgress / 1000) * 100;

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>

                {/* 1. КАРТКА ПРОФІЛЮ (Особисті дані) */}
                <View style={styles.profileHeader}>
                    <View style={styles.avatarContainer}>
                        {/* Тут можна зробити завантаження реального фото, поки що маскот */}
                        <Image source={require('../assets/fox_mascot.png')} style={styles.avatar} />
                        <TouchableOpacity style={styles.editAvatarBtn} onPress={() => navigation.navigate('UserDetails')}>
                            <Ionicons name="camera" size={16} color="white" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.userName}>{userData?.displayName || "Uczeń"}</Text>
                    <Text style={styles.userEmail}>{user?.email}</Text>

                    <View style={styles.classBadge}>
                        <Text style={styles.classText}>Klasa {userData?.userClass || "?"}</Text>
                    </View>
                </View>

                {/* 2. РІВЕНЬ (Залишаємо як статус) */}
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

                {/* 3. МЕНЮ ДІЙ */}
                <View style={styles.menuContainer}>

                    {/* Кнопка на Статистику */}
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

                    {/* Редагування даних */}
                    <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('UserDetails')}>
                        <View style={[styles.iconBox, { backgroundColor: '#F3E5F5' }]}>
                            <Ionicons name="person" size={24} color="#9C27B0" />
                        </View>
                        <View style={styles.menuTextContainer}>
                            <Text style={styles.menuTitle}>Edytuj Dane</Text>
                            <Text style={styles.menuSub}>Imię, klasa, hasło</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={24} color="#CCC" />
                    </TouchableOpacity>

                    {/* Sklep (якщо є) */}
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

                {/* 4. ВИХІД */}
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={24} color={COLORS.error} />
                    <Text style={styles.logoutText}>Wyloguj się</Text>
                </TouchableOpacity>

                <Text style={styles.versionText}>Wersja aplikacji 1.0.2</Text>

            </ScrollView>
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
    avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: COLORS.primary },
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
    versionText: { textAlign: 'center', color: '#CCC', marginTop: 20, fontSize: 12 }
});

export default ProfileScreen;
