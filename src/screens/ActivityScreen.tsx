import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    Alert, ActivityIndicator, SafeAreaView, Image, ScrollView
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

    const [notifications, setNotifications] = useState<AppNotification[]>([]);

    // Стан завдання від Тренера
    const [trainerTask, setTrainerTask] = useState<{
        active: boolean;
        topic: string; // Це SubTopic (підтема)
        reason: string;
    } | null>(null);

    // --- ПОШУК БАТЬКІВСЬКОГО РОЗДІЛУ ---
    // Нам треба знати MainTopic (наприклад, "LICZBY"), щоб відкрити PracticeScreen
    const findParentTopic = (subTopicName: string): string => {
        const grade4Data = (questionsDatabase as any)["4"];
        if (!grade4Data) return 'LICZBY I DZIAŁANIA';

        for (const mainTopicKey in grade4Data) {
            if (grade4Data[mainTopicKey][subTopicName]) {
                return mainTopicKey; // Знайшли батьківський розділ
            }
        }
        return 'LICZBY I DZIAŁANIA'; // Дефолтне значення
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
                        // Якщо немає помилок, пропонуємо гру або розминку
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

    // --- ДІЇ ---

    const handleDelete = (id: string) => deleteNotification(id);

    const handleClearAll = () => {
        if (notifications.length === 0) return;
        Alert.alert("Wyczyść", "Usunąć wszystkie powiadomienia?", [
            { text: "Nie", style: "cancel" },
            { text: "Tak", style: "destructive", onPress: clearAllNotifications }
        ]);
    };

    // 🔥 ВИПРАВЛЕНА НАВІГАЦІЯ
    const handleTrainerAction = () => {
        if (!trainerTask) return;

        if (trainerTask.topic === "Szybkie Liczenie") {
            // Навігація в інший стек (GamesStack)
            navigation.navigate('GamesStack', {
                screen: 'SpeedyCountGame'
            });
        } else {
            // Шукаємо головний розділ
            const parentTopic = findParentTopic(trainerTask.topic);

            console.log(`Trainer Nav: HomeStack -> Practice -> ${parentTopic} / ${trainerTask.topic}`);

            // Навігація в інший стек (HomeStack) -> екран Practice
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
                { text: "Tak", onPress: () => {
                        // Перехід в тест (HomeStack -> Test)
                        navigation.navigate('HomeStack', {
                            screen: 'Test',
                            params: { mode: 'assess', testType: 'duel', duelId: item.data?.duelId }
                        });
                        handleDelete(item.id);
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

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>

                {/* --- 1. HERO CARD (ТРЕНЕР) --- */}
                {trainerTask && (
                    <View style={styles.heroContainer}>
                        <View style={styles.heroHeaderRow}>
                            <Ionicons name="sparkles" size={18} color="#FFD700" />
                            <Text style={styles.heroLabel}>ZADANIE SPECJALNE</Text>
                        </View>

                        <View style={styles.heroContent}>
                            <View style={styles.heroTextContainer}>
                                <Text style={styles.heroTitle}>Czas na trening!</Text>
                                <Text style={styles.heroSubtitle}>{trainerTask.reason}</Text>
                                <View style={styles.topicBadge}>
                                    <Text style={styles.topicText}>{trainerTask.topic}</Text>
                                </View>
                            </View>
                            <Image source={require('../assets/fox_mascot.png')} style={styles.heroImage} />
                        </View>

                        <TouchableOpacity style={styles.heroButton} onPress={handleTrainerAction}>
                            <Text style={styles.heroButtonText}>Rozpocznij teraz</Text>
                            <Ionicons name="arrow-forward-circle" size={24} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                )}

                {/* --- 2. ЗАГОЛОВОК СПИСКУ --- */}
                <View style={styles.listHeaderRow}>
                    <Text style={styles.sectionHeader}>Powiadomienia ({notifications.length})</Text>
                    {notifications.length > 0 && (
                        <TouchableOpacity onPress={handleClearAll} style={styles.clearBtn}>
                            <Text style={styles.clearText}>Wyczyść</Text>
                            <Ionicons name="trash-outline" size={16} color={COLORS.error} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* --- 3. СПИСОК СПОВІЩЕНЬ --- */}
                {notifications.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="notifications-off-outline" size={60} color="#E0E0E0" />
                        <Text style={styles.emptyText}>Brak nowych powiadomień</Text>
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
                                <View key={item.id} style={styles.card}>
                                    <TouchableOpacity style={styles.contentRow} onPress={() => handleNotifAction(item)}>
                                        <View style={[styles.iconBox, { backgroundColor: color + '15' }]}>
                                            <Ionicons name={icon} size={24} color={color} />
                                        </View>
                                        <View style={styles.textContainer}>
                                            <Text style={styles.title}>{item.title}</Text>
                                            <Text style={styles.body}>{item.body}</Text>
                                        </View>
                                        {(item.type === 'duel_request' || item.type === 'friend_request') && (
                                            <View style={styles.actionBadge}>
                                                <Text style={styles.actionText}>Akcja</Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id)}>
                                        <Ionicons name="close" size={18} color="#AAA" />
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
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scrollContent: { padding: PADDING.medium },

    // HERO STYLES
    heroContainer: {
        backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginBottom: 25,
        elevation: 4, shadowColor: COLORS.primary, shadowOpacity: 0.15, shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 }, borderWidth: 1, borderColor: '#F0F0F0'
    },
    heroHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    heroLabel: { fontSize: 12, fontWeight: 'bold', color: '#FFD700', marginLeft: 5, letterSpacing: 1 },
    heroContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    heroTextContainer: { flex: 1, paddingRight: 10 },
    heroTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.text, marginBottom: 5 },
    heroSubtitle: { fontSize: 14, color: COLORS.grey, marginBottom: 10 },
    topicBadge: { backgroundColor: '#E3F2FD', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    topicText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 12 },
    heroImage: { width: 80, height: 80, resizeMode: 'contain' },
    heroButton: {
        backgroundColor: COLORS.primary, flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
        paddingVertical: 12, borderRadius: 12, marginTop: 15, elevation: 2
    },
    heroButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16, marginRight: 8 },

    // LIST HEADER
    listHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingHorizontal: 5 },
    sectionHeader: { fontSize: 16, fontWeight: 'bold', color: COLORS.grey },
    clearBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    clearText: { fontSize: 12, color: COLORS.error, fontWeight: '600' },

    // CARD
    card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 14, marginBottom: 10, padding: 10, elevation: 1, borderWidth: 1, borderColor: '#FAFAFA' },
    contentRow: { flex: 1, flexDirection: 'row', alignItems: 'center' },
    iconBox: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    textContainer: { flex: 1 },
    title: { fontWeight: 'bold', fontSize: 14, color: '#333' },
    body: { fontSize: 13, color: '#666', marginTop: 2 },
    actionBadge: { backgroundColor: COLORS.primary, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginRight: 5 },
    actionText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
    deleteBtn: { padding: 10 },

    emptyContainer: { alignItems: 'center', marginTop: 40, opacity: 0.7 },
    emptyText: { fontSize: 16, fontWeight: '600', color: COLORS.grey, marginTop: 15 }
});

export default ActivityScreen;
