import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    Image, Alert, ActivityIndicator, useColorScheme,
    SafeAreaView, Platform, StatusBar, Dimensions
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { COLORS, FONT_SIZES, PADDING, MARGIN } from '../styles/theme';
import { getAvatarImage, getPowerUpImage } from '../utils/avatarUtils';

const { width } = Dimensions.get('window');

// Pomocnicza funkcja skalowania względem szerokości ekranu
const scale = (size: number) => (width / 375) * size;

interface StoreItem {
    id: string;
    name: string;
    cost: number;
    image: any;
    type: 'avatar' | 'powerup';
    description: string;
}

const STORE_ITEMS: StoreItem[] = [
    {
        id: 'avatar4_robot',
        name: 'Awatar Robota',
        cost: 100,
        image: getAvatarImage('avatar4_robot'),
        type: 'avatar',
        description: 'Odblokuj nowy awatar Robota.'
    },
    {
        id: 'avatar5_dragon',
        name: 'Awatar Smoka',
        cost: 500,
        image: getAvatarImage('avatar5_dragon'),
        type: 'avatar',
        description: 'Odblokuj potężny awatar Smoka.'
    },
    {
        id: 'hint5050',
        name: 'Wskazówka 50/50',
        cost: 50,
        image: getPowerUpImage('hint5050'),
        type: 'powerup',
        description: 'Usuwa 2 błędne odpowiedzi w teście.'
    },
    {
        id: 'doubleXp',
        name: 'Podwójne XP',
        cost: 200,
        image: getPowerUpImage('doubleXp'),
        type: 'powerup',
        description: 'Zdobądź x2 XP za następny ukończony test.'
    },
];

