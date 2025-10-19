// src/services/friendService.ts

import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { Alert } from 'react-native';
import { createNotification } from './notificationService';
import questionsDatabase from '../data/questionsDb.json';

// --- FUNKCJA POPRAWIONA ---
// Wcześniej: szukała 'nickname' i używała 'displayName'
// Teraz: szuka 'firstName' i pobiera 'firstName' aktualnego użytkownika z Firestore
export const sendFriendRequest = async (friendName: string) => {
    const currentUser = auth().currentUser;
    if (!currentUser) {
        Alert.alert("Błąd", "Nie jesteś zalogowany.");
        return;
    }

    const usersRef = firestore().collection('users');

    try {
        // 1. Pobieramy dane aktualnego użytkownika z Firestore, aby dostać 'firstName'
        const currentUserDoc = await usersRef.doc(currentUser.uid).get();
        if (!currentUserDoc.exists) {
            Alert.alert("Błąd", "Wystąpił błąd z Twoim kontem. Spróbuj zalogować się ponownie.");
            return;
        }

        const currentUserData = currentUserDoc.data();
        const currentUserFirstName = currentUserData?.firstName; // Używamy pola firstName

        if (!currentUserFirstName) {
            Alert.alert("Błąd", "Twoje konto nie ma ustawionego imienia.");
            return;
        }

        // 2. Sprawdzamy, czy użytkownik nie dodaje samego siebie
        if (currentUserFirstName.toLowerCase() === friendName.toLowerCase()) {
            Alert.alert("Błąd", "Nie możesz dodać samego siebie do znajomych.");
            return;
        }

        // 3. Szukamy znajomego po `firstName` zamiast `nickname`
        const querySnapshot = await usersRef.where('firstName', '==', friendName).limit(1).get();

        if (querySnapshot.empty) {
            Alert.alert("Nie znaleziono", `Użytkownik o imieniu ${friendName} nie został znaleziony.`);
            return;
        }

        const friendDoc = querySnapshot.docs[0];
        const friendId = friendDoc.id;

        // 4. Sprawdzamy, czy już nie są znajomymi
        if (currentUserData?.friends?.includes(friendId)) {
            Alert.alert("Informacja", "Ten użytkownik jest już na Twojej liście znajomych.");
            return;
        }

        // 5. Wysyłamy powiadomienie używając `currentUserFirstName`
        await createNotification(friendId, {
            type: 'friend_request',
            title: 'Nowe zaproszenie do znajomych!',
            body: `Użytkownik ${currentUserFirstName} chce Cię dodać do znajomych.`,
            icon: 'person-add-outline',
            fromUserId: currentUser.uid,
            fromUserNickname: currentUserFirstName, // Przekazujemy imię jako "nick"
        });

        Alert.alert("Wysłano!", `Wysłano zaproszenie do znajomych do ${friendName}.`);
    } catch (error) {
        console.error("Error sending friend request:", error);
        Alert.alert("Błąd", "Wystąpił problem podczas wysyłania zaproszenia.");
    }
};

