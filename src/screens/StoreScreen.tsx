// src/screens/StoreScreen.tsx

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    Alert,
    ActivityIndicator,
    useColorScheme,
    SafeAreaView,
    Platform,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { COLORS, FONT_SIZES, PADDING, MARGIN } from '../styles/theme';
import { getAvatarImage, getPowerUpImage } from '../utils/avatarUtils';

// Інтерфейс товару
interface StoreItem {
    id: string;
    name: string;
    cost: number;
    image: any;
    type: 'avatar' | 'powerup';
    description: string;
}

// Список товарів (перекладено)
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
        name: 'Podwójne XP (1 Test)',
        cost: 200,
        image: getPowerUpImage('doubleXp'),
        type: 'powerup',
        description: 'Zdobądź x2 XP za następny ukończony test.'
    },
];

export default function StoreScreen() {
    const navigation = useNavigation();
    const user = auth().currentUser;

    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';

    const [loading, setLoading] = useState(true);
    const [userCoins, setUserCoins] = useState(0);
    const [unlockedAvatars, setUnlockedAvatars] = useState<string[]>([]);
    const [userInventory, setUserInventory] = useState<{ [key: string]: number }>({});
    const [isPurchasing, setIsPurchasing] = useState<string | null>(null);

    // Динамічні стилі
    const themeStyles = {
        background: { backgroundColor: isDarkMode ? COLORS.backgroundDark : COLORS.backgroundLight },
        card: { backgroundColor: isDarkMode ? COLORS.cardDark : COLORS.cardLight, borderColor: isDarkMode ? COLORS.cardDark : '#E0E0E0' },
        text: { color: isDarkMode ? COLORS.textDark : COLORS.textLight },
        textSecondary: { color: isDarkMode ? COLORS.greyDarkTheme : COLORS.grey },
        coinText: {
            color: isDarkMode ? '#FFD700' : '#E6A23C',
            fontSize: FONT_SIZES.medium,
            fontWeight: 'bold',
        },
        itemName: {
            color: isDarkMode ? COLORS.textDark : COLORS.textLight,
            fontSize: FONT_SIZES.medium,
            fontWeight: '600',
        },
        itemDescription: {
            color: isDarkMode ? COLORS.greyDarkTheme : COLORS.grey,
            fontSize: FONT_SIZES.small,
        },
        itemCost: {
            color: isDarkMode ? '#FFD700' : '#E6A23C',
            fontSize: FONT_SIZES.medium,
            fontWeight: 'bold',
            marginLeft: MARGIN.small / 2,
        },
        buyButtonText: {
            color: COLORS.white,
            fontSize: FONT_SIZES.medium,
            fontWeight: 'bold',
        },
        inventoryCountText: {
            color: isDarkMode ? COLORS.primaryDarkTheme : COLORS.primary,
            fontSize: FONT_SIZES.small,
            fontWeight: 'bold',
        }
    };

    // (useEffect та handlePurchase без змін)
    useEffect(() => {
        if (!user) return;
        const userRef = firestore().collection('users').doc(user.uid);
        const unsubscribe = userRef.onSnapshot(doc => {
            if (doc.exists) {
                const data = doc.data();
                setUserCoins(data?.coins || 0);
                setUnlockedAvatars([
                    'avatar1', 'avatar2', 'avatar3',
                    ...(data?.unlockedAvatars || [])
                ]);
                setUserInventory(data?.inventory || {});
            }
            setLoading(false);
        }, error => {
            console.error("StoreScreen: Błąd pobierania danych:", error);
            setLoading(false);
            Alert.alert("Błąd", "Nie udało się załadować danych użytkownika.");
        });
        return () => unsubscribe();
    }, [user]);

    const handlePurchase = async (item: StoreItem) => {
        if (!user || isPurchasing) return;

        setIsPurchasing(item.id);

        if (userCoins < item.cost) {
            Alert.alert("Brak monet", "Masz za mało monet, aby kupić ten przedmiot.");
            setIsPurchasing(null);
            return;
        }

        const userRef = firestore().collection('users').doc(user.uid);

        try {
            await firestore().runTransaction(async (transaction) => {
                const userDoc = await transaction.get(userRef);
                if (!userDoc.exists) throw "Użytkownik nie istnieje!";

                const data = userDoc.data()!;
                const currentCoins = data.coins || 0;
                if (currentCoins < item.cost) throw "Za mało monet!";

                if (item.type === 'avatar') {
                    if (unlockedAvatars.includes(item.id)) {
                        throw "Już posiadane";
                    }
                    transaction.update(userRef, {
                        coins: currentCoins - item.cost,
                        unlockedAvatars: firestore.FieldValue.arrayUnion(item.id)
                    });
                    Alert.alert("Sukces!", `Odblokowałeś ${item.name}!`);

                } else if (item.type === 'powerup') {
                    const fieldToIncrement = `inventory.${item.id}`;
                    transaction.update(userRef, {
                        coins: currentCoins - item.cost,
                        [fieldToIncrement]: firestore.FieldValue.increment(1)
                    });
                    Alert.alert("Kupiono!", `Kupiłeś 1 x ${item.name}!`);
                }
            });

        } catch (error) {
            console.error("Błąd zakupu:", error);
            if (error === "Już posiadane") {
                Alert.alert("Już posiadane", "Posiadasz już ten przedmiot.");
            } else if (error === "Za mało monet!") {
                Alert.alert("Brak monet", "Masz za mało monet.");
            } else {
                Alert.alert("Błąd", "Wystąpił błąd podczas zakupu.");
            }
        }

        setIsPurchasing(null);
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.safeArea, themeStyles.background, {justifyContent: 'center'}]}>
                <ActivityIndicator size="large" color={isDarkMode ? COLORS.primaryDarkTheme : COLORS.primary} />
            </SafeAreaView>
        );
    }

    const renderItem = ({ item }: { item: StoreItem }) => {
        const isOwned = item.type === 'avatar' && unlockedAvatars.includes(item.id);
        const canAfford = userCoins >= item.cost;
        const isBeingBought = isPurchasing === item.id;
        const currentCount = userInventory[item.id] || 0;

        return (
            <View style={[styles.itemContainer, themeStyles.card]}>
                <Image source={item.image} style={styles.itemImage} />
                <View style={styles.itemInfo}>
                    <Text style={themeStyles.itemName}>{item.name}</Text>
                    <Text style={themeStyles.itemDescription}>{item.description}</Text>

                    <View style={styles.costContainer}>
                        <Ionicons name="logo-bitcoin" size={18} color={themeStyles.itemCost.color} />
                        <Text style={themeStyles.itemCost}>{item.cost}</Text>
                    </View>
                </View>

                {isOwned ? (
                    <View style={[styles.buyButton, styles.ownedButton]}>
                        <Text style={themeStyles.buyButtonText}>W posiadaniu</Text>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={[
                            styles.buyButton,
                            (!canAfford || isBeingBought) && styles.disabledButton
                        ]}
                        onPress={() => handlePurchase(item)}
                        disabled={!canAfford || isBeingBought}
                    >
                        {isBeingBought ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <Text style={themeStyles.buyButtonText}>Kup</Text>
                        )}
                    </TouchableOpacity>
                )}

                {item.type === 'powerup' && currentCount > 0 && (
                    <View style={styles.inventoryCount}>
                        <Text style={themeStyles.inventoryCountText}>W plecaku: {currentCount}</Text>
                    </View>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.safeArea, themeStyles.background]}>
            {/* --- ✅ ВЕРХНЮ ПАНЕЛЬ (HEADER) ВИДАЛЕНО --- */}

            <FlatList
                data={STORE_ITEMS}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent} // <-- Додаємо відступ зверху
            />
        </SafeAreaView>
    );
}

