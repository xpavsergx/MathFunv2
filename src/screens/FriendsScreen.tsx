// src/screens/FriendsScreen.tsx

import React, { useState, useEffect, useMemo } from 'react';
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
    Platform,
    Image,
    useColorScheme
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import Ionicons from '@expo/vector-icons/Ionicons'; // (Виправлений імпорт для Expo)
import { useNavigation } from '@react-navigation/native';
// --- ✅ 1. ІМПОРТУЄМО sendFriendRequest з ОНОВЛЕНОГО ФАЙЛУ ---
import { sendFriendRequest } from '../services/friendService'; // (Ти надав цей файл)
import { FriendsStackParamList } from '../../App';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getAvatarImage } from '../utils/avatarUtils';
import { COLORS, FONT_SIZES, PADDING, MARGIN } from '../styles/theme';

// (Інтерфейс Friend - без змін)
interface Friend {
    id: string;
    email: string; // Залишаємо email для внутрішньої логіки (якщо потрібен)
    nickname: string; // Це поле ми будемо показувати
    avatar?: string;
    level: number;
    xp: number;
}

type FriendsScreenNavigationProp = NativeStackNavigationProp<FriendsStackParamList, 'Friends'>;
type TabType = 'friends' | 'ranking';

// (Компонент AddFriendSection - без змін)
const AddFriendSection = ({ friendInput, setFriendInput, onAddFriend, isSendingRequest, themeStyles }) => {
    return (
        <View style={[styles.addFriendContainer, themeStyles.card]}>
            <Text style={[styles.sectionTitle, themeStyles.text]}>Dodaj znajomego</Text>
            <TextInput
                style={[styles.input, themeStyles.input]}
                placeholder="Wpisz imię znajomego..." // <-- Тепер шукаємо за іменем
                placeholderTextColor={themeStyles.placeholder.color}
                value={friendInput}
                onChangeText={setFriendInput}
                autoCapitalize="none"
                autoCorrect={false}
            />
            <TouchableOpacity
                style={[styles.sendButton, isSendingRequest && styles.disabledButton, themeStyles.button]}
                onPress={onAddFriend}
                disabled={isSendingRequest}
            >
                {isSendingRequest
                    ? <ActivityIndicator color={themeStyles.buttonText.color} />
                    : <Text style={[styles.sendButtonText, themeStyles.buttonText]}>Wyślij zaproszenie</Text>
                }
            </TouchableOpacity>
        </View>
    );
};

