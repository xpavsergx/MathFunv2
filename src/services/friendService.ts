// src/services/friendService.ts

import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { Alert } from 'react-native';
import { createNotification } from './notificationService';
import questionsDatabase from '../data/questionsDb.json';

export const sendFriendRequest = async (friendNickname: string) => {
    const currentUser = auth().currentUser;
    if (!currentUser || !currentUser.displayName) {
        Alert.alert("Błąd", "Wystąpił błąd z Twoim kontem. Spróbuj zalogować się ponownie.");
        return;
    }

    if (currentUser.displayName.toLowerCase() === friendNickname.toLowerCase()) {
        Alert.alert("Błąd", "Nie możesz dodać samego siebie do znajomych.");
        return;
    }

    try {
        const usersRef = firestore().collection('users');
        const querySnapshot = await usersRef.where('nickname', '==', friendNickname).limit(1).get();

        if (querySnapshot.empty) {
            Alert.alert("Nie znaleziono", `Użytkownik o nicku ${friendNickname} nie został znaleziony.`);
            return;
        }

        const friendDoc = querySnapshot.docs[0];
        const friendId = friendDoc.id;

        const currentUserDoc = await usersRef.doc(currentUser.uid).get();
        if (currentUserDoc.data()?.friends?.includes(friendId)) {
            Alert.alert("Informacja", "Ten użytkownik jest już na Twojej liście znajomych.");
            return;
        }

        await createNotification(friendId, {
            type: 'friend_request',
            title: 'Nowe zaproszenie do znajomych!',
            body: `Użytkownik ${currentUser.displayName} chce Cię dodać do znajomych.`,
            icon: 'person-add-outline',
            fromUserId: currentUser.uid,
            fromUserNickname: currentUser.displayName,
        });

        Alert.alert("Wysłano!", `Wysłano zaproszenie do znajomych do ${friendNickname}.`);
    } catch (error) {
        console.error("Error sending friend request:", error);
        Alert.alert("Błąd", "Wystąpił problem podczas wysyłania zaproszenia.");
    }
};

export const acceptFriendRequest = async (friendId: string, fromUserNickname: string, notificationId: string) => {
    const currentUser = auth().currentUser;
    if (!currentUser || !currentUser.displayName) return;

    const currentUserRef = firestore().collection('users').doc(currentUser.uid);
    const friendRef = firestore().collection('users').doc(friendId);

    try {
        const batch = firestore().batch();
        batch.update(currentUserRef, { friends: firestore.FieldValue.arrayUnion(friendId) });
        batch.update(friendRef, { friends: firestore.FieldValue.arrayUnion(currentUser.uid) });
        batch.delete(currentUserRef.collection('notifications').doc(notificationId));
        await batch.commit();

        await createNotification(friendId, {
            type: 'friend_accepted',
            title: 'Zaproszenie przyjęte',
            body: `${currentUser.displayName} przyjął/przyjęła Twoje zaproszenie.`,
            icon: 'checkmark-done-outline'
        });

        Alert.alert("Sukces", `Dodałeś ${fromUserNickname} do znajomych!`);
    } catch (error) {
        console.error("Error accepting friend request:", error);
        Alert.alert("Błąd", "Nie udało się zaakceptować zaproszenia.");
    }
};

export const rejectFriendRequest = async (notificationId: string) => {
    const currentUser = auth().currentUser;
    if (!currentUser) return;
    try {
        await firestore().collection('users').doc(currentUser.uid).collection('notifications').doc(notificationId).delete();
    } catch (error) {
        console.error("Error rejecting friend request:", error);
    }
};

export const sendDuelRequest = async (friendId: string, grade: number, topic: string) => {
    const currentUser = auth().currentUser;
    if (!currentUser || !currentUser.displayName) return;

    try {
        const gradeData = (questionsDatabase as any)[String(grade)];
        if (!gradeData || !gradeData[topic]) {
            throw new Error("Invalid grade or topic provided for duel.");
        }

        const allQuestions = Object.values(gradeData[topic])
            .flatMap((subTopic: any) => subTopic.questions || []);

        if (allQuestions.length < 5) {
            Alert.alert("Błąd", "W tym temacie jest za mało pytań, aby stworzyć pojedynek (wymagane 5).");
            return;
        }

        const duelQuestions = allQuestions.sort(() => 0.5 - Math.random()).slice(0, 5);
        const questionIds = duelQuestions.map(q => q.id);

        const duelRef = await firestore().collection('duels').add({
            status: 'pending',
            players: [currentUser.uid, friendId],
            challengerId: currentUser.uid,
            challengerNickname: currentUser.displayName,
            topic: topic,
            grade: grade,
            questionIds: questionIds,
            results: {
                [currentUser.uid]: { score: null, time: null, nickname: currentUser.displayName },
                [friendId]: { score: null, time: null },
            },
            createdAt: firestore.FieldValue.serverTimestamp(),
        });

        // Додаємо в сповіщення всю необхідну інформацію для старту тесту
        await createNotification(friendId, {
            type: 'duel_request',
            title: 'Wyzwanie na pojedynek!',
            body: `${currentUser.displayName} rzuca Ci wyzwanie z tematu: ${topic}.`,
            icon: 'flame-outline',
            duelId: duelRef.id,
            grade: grade,
            topic: topic,
        });

        Alert.alert("Wysłano wyzwanie!", `Zaproszenie do pojedynku zostało wysłane.`);

    } catch (error) {
        console.error("Error sending duel request:", error);
        Alert.alert("Błąd", "Nie udało się wysłać wyzwania.");
    }
};
