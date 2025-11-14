// src/services/xpService.ts
import firestore from '@react-native-firebase/firestore';

// Розрахунок XP для наступного рівня (100, 200, 300...)
const calculateXpToNextLevel = (level: number) => {
    return level * 100;
};

/**
 * Додає XP користувачу та перевіряє підвищення рівня.
 * @param userId ID користувача
 * @param totalXp Загальна кількість XP для додавання
 * @param activeXp XP, зароблені за активні дії (відповіді)
 * @param passiveXp XP, зароблені пасивно (за завершення)
 */
const addXP = async (userId: string, totalXp: number, activeXp: number, passiveXp: number) => {
    if (!userId || totalXp === 0) return;

    const userRef = firestore().collection('users').doc(userId);

    try {
        await firestore().runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) {
                // Якщо документ не існує, ми не можемо його оновити.
                // Можливо, варто створити його, але це може бути ознакою іншої проблеми.
                console.warn(`User document ${userId} not found. Cannot add XP.`);
                return;
            }

            const userData = userDoc.data() || {};
            const currentLevel = userData.level || 1;
            const currentXp = userData.xp || 0;
            let xpToNextLevel = userData.xpToNextLevel || calculateXpToNextLevel(currentLevel);

            let newXp = currentXp + totalXp;
            let newLevel = currentLevel;

            // Перевірка підвищення рівня (можливо, кілька разів)
            while (newXp >= xpToNextLevel) {
                newXp = newXp - xpToNextLevel; // Віднімаємо поріг старого рівня
                newLevel += 1; // Підвищуємо рівень
                xpToNextLevel = calculateXpToNextLevel(newLevel); // Розраховуємо новий поріг

                // (Тут можна додати логіку для "Level Up" нотифікації)
            }

            // Оновлюємо документ користувача
            transaction.update(userRef, {
                xp: newXp,
                level: newLevel,
                xpToNextLevel: xpToNextLevel,
                totalXpGained: firestore.FieldValue.increment(totalXp), // Загальна статистика
            });
        });

        // (Тут можна також оновити статистику 'userStatsService', якщо потрібно)

    } catch (error) {
        console.error("Błąd podczas dodawania XP:", error);
    }
};

/**
 * Отримує поточний рівень та XP користувача.
 */
const getUserXP = async (userId: string) => {
    if (!userId) return null;
    try {
        const userDoc = await firestore().collection('users').doc(userId).get();
        if (userDoc.exists) {
            const { level, xp, xpToNextLevel } = userDoc.data() || {};
            return { level, xp, xpToNextLevel };
        }
        return null;
    } catch (error) {
        console.error("Błąd pobierania XP użytkownika:", error);
        return null;
    }
};

// Експортуємо сервіс
export const xpService = {
    addXP,
    getUserXP,
};
