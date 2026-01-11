import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { Alert } from 'react-native';
import questionsDatabase from '../data/questionsDb.json';

/**
 * Wysyła wyzwanie (Gracz 1 -> Gracz 2)
 */
export const sendDuelRequest = async (friendId: string, grade: number, topic: string) => {
    const currentUser = auth().currentUser;
    if (!currentUser) return null;

    try {
        const db = (questionsDatabase as any).default || questionsDatabase;
        const topicData = db[String(grade)]?.[topic];
        let questionPool: string[] = [];

        // Przeszukiwanie podtematów w Twoim JSON
        if (topicData) {
            Object.keys(topicData).forEach(subKey => {
                const subContent = topicData[subKey];
                if (subContent.questions && Array.isArray(subContent.questions)) {
                    const ids = subContent.questions.map((q: any) => String(q.id));
                    questionPool = [...questionPool, ...ids];
                }
            });
        }

        if (questionPool.length === 0) {
            Alert.alert("Błąd", "Nie znaleziono pytań dla tego działu.");
            return null;
        }

        const selectedQuestionIds = questionPool.sort(() => 0.5 - Math.random()).slice(0, 10);
        const myName = currentUser.displayName || currentUser.email || 'Gracz 1';

        const duelRef = await firestore().collection('duels').add({
            challengerId: currentUser.uid,
            opponentId: friendId,
            players: [currentUser.uid, friendId], // Potrzebne do powiadomień i wyników
            grade,
            topic,
            questionIds: selectedQuestionIds, // Kluczowe dla TestScreen
            status: 'pending',
            createdAt: firestore.FieldValue.serverTimestamp(),
            results: {
                [currentUser.uid]: { score: null, time: null, nickname: myName },
                [friendId]: { score: null, time: null, nickname: 'Przeciwnik' }
            }
        });

        // Powiadomienie o wyzwaniu
        await firestore().collection('users').doc(friendId).collection('notifications').add({
            type: 'duel_request',
            title: 'Nowe wyzwanie! ⚔️',
            body: `${myName} wyzywa Cię: ${topic}!`,
            data: { duelId: duelRef.id, fromUserId: currentUser.uid },
            createdAt: firestore.FieldValue.serverTimestamp(),
            read: false,
        });

        return duelRef.id;
    } catch (error) {
        console.error("sendDuelRequest Error:", error);
        return null;
    }
};

/**
 * Akceptuje wyzwanie (Gracz 2 klika "Tak" w ActivityScreen)
 */
export const acceptDuelRequest = async (duelId: string) => {
    const currentUser = auth().currentUser;
    if (!currentUser) return;

    try {
        const duelRef = firestore().collection('duels').doc(duelId);
        const duelSnap = await duelRef.get();
        if (!duelSnap.exists) return;
        const duelData = duelSnap.data();

        await duelRef.update({ status: 'active' });

        // Powiadomienie zwrotne dla Gracza 1
        const challengerId = duelData?.challengerId;
        if (challengerId) {
            await firestore().collection('users').doc(challengerId).collection('notifications').add({
                type: 'duel_accepted',
                title: 'Wyzwanie zaakceptowane! 🚀',
                body: `${currentUser.displayName || 'Przeciwnik'} przyjął wyzwanie. Twoja tura!`,
                data: { duelId },
                createdAt: firestore.FieldValue.serverTimestamp(),
                read: false,
            });
        }
    } catch (error) {
        console.error("acceptDuelRequest Error:", error);
    }
};

export const sendFriendRequest = async (targetName: string) => {
    const currentUser = auth().currentUser;
    if (!currentUser || !currentUser.email) return;
    try {
        const snap = await firestore().collection('users').where('firstName', '==', targetName).limit(1).get();
        if (snap.empty) { Alert.alert("Błąd", "Nie znaleziono użytkownika."); return; }
        const targetId = snap.docs[0].id;
        if (targetId === currentUser.uid) return;

        await firestore().collection('users').doc(targetId).collection('notifications').add({
            type: 'friend_request',
            title: 'Zaproszenie',
            body: `Użytkownik ${currentUser.email} chce Cię dodać do znajomych.`,
            data: { fromUserId: currentUser.uid, fromUserEmail: currentUser.email },
            createdAt: firestore.FieldValue.serverTimestamp(),
            read: false,
        });
        Alert.alert("Sukces", "Wysłano zaproszenie!");
    } catch (e) { Alert.alert("Błąd", "Problem przy wysyłaniu."); }
};

export const acceptFriendRequest = async (currentUserId: string, friendId: string) => {
    if (!currentUserId || !friendId) return;
    try {
        const db = firestore();
        const batch = db.batch();
        batch.update(db.collection('users').doc(currentUserId), { friends: firestore.FieldValue.arrayUnion(friendId) });
        batch.update(db.collection('users').doc(friendId), { friends: firestore.FieldValue.arrayUnion(currentUserId) });
        await batch.commit();
    } catch (e) { console.error(e); }
};

export const removeFriend = async (friendId: string) => {
    const user = auth().currentUser;
    if (user) await firestore().collection('users').doc(user.uid).update({ friends: firestore.FieldValue.arrayRemove(friendId) });
};
