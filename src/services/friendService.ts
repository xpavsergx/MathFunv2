// src/services/friendService.ts
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { Alert } from 'react-native';

export interface Friend {
    id: string;
    email: string;
    avatar?: string;
    nickname?: string;
    level: number;
    xp: number;
}

/**
 * Wysyła zaproszenie do znajomych (szuka po imieniu/firstName)
 */
export const sendFriendRequest = async (targetName: string) => {
    const currentUser = auth().currentUser;
    if (!currentUser || !currentUser.email) return;

    try {
        const usersSnapshot = await firestore()
            .collection('users')
            .where('firstName', '==', targetName)
            .limit(1)
            .get();

        if (usersSnapshot.empty) {
            Alert.alert("Błąd", "Nie znaleziono użytkownika o imieniu: " + targetName);
            return;
        }

        const targetUserId = usersSnapshot.docs[0].id;

        if (targetUserId === currentUser.uid) {
            Alert.alert("Błąd", "Nie możesz dodać samego siebie.");
            return;
        }

        await firestore()
            .collection('users')
            .doc(targetUserId)
            .collection('notifications')
            .add({
                type: 'friend_request',
                title: 'Zaproszenie do znajomych',
                body: `Użytkownik ${currentUser.email} chce Cię dodać do znajomych.`,
                data: {
                    fromUserId: currentUser.uid,
                    fromUserEmail: currentUser.email
                },
                createdAt: firestore.FieldValue.serverTimestamp(),
                read: false,
            });

        Alert.alert("Sukces", "Wysłano zaproszenie!");
    } catch (error) {
        Alert.alert("Błąd", "Wystąpił problem przy wysyłaniu.");
    }
};

/**
 * Przyjmuje zaproszenie i dodaje ID do TABLICY (zgodnie z Twoją bazą)
 */
export const acceptFriendRequest = async (currentUserId: string, friendId: string) => {
    if (!currentUserId || !friendId) return;

    try {
        const db = firestore();
        const batch = db.batch();

        const currentUserRef = db.collection('users').doc(currentUserId);
        const friendUserRef = db.collection('users').doc(friendId);

        batch.update(currentUserRef, {
            friends: firestore.FieldValue.arrayUnion(friendId)
        });

        batch.update(friendUserRef, {
            friends: firestore.FieldValue.arrayUnion(currentUserId)
        });

        await batch.commit();
        console.log("Znajomość nawiązana w tablicy!");
    } catch (error) {
        console.error("Błąd akceptowania:", error);
    }
};

/**
 * Wysyła zaproszenie do pojedynku (Tworzy pojedynek + Powiadomienie)
 */
export const sendDuelRequest = async (friendId: string, grade: number, topic: string) => {
    const currentUser = auth().currentUser;
    if (!currentUser) return null;

    try {
        // 1. Tworzymy dokument w kolekcji 'duels'
        const duelRef = await firestore().collection('duels').add({
            challengerId: currentUser.uid,
            challengerEmail: currentUser.email,
            opponentId: friendId,
            grade,
            topic,
            status: 'pending',
            createdAt: firestore.FieldValue.serverTimestamp(),
            scores: {
                [currentUser.uid]: null,
                [friendId]: null
            }
        });

        // 2. WYSYŁAMY POWIADOMIENIE DO PRZECIWNIKA (tego brakowało!)
        await firestore()
            .collection('users')
            .doc(friendId)
            .collection('notifications')
            .add({
                type: 'duel_request',
                title: 'Nowe wyzwanie!',
                body: `${currentUser.email} wyzywa Cię na pojedynek: ${topic} (Klasa ${grade})!`,
                data: {
                    duelId: duelRef.id,
                    fromUserId: currentUser.uid,
                    topic: topic
                },
                createdAt: firestore.FieldValue.serverTimestamp(),
                read: false,
            });

        return duelRef.id;
    } catch (error) {
        console.error("Błąd podczas tworzenia pojedynku:", error);
        Alert.alert("Błąd", "Nie udało się wysłać wyzwania.");
        return null;
    }
};

/**
 * Usuwa znajomego z tablicy
 */
export const removeFriend = async (friendId: string) => {
    const currentUser = auth().currentUser;
    if (!currentUser) return;

    try {
        await firestore().collection('users').doc(currentUser.uid).update({
            friends: firestore.FieldValue.arrayRemove(friendId)
        });
    } catch (error) {
        console.error("Błąd usuwania:", error);
    }
};