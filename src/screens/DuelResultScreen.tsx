import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ActivityIndicator, SafeAreaView,
    useColorScheme, TouchableOpacity, StatusBar, Dimensions
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { MainAppStackParamList } from '../navigation/types';
import { COLORS, FONT_SIZES, MARGIN, PADDING } from '../styles/theme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { updateDuelStats } from '../services/userStatsService';
import { updateQuestProgress } from '../services/dailyQuestService';

type DuelResultRouteProp = RouteProp<MainAppStackParamList, 'DuelResult'>;

interface DuelPlayerResult {
    score: number | null;
    time: number | null;
    nickname: string;
}

interface DuelData {
    status: 'pending' | 'active' | 'completed';
    players: string[];
    topic: string;
    results: { [userId: string]: DuelPlayerResult };
}

function DuelResultScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<DuelResultRouteProp>();
    const { duelId } = route.params;
    const currentUser = auth().currentUser;

    const [duelData, setDuelData] = useState<DuelData | null>(null);
    const [outcome, setOutcome] = useState<'waiting' | 'win' | 'lose' | 'draw' | 'error'>('waiting');
    const [statsUpdated, setStatsUpdated] = useState(false);

    const isDarkMode = useColorScheme() === 'dark';
    const theme = {
        bg: isDarkMode ? COLORS.backgroundDark : '#F8FAFC',
        card: isDarkMode ? COLORS.cardDark : '#FFFFFF',
        text: isDarkMode ? COLORS.textDark : '#1F2937'
    };

    useEffect(() => {
        if (!currentUser) return;
        const duelRef = firestore().collection('duels').doc(duelId);

        const unsubscribe = duelRef.onSnapshot(async (doc) => {
            if (!doc.exists) { setOutcome('error'); return; }

            const data = doc.data() as DuelData;
            setDuelData(data);

            const players = data.players || [];
            if (players.length < 2) return;

            const res1 = data.results[players[0]];
            const res2 = data.results[players[1]];

            if (res1?.score !== null && res2?.score !== null) {
                let currentOutcome: 'win' | 'lose' | 'draw' = 'draw';
                const myRes = data.results[currentUser.uid];
                const oppId = players.find(id => id !== currentUser.uid)!;
                const oppRes = data.results[oppId];

                if (myRes.score > oppRes.score) currentOutcome = 'win';
                else if (myRes.score < oppRes.score) currentOutcome = 'lose';
                else {
                    if (myRes.time! < oppRes.time!) currentOutcome = 'win';
                    else if (myRes.time! > oppRes.time!) currentOutcome = 'lose';
                    else currentOutcome = 'draw';
                }

                setOutcome(currentOutcome);

                if (!statsUpdated) {
                    setStatsUpdated(true);
                    try {
                        if (currentOutcome === 'win') updateQuestProgress('DUEL_WIN');
                        await updateDuelStats(currentOutcome);
                        if (data.status !== 'completed') {
                            await duelRef.update({ status: 'completed' });
                        }
                    } catch (e) { console.error("Stats Error:", e); }
                }
            }
        });

        return () => unsubscribe();
    }, [duelId, statsUpdated]);

    const formatTime = (t: number | null) => {
        if (t === null) return '--:--';
        return `${Math.floor(t / 60)}m ${t % 60}s`;
    };

    const config = {
        win: { t: 'Zwycięstwo!', i: 'trophy', c: COLORS.correct },
        lose: { t: 'Porażka', i: 'sad-outline', c: COLORS.incorrect },
        draw: { t: 'Remis!', i: 'git-compare-outline', c: COLORS.primary },
        waiting: { t: 'Oczekiwanie...', i: 'time-outline', c: COLORS.grey },
        error: { t: 'Błąd', i: 'alert-circle', c: COLORS.error }
    }[outcome];

    if (!duelData) return <ActivityIndicator style={styles.center} />;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
            <View style={styles.content}>
                <View style={styles.header}>
                    <Ionicons name={config.i} size={80} color={config.c} />
                    <Text style={[styles.statusTitle, { color: theme.text }]}>{config.t}</Text>
                    <Text style={{ color: COLORS.grey }}>{duelData.topic}</Text>
                </View>

                <View style={styles.vsRow}>
                    {duelData.players.map(id => (
                        <View key={id} style={[styles.playerCard, { backgroundColor: theme.card }]}>
                            {id === currentUser?.uid && <View style={styles.youBadge}><Text style={styles.youText}>TY</Text></View>}
                            <Text style={[styles.nick, { color: theme.text }]} numberOfLines={1}>
                                {duelData.results[id]?.nickname || 'Gracz'}
                            </Text>
                            <Text style={[styles.score, {color: COLORS.primary}]}>{duelData.results[id]?.score ?? '-'} pkt</Text>
                            <Text style={{color: COLORS.grey}}>{formatTime(duelData.results[id]?.time ?? null)}</Text>
                        </View>
                    ))}
                </View>

                <TouchableOpacity style={styles.btn} onPress={() => navigation.popToTop()}>
                    <Text style={styles.btnT}>Powrót do menu</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center' },
    content: { flex: 1, padding: 20, alignItems: 'center', justifyContent: 'space-around' },
    header: { alignItems: 'center' },
    statusTitle: { fontSize: 32, fontWeight: 'bold', marginVertical: 10 },
    vsRow: { flexDirection: 'row', gap: 10, width: '100%' },
    playerCard: { flex: 1, padding: 20, borderRadius: 20, alignItems: 'center', elevation: 3, shadowOpacity: 0.1 },
    nick: { fontWeight: 'bold', marginBottom: 5, fontSize: 16 },
    score: { fontSize: 22, fontWeight: '900', marginVertical: 5 },
    youBadge: { backgroundColor: COLORS.primary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 5, marginBottom: 5 },
    youText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
    btn: { backgroundColor: COLORS.primary, padding: 18, borderRadius: 30, width: '100%', alignItems: 'center' },
    btnT: { color: '#FFF', fontWeight: 'bold', fontSize: 18 }
});

export default DuelResultScreen;
