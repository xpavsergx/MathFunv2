// src/services/achievementService.ts

import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
// Використовуємо правильний відносний шлях, оскільки файли в одній папці
import { awardAchievement } from './notificationService'; // <-- ВИПРАВЛЕНО НА ВІДНОСНИЙ ШЛЯХ

// Функція перевірки, чи досягнення вже отримано
const hasAchievement = async (userId: string, achievementId: string): Promise<boolean> => {
    try {
        const doc = await firestore().collection('users').doc(userId).collection('achievements').doc(achievementId).get();
        return doc.exists;
    } catch (error) {
        console.error(`Error checking achievement ${achievementId}:`, error);
        return false;
    }
};

// Головна функція, яка перевіряє всі можливі досягнення після тесту
export const checkAchievementsOnTestComplete = async (score: number, total: number, topic: string) => {
    const user = auth().currentUser;
    if (!user) return;

    try {
        if (!(await hasAchievement(user.uid, 'FIRST_TEST_COMPLETED'))) {
            awardAchievement(user.uid, 'FIRST_TEST_COMPLETED');
        }

        if (total > 0 && score === total) {
            awardAchievement(user.uid, 'PERFECT_SCORE');
        }

        const resultsSnapshot = await firestore().collection('users').doc(user.uid).collection('testResults').get();
        const totalTestsCompleted = resultsSnapshot.size;

        if (totalTestsCompleted >= 5 && !(await hasAchievement(user.uid, 'MATH_NOVICE'))) {
            awardAchievement(user.uid, 'MATH_NOVICE');
        }

        if (totalTestsCompleted >= 25 && !(await hasAchievement(user.uid, 'MATH_ADEPT'))) {
            awardAchievement(user.uid, 'MATH_ADEPT');
        }

        if (!(await hasAchievement(user.uid, 'TOPIC_MASTER'))) {
            const topicResults = resultsSnapshot.docs.map(doc => doc.data()).filter(res => res.topic === topic);
            if (topicResults.length >= 5) {
                const topicAverage = topicResults.reduce((sum, res) => sum + res.percentage, 0) / topicResults.length;
                if (topicAverage >= 90) {
                    awardAchievement(user.uid, 'TOPIC_MASTER');
                }
            }
        }
    } catch(error) {
        console.error("Error in checkAchievementsOnTestComplete:", error)
    }
};