function FriendsScreen() {
    // (Всі стани та хуки - без змін)
    const [friends, setFriends] = useState<Friend[]>([]);
    const [currentUserData, setCurrentUserData] = useState<Friend | null>(null);
    const [loading, setLoading] = useState(true);
    const [friendInput, setFriendInput] = useState('');
    const [isSendingRequest, setIsSendingRequest] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>('friends');

    const currentUser = auth().currentUser;
    const navigation = useNavigation<FriendsScreenNavigationProp>();

    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';

    // (themeStyles - без змін)
    const themeStyles = {
        container: { backgroundColor: isDarkMode ? COLORS.backgroundDark : '#F0F4F8' },
        card: { backgroundColor: isDarkMode ? COLORS.cardDark : COLORS.white },
        text: { color: isDarkMode ? COLORS.textDark : COLORS.textLight },
        placeholder: { color: isDarkMode ? COLORS.greyDarkTheme : COLORS.grey },
        input: {
            backgroundColor: isDarkMode ? '#1E1E1E' : '#fafafa',
            color: isDarkMode ? COLORS.textDark : '#333',
            borderColor: isDarkMode ? '#444' : '#ccc',
        },
        button: { backgroundColor: COLORS.primary },
        buttonText: { color: COLORS.white },
        tabButton: {
            backgroundColor: isDarkMode ? COLORS.cardDark : COLORS.white,
            borderColor: isDarkMode ? '#444' : '#E0E0E0',
        },
        tabButtonActive: {
            backgroundColor: isDarkMode ? COLORS.primaryDarkTheme : COLORS.primary,
        },
        tabText: { color: isDarkMode ? COLORS.greyDarkTheme : COLORS.grey },
        tabTextActive: { color: COLORS.white },
        friendCard: {
            backgroundColor: isDarkMode ? COLORS.cardDark : COLORS.white,
            borderColor: isDarkMode ? '#333' : '#E0E0E0'
        },
        friendName: { color: isDarkMode ? COLORS.textDark : '#333' },
    };

    // --- ✅ 2. ОНОВЛЕНИЙ useEffect (використовує 'firstName' та 'nickname') ---
    useEffect(() => {
        if (!currentUser) {
            setLoading(false);
            return;
        }
        const userRef = firestore().collection('users').doc(currentUser.uid);

        const unsubscribe = userRef.onSnapshot(async (documentSnapshot) => {
            const userData = documentSnapshot.data();
            const friendIds = userData?.friends || [];

            // 1. Завантажуємо дані поточного користувача (для рейтингу)
            setCurrentUserData({
                id: currentUser.uid,
                email: userData?.email || '',
                // Використовуємо firstName як nickname
                nickname: userData?.firstName || userData?.email || 'Ty',
                avatar: userData?.avatar,
                level: userData?.level || 1,
                xp: userData?.xp || 0,
            });

            // 2. Завантажуємо повні дані друзів
            if (friendIds.length > 0) {
                const friendsPromises = friendIds.map((id: string) =>
                    firestore().collection('users').doc(id).get()
                );
                const friendsDocs = await Promise.all(friendsPromises);
                const friendsData = friendsDocs
                    .filter(doc => doc.exists)
                    .map(doc => {
                        const data = doc.data();
                        return {
                            id: doc.id,
                            email: data?.email || '',
                            // Використовуємо firstName, якщо nickname немає
                            nickname: data?.firstName || data?.nickname || data?.email,
                            avatar: data?.avatar,
                            level: data?.level || 1,
                            xp: data?.xp || 0,
                        };
                    });
                setFriends(friendsData);
            } else {
                setFriends([]);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [currentUser]);

    // (useMemo rankingList - без змін)
    const rankingList = useMemo(() => {
        if (!currentUserData) return [];
        const allPlayers = [...friends, currentUserData];
        return allPlayers.sort((a, b) => {
            if (a.level !== b.level) {
                return b.level - a.level;
            }
            return b.xp - a.xp;
        });
    }, [friends, currentUserData]);

    // --- ✅ 3. ОНОВЛЕНИЙ handleAddFriend (використовує friendService, який ти надав) ---
    const handleAddFriend = async () => {
        const friendName = friendInput.trim(); // Використовуємо friendName
        if (!friendName) {
            Alert.alert("Błąd", "Proszę wpisać imię znajomego."); // Повідомлення про "imię"
            return;
        }
        setIsSendingRequest(true);
        // Викликаємо оновлену функцію з friendService
        await sendFriendRequest(friendName);
        setFriendInput('');
        setIsSendingRequest(false);
    };

    const handleChallengeFriend = (friend: Friend) => {
        // Передаємо nickname (який тепер є firstName)
        navigation.navigate('DuelSetup', { friendId: friend.id, friendEmail: friend.nickname });
    };

    // --- ✅ 4. ОНОВЛЕНИЙ renderFriendItem (показує 'nickname') ---
    const renderFriendItem = ({ item }: { item: Friend }) => (
        <View style={[styles.friendCard, themeStyles.friendCard]}>
            <Image source={getAvatarImage(item.avatar)} style={styles.friendAvatar} />
            <View style={styles.friendInfo}>
                {/* --- Отут була зміна: item.email -> item.nickname --- */}
                <Text style={[styles.friendName, themeStyles.friendName]}>{item.nickname}</Text>
                <Text style={styles.friendLevel}>Poziom {item.level}</Text>
            </View>
            <TouchableOpacity style={styles.challengeButton} onPress={() => handleChallengeFriend(item)}>
                <Ionicons name="flash-outline" size={24} color="#fff" />
            </TouchableOpacity>
        </View>
    );

    // --- ✅ 5. ОНОВЛЕНИЙ renderRankingItem (показує 'nickname') ---
    const renderRankingItem = ({ item, index }: { item: Friend; index: number }) => {
        const isCurrentUser = item.id === currentUser?.uid;
        return (
            <View style={[
                styles.friendCard,
                themeStyles.friendCard,
                isCurrentUser && styles.rankingCurrentUser
            ]}>
                <Text style={[styles.rankingPosition, themeStyles.text]}>{index + 1}</Text>
                <Image source={getAvatarImage(item.avatar)} style={styles.friendAvatar} />
                <View style={styles.friendInfo}>
                    {/* --- Тут теж: item.email -> item.nickname --- */}
                    <Text style={[styles.friendName, themeStyles.friendName]}>{item.nickname} {isCurrentUser ? "(Ty)" : ""}</Text>
                    <Text style={styles.friendLevel}>Poziom {item.level} (XP: {item.xp})</Text>
                </View>
            </View>
        );
    };

    // (JSX - без змін)
    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            <View style={[styles.container, themeStyles.container]}>

                <AddFriendSection
                    friendInput={friendInput}
                    setFriendInput={setFriendInput}
                    onAddFriend={handleAddFriend}
                    isSendingRequest={isSendingRequest}
                    themeStyles={themeStyles}
                />

                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[
                            styles.tabButton,
                            styles.tabLeft,
                            themeStyles.tabButton,
                            activeTab === 'friends' && themeStyles.tabButtonActive
                        ]}
                        onPress={() => setActiveTab('friends')}
                    >
                        <Text style={[styles.tabText, themeStyles.tabText, activeTab === 'friends' && themeStyles.tabTextActive]}>
                            Znajomi
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.tabButton,
                            styles.tabRight,
                            themeStyles.tabButton,
                            activeTab === 'ranking' && themeStyles.tabButtonActive
                        ]}
                        onPress={() => setActiveTab('ranking')}
                    >
                        <Text style={[styles.tabText, themeStyles.tabText, activeTab === 'ranking' && themeStyles.tabTextActive]}>
                            Ranking
                        </Text>
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }}/>
                ) : (
                    <>
                        {activeTab === 'friends' && (
                            <FlatList
                                data={friends}
                                renderItem={renderFriendItem}
                                keyExtractor={item => item.id}
                                ListEmptyComponent={<Text style={[styles.emptyText, themeStyles.text]}>Nie masz jeszcze znajomych.</Text>}
                                style={styles.listStyle}
                            />
                        )}
                        {activeTab === 'ranking' && (
                            <FlatList
                                data={rankingList}
                                renderItem={renderRankingItem}
                                keyExtractor={item => item.id}
                                ListEmptyComponent={<Text style={[styles.emptyText, themeStyles.text]}>Brak danych do rankingu.</Text>}
                                style={styles.listStyle}
                            />
                        )}
                    </>
                )}
            </View>
        </KeyboardAvoidingView>
    );
}

