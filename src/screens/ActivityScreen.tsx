// src/screens/ActivityScreen.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Ionicons from '@expo/vector-icons/Ionicons';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
// --- ✅ 1. ІМПОРТУЄМО ОБИДВІ ФУНКЦІЇ ВІДХИЛЕННЯ ---
import { acceptFriendRequest, rejectFriendRequest, rejectDuelRequest } from '../services/friendService';
import { findWeakestTopic, WeakTopicInfo } from '../services/userStatsService';
import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

// (Інтерфейс Notification - без змін)
export interface Notification {
    id: string;
    type: 'achievement' | 'friend_request' | 'friend_accepted' | 'duel_request';
    title: string;
    body: string;
    icon: keyof typeof Ionicons.glyphMap;
    createdAt: FirebaseFirestoreTypes.Timestamp;
    read: boolean;
    fromUserId?: string;
    fromUserNickname?: string;
    duelId?: string;
    grade?: number;
    topic?: string;
}

function ActivityScreen() {
    // (Стани та хуки - без змін)
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [weakestTopic, setWeakestTopic] = useState<WeakTopicInfo | null>(null);
    const [isLoadingWeakTopic, setIsLoadingWeakTopic] = useState(true);
    const currentUser = auth().currentUser;
    const navigation = useNavigation<any>();

    useFocusEffect(
        useCallback(() => {
            const fetchWeakTopic = async () => {
                setIsLoadingWeakTopic(true);
                const topic = await findWeakestTopic();
                setWeakestTopic(topic);
                setIsLoadingWeakTopic(false);
            };
            fetchWeakTopic();
        }, [])
    );

    useEffect(() => {
        if (!currentUser) {
            setLoading(false);
            return;
        }
        const subscriber = firestore()
            .collection('users')
            .doc(currentUser.uid)
            .collection('notifications')
            .orderBy('createdAt', 'desc')
            .limit(50)
            .onSnapshot(querySnapshot => {
                const fetchedNotifications: Notification[] = [];
                querySnapshot.forEach(doc => {
                    fetchedNotifications.push({ id: doc.id, ...doc.data() } as Notification);
                });
                setNotifications(fetchedNotifications);
                setLoading(false);
            });
        return () => subscriber();
    }, [currentUser]);

    // (handleAcceptFriend, handleRejectFriend, handlePracticeWeakTopic, handleStartDuel - без змін)
    const handleAcceptFriend = async (notification: Notification) => {
        if (!notification.fromUserId || !notification.fromUserNickname) return;
        await acceptFriendRequest(notification.fromUserId, notification.fromUserNickname, notification.id);
    };
    const handleRejectFriend = async (notification: Notification) => {
        if (!currentUser || !notification.id) return;
        await rejectFriendRequest(notification.id);
    };
    const handlePracticeWeakTopic = () => {
        if (weakestTopic) {
            navigation.navigate('HomeStack', {
                screen: 'Test',
                params: {
                    grade: weakestTopic.grade,
                    topic: weakestTopic.topic,
                    subTopic: weakestTopic.subTopic,
                    mode: 'learn',
                    testType: 'subTopic',
                }
            });
        }
    };
    const handleStartDuel = (notification: Notification) => {
        if (!notification.duelId || !notification.grade || !notification.topic) {
            Alert.alert("Błąd", "Brak pełnych informacji o pojedynku. Spróbuj ponownie.");
            return;
        }
        navigation.navigate('HomeStack', {
            screen: 'Test',
            params: {
                mode: 'duel',
                testType: 'duel',
                duelId: notification.duelId,
                grade: notification.grade,
                topic: notification.topic,
            }
        });
    };

    // --- ✅ 2. НОВА ФУНКЦІЯ (для відхилення дуелі) ---
    const handleRejectDuel = async (notification: Notification) => {
        if (!notification.duelId || !notification.fromUserId) {
            Alert.alert("Błąd", "Brak informacji o pojedynku, aby go odrzucić.");
            return;
        }
        await rejectDuelRequest(notification.id, notification.duelId, notification.fromUserId);
    };


    // --- ✅ 3. ОНОВЛЕНИЙ RENDER ITEM (показує кнопки для дуелей) ---
    const renderItem = ({ item }: { item: Notification }) => (
        <View style={[styles.notificationCard, !item.read && styles.unreadCard]}>
            <Ionicons name={item.icon} size={30} color={item.type === 'achievement' ? '#FFC107' : (item.type === 'duel_request' ? '#F44336' : '#00BCD4')} style={styles.icon} />
            <View style={styles.textContainer}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.body}>{item.body}</Text>
                <Text style={styles.timestamp}>
                    {item.createdAt ? formatDistanceToNow(item.createdAt.toDate(), { addSuffix: true, locale: pl }) : 'chwilę temu'}
                </Text>
            </View>

            {/* Кнопки для ЗАПИТІВ У ДРУЗІ */}
            {item.type === 'friend_request' && (
                <View style={styles.buttonGroup}>
                    <TouchableOpacity style={styles.actionButton} onPress={() => handleAcceptFriend(item)}>
                        <Ionicons name="checkmark-circle-outline" size={30} color="#4CAF50" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton} onPress={() => handleRejectFriend(item)}>
                        <Ionicons name="close-circle-outline" size={30} color="#F44336" />
                    </TouchableOpacity>
                </View>
            )}

            {/* Кнопки для ВИКЛИКІВ НА ДУЕЛЬ */}
            {item.type === 'duel_request' && (
                <View style={styles.buttonGroup}>
                    <TouchableOpacity style={styles.actionButton} onPress={() => handleStartDuel(item)}>
                        <Text style={styles.buttonTextAccept}>Podejmij</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton} onPress={() => handleRejectDuel(item)}>
                        <Text style={styles.buttonTextReject}>Odrzuć</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );

    // (ListHeader - без змін)
    const ListHeader = () => (
        <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Twój osobisty trener</Text>
            {isLoadingWeakTopic ? (
                <ActivityIndicator style={{marginTop: 10}} />
            ) : (
                weakestTopic ? (
                    <TouchableOpacity style={[styles.card, styles.weaknessCard]} onPress={handlePracticeWeakTopic}>
                        <Ionicons name="fitness-outline" size={40} color="#FFFFFF" style={styles.icon}/>
                        <View style={styles.cardTextContainer}>
                            <Text style={styles.cardTitle}>Poćwicz słabszy temat!</Text>
                            <Text style={styles.cardSubtitle}>Twoja średnia w temacie "{weakestTopic.subTopic}" to {weakestTopic.averageScore}%. Damy radę to poprawić!</Text>
                        </View>
                    </TouchableOpacity>
                ) : (
                    <Text style={styles.placeholderText}>Świetnie sobie radzisz! Nie znaleźliśmy tematów do dodatkowego treningu.</Text>
                )
            )}
        </View>
    );

    return (
        <FlatList
            style={styles.container}
            data={notifications}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            ListHeaderComponent={ListHeader}
            ListEmptyComponent={!loading ? <Text style={styles.emptyText}>Brak nowych powiadomień.</Text> : null}
            ListFooterComponent={loading ? <ActivityIndicator style={{ margin: 20 }} size="large" color="#00BCD4" /> : null}
        />
    );
}

