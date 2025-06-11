// src/services/userStatsService.ts

import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { MainAppStackParamList } from '@/App';

export interface TestResultData {
    grade: number;
    topic: string;
    subTopic?: string;
    testType: MainAppStackParamList['Test']['testType'];
    score: number;
    total: number;
    percentage: number;
    completedAt: firestore.FieldValue | firestore.Timestamp;
};

export const saveTestResult = async (params: MainAppStackParamList['Test'], score: number, total: number): Promise<void> => {
    try {
        const user = auth().currentUser;
        if (!user) {
            console.error("[Stats] User not logged in. Cannot save test result.");
            return;
        }
        if (total === 0) {
            console.log("[Stats] Test has 0 questions. Skipping save.");
            return;
        }

        console.log(`[Stats] Attempting to save test result for user ${user.uid}...`);

        const resultData: Omit<TestResultData, 'completedAt'> & { completedAt: firestore.FieldValue } = {
            grade: params.grade,
            topic: params.topic,
            subTopic: params.subTopic,
            testType: params.testType,
            score,
            total,
            percentage: Math.round((score / total) * 100),
            completedAt: firestore.FieldValue.serverTimestamp(),
        };

        // Логуємо дані, які будемо записувати
        console.log("[Stats] Data to be saved:", JSON.stringify(resultData, null, 2));

        await firestore()
            .collection('users')
            .doc(user.uid)
            .collection('testResults')
            .add(resultData);

        console.log(`[Stats] SUCCESS: Test result saved for user ${user.uid}`);

    } catch (error) {
        // Логуємо будь-яку помилку від Firestore
        console.error("[Stats] FIRESTORE_ERROR: Error saving test result:", error);
    }
};

export interface WeakTopicInfo {
    grade: number;
    topic: string;
    subTopic: string;
    averageScore: number;
}

export const findWeakestTopic = async (): Promise<WeakTopicInfo | null> => {
    const user = auth().currentUser;
    if (!user) return null;

    try {
        const snapshot = await firestore()
            .collection('users')
            .doc(user.uid)
            .collection('testResults')
            .where('testType', '==', 'subTopic')
            .limit(100)
            .get();

        if (snapshot.empty) return null;

        const results: TestResultData[] = snapshot.docs.map(doc => doc.data() as TestResultData);

        const performanceBySubTopic: { [key: string]: { sum: number; count: number; grade: number; topic: string } } = {};

        results.forEach(res => {
            if (!res.subTopic) return;
            const key = `${res.grade}|${res.topic}|${res.subTopic}`;
            if (!performanceBySubTopic[key]) {
                performanceBySubTopic[key] = { sum: 0, count: 0, grade: res.grade, topic: res.topic };
            }
            performanceBySubTopic[key].sum += res.percentage;
            performanceBySubTopic[key].count += 1;
        });

        let weakestTopic: WeakTopicInfo | null = null;
        let lowestScore = 101;

        for (const key in performanceBySubTopic) {
            const stats = performanceBySubTopic[key];
            if (stats.count >= 2) {
                const averageScore = stats.sum / stats.count;
                if (averageScore < lowestScore && averageScore < 75) {
                    lowestScore = averageScore;
                    const [grade, topic, subTopic] = key.split('|');
                    weakestTopic = {
                        grade: Number(grade),
                        topic,
                        subTopic,
                        averageScore: Math.round(averageScore),
                    };
                }
            }
        }

        return weakestTopic;

    } catch (error) {
        console.error("Error finding weakest topic:", error);
        return null;
    }
};
