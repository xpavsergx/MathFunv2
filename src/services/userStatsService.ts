// src/services/userStatsService.ts

import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { checkAndGrantAchievements } from './achievementService';

// --- ✅ 1. ОНОВЛЮЄМО ІНТЕРФЕЙС ---
export interface UserStats {
    testsCompleted?: number;
    correctAnswersTotal?: number;
    flawlessTests?: number;
    duelsWon?: number;
    friendsCount?: number;
    // --- Додані поля ---
    duelsPlayed?: number;
    duelsLost?: number;
    duelsDraw?: number;
}

function getUserDocRef(userId?: string) {
    const uid = userId || auth().currentUser?.uid;
    if (!uid) return null;
    return firestore().collection('users').doc(uid);
}

/**
 * Оновлює статистику користувача у Firestore.
 * (Функція без змін, але тепер вона підтримує нові поля)
 */
export async function incrementUserStats(statsToIncrement: { [key in keyof UserStats]?: number }) {
    const user = auth().currentUser;
    if (!user) return;

    const userDocRef = getUserDocRef(user.uid);
    if (!userDocRef) return;

    try {
        const updateData: { [key: string]: any } = {};
        for (const key in statsToIncrement) {
            const value = statsToIncrement[key as keyof UserStats];
            if (value !== undefined) {
                updateData[key] = firestore.FieldValue.increment(value);
            }
        }

        if (Object.keys(updateData).length === 0) {
            return; // Немає чого оновлювати
        }

        await userDocRef.set(updateData, { merge: true });

        // Запускаємо перевірку досягнень
        checkAndGrantAchievements(user.uid).catch(err => {
            console.error("Фонова перевірка досягнень не вдалася:", err);
        });

    } catch (error) {
        console.error("Помилка при оновленні статистики:", error);
    }
}

// --- ✅ 2. НОВА ФУНКЦІЯ ДЛЯ СТАТИСТИКИ ДУЕЛІ ---
/**
 * Оновлює статистику дуелей (перемога, поразка, нічия).
 * Викликається з DuelResultScreen.
 */
export async function updateDuelStats(result: 'win' | 'lose' | 'draw') {
    const user = auth().currentUser;
    if (!user) return;

    let statsToUpdate: { [key in keyof UserStats]?: number } = {
        duelsPlayed: 1, // Кожна дуель - це +1 зіграна
    };

    if (result === 'win') {
        statsToUpdate.duelsWon = 1;
    } else if (result === 'lose') {
        statsToUpdate.duelsLost = 1;
    } else if (result === 'draw') {
        statsToUpdate.duelsDraw = 1;
    }

    // Використовуємо існуючу функцію, щоб не дублювати логіку
    // Вона також автоматично викличе перевірку досягнень (напр. "Виграти 1 дуель")
    await incrementUserStats(statsToUpdate);
}


/**
 * Отримує поточну статистику користувача.
 * (Функція без змін)
 */
export async function getUserStats(): Promise<UserStats | null> {
    const userDocRef = getUserDocRef();
    if (!userDocRef) return null;

    try {
        const doc = await userDocRef.get();
        if (doc.exists) {
            return doc.data() as UserStats;
        }
        return null;
    } catch (error) {
        console.error("Помилка отримання статистики:", error);
        return null;
    }
}
