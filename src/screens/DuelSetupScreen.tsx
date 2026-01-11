// src/screens/DuelSetupScreen.tsx

import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
    useColorScheme, SafeAreaView, ScrollView, Animated, Alert
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import firestore from '@react-native-firebase/firestore';
import questionsDatabase from '../data/questionsDb.json';
import { sendDuelRequest } from '../services/friendService';
import { COLORS } from '../styles/theme';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function DuelSetupScreen() {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { friendId, friendEmail } = route.params;
    const isDark = useColorScheme() === 'dark';

    const [selectedGrade, setSelectedGrade] = useState(4);
    const [selectedTopic, setSelectedTopic] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const pulseAnim = useRef(new Animated.Value(1)).current;

    const db = (questionsDatabase as any).default || questionsDatabase;
    const availableTopics = db[String(selectedGrade)] ? Object.keys(db[String(selectedGrade)]) : [];

    // ✅ LISTA ZABLOKOWANYCH KLAS
    const lockedGrades = [5, 6, 7];

    useEffect(() => {
        if (availableTopics.length > 0) setSelectedTopic(availableTopics[0]);
    }, [selectedGrade]);

    useEffect(() => {
        if (isLoading) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.05, duration: 800, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
                ])
            ).start();
        }
    }, [isLoading]);

    const handleGradePress = (g: number) => {
        if (lockedGrades.includes(g)) {
            Alert.alert("Już wkrótce!", `Testy dla klasy ${g} są w przygotowaniu. Wybierz klasę 4, aby walczyć teraz!`);
            return;
        }
        setSelectedGrade(g);
    };

    const handleStart = async () => {
        if (!selectedTopic) return;
        setIsLoading(true);
        const newDuelId = await sendDuelRequest(friendId, selectedGrade, selectedTopic);

        if (newDuelId) {
            const unsubscribe = firestore().collection('duels').doc(newDuelId).onSnapshot(doc => {
                if (doc && doc.exists && doc.data()?.status === 'active') {
                    unsubscribe();
                    setIsLoading(false);
                    navigation.navigate('HomeStack', {
                        screen: 'Test',
                        params: { duelId: newDuelId, mode: 'assess', testType: 'duel', grade: selectedGrade, topic: selectedTopic }
                    });
                }
            }, (error) => {
                console.log("Duel Listener Error: ", error);
                setIsLoading(false);
            });
        } else {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? COLORS.backgroundDark : '#F8FAFC' }}>
            <ScrollView contentContainerStyle={{ padding: 20 }}>
                <View style={[styles.card, { backgroundColor: isDark ? COLORS.cardDark : '#FFF' }]}>
                    <View style={styles.iconCircle}><Ionicons name="flash" size={40} color="#FFF" /></View>
                    <Text style={[styles.title, { color: isDark ? '#FFF' : '#1E293B' }]}>Wyzwanie dla {friendEmail}</Text>

                    <Text style={[styles.label, { color: isDark ? COLORS.grey : '#64748B' }]}>WYBIERZ KLASĘ</Text>
                    <View style={styles.row}>
                        {[4, 5, 6, 7].map(g => {
                            const isLocked = lockedGrades.includes(g);
                            const isActive = selectedGrade === g;

                            return (
                                <TouchableOpacity
                                    key={g}
                                    activeOpacity={0.7}
                                    style={[
                                        styles.gradeBlock,
                                        isActive && styles.gradeBlockActive,
                                        isLocked && styles.gradeBlockLocked,
                                        { borderColor: isActive ? COLORS.primary : (isDark ? '#334155' : '#E2E8F0') }
                                    ]}
                                    onPress={() => handleGradePress(g)}
                                >
                                    <Text style={[
                                        styles.gradeText,
                                        { color: isActive ? '#FFF' : (isLocked ? '#94A3B8' : (isDark ? '#FFF' : '#334155')) }
                                    ]}>{g}</Text>
                                    <Text style={[
                                        styles.gradeSubText,
                                        { color: isActive ? 'rgba(255,255,255,0.8)' : '#94A3B8' }
                                    ]}>Klasa</Text>
                                    {isLocked && (
                                        <View style={styles.lockBadge}>
                                            <Ionicons name="lock-closed" size={10} color="#FFF" />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <Text style={[styles.label, { color: isDark ? COLORS.grey : '#64748B' }]}>TEMAT WALKI</Text>
                    {availableTopics.length > 0 ? (
                        availableTopics.map(t => (
                            <TouchableOpacity
                                key={t}
                                activeOpacity={0.8}
                                style={[
                                    styles.topic,
                                    { backgroundColor: selectedTopic === t ? COLORS.primary : (isDark ? '#2C2C2E' : '#F1F5F9') }
                                ]}
                                onPress={() => setSelectedTopic(t)}
                            >
                                <Text style={[
                                    styles.topicText,
                                    { color: selectedTopic === t ? '#FFF' : (isDark ? '#E2E8F0' : '#475569') }
                                ]}>{t}</Text>
                                <Ionicons
                                    name={selectedTopic === t ? "radio-button-on" : "radio-button-off"}
                                    size={20}
                                    color={selectedTopic === t ? "#FFF" : "#94A3B8"}
                                />
                            </TouchableOpacity>
                        ))
                    ) : (
                        <View style={styles.emptyBox}>
                            <Text style={styles.emptyText}>Wybierz dostępną klasę</Text>
                        </View>
                    )}

                    <View style={{ width: '100%', marginTop: 30 }}>
                        {isLoading ? (
                            <Animated.View style={{ alignItems: 'center', transform: [{ scale: pulseAnim }] }}>
                                <ActivityIndicator size="large" color={COLORS.primary} />
                                <Text style={{ marginTop: 10, color: COLORS.primary, fontWeight: 'bold' }}>Czekam na akceptację...</Text>
                            </Animated.View>
                        ) : (
                            <TouchableOpacity
                                style={[styles.btn, (!selectedTopic || isLoading) && { opacity: 0.5 }]}
                                onPress={handleStart}
                                disabled={!selectedTopic || isLoading}
                            >
                                <Text style={styles.btnT}>WYŚLIJ WYZWANIE</Text>
                                <Ionicons name="paper-plane" size={20} color="#FFF" style={{ marginLeft: 10 }} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    card: { padding: 25, borderRadius: 32, alignItems: 'center', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 },
    iconCircle: { width: 70, height: 70, borderRadius: 35, backgroundColor: COLORS.accent, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
    title: { fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 20, lineHeight: 28 },
    label: { alignSelf: 'flex-start', fontSize: 11, fontWeight: '900', letterSpacing: 1, marginTop: 25, marginBottom: 12 },
    row: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },

    // Nowe style dla bloków klas
    gradeBlock: { width: '22%', height: 75, borderRadius: 20, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', position: 'relative' },
    gradeBlockActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    gradeBlockLocked: { backgroundColor: 'rgba(148, 163, 184, 0.1)', borderColor: '#E2E8F0', borderStyle: 'dashed' },
    gradeText: { fontSize: 22, fontWeight: '900' },
    gradeSubText: { fontSize: 10, fontWeight: '600', marginTop: -2 },
    lockBadge: { position: 'absolute', top: -5, right: -5, backgroundColor: '#94A3B8', width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },

    topic: { width: '100%', padding: 18, borderRadius: 18, marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    topicText: { fontSize: 15, fontWeight: '700', flex: 1, marginRight: 10 },
    emptyBox: { padding: 20, alignItems: 'center', width: '100%' },
    emptyText: { color: '#94A3B8', fontStyle: 'italic' },

    btn: { backgroundColor: COLORS.primary, padding: 20, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', width: '100%', elevation: 4 },
    btnT: { color: '#FFF', fontWeight: '900', fontSize: 17, letterSpacing: 0.5 }
});