export default function StoreScreen() {
    const isDarkMode = useColorScheme() === 'dark';
    const primaryTurquoise = '#00BDD6';

    const [loading, setLoading] = useState(true);
    const [userCoins, setUserCoins] = useState(0);
    const [unlockedAvatars, setUnlockedAvatars] = useState<string[]>([]);
    const [userInventory, setUserInventory] = useState<{ [key: string]: number }>({});
    const [isPurchasing, setIsPurchasing] = useState<string | null>(null);

    const theme = {
        background: isDarkMode ? '#121212' : '#F8F9FA',
        card: isDarkMode ? '#1E1E1E' : '#FFF',
        textMain: isDarkMode ? '#E0E0E0' : '#2C3E50',
        textSecondary: isDarkMode ? '#AAA' : '#7F8C8D',
        headerBg: isDarkMode ? '#1E1E1E' : '#FFF',
        buttonDisabled: isDarkMode ? '#333' : '#E0E0E0',
    };

    useEffect(() => {
        const user = auth().currentUser;
        if (!user) return;

        const unsubscribe = firestore().collection('users').doc(user.uid).onSnapshot(doc => {
            if (doc.exists) {
                const data = doc.data();
                setUserCoins(data?.coins || 0);
                setUnlockedAvatars(['avatar1', 'avatar2', 'avatar3', ...(data?.unlockedAvatars || [])]);
                setUserInventory(data?.inventory || {});
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handlePurchase = async (item: StoreItem) => {
        const user = auth().currentUser;
        if (!user || isPurchasing) return;

        setIsPurchasing(item.id);
        if (userCoins < item.cost) {
            Alert.alert("Brak monet", "Masz za mało monet!");
            setIsPurchasing(null);
            return;
        }

        const userRef = firestore().collection('users').doc(user.uid);
        try {
            await firestore().runTransaction(async (transaction) => {
                const userDoc = await transaction.get(userRef);
                const data = userDoc.data()!;
                const currentCoins = data.coins || 0;

                if (item.type === 'avatar') {
                    transaction.update(userRef, {
                        coins: currentCoins - item.cost,
                        unlockedAvatars: firestore.FieldValue.arrayUnion(item.id)
                    });
                } else {
                    transaction.update(userRef, {
                        coins: currentCoins - item.cost,
                        [`inventory.${item.id}`]: firestore.FieldValue.increment(1)
                    });
                }
            });
            Alert.alert("Sukces!", `Kupiono: ${item.name}`);
        } catch (e) {
            Alert.alert("Błąd", "Nie udało się dokonać zakupu.");
        }
        setIsPurchasing(null);
    };

    const renderItem = ({ item }: { item: StoreItem }) => {
        const isOwned = item.type === 'avatar' && unlockedAvatars.includes(item.id);
        const canAfford = userCoins >= item.cost;
        const count = userInventory[item.id] || 0;

        return (
            <View style={[styles.statCard, { backgroundColor: theme.card }]}>
                <View style={styles.cardHeader}>
                    <View style={[styles.iconCircle, { backgroundColor: isDarkMode ? 'rgba(0,189,214,0.1)' : '#E0F7FA' }]}>
                        <Image source={item.image} style={styles.itemImage} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.exerciseLabel, { color: theme.textMain }]}>{item.name}</Text>
                        <Text style={[styles.descriptionText, { color: theme.textSecondary }]}>{item.description}</Text>
                    </View>
                </View>

                <View style={styles.actionRow}>
                    <View style={styles.costBadge}>
                        <Icon name="database-arrow-up" size={scale(20)} color="#FFD700" />
                        <Text style={styles.costText}>{item.cost}</Text>
                    </View>

                    {item.type === 'powerup' && count > 0 && (
                        <View style={styles.ownedInfo}>
                            <Icon name="bag-personal" size={scale(16)} color={primaryTurquoise} />
                            <Text style={[styles.ownedText, { color: primaryTurquoise }]}> x{count}</Text>
                        </View>
                    )}

                    <TouchableOpacity
                        style={[
                            styles.buyButton,
                            { backgroundColor: isOwned ? theme.buttonDisabled : primaryTurquoise },
                            (!canAfford && !isOwned) && { opacity: 0.5 }
                        ]}
                        onPress={() => handlePurchase(item)}
                        disabled={isOwned || !canAfford || isPurchasing === item.id}
                    >
                        {isPurchasing === item.id ? (
                            <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                            <Text style={styles.buyButtonText}>{isOwned ? "Posiadasz" : "Kup teraz"}</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    if (loading) return (
        <View style={[styles.center, {backgroundColor: theme.background}]}>
            <ActivityIndicator size="large" color={primaryTurquoise} />
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />

            <View style={[styles.topSection, { backgroundColor: theme.headerBg }]}>
                <View style={styles.coinsHeader}>
                    <Text style={[styles.groupTitle, { color: primaryTurquoise }]}>Twoje monety</Text>
                    <View style={styles.coinBalance}>
                        <Icon name="database-arrow-up" size={scale(24)} color="#FFD700" />
                        <Text style={styles.balanceText}>{userCoins}</Text>
                    </View>
                </View>
            </View>

            <FlatList
                data={STORE_ITEMS}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    topSection: {
        padding: scale(18),
        borderBottomLeftRadius: scale(25),
        borderBottomRightRadius: scale(25),
    },
    coinsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    groupTitle: {
        fontSize: scale(22),
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 1.2
    },
    coinBalance: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 215, 0, 0.1)',
        paddingHorizontal: scale(12),
        paddingVertical: scale(6),
        borderRadius: scale(15)
    },
    balanceText: { marginLeft: 6, fontSize: scale(18), fontWeight: '900', color: '#E6A23C' },
    scrollContent: { padding: scale(18) },
    statCard: {
        borderRadius: scale(22),
        padding: scale(18),
        marginBottom: scale(15),
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 8
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: scale(12) },
    iconCircle: { width: scale(56), height: scale(56), borderRadius: scale(28), justifyContent: 'center', alignItems: 'center', marginRight: scale(12) },
    itemImage: { width: scale(40), height: scale(40), resizeMode: 'contain' },
    exerciseLabel: { fontSize: scale(16), fontWeight: '800' },
    descriptionText: { fontSize: scale(13), marginTop: 2, lineHeight: scale(18) },
    actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: scale(10) },
    costBadge: { flexDirection: 'row', alignItems: 'center' },
    costText: { marginLeft: 6, fontSize: scale(18), fontWeight: '900', color: '#E6A23C' },
    buyButton: { paddingHorizontal: scale(20), paddingVertical: scale(10), borderRadius: scale(12), minWidth: scale(110), alignItems: 'center' },
    buyButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: scale(14) },
    ownedInfo: { flexDirection: 'row', alignItems: 'center', marginRight: scale(8) },
    ownedText: { fontWeight: '900', fontSize: scale(14) }
});