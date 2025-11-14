// src/services/xpService.ts

import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Toast from 'react-native-toast-message';

/**
 * Визначає, скільки досвіду потрібно для досягнення наступного рівня.
 * @param currentLevel - Поточний рівень.
 */
const calculateXpForNextLevel = (currentLevel: number): number => {
    // Проста лінійна прогресія: Рівень 1 -> 100 XP, Рівень 2 -> 150 XP, Рівень 3 -> 200 XP
    // Ти можеш зробити цю формулу складнішою, наприклад, (currentLevel * 100) * 1.5
    return 100 + (currentLevel * 50);
};

/**
 * Нараховує досвід (XP) та монети користувачу та обробляє підвищення рівня (Level Up).
 * @param xpGained - Кількість досвіду, яку потрібно додати.
 * @param coinsGained - Кількість монет, яку потрібно додати.
 */
export const awardXpAndCoins = async (xpGained: number, coinsGained: number) => {
    const user = auth().currentUser;
    if (!user) {
        console.warn("[xpService] Користувач не залогінений. Нарахування скасовано.");
        return;
    }

    const userRef = firestore().collection('users').doc(user.uid);

    try {
        await firestore().runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) {
                console.error("[xpService] Документ користувача не знайдено.");
                return;
            }

            const data = userDoc.data();

            // Отримуємо поточні значення або 0/1 за замовчуванням
            let currentLevel = data?.level || 1;
            let currentXp = data?.xp || 0;
            let currentXpToNextLevel = data?.xpToNextLevel || calculateXpForNextLevel(currentLevel);
            let currentCoins = data?.coins || 0;

            // 1. Нараховуємо XP та монети
            currentXp += xpGained;
            currentCoins += coinsGained;

            // 2. Перевіряємо, чи достатньо XP для нового рівня
            let hasLeveledUp = false;
            while (currentXp >= currentXpToNextLevel) {
                hasLeveledUp = true;

                // Перехід на новий рівень
                currentLevel += 1;

                // Віднімаємо XP, використаний для підвищення рівня
                currentXp -= currentXpToNextLevel;

                // (Опціонально) Бонусні монети за рівень
                currentCoins += 50; // Наприклад, 50 монет за кожен новий рівень

                // Розраховуємо XP для наступного рівня
                currentXpToNextLevel = calculateXpForNextLevel(currentLevel);
            }

            // 3. Зберігаємо оновлені дані в транзакції
            transaction.update(userRef, {
                level: currentLevel,
                xp: currentXp,
                xpToNextLevel: currentXpToNextLevel,
                coins: currentCoins,
            });

            // 4. Повертаємо true, якщо відбувся Level Up (для показу Toast)
            return hasLeveledUp ? currentLevel : false;
        })
            .then((levelUpResult) => {
                // Цей код виконається ПІСЛЯ успішної транзакції

                // 4. Повідомляємо користувача про нагороди
                if (levelUpResult) {
                    // Якщо був Level Up
                    const level = levelUpResult as number;
                    Toast.show({
                        type: 'success', // Або кастомний тип
                        text1: 'Awans!',
                        text2: `Gratulacje! Osiągnąłeś poziom ${level}! 🔥 (+50 monet)`
                    });
                } else if (xpGained > 0 || coinsGained > 0) {
                    // Якщо просто отримав XP/монети
                    Toast.show({
                        type: 'info',
                        text1: 'Nagroda!',
                        text2: `Zdobyłeś +${xpGained} XP i +${coinsGained} monet 🪙`
                    });
                }
            });

    } catch (error) {
        console.error("[xpService] Помилка під час транзакції XP:", error);
        Alert.alert("Błąd", "Nie udało się zapisać postępu.");
    }
};
