// src/services/notificationService.ts

import firestore from '@react-native-firebase/firestore';
import Toast from 'react-native-toast-message';
import { ACHIEVEMENTS } from '../config/achievements'; // Використовуємо відносний шлях

// Утиліта для створення запису сповіщення в Firestore
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

// Функція, що об'єднує запис ачівки, створення сповіщення і показ Toast
export const awardAchievement = (userId: string, achievementId: string) => {
    const achievementData = ACHIEVEMENTS[achievementId];
    if (!achievementData) return;

    // 1. Створюємо запис про саме досягнення
    firestore()
        .collection('users')
        .doc(userId)
        .collection('achievements')
        .doc(achievementId)
        .set({
            ...achievementData,
            awardedAt: firestore.FieldValue.serverTimestamp()
        });

    // 2. Створюємо сповіщення для користувача
    createNotification(userId, {
        type: 'achievement',
        title: 'Nowe Osiągnięcie!',
        body: `Zdobyłeś odznakę: "${achievementData.name}"`,
        icon: 'trophy-outline'
    });

    // 3. Показуємо Toast
    Toast.show({
        type: 'success',
        text1: 'Nowe Osiągnięcie!',
        text2: `Zdobyłeś odznakę: "${achievementData.name}"`,
    });
};