// --- ✅ СТИЛІ ОНОВЛЕНО ---
const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    // (Стилі header, backButton, headerTitle, coinsDisplay, coinsText ВИДАЛЕНО)
    listContent: {
        padding: PADDING.medium,
        paddingTop: PADDING.large, // <-- Додано відступ зверху, щоб компенсувати відсутність панелі
    },
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        padding: PADDING.medium,
        marginBottom: MARGIN.medium,
        elevation: 2,
        borderWidth: 1,
        position: 'relative',
    },
    itemImage: {
        width: 70,
        height: 70,
        borderRadius: 35,
        borderWidth: 2,
        borderColor: COLORS.primary,
        resizeMode: 'contain',
    },
    itemInfo: {
        flex: 1,
        marginLeft: MARGIN.medium,
    },
    costContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: MARGIN.small,
    },
    buyButton: {
        paddingVertical: PADDING.small,
        paddingHorizontal: PADDING.medium,
        borderRadius: 20,
        backgroundColor: COLORS.primary,
        minWidth: 100,
        alignItems: 'center',
    },
    ownedButton: {
        backgroundColor: COLORS.grey,
    },
    disabledButton: {
        backgroundColor: COLORS.greyDarkTheme,
    },
    inventoryCount: {
        position: 'absolute',
        top: 5,
        right: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
    }
});
