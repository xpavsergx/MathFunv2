// src/services/xpService.ts

import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Toast from 'react-native-toast-message';

// --- 1. Функція для нарахування XP та монет (використовується в тренажерах) ---
export const awardXpAndCoins = async (xpAmount: number, coinsAmount: number) => {
    const user = auth().currentUser;
    if (!user) return;

    const userRef = firestore().collection('users').doc(user.uid);

    try {
        await userRef.update({
            xp: firestore.FieldValue.increment(xpAmount),
            coins: firestore.FieldValue.increment(coinsAmount),
            // Опціонально: оновлюємо денний прогрес
            xpToday: firestore.FieldValue.increment(xpAmount)
        });

        // Можна додати Toast, щоб користувач бачив нагороду (опціонально)
        // Toast.show({
        //     type: 'success',
        //     text1: `+${xpAmount} XP  |  +${coinsAmount} Monet`,
        //     position: 'bottom',
        //     visibilityTime: 1500,
        // });

    } catch (error) {
        console.error("Błąd awardXpAndCoins:", error);
    }
};

// --- 2. Об'єкт сервісу (використовується в іграх та квестах) ---
export const xpService = {
    addXP: async (userId: string, xp: number, dailyXp: number, coins: number) => {
        try {
            await firestore().collection('users').doc(userId).update({
                xp: firestore.FieldValue.increment(xp),
                coins: firestore.FieldValue.increment(coins),
                xpToday: firestore.FieldValue.increment(dailyXp)
            });
        } catch (error) {
            console.error("Błąd xpService.addXP:", error);
        }
    }
};

// --- 3. Функція для збереження результатів тесту (вже була у вас) ---
export const saveTestResults = async (
    xpEarned: number,
    coinsEarned: number,
    totalQuestions: number,
    correctAnswers: number,
    topicName: string
) => {
    const user = auth().currentUser;
    if (!user) return;

    const userRef = firestore().collection('users').doc(user.uid);

    try {
        const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

        const updateData: any = {
            xp: firestore.FieldValue.increment(xpEarned),
            coins: firestore.FieldValue.increment(coinsEarned),
            'stats.testsCompleted': firestore.FieldValue.increment(1),
            'stats.totalQuestionsSolved': firestore.FieldValue.increment(totalQuestions),
            'stats.correctAnswers': firestore.FieldValue.increment(correctAnswers),
            xpToday: firestore.FieldValue.increment(xpEarned),
        };

        // Логіка для "слабких тем"
        if (accuracy < 50) {
            updateData['stats.weakestTopic'] = topicName;
        } else if (accuracy >= 80) {
            // Видаляємо слабку тему, якщо результат хороший
            updateData['stats.weakestTopic'] = firestore.FieldValue.delete();
        }

        await userRef.update(updateData);
        console.log(`Statystyki zaktualizowane. Wynik: ${accuracy}%`);

    } catch (error) {
        console.error("Błąd zapisu statystyk:", error);
    }
};
