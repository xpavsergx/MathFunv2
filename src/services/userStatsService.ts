import {
    getFirestore,
    doc,
    updateDoc,
    increment,
    arrayUnion,
    getDoc,
    setDoc
} from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';
import { checkAndGrantAchievements } from './achievementService';

export interface UserStats {
    testsCompleted?: number;
    correctAnswersTotal?: number;
    duelsPlayed?: number;
    duelsWon?: number;
    duelsLost?: number;
    duelsDraw?: number;
    weakestTopic?: string;
    history?: { score: number; date: string; topic: string }[];
}

/**
 * GŁÓWNA FUNKCJA: Zapisuje wynik testu, historię dla wykresów i dane dla Lisa
 */
export async function saveTestResultToHistory(score: number, total: number, topic: string) {
    const auth = getAuth();
    const db = getFirestore();
    const user = auth.currentUser;

    if (!user) return;

    const percentage = Math.round((score / total) * 100);
    const userRef = doc(db, 'users', user.uid);
    const today = new Date().toISOString().split('T')[0];

    try {
        // 1. Pobieramy aktualne statystyki tematów, aby Lis wiedział, co nam nie idzie
        const userSnap = await getDoc(userRef);
        const userData = userSnap.data();

        // Inicjalizacja liczników błędów jeśli nie istnieją
        const topicErrors = userData?.stats?.topicErrors || {};

        // Jeśli wynik jest słaby (poniżej 70%), zwiększamy licznik błędów dla tego tematu
        if (percentage < 70) {
            topicErrors[topic] = (topicErrors[topic] || 0) + 1;
        }

        // Algorytm wyboru "Najsłabszego tematu" dla Lisa
        let weakest = userData?.stats?.weakestTopic || "";
        let maxErrors = 0;
        Object.keys(topicErrors).forEach(key => {
            if (topicErrors[key] > maxErrors) {
                maxErrors = topicErrors[key];
                weakest = key;
            }
        });

        // 2. Aktualizacja zbiorcza (Modular API)
        await updateDoc(userRef, {
            // Historia pod wykres liniowy (LineChart)
            'stats.history': arrayUnion({
                score: percentage,
                date: new Date().toISOString(),
                topic: topic
            }),
            // Aktywność pod słupki w StatsScreen (BarChart)
            [`dailyActivity.${today}`]: increment(1),

            // Liczniki ogólne
            'stats.testsCompleted': increment(1),
            'stats.correctAnswersTotal': increment(score),

            // Dane dla Trenera (Lisa)
            'stats.topicErrors': topicErrors,
            'stats.weakestTopic': weakest,

            // Dodajemy XP za ukończenie testu
            'xp': increment(percentage > 50 ? 25 : 10)
        });

        console.log(`[Stats] Zapisano wynik: ${percentage}%. Najsłabszy temat dla Lisa: ${weakest}`);

        // 3. Sprawdzanie osiągnięć
        checkAndGrantAchievements(user.uid).catch(err => console.log("Osiągnięcia błąd:", err));

    } catch (error) {
        console.error("Błąd w saveTestResultToHistory:", error);
    }
}

/**
 * STATYSTYKI POJEDYNKÓW: Aktualizacja po walce z kolegą
 */
export async function updateDuelStats(result: 'win' | 'lose' | 'draw') {
    const auth = getAuth();
    const db = getFirestore();
    const user = auth.currentUser;

    if (!user) return;

    const userRef = doc(db, 'users', user.uid);
    const today = new Date().toISOString().split('T')[0];

    // Definiujemy nagrody za pojedynek
    let xpGain = 20; // XP za sam udział
    if (result === 'win') xpGain = 60;
    else if (result === 'draw') xpGain = 35;

    const updateData: any = {
        'xp': increment(xpGain),
        'stats.duelsPlayed': increment(1),
        'stats.testsCompleted': increment(1),
        [`dailyActivity.${today}`]: increment(1)
    };

    if (result === 'win') updateData['stats.duelsWon'] = increment(1);
    else if (result === 'lose') updateData['stats.duelsLost'] = increment(1);
    else if (result === 'draw') updateData['stats.duelsDraw'] = increment(1);

    try {
        await updateDoc(userRef, updateData);
        console.log(`[Stats] Duel ${result}. Przyznano ${xpGain} XP.`);
    } catch (error) {
        console.error("Błąd w updateDuelStats:", error);
    }
}

/**
 * POBIERANIE STATYSTYK: Używane w profilu i StatsScreen
 */
export async function getUserStats(): Promise<UserStats | null> {
    const auth = getAuth();
    const db = getFirestore();
    const user = auth.currentUser;

    if (!user) return null;

    try {
        const userSnap = await getDoc(doc(db, 'users', user.uid));
        if (userSnap.exists()) {
            return userSnap.data().stats as UserStats;
        }
        return null;
    } catch (error) {
        console.error("Błąd pobierania statystyk:", error);
        return null;
    }
}
