// src/services/friendService.ts

import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { Alert } from 'react-native';
import { createNotification } from './notificationService';
import questionsDatabase from '../data/questionsDb.json';

// (sendFriendRequest - без змін, вже обробляє дублікати)
export const sendFriendRequest = async (friendName: string) => {
    const currentUser = auth().currentUser;
    if (!currentUser) {
        Alert.alert("Błąd", "Nie jesteś zalogowany.");
        return;
    }
    const usersRef = firestore().collection('users');
    try {
        const currentUserDoc = await usersRef.doc(currentUser.uid).get();
        if (!currentUserDoc.exists) {
            Alert.alert("Błąd", "Wystąpił błąd z Twoim kontem.");
            return;
        }
        const currentUserData = currentUserDoc.data();
        const currentUserFirstName = currentUserData?.firstName;
        if (!currentUserFirstName) {
            Alert.alert("Błąd", "Twoje konto nie ma ustawionego imienia.");
            return;
        }
        if (currentUserFirstName.toLowerCase() === friendName.toLowerCase()) {
            Alert.alert("Błąd", "Nie możesz dodać samego siebie do znajomych.");
            return;
        }
        const querySnapshot = await usersRef.where('firstName', '==', friendName).get();
        if (querySnapshot.empty) {
            Alert.alert("Nie znaleziono", `Użytkownik o imieniu ${friendName} nie został znaleziony.`);
            return;
        }
        if (querySnapshot.size > 1) {
            Alert.alert(
                "Znaleziono wielu graczy",
                `Znaleziono ${querySnapshot.size} użytkowników o imieniu ${friendName}.\n\nSpróbuj poprosić znajomego o jego unikalny nick lub e-mail.`
            );
            return;
        }
        const friendDoc = querySnapshot.docs[0];
        const friendId = friendDoc.id;
        if (currentUserData?.friends?.includes(friendId)) {
            Alert.alert("Informacja", "Ten użytkownik jest już na Twojej liście znajomych.");
            return;
        }
        await createNotification(friendId, {
            type: 'friend_request',
            title: 'Nowe zaproszenie do znajomych!',
            body: `Użytkownik ${currentUserFirstName} chce Cię dodać do znajomych.`,
            icon: 'person-add-outline',
            fromUserId: currentUser.uid,
            fromUserNickname: currentUserFirstName,
        });
        Alert.alert("Wysłano!", `Wysłano zaproszenie do znajomych do ${friendName}.`);
    } catch (error) {
        console.error("Error sending friend request:", error);
        Alert.alert("Błąd", "Wystąpił problem podczas wysyłania zaproszenia.");
    }
};

// (acceptFriendRequest - без змін)
export const acceptFriendRequest = async (friendId: string, fromUserNickname: string, notificationId: string) => {
    const currentUser = auth().currentUser;
    if (!currentUser) return;
    const currentUserRef = firestore().collection('users').doc(currentUser.uid);
    const friendRef = firestore().collection('users').doc(friendId);
    try {
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
        const batch = firestore().batch();
        batch.update(currentUserRef, { friends: firestore.FieldValue.arrayUnion(friendId) });
        batch.update(friendRef, { friends: firestore.FieldValue.arrayUnion(currentUser.uid) });
        batch.delete(currentUserRef.collection('notifications').doc(notificationId));
        await batch.commit();
        await createNotification(friendId, {
            type: 'friend_accepted',
            title: 'Zaproszenie przyjęte',
            body: `${currentUserFirstName} przyjął/przyjęła Twoje zaproszenie.`,
            icon: 'checkmark-done-outline'
        });
        Alert.alert("Sukces", `Dodałeś ${fromUserNickname} do znajomych!`);
    } catch (error) {
        console.error("Error accepting friend request:", error);
        Alert.alert("Błąd", "Nie udało się zaakceptować zaproszenia.");
    }
};

// (rejectFriendRequest - без змін)
export const rejectFriendRequest = async (notificationId: string) => {
    const currentUser = auth().currentUser;
    if (!currentUser) return;
    try {
        await firestore().collection('users').doc(currentUser.uid).collection('notifications').doc(notificationId).delete();
    } catch (error) {
        console.error("Error rejecting friend request:", error);
    }
};

