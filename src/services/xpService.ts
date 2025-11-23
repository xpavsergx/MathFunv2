// src/services/xpService.ts
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth'; // Dodajemy import auth, który jest potrzebny
import { checkAndGrantAchievements } from './achievementService';

// Розрахунок XP для наступного рівня (100, 200, 300...)
const calculateXpToNextLevel = (level: number) => {
    return level * 100;
};

/**
 * Додає XP та МОНЕТИ користувачу та перевіряє підвищення рівня.
 * ЗМІНА: Додано coinsAmount
 * @param userId ID користувача
 * @param totalXp Загальна кількість XP для додавання
 * @param activeXp XP, зароблені за активні дії (відповіді)
 * @param passiveXp XP, зароблені пасивно (за завершення)
 * @param coinsAmount Кількість монет для додавання (NOWY ARGUMENT)
 */
const addXP = async (userId: string, totalXp: number, activeXp: number, passiveXp: number, coinsAmount: number = 0) => {
    // Zmieniono warunek, aby uwzględniał też monety
    if (!userId || (totalXp === 0 && coinsAmount === 0)) return;

    const userRef = firestore().collection('users').doc(userId);
    let levelIncreased = false;

    try {
        await firestore().runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) {
                console.warn(`User document ${userId} not found. Cannot add XP/Coins.`);
                return;
            }

            const userData = userDoc.data() || {};
            const currentLevel = userData.level || 1;
            const currentXp = userData.xp || 0;
            let xpToNextLevel = userData.xpToNextLevel || calculateXpToNextLevel(currentLevel);

            let newXp = currentXp + totalXp;
            let newLevel = currentLevel;

            // Перевірка підвищення рівня
            while (newXp >= xpToNextLevel) {
                newXp = newXp - xpToNextLevel;
                newLevel += 1;
                xpToNextLevel = calculateXpToNextLevel(newLevel);
                levelIncreased = true;
            }

            // Оновлюємо документ користувача
            transaction.update(userRef, {
                xp: newXp,
                level: newLevel,
                xpToNextLevel: xpToNextLevel,
                totalXpGained: firestore.FieldValue.increment(totalXp),
                coins: firestore.FieldValue.increment(coinsAmount), // 👈 DODANO LOGIKĘ MONET
            });
        });

        if (levelIncreased) {
            checkAndGrantAchievements(userId).catch(err => {
                console.error("Фонова перевірка досягнень (Level Up) не вдалася:", err);
            });
        }

    } catch (error) {
        console.error("Błąd podczas dodawania XP:", error);
    }
};

// 🌟 DODANO TĘ FUNKCJĘ, ABY ROZWIĄZAĆ PROBLEM IMPORTU 🌟
/**
 * Adapter dla ekranów zadaniowych.
 * Obsługuje stary format wywołania awardXpAndCoins(xp, coins).
 * Wskazówka: Całe XP jest traktowane jako 'activeXp'.
 */
export const awardXpAndCoins = (xp: number, coins: number) => {
    const currentUser = auth().currentUser;
    if (currentUser) {
        // Wywołuje pełną funkcję addXP z userId, XP, i monetami.
        // Używamy XP jako aktywne i 0 jako pasywne.
        addXP(currentUser.uid, xp, xp, 0, coins);
    } else {
        console.warn("Nie można przyznać nagród XP i monet: użytkownik niezalogowany.");
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

// Експортуємо сервіс (bez zmian)
export const xpService = {
    addXP,
    getUserXP,
};