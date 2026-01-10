import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { isToday } from 'date-fns';
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
        id: 'test_2', // Nowe ID dla drugiego zadania
        type: 'TEST_COMPLETE', // Ten sam typ!
        title: 'Mistrz wiedzy (2 testy)',
        target: 2, // Musi rozwiązać dwa
        reward: { xp: 150, coins: 40 },
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

    // Скидаємо завдання, якщо дата не сьогоднішня
    if (!quests.lastUpdated || !isToday(quests.lastUpdated.toDate())) {
        quests = {
            lastUpdated: firestore.Timestamp.now(),
            progress: {},
            completed: {},
        };
        await userRef.update({ dailyQuests: quests });
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
            // Оновлюємо тільки якщо завдання ще не виконане
            if (!questsData.completed[quest.id]) {
                const currentProgress = questsData.progress[quest.id] || 0;
                const newProgress = currentProgress + 1;

                questsData.progress[quest.id] = newProgress;
                needsUpdate = true;

                // Перевіряємо, чи досягнуто цілі
                if (newProgress >= quest.target) {
                    questsData.completed[quest.id] = true;

                    const { xp, coins } = quest.reward;

                    // ✅ ПРАВИЛЬНЕ НАРАХУВАННЯ: Використовуємо FieldValue.increment
                    await userRef.update({
                        xp: firestore.FieldValue.increment(xp),
                        coins: firestore.FieldValue.increment(coins)
                    });

                    // Показуємо гарне сповіщення
                    Toast.show({
                        type: 'success',
                        text1: 'Zadanie Ukończone! 🌟',
                        text2: `Otrzymałeś: ${quest.title} (+${xp} XP, +${coins} 🪙)`,
                        visibilityTime: 4000,
                        position: 'top'
                    });
                }
            }
        }

        // Записуємо оновлений прогрес в базу
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