// --- ✅ 4. ОНОВЛЕНІ СТИЛІ (додано текстові кнопки) ---
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0f4f8' },
    sectionContainer: { padding: 15, backgroundColor: '#fff', marginBottom: 10 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#333' },
    card: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 12, elevation: 3 },
    weaknessCard: { backgroundColor: '#F44336' },
    cardTextContainer: { flex: 1, marginLeft: 15 },
    cardTitle: { fontSize: 16, fontWeight: 'bold', color: 'white' },
    cardSubtitle: { fontSize: 14, color: 'white', marginTop: 4 },
    placeholderText: { fontSize: 14, color: '#666', textAlign: 'center', paddingVertical: 10 },
    notificationCard: { backgroundColor: '#fff', flexDirection: 'row', padding: 15, marginHorizontal: 10, marginVertical: 5, borderRadius: 10, elevation: 2, alignItems: 'center' },
    unreadCard: { borderLeftWidth: 4, borderLeftColor: '#00BCD4' },
    icon: { marginRight: 15 },
    textContainer: { flex: 1 },
    title: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    body: { fontSize: 14, color: '#666', marginTop: 2 },
    timestamp: { fontSize: 12, color: '#999', marginTop: 5 },
    emptyText: { textAlign: 'center', marginTop: 20, fontSize: 16, color: '#888' },
    buttonGroup: { flexDirection: 'column' }, // (Змінено на 'column' для текстових кнопок)
    actionButton: { padding: 5, alignItems: 'center' },
    buttonTextAccept: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#4CAF50', // Зелений
        paddingVertical: 4
    },
    buttonTextReject: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#F44336', // Червоний
        paddingVertical: 4
    }
});

export default ActivityScreen;
