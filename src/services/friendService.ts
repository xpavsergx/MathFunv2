// src/services/friendService.ts

import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { Alert } from 'react-native';

// --- Типи ---
export interface Friend {
    id: string;
    email: string;
    avatar?: string;
    displayName?: string;
}

/**
 * Відправляє запит на дружбу за Email
 */
export const sendFriendRequest = async (targetEmail: string) => {
    const currentUser = auth().currentUser;
    if (!currentUser || !currentUser.email) return;

    if (currentUser.email.toLowerCase() === targetEmail.toLowerCase()) {
        Alert.alert("Błąd", "Nie możesz dodać samego siebie.");
        return;
    }

    try {
        // 1. Знаходимо користувача за Email
        const usersSnapshot = await firestore()
            .collection('users')
            .where('email', '==', targetEmail.toLowerCase())
            .limit(1)
            .get();

        if (usersSnapshot.empty) {
            Alert.alert("Błąd", "Nie znaleziono użytkownika z takim e-mailem.");
            return;
        }

        const targetUserDoc = usersSnapshot.docs[0];
        const targetUserId = targetUserDoc.id;

        // 2. Створюємо сповіщення для цього користувача
        await firestore()
            .collection('users')
            .doc(targetUserId)
            .collection('notifications')
            .add({
                type: 'friend_request',
                title: 'Zaproszenie do znajomych',
                body: `Użytkownik ${currentUser.email} chce dodać Cię do znajomych.`,
                data: {
                    fromUserId: currentUser.uid,
                    fromUserEmail: currentUser.email
                },
                createdAt: firestore.FieldValue.serverTimestamp(),
                read: false,
            });

        Alert.alert("Sukces", "Wysłano zaproszenie!");

    } catch (error) {
        console.error("Błąd wysyłania zaproszenia:", error);
        Alert.alert("Błąd", "Wystąpił problem przy wysyłaniu.");
    }
};

/**
 * Приймає запит на дружбу
 * Оновлює списки друзів у обох користувачів (current + friend)
 */
export const acceptFriendRequest = async (currentUserId: string, friendId: string, friendEmail: string) => {
    if (!currentUserId || !friendId) return;

    const db = firestore();
    const batch = db.batch();

    // 1. Додаємо друга до списку поточного користувача
    const currentUserFriendRef = db.collection('users').doc(currentUserId).collection('friends').doc(friendId);
    batch.set(currentUserFriendRef, {
        id: friendId,
        email: friendEmail, // Зберігаємо email для зручності
        addedAt: firestore.FieldValue.serverTimestamp(),
    });

    // 2. Додаємо поточного користувача до списку друга
    // Спочатку треба отримати email поточного юзера
    const currentUser = auth().currentUser;
    const currentUserEmail = currentUser?.email || "unknown@email.com";

    const friendUserRef = db.collection('users').doc(friendId).collection('friends').doc(currentUserId);
    batch.set(friendUserRef, {
        id: currentUserId,
        email: currentUserEmail,
        addedAt: firestore.FieldValue.serverTimestamp(),
    });

    // Виконуємо запис
    await batch.commit();
    console.log(`Znajomość nawiązana: ${currentUserId} <-> ${friendId}`);
};

/**
 * Отримує список друзів (real-time)
 */
export const subscribeToFriends = (userId: string, onUpdate: (friends: Friend[]) => void) => {
    return firestore()
        .collection('users')
        .doc(userId)
        .collection('friends')
        .onSnapshot(snapshot => {
            const friendsList = snapshot.docs.map(doc => ({
                id: doc.id,
                email: doc.data().email || 'Brak emaila',
                ...doc.data()
            })) as Friend[];
            onUpdate(friendsList);
        });
};

/**
 * Видаляє друга
 */
export const removeFriend = async (friendId: string) => {
    const currentUser = auth().currentUser;
    if (!currentUser) return;

    try {
        await firestore()
            .collection('users')
            .doc(currentUser.uid)
            .collection('friends')
            .doc(friendId)
            .delete();

        // Опціонально: видалити і у друга (щоб дружба була двостороння)
        // Але зазвичай достатньо видалити у себе
    } catch (error) {
        console.error("Error removing friend:", error);
    }
};
