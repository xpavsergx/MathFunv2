// src/screens/FriendsScreen.tsx

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TextInput,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { sendFriendRequest } from '../services/friendService';
import { FriendsStackParamList } from '../../App';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

interface Friend {
    id: string;
    email: string;
    nickname: string;
}

type FriendsScreenNavigationProp = NativeStackNavigationProp<FriendsStackParamList, 'Friends'>;

// Компонент для додавання друга. Винесений назовні для стабільності.
const AddFriendSection = ({ friendInput, setFriendInput, onAddFriend, isSendingRequest }) => {
    return (
        <View style={styles.addFriendContainer}>
            <Text style={styles.sectionTitle}>Dodaj znajomego</Text>
            <TextInput
                style={styles.input}
                placeholder="Wpisz imię znajomego..."
                value={friendInput}
                onChangeText={setFriendInput}
                autoCapitalize="none"
                autoCorrect={false}
            />
            <TouchableOpacity
                style={[styles.sendButton, isSendingRequest && styles.disabledButton]}
                onPress={onAddFriend}
                disabled={isSendingRequest}
            >
                {isSendingRequest
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.sendButtonText}>Wyślij zaproszenie</Text>
                }
            </TouchableOpacity>
        </View>
    );
};

function FriendsScreen() {
    const [friends, setFriends] = useState<Friend[]>([]);
    const [loading, setLoading] = useState(true);
    const [friendInput, setFriendInput] = useState('');
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
                        nickname: doc.data()?.nickname || doc.data()?.email,
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
        if (!friendInput.trim()) {
            Alert.alert("Błąd", "Proszę wpisać nick znajomego.");
            return;
        }
        setIsSendingRequest(true);
        await sendFriendRequest(friendInput.trim());
        setFriendInput('');
        setIsSendingRequest(false);
    };

    const handleChallengeFriend = (friend: Friend) => {
        navigation.navigate('DuelSetup', { friendId: friend.id, friendEmail: friend.nickname });
    };

    const renderFriendItem = ({ item }: { item: Friend }) => (
        <View style={styles.friendCard}>
            <Ionicons name="person-circle-outline" size={40} color="#00796B" style={styles.friendIcon} />
            <Text style={styles.friendEmail}>{item.nickname}</Text>
            <TouchableOpacity style={styles.challengeButton} onPress={() => handleChallengeFriend(item)}>
                <Ionicons name="flash-outline" size={24} color="#fff" />
            </TouchableOpacity>
        </View>
    );

    return (
        // Використовуємо KeyboardAvoidingView для кращої роботи клавіатури на iOS
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            <View style={styles.container}>
                {/* --- КЛЮЧОВА ЗМІНА: РЕНДЕРИМО ФОРМУ ПОЗА СПИСКОМ --- */}
                <AddFriendSection
                    friendInput={friendInput}
                    setFriendInput={setFriendInput}
                    onAddFriend={handleAddFriend}
                    isSendingRequest={isSendingRequest}
                />

                <Text style={styles.sectionTitle}>Twoi znajomi</Text>

                {loading ? (
                    <ActivityIndicator size="large" color="#00BCD4" style={{ marginTop: 20 }}/>
                ) : (
                    <FlatList
                        data={friends}
                        renderItem={renderFriendItem}
                        keyExtractor={item => item.id}
                        ListEmptyComponent={<Text style={styles.emptyText}>Nie masz jeszcze znajomych.</Text>}
                        style={{ width: '100%' }} // Додаємо ширину для FlatList
                    />
                )}
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0f4f8' },
    addFriendContainer: { padding: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, paddingHorizontal: 15, paddingTop: 10, color: '#333' },
    input: { height: 45, borderWidth: 1, borderColor: '#ccc', padding: 10, borderRadius: 8, marginBottom: 10, backgroundColor: '#fafafa', fontSize: 16 },
    sendButton: { backgroundColor: '#00BCD4', padding: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center', minHeight: 48 },
    sendButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    disabledButton: { backgroundColor: '#aaa' },
    friendCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, marginHorizontal: 15, marginVertical: 5, borderRadius: 10, elevation: 2, justifyContent: 'space-between' },
    friendIcon: { marginRight: 15 },
    friendEmail: { fontSize: 16, color: '#333', flex: 1, fontWeight: '500' },
    challengeButton: { backgroundColor: '#FF9800', padding: 8, borderRadius: 20, marginLeft: 10 },
    emptyText: { textAlign: 'center', marginTop: 30, fontSize: 16, color: '#888' },
});

export default FriendsScreen;