// --- FUNKCJA POPRAWIONA ---
// Wcześniej: wysyłała powiadomienie zwrotne z 'displayName'
// Teraz: pobiera 'firstName' aktualnego użytkownika i używa go w powiadomieniu
export const acceptFriendRequest = async (friendId: string, fromUserNickname: string, notificationId: string) => {
    const currentUser = auth().currentUser;
    if (!currentUser) return;

    const currentUserRef = firestore().collection('users').doc(currentUser.uid);
    const friendRef = firestore().collection('users').doc(friendId);

    try {
        // 1. Pobieramy imię aktualnego użytkownika (tego, który akceptuje)
        const currentUserDoc = await currentUserRef.get();
        if (!currentUserDoc.exists) {
            Alert.alert("Błąd", "Nie można znaleźć Twoich danych.");
            return;
        }
        const currentUserFirstName = currentUserDoc.data()?.firstName;
        if (!currentUserFirstName) {
            Alert.alert("Błąd", "Twoje konto nie ma ustawionego imienia.");
            return;
        }

        // 2. Dodajemy się nawzajem do znajomych i usuwamy powiadomienie
        const batch = firestore().batch();
        batch.update(currentUserRef, { friends: firestore.FieldValue.arrayUnion(friendId) });
        batch.update(friendRef, { friends: firestore.FieldValue.arrayUnion(currentUser.uid) });
        batch.delete(currentUserRef.collection('notifications').doc(notificationId));
        await batch.commit();

        // 3. Wysyłamy powiadomienie zwrotne z poprawnym imieniem
        await createNotification(friendId, {
            type: 'friend_accepted',
            title: 'Zaproszenie przyjęte',
            body: `${currentUserFirstName} przyjął/przyjęła Twoje zaproszenie.`, // <-- ZMIANA
            icon: 'checkmark-done-outline'
        });

        Alert.alert("Sukces", `Dodałeś ${fromUserNickname} do znajomych!`);
    } catch (error) {
        console.error("Error accepting friend request:", error);
        Alert.alert("Błąd", "Nie udało się zaakceptować zaproszenia.");
    }
};

// --- TA FUNKCJA BYŁA POPRAWNA ---
// Nie używa żadnych nazw użytkowników, więc nie wymagała zmian.
export const rejectFriendRequest = async (notificationId: string) => {
    const currentUser = auth().currentUser;
    if (!currentUser) return;
    try {
        await firestore().collection('users').doc(currentUser.uid).collection('notifications').doc(notificationId).delete();
    } catch (error) {
        console.error("Error rejecting friend request:", error);
    }
};

// --- FUNKCJA POPRAWIONA ---
// Wcześniej: używała 'displayName' i nie zapisywała imienia przeciwnika w 'results'
// Teraz: pobiera 'firstName' obu graczy i zapisuje je poprawnie w dokumencie 'duels'
export const sendDuelRequest = async (friendId: string, grade: number, topic: string) => {
    const currentUser = auth().currentUser;
    if (!currentUser) {
        Alert.alert("Błąd", "Nie jesteś zalogowany.");
        return;
    }

    try {
        const usersRef = firestore().collection('users');

        // 1. Pobieramy dane obu graczy z Firestore
        const currentUserDoc = await usersRef.doc(currentUser.uid).get();
        const friendDoc = await usersRef.doc(friendId).get();

        if (!currentUserDoc.exists || !friendDoc.exists) {
            Alert.alert("Błąd", "Nie można znaleźć danych użytkownika lub znajomego.");
            return;
        }

        const currentUserData = currentUserDoc.data();
        const friendData = friendDoc.data();

        const currentUserFirstName = currentUserData?.firstName;
        const friendFirstName = friendData?.firstName;

        if (!currentUserFirstName || !friendFirstName) {
            Alert.alert("Błąd", "Brak imion użytkowników, nie można rozpocząć pojedynku.");
            return;
        }

        // 2. Logika pobierania pytań (bez zmian)
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

        // 3. Tworzymy dokument 'duel' z poprawnymi imionami
        const duelRef = await firestore().collection('duels').add({
            status: 'pending',
            players: [currentUser.uid, friendId],
            challengerId: currentUser.uid,
            challengerNickname: currentUserFirstName, // <-- ZMIANA
            topic: topic,
            grade: grade,
            questionIds: questionIds,
            results: {
                [currentUser.uid]: { score: null, time: null, nickname: currentUserFirstName }, // <-- ZMIANA
                [friendId]: { score: null, time: null, nickname: friendFirstName }, // <-- ZMIANA (dodano imię)
            },
            createdAt: firestore.FieldValue.serverTimestamp(),
        });

        // 4. Wysyłamy powiadomienie z poprawnym imieniem
        await createNotification(friendId, {
            type: 'duel_request',
            title: 'Wyzwanie na pojedynek!',
            body: `${currentUserFirstName} rzuca Ci wyzwanie z tematu: ${topic}.`, // <-- ZMIANA
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