// (Стилі - без змін)
const styles = StyleSheet.create({
    container: { flex: 1 },
    addFriendContainer: {
        padding: PADDING.medium,
        borderBottomWidth: 1,
    },
    sectionTitle: {
        fontSize: FONT_SIZES.large,
        fontWeight: 'bold',
        marginBottom: MARGIN.medium,
    },
    input: {
        height: 50,
        borderWidth: 1,
        paddingHorizontal: PADDING.medium,
        paddingVertical: 10,
        borderRadius: 8,
        marginBottom: MARGIN.medium,
        fontSize: FONT_SIZES.medium,
    },
    sendButton: {
        padding: PADDING.medium - 2,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 48,
    },
    sendButtonText: {
        fontWeight: 'bold',
        fontSize: FONT_SIZES.medium,
    },
    disabledButton: {
        backgroundColor: COLORS.grey,
    },
    listStyle: {
        width: '100%',
        paddingHorizontal: PADDING.medium,
    },
    friendCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: PADDING.medium,
        marginVertical: MARGIN.small / 2,
        borderRadius: 10,
        elevation: 2,
        borderWidth: 1,
    },
    friendAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: MARGIN.medium,
    },
    friendInfo: {
        flex: 1,
    },
    friendName: {
        fontSize: FONT_SIZES.medium,
        fontWeight: '500',
    },
    friendLevel: {
        fontSize: FONT_SIZES.small,
        color: COLORS.grey,
    },
    challengeButton: {
        backgroundColor: COLORS.accent,
        padding: PADDING.small,
        borderRadius: 20,
        marginLeft: MARGIN.small,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 30,
        fontSize: FONT_SIZES.medium,
    },
    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: PADDING.medium,
        marginVertical: MARGIN.medium,
    },
    tabButton: {
        flex: 1,
        paddingVertical: PADDING.medium - 2,
        alignItems: 'center',
        borderWidth: 1,
    },
    tabLeft: {
        borderTopLeftRadius: 8,
        borderBottomLeftRadius: 8,
    },
    tabRight: {
        borderTopRightRadius: 8,
        borderBottomRightRadius: 8,
    },
    tabText: {
        fontSize: FONT_SIZES.medium,
        fontWeight: '600',
    },
    rankingPosition: {
        fontSize: FONT_SIZES.medium,
        fontWeight: 'bold',
        marginRight: MARGIN.medium,
        width: 25,
        textAlign: 'center',
    },
    rankingCurrentUser: {
        borderColor: COLORS.primary,
        borderWidth: 2,
    },
});

export default FriendsScreen;
