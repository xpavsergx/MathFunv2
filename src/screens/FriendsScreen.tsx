// src/screens/FriendsScreen.tsx

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { sendFriendRequest } from '../services/friendService';
import { FriendsStackParamList } from '../App';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

interface Friend {
    id: string;
    email: string;
}

type FriendsScreenNavigationProp = NativeStackNavigationProp<FriendsStackParamList, 'Friends'>;

function FriendsScreen() {
    const [friends, setFriends] = useState<Friend[]>([]);
    const [loading, setLoading] = useState(true);
    const [friendEmail, setFriendEmail] = useState('');
    const [isSendingRequest, setIsSendingRequest] = useState(false);
    const currentUser = auth().currentUser;
    const navigation = useNavigation<FriendsScreenNavigationProp>();

    useEffect(() => {
        if (!currentUser) {
            setLoading(false);
            return;
        }
        const userRef = firestore().collection('users').doc(currentUser.uid);

        const unsubscribe = userRef.onSnapshot(async documentSnapshot => {
            const userData = documentSnapshot.data();
            const friendIds = userData?.friends || [];

            if (friendIds.length > 0) {
                const friendsPromises = friendIds.map((id: string) =>
                    firestore().collection('users').doc(id).get()
                );
                const friendsDocs = await Promise.all(friendsPromises);
                const friendsData = friendsDocs
                    .filter(doc => doc.exists)
                    .map(doc => ({
                        id: doc.id,
                        email: doc.data()?.email,
                    }));
                setFriends(friendsData);
            } else {
                setFriends([]);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [currentUser]);

    const handleAddFriend = async () => {
        if (!friendEmail.trim()) {
            Alert.alert("Błąd", "Proszę wpisać adres email znajomego.");
            return;
        }
        setIsSendingRequest(true);
        await sendFriendRequest(friendEmail.trim().toLowerCase());
        setFriendEmail('');
        setIsSendingRequest(false);
    };

    const handleChallengeFriend = (friend: Friend) => {
        navigation.navigate('DuelSetup', { friendId: friend.id, friendEmail: friend.email });
    };

    const renderFriendItem = ({ item }: { item: Friend }) => (
        <View style={styles.friendCard}>
            <Ionicons name="person-circle-outline" size={40} color="#00796B" style={styles.friendIcon} />
            <Text style={styles.friendEmail}>{item.email}</Text>
            <TouchableOpacity style={styles.challengeButton} onPress={() => handleChallengeFriend(item)}>
                <Ionicons name="flash-outline" size={24} color="#fff" />
            </TouchableOpacity>
        </View>
    );

    const ListHeader = () => (
        <View style={styles.addFriendContainer}>
            <Text style={styles.sectionTitle}>Dodaj znajomego</Text>
            <TextInput
                style={styles.input}
                placeholder="Wpisz email znajomego..."
                value={friendEmail}
                onChangeText={setFriendEmail}
                keyboardType="email-address"
                autoCapitalize="none"
            />
            <TouchableOpacity style={[styles.sendButton, isSendingRequest && styles.disabledButton]} onPress={handleAddFriend} disabled={isSendingRequest}>
                <Text style={styles.sendButtonText}>Wyślij zaproszenie</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <FlatList
                data={friends}
                renderItem={renderFriendItem}
                keyExtractor={item => item.id}
                ListHeaderComponent={
                    <>
                        <ListHeader />
                        <Text style={styles.sectionTitle}>Twoi znajomi</Text>
                    </>
                }
                ListEmptyComponent={
                    !loading ? <Text style={styles.emptyText}>Nie masz jeszcze znajomych.</Text> : null
                }
                ListFooterComponent={
                    loading ? <ActivityIndicator size="large" color="#00BCD4" style={{ marginTop: 20 }}/> : null
                }
                contentContainerStyle={{ flexGrow: 1 }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0f4f8' },
    addFriendContainer: { padding: 15, backgroundColor: '#fff', marginBottom: 10 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, paddingHorizontal: 15, paddingTop: 10, color: '#333' },
    input: { borderWidth: 1, borderColor: '#ccc', padding: 10, borderRadius: 8, marginBottom: 10, backgroundColor: '#fafafa' },
    sendButton: { backgroundColor: '#00BCD4', padding: 12, borderRadius: 8, alignItems: 'center' },
    sendButtonText: { color: 'white', fontWeight: 'bold' },
    disabledButton: { backgroundColor: '#aaa' },
    friendCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 10, marginHorizontal: 15, marginVertical: 5, borderRadius: 8, elevation: 1, justifyContent: 'space-between' },
    friendIcon: { marginRight: 10 },
    friendEmail: { fontSize: 16, color: '#333', flex: 1 },
    challengeButton: { backgroundColor: '#FF9800', padding: 8, borderRadius: 20, marginLeft: 10 },
    emptyText: { textAlign: 'center', marginTop: 30, fontSize: 16, color: '#888' },
});

export default FriendsScreen;
