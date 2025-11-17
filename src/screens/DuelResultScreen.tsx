// src/screens/DuelResultScreen.tsx

import React, { useState, useEffect } from 'react';
// --- ✅ 1. ДОДАЄМО 'TouchableOpacity' ДО ІМПОРТУ ---
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    SafeAreaView,
    useColorScheme,
    TouchableOpacity
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { MainAppStackParamList } from '../../src/navigation/types';
import { COLORS, FONT_SIZES, MARGIN, PADDING } from '../styles/theme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { updateDuelStats } from '../services/userStatsService';

// (Типи, інтерфейси - без змін)
type DuelResultRouteProp = RouteProp<MainAppStackParamList, 'DuelResult'>;

interface DuelPlayerResult {
    score: number | null;
    time: number | null;
    nickname: string;
}

interface DuelData {
    status: 'pending' | 'completed';
    players: string[];
    challengerNickname: string;
    topic: string;
    results: {
        [userId: string]: DuelPlayerResult;
    };
    createdAt: FirebaseFirestoreTypes.Timestamp;
}

type DuelOutcome = 'waiting' | 'win' | 'lose' | 'draw' | 'error';

function DuelResultScreen() {
    // (Хуки, стани, стилі теми - без змін)
    const navigation = useNavigation<any>();
    const route = useRoute<DuelResultRouteProp>();
    const { duelId } = route.params;
    const currentUser = auth().currentUser;

    const [duelData, setDuelData] = useState<DuelData | null>(null);
    const [outcome, setOutcome] = useState<DuelOutcome>('waiting');

    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';

    const themeStyles = {
        container: { backgroundColor: isDarkMode ? COLORS.backgroundDark : COLORS.backgroundLight },
        card: { backgroundColor: isDarkMode ? COLORS.cardDark : COLORS.white },
        text: { color: isDarkMode ? COLORS.textDark : COLORS.textLight },
        title: { color: isDarkMode ? COLORS.textDark : COLORS.textLight },
        winnerText: { color: COLORS.correct },
        loserText: { color: COLORS.incorrect },
        drawText: { color: isDarkMode ? COLORS.primaryDarkTheme : COLORS.primary },
    };

    // (Логіка useEffect - без змін)
    useEffect(() => {
        if (!currentUser) return;

        const duelRef = firestore().collection('duels').doc(duelId);

        const unsubscribe = duelRef.onSnapshot(async (doc) => {
            if (!doc.exists) {
                setOutcome('error');
                return;
            }

            const data = doc.data() as DuelData;
            setDuelData(data);

            const [player1Id, player2Id] = data.players;
            // --- ✅ 2. ДОДАЄМО ПЕРЕВІРКУ НА ІСНУВАННЯ РЕЗУЛЬТАТІВ ---
            // (Це запобігає падінню, якщо документ дуелі пошкоджений)
            if (!data.results[player1Id] || !data.results[player2Id]) {
                console.warn("Duel document is missing player results!");
                setOutcome('error');
                return;
            }

            const res1 = data.results[player1Id];
            const res2 = data.results[player2Id];

            if (res1.score !== null && res1.time !== null && res2.score !== null && res2.time !== null) {

                let newOutcome: DuelOutcome = 'draw';

                if (res1.score > res2.score) {
                    newOutcome = player1Id === currentUser.uid ? 'win' : 'lose';
                } else if (res2.score > res1.score) {
                    newOutcome = player2Id === currentUser.uid ? 'win' : 'lose';
                } else {
                    if (res1.time < res2.time) {
                        newOutcome = player1Id === currentUser.uid ? 'win' : 'lose';
                    } else if (res2.time < res1.time) {
                        newOutcome = player2Id === currentUser.uid ? 'win' : 'lose';
                    } else {
                        newOutcome = 'draw';
                    }
                }

                setOutcome(newOutcome);

                if (data.status === 'pending') {
                    await duelRef.update({ status: 'completed' });
                    // Оновлюємо статистику ТІЛЬКИ для поточного користувача
                    await updateDuelStats(newOutcome);
                }
            } else {
                setOutcome('waiting');
            }
        });

        return () => unsubscribe();

    }, [currentUser, duelId]);

    // (Компонент renderOutcome - без змін, помилка була не тут)
    const renderOutcome = () => {
        if (!duelData) return null;

        // --- ✅ 3. ДОДАЄМО БЕЗПЕЧНУ ПЕРЕВІРКУ (на випадок помилки даних) ---
        if (!duelData.results || !duelData.players) {
            return <Text style={[styles.title, themeStyles.text]}>Błąd ładowania danych...</Text>;
        }

        const [player1Id, player2Id] = duelData.players;
        const res1 = duelData.results[player1Id];
        const res2 = duelData.results[player2Id];

        // Перевіряємо, чи є дані гравців (захист від падіння)
        if (!res1 || !res2) {
            return <Text style={[styles.title, themeStyles.text]}>Oczekiwanie na graczy...</Text>;
        }

        const formatTime = (time: number | null) => {
            if (time === null) return '...';
            // Час тепер зберігається як ВИТРАЧЕНИЙ час, а не залишок
            // const totalSeconds = 15 * 60 - time; // (Стара логіка)
            const totalSeconds = time; // (Нова логіка)
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            return `${minutes}м ${seconds}с`;
        };

        const getIcon = (o: DuelOutcome) => {
            if (o === 'win') return { name: 'trophy', color: COLORS.correct };
            if (o === 'lose') return { name: 'sad-outline', color: COLORS.incorrect };
            if (o === 'draw') return { name: 'hand-left-outline', color: COLORS.primary };
            return { name: 'time-outline', color: COLORS.grey };
        };

        const titleMap: Record<DuelOutcome, string> = {
            win: 'Zwycięstwo!',
            lose: 'Porażka',
            draw: 'Remis!',
            waiting: `Oczekiwanie na przeciwnika...`,
            error: 'Błąd Pojedynku'
        };
        const icon = getIcon(outcome);

        return (
            <View style={[styles.card, themeStyles.card]}>
                <Ionicons name={icon.name} size={80} color={icon.color} style={{ marginBottom: MARGIN.medium }}/>
                <Text style={[styles.title, themeStyles.title]}>{titleMap[outcome]}</Text>

                <Text style={[styles.topicText, themeStyles.text]}>Temat: {duelData.topic}</Text>

                <View style={styles.resultsContainer}>
                    <View style={styles.playerResult}>
                        <Text style={[styles.playerName, themeStyles.text, outcome === 'win' && themeStyles.winnerText]}>
                            {res1.nickname} (Ty)
                        </Text>
                        <Text style={[styles.playerScore, themeStyles.text]}>Wynik: {res1.score ?? '...'}</Text>
                        <Text style={[styles.playerTime, themeStyles.text]}>Czas: {formatTime(res1.time)}</Text>
                    </View>

                    <View style={styles.playerResult}>
                        <Text style={[styles.playerName, themeStyles.text, outcome === 'lose' && themeStyles.loserText]}>
                            {res2.nickname}
                        </Text>
                        <Text style={[styles.playerScore, themeStyles.text]}>Wynik: {res2.score ?? '...'}</Text>
                        <Text style={[styles.playerTime, themeStyles.text]}>Czas: {formatTime(res2.time)}</Text>
                    </View>
                </View>

                {outcome !== 'waiting' && outcome !== 'error' && (
                    <TouchableOpacity
                        style={styles.doneButton}
                        onPress={() => navigation.popToTop()}
                    >
                        <Text style={styles.doneButtonText}>Zakończ</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    // (Головний return - без змін)
    return (
        <SafeAreaView style={[styles.container, themeStyles.container]}>
            {outcome === 'waiting' && !duelData && (
                <ActivityIndicator size="large" color={COLORS.primary} />
            )}
            {renderOutcome()}
        </SafeAreaView>
    );
}

// (Стилі - без змін)
const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: PADDING.medium,
    },
    card: {
        width: '100%',
        borderRadius: 20,
        padding: PADDING.large,
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
    },
    title: {
        fontSize: FONT_SIZES.title,
        fontWeight: 'bold',
        marginBottom: MARGIN.medium,
    },
    topicText: {
        fontSize: FONT_SIZES.medium,
        color: COLORS.grey,
        marginBottom: MARGIN.large,
    },
    resultsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: MARGIN.large,
    },
    playerResult: {
        alignItems: 'center',
        flex: 1,
        padding: PADDING.small,
    },
    playerName: {
        fontSize: FONT_SIZES.large,
        fontWeight: 'bold',
        marginBottom: MARGIN.small,
    },
    playerScore: {
        fontSize: FONT_SIZES.medium,
        marginBottom: MARGIN.small / 2,
    },
    playerTime: {
        fontSize: FONT_SIZES.medium,
        color: COLORS.grey,
    },
    doneButton: {
        backgroundColor: COLORS.primary,
        paddingVertical: PADDING.medium,
        paddingHorizontal: PADDING.large,
        borderRadius: 25,
        marginTop: MARGIN.medium,
    },
    doneButtonText: {
        color: COLORS.white,
        fontSize: FONT_SIZES.medium,
        fontWeight: 'bold',
    }
});

export default DuelResultScreen;
