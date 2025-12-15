// src/services/xpService.ts

import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

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

        // 🔥 ЛОГІКА ТРЕНЕРА (ОНОВЛЕНА)
        if (accuracy < 50) {
            // Якщо погано - запам'ятовуємо як слабку тему
            updateData['stats.weakestTopic'] = topicName;
        } else if (accuracy >= 80) {
            // ✅ ЯКЩО ДОБРЕ - ВИДАЛЯЄМО СЛАБКУ ТЕМУ
            // (Використовуємо FieldValue.delete(), щоб стерти поле з бази)
            updateData['stats.weakestTopic'] = firestore.FieldValue.delete();
        }

        await userRef.update(updateData);
        console.log(`Statystyki zaktualizowane. Wynik: ${accuracy}%`);

    } catch (error) {
        console.error("Błąd zapisu statystyk:", error);
    }
};
