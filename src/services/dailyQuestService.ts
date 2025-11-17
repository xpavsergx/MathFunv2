// src/services/dailyQuestService.ts

import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { isToday } from 'date-fns';
import { xpService } from './xpService';
import Toast from 'react-native-toast-message';

// Типи завдань
export type QuestType = 'TEST_COMPLETE' | 'DUEL_WIN' | 'GAMES_PLAYED';

// Визначення завдань
export const QUEST_DEFINITIONS = [
    {
        id: 'test_1',
        type: 'TEST_COMPLETE',
        title: 'Pierwszy test dnia',
        target: 1,
        reward: { xp: 50, coins: 10 },
    },
    {
        id: 'games_3',
        type: 'GAMES_PLAYED',
        title: 'Zagraj w 3 gry',
        target: 3,
        reward: { xp: 100, coins: 20 },
    },
    {
        id: 'duel_1',
        type: 'DUEL_WIN',
        title: 'Wygraj 1 pojedynek',
        target: 1,
        reward: { xp: 150, coins: 50 },
    },
];

// Інтерфейс для даних в Firestore
interface DailyQuestsData {
    lastUpdated: FirebaseFirestoreTypes.Timestamp;
    progress: { [questId: string]: number };
    completed: { [questId: string]: boolean };
}

// Отримує посилання на документ користувача
const getUserRef = () => {
    const user = auth().currentUser;
    if (!user) return null;
    return firestore().collection('users').doc(user.uid);
}

/**
 * Перевіряє та скидає щоденні завдання, якщо настав новий день.
 * Повертає актуальні дані про завдання.
 */
const getAndResetQuests = async (): Promise<DailyQuestsData> => {
    const userRef = getUserRef();
    if (!userRef) throw new Error("Użytkownik nie jest zalogowany");

    const doc = await userRef.get();
    const data = doc.data();

    let quests: DailyQuestsData = data?.dailyQuests || {
        lastUpdated: firestore.Timestamp.fromMillis(0),
        progress: {},
        completed: {},
    };

    if (!isToday(quests.lastUpdated.toDate())) {
        quests = {
            lastUpdated: firestore.Timestamp.now(),
            progress: {},
            completed: {},
        };
        userRef.update({ dailyQuests: quests });
    }

    return quests;
}

/**
 * Отримує поточний стан завдань для відображення на MainScreen
 */
export const getUserQuests = async () => {
    try {
        const questsData = await getAndResetQuests();

        return QUEST_DEFINITIONS.map(quest => {
            const progress = questsData.progress[quest.id] || 0;
            const isCompleted = questsData.completed[quest.id] || false;
            return {
                ...quest,
                progress,
                isCompleted,
            };
        });

    } catch (error) {
        console.error("Błąd pobierania zadań:", error);
        return [];
    }
}

/**
 * Оновлює прогрес для певного типу завдання
 */
export const updateQuestProgress = async (type: QuestType) => {
    const userRef = getUserRef();
    if (!userRef) return;

    try {
        const questsData = await getAndResetQuests();

        const questsToUpdate = QUEST_DEFINITIONS.filter(q => q.type === type);

        let needsUpdate = false;

        for (const quest of questsToUpdate) {
            if (!questsData.completed[quest.id]) {
                const newProgress = (questsData.progress[quest.id] || 0) + 1;
                questsData.progress[quest.id] = newProgress;
                needsUpdate = true;

                if (newProgress >= quest.target) {
                    questsData.completed[quest.id] = true;

                    const { xp, coins } = quest.reward;
                    await xpService.addXP(userRef.id, xp, xp, 0);
                    await userRef.update({
                        coins: firestore.FieldValue.increment(coins)
                    });

                    Toast.show({
                        type: 'success',
                        text1: 'Zadanie Ukończone!',
                        text2: `Zdobyłeś: ${quest.title} (+${xp} XP, +${coins} 🪙)`,
                    });
                }
            }
        }

        if (needsUpdate) {
            await userRef.update({
                'dailyQuests.progress': questsData.progress,
                'dailyQuests.completed': questsData.completed,
                'dailyQuests.lastUpdated': firestore.Timestamp.now(),
            });
        }

    } catch (error) {
        console.error("Błąd aktualizacji zadania:", error);
    }
}
