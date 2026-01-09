// src/screens/ActivityScreen.tsx

import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    Alert, ActivityIndicator, SafeAreaView, Image, ScrollView, useColorScheme
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { COLORS, PADDING, MARGIN } from '../styles/theme';

import { deleteNotification, clearAllNotifications, AppNotification } from '../services/notificationService';
import { acceptFriendRequest } from '../services/friendService';

// Імпортуємо базу питань для пошуку розділів
import questionsDatabase from '../data/questionsDb.json';

const ActivityScreen = () => {
    const navigation = useNavigation<any>();
    const user = auth().currentUser;
    const [loading, setLoading] = useState(true);

    // TRYB CIEMNY
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';

    const [notifications, setNotifications] = useState<AppNotification[]>([]);

    // Стан завдання від Тренера
    const [trainerTask, setTrainerTask] = useState<{
        active: boolean;
        topic: string; // Це SubTopic (підтема)
        reason: string;
    } | null>(null);

    // --- ПОШУК БАТЬКІВСЬКОГО РОЗДІЛУ ---
    const findParentTopic = (subTopicName: string): string => {
        const grade4Data = (questionsDatabase as any)["4"];
        if (!grade4Data) return 'LICZBY I DZIAŁANIA';

        for (const mainTopicKey in grade4Data) {
            if (grade4Data[mainTopicKey][subTopicName]) {
                return mainTopicKey;
            }
        }
        return 'LICZBY I DZIAŁANIA';
    };

    useEffect(() => {
        if (!user) return;

        // 1. Слухаємо сповіщення
        const unsubNotifs = firestore()
            .collection('users')
            .doc(user.uid)
            .collection('notifications')
            .orderBy('createdAt', 'desc')
            .onSnapshot(snapshot => {
                const loaded = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as AppNotification[];
                setNotifications(loaded);
            });

        // 2. Слухаємо статистику для Тренера
        const unsubStats = firestore()
            .collection('users')
            .doc(user.uid)
            .onSnapshot(doc => {
                if (doc.exists) {
                    const data = doc.data();
                    const weakestTopic = data?.stats?.weakestTopic;

                    if (weakestTopic) {
                        setTrainerTask({
                            active: true,
                            topic: weakestTopic,
                            reason: "W tym dziale robisz najwięcej błędów."
                        });
                    } else {
                        setTrainerTask({
                            active: true,
                            topic: "Szybkie Liczenie",
                            reason: "Rozgrzej mózg szybką grą!"
                        });
                    }
                }
                setLoading(false);
            });

        return () => { unsubNotifs(); unsubStats(); };
    }, [user]);

    // DYNAMICZNE STYLE
    const themeStyles = {
        container: { backgroundColor: isDarkMode ? COLORS.backgroundDark : '#F8F9FA' },
        card: { backgroundColor: isDarkMode ? COLORS.cardDark : '#FFF' },
        text: { color: isDarkMode ? COLORS.textDark : COLORS.text },
        textSecondary: { color: isDarkMode ? COLORS.greyDarkTheme : COLORS.grey },
        headerText: { color: isDarkMode ? COLORS.textDark : COLORS.grey },
        border: { borderColor: isDarkMode ? '#2C2C2E' : '#FAFAFA' },
        badge: { backgroundColor: isDarkMode ? '#1C1C1E' : '#E3F2FD' }
    };

    // --- ДІЇ ---
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
            navigation.navigate('GamesStack', {
                screen: 'SpeedyCountGame'
            });
        } else {
            const parentTopic = findParentTopic(trainerTask.topic);
            navigation.navigate('HomeStack', {
                screen: 'Practice',
                params: {
                    grade: 4,
                    topic: parentTopic,
                    subTopic: trainerTask.topic
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
                            const duelDoc = await firestore().collection('duels').doc(duelId).get();

                            if (duelDoc.exists) {
                                const duelData = duelDoc.data();

                                await firestore().collection('duels').doc(duelId).update({
                                    status: 'active'
                                });

                                navigation.navigate('HomeStack', {
                                    screen: 'Test',
                                    params: {
                                        mode: 'assess',
                                        testType: 'duel',
                                        duelId: duelId,
                                        grade: String(duelData?.grade || "4"),
                                        topic: duelData?.topic || 'LICZBY I DZIAŁANIA'
                                    }
                                });
                                handleDelete(item.id);
                            } else {
                                Alert.alert("Błąd", "Pojedynek już nie istnieje.");
                                handleDelete(item.id);
                            }
                        } catch (error) {
                            console.error("Błąd akceptacji pojedynku:", error);
                            Alert.alert("Błąd", "Problem z dołączeniem do gry.");
                        }
                    }}
            ]);
        } else if (item.type === 'friend_request') {
            Alert.alert("👥 Znajomi", "Dodać do znajomych?", [
                { text: "Nie", onPress: () => handleDelete(item.id) },
                { text: "Tak", onPress: async () => {
                        await acceptFriendRequest(user!.uid, item.data?.fromUserId, item.data?.fromUserEmail);
                        handleDelete(item.id);
                    }}
            ]);
        } else {
            handleDelete(item.id);
        }
    };

    if (loading) return <View style={[styles.center, themeStyles.container]}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

    return (
        <SafeAreaView style={[styles.container, themeStyles.container]}>
            <ScrollView contentContainerStyle={styles.scrollContent}>

                {trainerTask && (
                    <View style={[styles.heroContainer, themeStyles.card, { borderColor: isDarkMode ? '#2C2C2E' : '#F0F0F0' }]}>
                        <View style={styles.heroHeaderRow}>
                            <Ionicons name="sparkles" size={18} color="#FFD700" />
                            <Text style={styles.heroLabel}>ZADANIE SPECJALNE</Text>
                        </View>

                        <View style={styles.heroContent}>
                            <View style={styles.heroTextContainer}>
                                <Text style={[styles.heroTitle, themeStyles.text]}>Czas na trening!</Text>
                                <Text style={[styles.heroSubtitle, themeStyles.textSecondary]}>{trainerTask.reason}</Text>
                                <View style={[styles.topicBadge, themeStyles.badge]}>
                                    <Text style={styles.topicText}>{trainerTask.topic}</Text>
                                </View>
                            </View>
                            <Image source={require('../assets/fox_mascot.png')} style={styles.heroImage} />
                        </View>

                        <TouchableOpacity style={[styles.heroButton, { backgroundColor: isDarkMode ? COLORS.primaryDarkTheme : COLORS.primary }]} onPress={handleTrainerAction}>
                            <Text style={styles.heroButtonText}>Rozpocznij teraz</Text>
                            <Ionicons name="arrow-forward-circle" size={24} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                )}

                <View style={styles.listHeaderRow}>
                    <Text style={[styles.sectionHeader, themeStyles.headerText]}>Powiadomienia ({notifications.length})</Text>
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
                        <Text style={[styles.emptyText, themeStyles.textSecondary]}>Brak nowych powiadomień</Text>
                    </View>
                ) : (
                    <View>
                        {notifications.map(item => {
                            let icon: any = 'notifications';
                            let color = COLORS.primary;
                            if(item.type === 'duel_request') { icon = 'flash'; color = '#FFC107'; }
                            if(item.type === 'friend_request') { icon = 'person-add'; color = '#4CAF50'; }
                            if(item.type === 'achievement') { icon = 'trophy'; color = '#9C27B0'; }

                            return (
                                <View key={item.id} style={[styles.card, themeStyles.card, themeStyles.border]}>
                                    <TouchableOpacity style={styles.contentRow} onPress={() => handleNotifAction(item)}>
                                        <View style={[styles.iconBox, { backgroundColor: color + '20' }]}>
                                            <Ionicons name={icon} size={24} color={color} />
                                        </View>
                                        <View style={styles.textContainer}>
                                            <Text style={[styles.title, themeStyles.text]}>{item.title}</Text>
                                            <Text style={[styles.body, themeStyles.textSecondary]}>{item.body}</Text>
                                        </View>
                                        {(item.type === 'duel_request' || item.type === 'friend_request') && (
                                            <View style={[styles.actionBadge, { backgroundColor: isDarkMode ? COLORS.primaryDarkTheme : COLORS.primary }]}>
                                                <Text style={styles.actionText}>Akcja</Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id)}>
                                        <Ionicons name="close" size={18} color={isDarkMode ? '#555' : '#AAA'} />
                                    </TouchableOpacity>
                                </View>
                            );
                        })}
                    </View>
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
        borderRadius: 20, padding: 20, marginBottom: 25,
        elevation: 4, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 }, borderWidth: 1
    },
    heroHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    heroLabel: { fontSize: 12, fontWeight: 'bold', color: '#FFD700', marginLeft: 5, letterSpacing: 1 },
    heroContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    heroTextContainer: { flex: 1, paddingRight: 10 },
    heroTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 5 },
    heroSubtitle: { fontSize: 14, marginBottom: 10 },
    topicBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    topicText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 12 },
    heroImage: { width: 80, height: 80, resizeMode: 'contain' },
    heroButton: {
        flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
        paddingVertical: 12, borderRadius: 12, marginTop: 15, elevation: 2
    },
    heroButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16, marginRight: 8 },
    listHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingHorizontal: 5 },
    sectionHeader: { fontSize: 16, fontWeight: 'bold' },
    clearBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    clearText: { fontSize: 12, color: COLORS.error, fontWeight: '600' },
    card: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, marginBottom: 10, padding: 10, elevation: 1, borderWidth: 1 },
    contentRow: { flex: 1, flexDirection: 'row', alignItems: 'center' },
    iconBox: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    textContainer: { flex: 1 },
    title: { fontWeight: 'bold', fontSize: 14 },
    body: { fontSize: 13, marginTop: 2 },
    actionBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginRight: 5 },
    actionText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
    deleteBtn: { padding: 10 },
    emptyContainer: { alignItems: 'center', marginTop: 40, opacity: 0.7 },
    emptyText: { fontSize: 16, fontWeight: '600', marginTop: 15 }
});

export default ActivityScreen;