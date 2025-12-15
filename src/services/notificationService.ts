// src/services/notificationService.ts

import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Toast from 'react-native-toast-message';
import { ACHIEVEMENTS } from '../config/achievements';

// ✅ Інтерфейс сповіщення для використання в UI (ActivityScreen)
export interface AppNotification {
    id: string;
    title: string;
    body: string;
    type: 'info' | 'duel_request' | 'duel_result' | 'friend_request' | 'achievement';
    data?: any;
    createdAt: any; // Timestamp
    read: boolean;
    icon?: string;
}

/**
 * Створює запис сповіщення в Firestore.
 * Використовується системою (наприклад, при виклику на дуель або отриманні ачівки).
 */
export const createNotification = async (userId: string, data: any) => {
    try {
        await firestore()
            .collection('users')
            .doc(userId)
            .collection('notifications')
            .add({
                ...data,
                createdAt: firestore.FieldValue.serverTimestamp(),
                read: false,
            });
    } catch (error) {
        console.error("Error creating notification: ", error);
    }
};

/**
 * Видаляє одне конкретне сповіщення.
 * Викликається, коли користувач натискає "кошик" або відхиляє/приймає виклик.
 */
export const deleteNotification = async (notificationId: string) => {
    const user = auth().currentUser;
    if (!user) return;

    try {
        await firestore()
            .collection('users')
            .doc(user.uid)
            .collection('notifications')
            .doc(notificationId)
            .delete();
    } catch (error) {
        console.error("Błąd usuwania powiadomienia:", error);
    }
};

/**
 * Видаляє ВСІ сповіщення користувача.
 * Викликається кнопкою "Wyczyść wszystko".
 */
export const clearAllNotifications = async () => {
    const user = auth().currentUser;
    if (!user) return;

    try {
        const querySnapshot = await firestore()
            .collection('users')
            .doc(user.uid)
            .collection('notifications')
            .get();

        const batch = firestore().batch();
        querySnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        await batch.commit();
        console.log("Wszystkie powiadomienia usunięte.");
    } catch (error) {
        console.error("Błąd czyszczenia powiadomień:", error);
    }
};

/**
 * Позначає сповіщення як прочитане.
 */
export const markAsRead = async (notificationId: string) => {
    const user = auth().currentUser;
    if (!user) return;
    try {
        await firestore()
            .collection('users')
            .doc(user.uid)
            .collection('notifications')
            .doc(notificationId)
            .update({ read: true });
    } catch (error) {
        console.error("Error marking read:", error);
    }
};

/**
 * Функція нагородження:
 * 1. Записує досягнення в базу.
 * 2. Створює сповіщення.
 * 3. Показує Toast на екрані.
 */
export const awardAchievement = (userId: string, achievementId: string) => {
    const achievementData = ACHIEVEMENTS[achievementId];
    if (!achievementData) return;

    // 1. Створюємо запис про саме досягнення в профілі
    firestore()
        .collection('users')
        .doc(userId)
        .collection('achievements')
        .doc(achievementId)
        .set({
            ...achievementData,
            awardedAt: firestore.FieldValue.serverTimestamp()
        });

    // 2. Створюємо сповіщення для ActivityScreen
    createNotification(userId, {
        type: 'achievement',
        title: 'Nowe Osiągnięcie!',
        body: `Zdobyłeś odznakę: "${achievementData.name}"`,
        icon: 'trophy-outline'
    });

    // 3. Показуємо спливаючий Toast
    Toast.show({
        type: 'success',
        text1: 'Nowe Osiągnięcie!',
        text2: `Zdobyłeś odznakę: "${achievementData.name}"`,
    });
};