// --- ✅ ОНОВЛЕНО: sendDuelRequest (повертає ID дуелі) ---
export const sendDuelRequest = async (friendId: string, grade: number, topic: string): Promise<string | null> => {
    const currentUser = auth().currentUser;
    if (!currentUser) {
        Alert.alert("Błąd", "Nie jesteś zalogowany.");
        return null; // Повертаємо null
    }
    try {
        const usersRef = firestore().collection('users');
        const currentUserDoc = await usersRef.doc(currentUser.uid).get();
        const friendDoc = await usersRef.doc(friendId).get();
        if (!currentUserDoc.exists || !friendDoc.exists) {
            Alert.alert("Błąd", "Nie można znaleźć danych użytkownika lub znajomego.");
            return null;
        }
        const currentUserData = currentUserDoc.data();
        const friendData = friendDoc.data();
        const currentUserFirstName = currentUserData?.firstName;
        const friendFirstName = friendData?.firstName;
        if (!currentUserFirstName || !friendFirstName) {
            Alert.alert("Błąd", "Brak imion użytkowników, nie można rozpocząć pojedynku.");
            return null;
        }
        const gradeData = (questionsDatabase as any)[String(grade)];
        if (!gradeData || !gradeData[topic]) {
            throw new Error("Invalid grade or topic provided for duel.");
        }
        const allQuestions = Object.values(gradeData[topic])
            .flatMap((subTopic: any) => subTopic.questions || []);
        if (allQuestions.length < 5) {
            Alert.alert("Błąd", "W tym temacie jest za mało pytań, aby stworzyć pojedynek (wymagane 5).");
            return null;
        }
        const duelQuestions = allQuestions.sort(() => 0.5 - Math.random()).slice(0, 5);
        const questionIds = duelQuestions.map(q => q.id);
        const duelRef = await firestore().collection('duels').add({
            status: 'pending',
            players: [currentUser.uid, friendId],
            challengerId: currentUser.uid,
            challengerNickname: currentUserFirstName,
            topic: topic,
            grade: grade,
            questionIds: questionIds,
            results: {
                [currentUser.uid]: { score: null, time: null, nickname: currentUserFirstName },
                [friendId]: { score: null, time: null, nickname: friendFirstName },
            },
            createdAt: firestore.FieldValue.serverTimestamp(),
        });
        await createNotification(friendId, {
            type: 'duel_request',
            title: 'Wyzwanie na pojedynek!',
            body: `${currentUserFirstName} rzuca Ci wyzwanie z tematu: ${topic}.`,
            icon: 'flame-outline',
            duelId: duelRef.id,
            grade: grade,
            topic: topic,
        });

        // Повертаємо ID дуелі
        return duelRef.id;

    } catch (error) {
        console.error("Error sending duel request:", error);
        Alert.alert("Błąd", "Nie udało się wysłać wyzwania.");
        return null;
    }
};

// --- ✅ НОВА ФУНКЦІЯ: rejectDuelRequest ---
export const rejectDuelRequest = async (notificationId: string, duelId: string, challengerId: string) => {
    const currentUser = auth().currentUser;
    if (!currentUser) return;

    const currentUserRef = firestore().collection('users').doc(currentUser.uid);
    const duelRef = firestore().collection('duels').doc(duelId);

    try {
        // Отримуємо ім'я поточного користувача для сповіщення про відхилення
        const currentUserDoc = await currentUserRef.get();
        const currentUserFirstName = currentUserDoc.data()?.firstName || 'Gracz';

        const batch = firestore().batch();

        // 1. Видаляємо дуель
        batch.delete(duelRef);
        // 2. Видаляємо сповіщення
        batch.delete(currentUserRef.collection('notifications').doc(notificationId));

        await batch.commit();

        // 3. (Опціонально) Надсилаємо сповіщення відправнику, що його виклик відхилено
        await createNotification(challengerId, {
            type: 'friend_accepted', // (Використовуємо загальний тип)
            title: 'Wyzwanie odrzucone',
            body: `${currentUserFirstName} odrzucił/a Twoje wyzwanie na pojedynek.`,
            icon: 'close-circle-outline'
        });

    } catch (error) {
        console.error("Error rejecting duel request:", error);
        Alert.alert("Błąd", "Nie udało się odrzucić wyzwania.");
    }
};
