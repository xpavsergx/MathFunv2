// src/screens/ActivityScreen.tsx

import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    Alert, ActivityIndicator, SafeAreaView, Image, ScrollView, useColorScheme
} from 'react-native';
import {
    getFirestore, collection, query, orderBy, onSnapshot, doc, getDoc
} from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { COLORS, PADDING, MARGIN } from '../styles/theme';

import { deleteNotification, clearAllNotifications, AppNotification } from '../services/notificationService';
import { acceptFriendRequest, acceptDuelRequest } from '../services/friendService';

// Import bazy pytań dla Trenera
import questionsDatabase from '../data/questionsDb.json';

const ActivityScreen = () => {
    const navigation = useNavigation<any>();
    const auth = getAuth();
    const db = getFirestore();
    const user = auth.currentUser;

    const [loading, setLoading] = useState(true);
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';

    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [trainerTask, setTrainerTask] = useState<{
        active: boolean;
        topic: string;
        reason: string;
    } | null>(null);

    // --- POSZUKIWANIE DZIAŁU DLA TRENERA ---
    const findParentTopic = (subTopicName: string): string => {
        const grade4Data = (questionsDatabase as any)["4"];
        if (!grade4Data) return 'LICZBY I DZIAŁANIA';

        // Jeśli sama nazwa jest działem głównym (np. "LICZBY I DZIAŁANIA")
        if (grade4Data[subTopicName]) return subTopicName;

        for (const mainTopicKey in grade4Data) {
            if (grade4Data[mainTopicKey][subTopicName]) {
                return mainTopicKey;
            }
        }
        return 'LICZBY I DZIAŁANIA';
    };

    useEffect(() => {
        if (!user) return;

        // 1. Słuchanie powiadomień (Modular API)
        const q = query(
            collection(db, 'users', user.uid, 'notifications'),
            orderBy('createdAt', 'desc')
        );
        const unsubNotifs = onSnapshot(q, snapshot => {
            if (snapshot) {
                const loaded = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as AppNotification[];
                setNotifications(loaded);
            }
        });

        // 2. Statystyki dla Trenera (Lis)
        const unsubStats = onSnapshot(doc(db, 'users', user.uid), userDoc => {
            if (userDoc.exists()) {
                const data = userDoc.data();
                const weakestTopic = data?.stats?.weakestTopic;

                if (weakestTopic) {
                    setTrainerTask({
                        active: true,
                        topic: weakestTopic,
                        reason: "W tym dziale robisz najwięcej błędów. Lis radzi poćwiczyć!"
                    });
                } else {
                    setTrainerTask({
                        active: true,
                        topic: "LICZBY I DZIAŁANIA",
                        reason: "Rozgrzej mózg solidną dawką zadań!"
                    });
                }
            }
            setLoading(false);
        });

        return () => { unsubNotifs(); unsubStats(); };
    }, [user]);

    const themeStyles = {
        container: { backgroundColor: isDarkMode ? COLORS.backgroundDark : '#F8F9FA' },
        card: { backgroundColor: isDarkMode ? COLORS.cardDark : '#FFF' },
        text: { color: isDarkMode ? COLORS.textDark : COLORS.text },
        textSecondary: { color: isDarkMode ? COLORS.greyDarkTheme : COLORS.grey },
        border: { borderColor: isDarkMode ? '#2C2C2E' : '#F0F0F0' },
        badge: { backgroundColor: isDarkMode ? 'rgba(0,188,212,0.1)' : '#E3F2FD' }
    };

    const handleDelete = (id: string) => deleteNotification(id);

    const handleClearAll = () => {
        if (notifications.length === 0) return;
        Alert.alert("Wyczyść", "Usunąć wszystkie powiadomienia?", [
            { text: "Nie", style: "cancel" },
            { text: "Tak", style: "destructive", onPress: clearAllNotifications }
        ]);
    };

    const handleTrainerAction = () => {
        if (!trainerTask) return;

        if (trainerTask.topic === "Szybkie Liczenie") {
            navigation.navigate('GamesStack', { screen: 'SpeedyCountGame' });
        } else {
            const parentTopic = findParentTopic(trainerTask.topic);
            const isMainTopic = parentTopic === trainerTask.topic;

            // ZMIANA: Kierujemy do TestScreen zamiast Practice,
            // aby użyć rekurencyjnego szukania pytań.
            navigation.navigate('HomeStack', {
                screen: 'Test',
                params: {
                    grade: 4,
                    topic: parentTopic,
                    subTopic: trainerTask.topic,
                    testType: isMainTopic ? 'mainTopic' : 'subTopic',
                    mode: 'learn' // Tryb treningowy z wyjaśnieniami
                }
            });
        }
    };

    const handleNotifAction = async (item: AppNotification) => {
        if (item.type === 'duel_request') {
            Alert.alert("⚔️ Pojedynek", "Przyjmujesz wyzwanie?", [
                { text: "Nie", onPress: () => handleDelete(item.id) },
                { text: "Tak", onPress: async () => {
                        const duelId = item.data?.duelId;
                        if (!duelId) return;
                        try {
                            await acceptDuelRequest(duelId);
                            const duelDoc = await getDoc(doc(db, 'duels', duelId));
                            const duelData = duelDoc.data();

                            navigation.navigate('HomeStack', {
                                screen: 'Test',
                                params: {
                                    mode: 'assess',
                                    testType: 'duel',
                                    duelId: duelId,
                                    grade: duelData?.grade || 4,
                                    topic: duelData?.topic || 'LICZBY I DZIAŁANIA'
                                }
                            });
                            handleDelete(item.id);
                        } catch (error) {
                            Alert.alert("Błąd", "Nie udało się dołączyć do pojedynku.");
                        }
                    }}
            ]);
        } else if (item.type === 'duel_accepted' || item.type === 'duel_update') {
            navigation.navigate('HomeStack', {
                screen: 'Test',
                params: { duelId: item.data?.duelId, mode: 'assess', testType: 'duel' }
            });
            handleDelete(item.id);
        } else if (item.type === 'friend_request') {
            Alert.alert("👥 Znajomi", "Dodać do znajomych?", [
                { text: "Nie", onPress: () => handleDelete(item.id) },
                { text: "Tak", onPress: async () => {
                        if (user) await acceptFriendRequest(user.uid, item.data?.fromUserId);
                        handleDelete(item.id);
                    }}
            ]);
        }
    };

    if (loading) return (
        <View style={[styles.center, themeStyles.container]}>
            <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, themeStyles.container]}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* ZADANIE SPECJALNE (LIS) */}
                {trainerTask && (
                    <View style={[styles.heroContainer, themeStyles.card, themeStyles.border]}>
                        <View style={styles.heroHeaderRow}>
                            <Ionicons name="sparkles" size={18} color="#FFD700" />
                            <Text style={styles.heroLabel}>ZADANIE SPECJALNE</Text>
                        </View>
                        <View style={styles.heroContent}>
                            <View style={styles.heroTextContainer}>
                                <Text style={[styles.heroTitle, themeStyles.text]}>Lis radzi!</Text>
                                <Text style={[styles.heroSubtitle, themeStyles.textSecondary]}>{trainerTask.reason}</Text>
                                <View style={[styles.topicBadge, themeStyles.badge]}>
                                    <Text style={styles.topicText}>{trainerTask.topic}</Text>
                                </View>
                            </View>
                            <Image source={require('../assets/fox_mascot.png')} style={styles.heroImage} />
                        </View>
                        <TouchableOpacity
                            style={[styles.heroButton, { backgroundColor: COLORS.primary }]}
                            onPress={handleTrainerAction}
                        >
                            <Text style={styles.heroButtonText}>Trenuj teraz</Text>
                            <Ionicons name="arrow-forward-circle" size={24} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                )}

                <View style={styles.listHeaderRow}>
                    <Text style={[styles.sectionHeader, themeStyles.text]}>Powiadomienia ({notifications.length})</Text>
                    {notifications.length > 0 && (
                        <TouchableOpacity onPress={handleClearAll} style={styles.clearBtn}>
                            <Text style={styles.clearText}>Wyczyść</Text>
                            <Ionicons name="trash-outline" size={16} color={COLORS.error} />
                        </TouchableOpacity>
                    )}
                </View>

                {notifications.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="notifications-off-outline" size={60} color={isDarkMode ? '#3A3A3C' : '#E0E0E0'} />
                        <Text style={[styles.emptyText, themeStyles.textSecondary]}>Wszystko nadrobione!</Text>
                    </View>
                ) : (
                    notifications.map(item => {
                        let icon: any = 'notifications';
                        let color = COLORS.primary;
                        if(item.type.includes('duel')) { icon = 'flash'; color = '#FFC107'; }
                        if(item.type === 'friend_request') { icon = 'person-add'; color = '#4CAF50'; }

                        return (
                            <View key={item.id} style={[styles.card, themeStyles.card, themeStyles.border]}>
                                <TouchableOpacity style={styles.contentRow} onPress={() => handleNotifAction(item)}>
                                    <View style={[styles.iconBox, { backgroundColor: color + '20' }]}>
                                        <Ionicons name={icon} size={24} color={color} />
                                    </View>
                                    <View style={styles.notifTextContainer}>
                                        <Text style={[styles.notifTitle, themeStyles.text]}>{item.title}</Text>
                                        <Text style={[styles.notifBody, themeStyles.textSecondary]} numberOfLines={2}>{item.body}</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color={isDarkMode ? '#555' : '#CCC'} />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id)}>
                                    <Ionicons name="close-circle" size={20} color={COLORS.error + '80'} />
                                </TouchableOpacity>
                            </View>
                        );
                    })
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scrollContent: { padding: PADDING.medium },
    heroContainer: {
        borderRadius: 25, padding: 20, marginBottom: 25,
        elevation: 6, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 }, borderWidth: 1
    },
    heroHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    heroLabel: { fontSize: 11, fontWeight: '900', color: '#FFD700', marginLeft: 6, letterSpacing: 1 },
    heroContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    heroTextContainer: { flex: 1, paddingRight: 10 },
    heroTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
    heroSubtitle: { fontSize: 14, marginBottom: 12, lineHeight: 18 },
    topicBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
    topicText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 13 },
    heroImage: { width: 85, height: 85, resizeMode: 'contain' },
    heroButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 14, borderRadius: 15, marginTop: 15, gap: 10
    },
    heroButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
    listHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingHorizontal: 4 },
    sectionHeader: { fontSize: 18, fontWeight: 'bold' },
    clearBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    clearText: { color: COLORS.error, fontSize: 13, fontWeight: '600' },
    card: {
        borderRadius: 20, marginBottom: 12, padding: 15,
        borderWidth: 1, position: 'relative'
    },
    contentRow: { flexDirection: 'row', alignItems: 'center' },
    iconBox: { width: 45, height: 45, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    notifTextContainer: { flex: 1, marginLeft: 15, marginRight: 10 },
    notifTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
    notifBody: { fontSize: 13, lineHeight: 18 },
    deleteBtn: { position: 'absolute', top: -10, right: -5, padding: 10 },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 60, opacity: 0.5 },
    emptyText: { marginTop: 15, fontSize: 16, fontWeight: '500' }
});

export default ActivityScreen;
