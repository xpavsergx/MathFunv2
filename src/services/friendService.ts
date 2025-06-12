// src/services/friendService.ts

import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { Alert } from 'react-native';
import { createNotification } from './notificationService';
import questionsDatabase from '../data/questionsDb.json';

export const sendFriendRequest = async (friendEmail: string) => {
    const currentUser = auth().currentUser;
    if (!currentUser) {
        Alert.alert("Błąd", "Musisz być zalogowany, aby dodać znajomych.");
        return;
    }

    if (currentUser.email === friendEmail) {
        Alert.alert("Błąd", "Nie możesz dodać samego siebie do znajomych.");
        return;
    }

    try {
        const usersRef = firestore().collection('users');
        const querySnapshot = await usersRef.where('email', '==', friendEmail).limit(1).get();

        if (querySnapshot.empty) {
            Alert.alert("Nie znaleziono", `Użytkownik z adresem email ${friendEmail} nie został znaleziony.`);
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
            title: 'Nowe zaproszenie do znajomych',
            body: `Użytkownik ${currentUser.email} chce Cię dodać do znajomych.`,
            icon: 'person-add-outline',
            fromUserId: currentUser.uid,
            fromUserEmail: currentUser.email
        });

        Alert.alert("Wysłano!", `Wysłano zaproszenie do znajomych do ${friendEmail}.`);
    } catch (error) {
        console.error("Error sending friend request:", error);
        Alert.alert("Błąd", "Wystąpił problem podczas wysyłania zaproszenia.");
    }
};

export const acceptFriendRequest = async (friendId: string, friendEmail: string, notificationId: string) => {
    const currentUser = auth().currentUser;
    if (!currentUser) return;

    console.log(`[Friends] ${currentUser.uid} accepts request from ${friendId}`);

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
            body: `${currentUser.email} przyjął/przyjęła Twoje zaproszenie do znajomych.`,
            icon: 'checkmark-done-outline'
        });

        Alert.alert("Sukces", `Dodałeś ${friendEmail} do znajomych!`);
    } catch (error) {
        console.error("Error accepting friend request:", error);
        Alert.alert("Błąd", "Nie udało się zaakceptować zaproszenia.");
    }
};

export const rejectFriendRequest = async (notificationId: string) => {
    const currentUser = auth().currentUser;
    if (!currentUser) return;

    console.log(`[Friends] ${currentUser.uid} rejects notification ${notificationId}`);

    try {
        await firestore().collection('users').doc(currentUser.uid).collection('notifications').doc(notificationId).delete();
    } catch (error) {
        console.error("Error rejecting friend request:", error);
    }
};

export const sendDuelRequest = async (friendId: string, grade: number, topic: string) => {
    const currentUser = auth().currentUser;
    if (!currentUser) return;

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
            topic: topic,
            grade: grade,
            questionIds: questionIds,
            results: {
                [currentUser.uid]: { score: null, time: null },
                [friendId]: { score: null, time: null },
            },
            createdAt: firestore.FieldValue.serverTimestamp(),
        });

        await createNotification(friendId, {
            type: 'duel_request',
            title: 'Wyzwanie na pojedynek!',
            body: `${currentUser.email} rzuca Ci wyzwanie na pojedynek z tematu: ${topic}.`,
            icon: 'flame-outline',
            duelId: duelRef.id
        });

    } catch (error) {
        console.error("Error sending duel request:", error);
        Alert.alert("Błąd", "Nie udało się wysłać wyzwania.");
    }
};
