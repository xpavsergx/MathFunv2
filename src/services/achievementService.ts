// src/services/achievementService.ts

import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Toast from 'react-native-toast-message';
import { ALL_ACHIEVEMENTS, Achievement } from '../config/achievements';
import { UserStats } from './userStatsService'; // Імпортуємо тип

// Тип для даних користувача (оновлений)
interface FullUserData extends UserStats {
    level?: number;
    xp?: number;
    stats?: {
        testsCompleted?: number;
        correctAnswers?: number;
        totalQuestionsSolved?: number;
    };
    // --- ✅ ЗМІНА ТИПУ ЗБЕРІГАННЯ ---
    // Замість string[] (масиву), ми будемо зберігати об'єкт (map)
    // earnedAchievements: string[]; // (СТАРИЙ ТИП)
    earnedAchievementsMap?: {
        [achievementId: string]: {
            unlockedAt: firestore.Timestamp; // Зберігаємо повну дату
        };
    };
}

function getUserDocRef(userId?: string) {
    const uid = userId || auth().currentUser?.uid;
    if (!uid) return null;
    return firestore().collection('users').doc(uid);
}

/**
 * Головна функція: перевіряє та надає нові досягнення.
 * @param userId ID користувача
 */
export async function checkAndGrantAchievements(userId: string): Promise<void> {
    const userDocRef = getUserDocRef(userId);
    if (!userDocRef) return;

    try {
        const doc = await userDocRef.get();
        if (!doc.exists) return;

        const userData = doc.data() as FullUserData;
        // Отримуємо поточну карту досягнень
        const earnedMap = userData.earnedAchievementsMap || {};

        const newAchievementsToGrant: Achievement[] = []; // Будемо зберігати повні об'єкти

        for (const achievement of ALL_ACHIEVEMENTS) {
            // Перевіряємо, чи воно вже є в *карті*
            if (earnedMap[achievement.id]) {
                continue; // Вже зароблене
            }

            const conditionMet = checkCondition(userData, achievement);

            if (conditionMet) {
                newAchievementsToGrant.push(achievement);
            }
        }

        if (newAchievementsToGrant.length > 0) {

            // --- ✅ 2. СТВОРЮЄМО ОБ'ЄКТ ДЛЯ ОНОВЛЕННЯ ---
            const updates: { [key: string]: any } = {};
            const now = firestore.Timestamp.now(); // Отримуємо поточну дату/час

            for (const ach of newAchievementsToGrant) {
                // Використовуємо "dot notation" для оновлення поля в об'єкті
                updates[`earnedAchievementsMap.${ach.id}`] = {
                    unlockedAt: now,
                };
            }

            // Оновлюємо документ користувача
            await userDocRef.update(updates);

            // --- ✅ 3. ПОКРАЩЕНЕ СПОВІЩЕННЯ ПОЛЬСЬКОЮ ---
            for (const ach of newAchievementsToGrant) {
                Toast.show({
                    type: 'success',
                    text1: 'Gratulacje! Nowe Osiągnięcie! 🏆',
                    text2: `Odblokowano: ${ach.title}`,
                    visibilityTime: 4000, // 4 секунди
                    position: 'top',
                });
            }
        }
    } catch (error) {
        console.error("Помилка при перевірці досягнень:", error);
    }
}

// Функція checkCondition залишається без змін (як у попередній відповіді)
function checkCondition(data: FullUserData, achievement: Achievement): boolean {
    const { criteriaType, criteriaValue } = achievement;

    // 1. Wyciągamy pod-obiekt stats z bazy (tam są wyniki testów)
    const stats = data.stats || {};

    switch (criteriaType) {
        case 'testsCompleted':
            // W bazie: stats.testsCompleted
            return (stats.testsCompleted || 0) >= criteriaValue;

        case 'correctAnswersTotal':
            // W bazie: sprawdzamy stats.correctAnswersTotal lub starsze stats.correctAnswers
            const answers =  stats.correctAnswers || 0;
            return answers >= criteriaValue;

        case 'flawlessTests':
            // W bazie: to pole jest na zewnątrz, obok XP (wg Twojej struktury)
            return (data.flawlessTests || 0) >= criteriaValue;

        case 'duelsWon':
            // W bazie: pojedynki są na głównym poziomie dokumentu
            return (data.duelsWon || 0) >= criteriaValue;

        case 'levelReached':
            // Poziom obliczamy z XP, które jest na głównym poziomie
            const level = Math.floor((data.xp || 0) / 1000) + 1;
            return level >= criteriaValue;

        default:
            return false;
    }
}

// Цю функцію (getUnlockedAchievements) поки не чіпаємо,
// оскільки ProfileScreen.tsx використовує onSnapshot
// і отримує дані в реальному часі.
export async function getUnlockedAchievements(): Promise<Achievement[]> {
    // ... (стара логіка все ще може використовуватися у StatsScreen,
    // але для ProfileScreen вона не потрібна)
    // ...
    // Для повноти, її теж варто оновити:
    const userDocRef = getUserDocRef();
    if (!userDocRef) return [];

    try {
        const doc = await userDocRef.get();
        if (!doc.exists) return [];

        const userData = doc.data() as FullUserData;
        const earnedMap = userData.earnedAchievementsMap || {};
        const earnedIds = Object.keys(earnedMap); // Отримуємо ключі (ID)

        const unlocked = ALL_ACHIEVEMENTS.filter(ach => earnedIds.includes(ach.id));
        return unlocked;

    } catch (error) {
        console.error("Помилка при отриманні розблокованих досягнень:", error);
        return [];
    }
}
