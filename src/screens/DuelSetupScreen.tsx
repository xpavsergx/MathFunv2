// src/screens/DuelSetupScreen.tsx

import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    useColorScheme,
    SafeAreaView,
    ScrollView
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import questionsDatabase from '../data/questionsDb.json';
import firestore from '@react-native-firebase/firestore'; // Dodany import firestore

import { AppTabParamList, FriendsStackParamList } from '../navigation/types';
import { sendDuelRequest } from '../services/friendService';
import { COLORS, FONT_SIZES, PADDING, MARGIN } from '../styles/theme';
import Ionicons from '@expo/vector-icons/Ionicons';

type DuelSetupRouteProp = RouteProp<FriendsStackParamList, 'DuelSetup'>;
type DuelNavigationProp = BottomTabNavigationProp<AppTabParamList>;

type QuestionsDB = {
    [grade: string]: {
        [topic: string]: any;
    };
};
const db: QuestionsDB = questionsDatabase;

function DuelSetupScreen() {
    const route = useRoute<DuelSetupRouteProp>();
    const navigation = useNavigation<DuelNavigationProp>();

    const { friendId, friendEmail } = route.params;

    const availableGrades = useMemo(() => Object.keys(db).map(Number), []);
    const [selectedGrade, setSelectedGrade] = useState<number>(availableGrades[0]);
    const [availableTopics, setAvailableTopics] = useState<string[]>([]);
    const [selectedTopic, setSelectedTopic] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';

    const themeStyles = {
        container: { backgroundColor: isDarkMode ? COLORS.backgroundDark : COLORS.backgroundLight },
        card: { backgroundColor: isDarkMode ? COLORS.cardDark : COLORS.white },
        text: { color: isDarkMode ? COLORS.textDark : COLORS.textLight },
        button: { backgroundColor: COLORS.primary },
        buttonText: { color: COLORS.white },
        chip: { backgroundColor: isDarkMode ? '#2C2C2E' : '#f0f0f0', },
        chipText: { color: isDarkMode ? COLORS.textDark : '#555', },
        chipActive: {
            backgroundColor: COLORS.primary,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
        },
        chipTextActive: { color: COLORS.white, },
    };

    useEffect(() => {
        const topicsForGrade = db[selectedGrade];
        let newTopics: string[] = [];
        if (topicsForGrade) {
            newTopics = Object.keys(topicsForGrade);
        }
        setAvailableTopics(newTopics);
        if (!newTopics.includes(selectedTopic) || !selectedTopic) {
            setSelectedTopic(newTopics[0] || '');
        }
    }, [selectedGrade]);

    // --- ✅ POPRAWIONA FUNKCJA (Czekanie na akceptację bez osobnego Lobby) ---
    const handleStartDuel = async () => {
        if (!selectedTopic) {
            Alert.alert("Błąd", "Nie wybrano tematu.");
            return;
        }
        if (selectedGrade === 5 || selectedGrade === 6) {
            Alert.alert(
                "Wkrótce dostępne",
                `Pojedynki dla klasy ${selectedGrade} będą dostępne wkrótce. Wybierz klasę 4, aby zagrać teraz!`,
                [{ text: "OK" }]
            );
            return;
        }
        setIsLoading(true); // Rozpoczęcie kręcenia się przycisku
        try {
            const newDuelId = await sendDuelRequest(friendId, selectedGrade, selectedTopic);

            if (newDuelId) {
                // Słuchamy zmian w dokumencie pojedynku w czasie rzeczywistym
                const unsubscribe = firestore()
                    .collection('duels')
                    .doc(newDuelId)
                    .onSnapshot(doc => {
                        if (!doc.exists) return;

                        const data = doc.data();

                        // Czekamy, aż przeciwnik zmieni status na 'active' w ActivityScreen
                        if (data?.status === 'active') {
                            unsubscribe(); // Przestajemy słuchać, bo zaczynamy grę
                            setIsLoading(false);

                            navigation.navigate('HomeStack', {
                                screen: 'Test',
                                params: {
                                    grade: selectedGrade,
                                    topic: selectedTopic,
                                    mode: 'duel',
                                    testType: 'duel',
                                    duelId: newDuelId,
                                }
                            });
                        }
                    }, (error) => {
                        console.error("Błąd nasłuchiwania pojedynku:", error);
                        setIsLoading(false);
                    });
            } else {
                setIsLoading(false);
            }
        } catch (error) {
            console.error("Błąd podczas tworzenia pojedynku:", error);
            Alert.alert("Błąd", "Nie udało się wysłać wyzwania.");
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, themeStyles.container]}>
            <ScrollView
                contentContainerStyle={styles.scrollContainer}
                keyboardShouldPersistTaps="handled"
            >
                <View style={[styles.card, themeStyles.card]}>
                    <Ionicons name="flash-outline" size={50} color={COLORS.accent} />
                    <Text style={[styles.title, themeStyles.text]}>Wyzwanie na Pojedynek!</Text>
                    <Text style={[styles.subtitle, themeStyles.text]}>
                        Rzucasz wyzwanie: <Text style={styles.friendName}>{friendEmail}</Text>
                    </Text>

                    <Text style={[styles.label, themeStyles.text]}>Wybierz klasę:</Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.chipScrollContainer}
                    >
                        {availableGrades.map(grade => {
                            // ✅ 1. Sprawdzamy, czy klasa powinna być zablokowana
                            const isLocked = grade === 5 || grade === 6;

                            return (
                                <TouchableOpacity
                                    key={grade}
                                    // ✅ 2. Wyłączamy klikalność dla klasy 5 i 6
                                    disabled={isLocked}
                                    style={[
                                        styles.chip,
                                        themeStyles.chip,
                                        selectedGrade === grade && [styles.chipActive, themeStyles.chipActive],
                                        // ✅ 3. Dodajemy styl dla zablokowanego przycisku (szary i półprzezroczysty)
                                        isLocked && { opacity: 0.5, backgroundColor: isDarkMode ? '#1C1C1E' : '#D1D1D6' }
                                    ]}
                                    onPress={() => setSelectedGrade(grade)}
                                >
                                    <Text style={[
                                        styles.chipText,
                                        themeStyles.chipText,
                                        selectedGrade === grade && [styles.chipTextActive, themeStyles.chipTextActive],
                                        // ✅ 4. Zmieniamy kolor tekstu dla zablokowanych na ciemniejszy szary
                                        isLocked && { color: '#8E8E93' }
                                    ]}>
                                        Klasa {grade}
                                        {isLocked ? ' 🔒' : ''}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    <Text style={[styles.label, themeStyles.text]}>Wybierz temat:</Text>
                    <View style={styles.topicContainer}>
                        {availableTopics.length > 0 ? (
                            availableTopics.map(topic => (
                                <TouchableOpacity
                                    key={topic}
                                    style={[
                                        styles.chip,
                                        styles.topicChip,
                                        themeStyles.chip,
                                        selectedTopic === topic && [styles.chipActive, themeStyles.chipActive]
                                    ]}
                                    onPress={() => setSelectedTopic(topic)}
                                >
                                    <Text style={[
                                        styles.chipText,
                                        themeStyles.chipText,
                                        selectedTopic === topic && [styles.chipTextActive, themeStyles.chipTextActive]
                                    ]}>
                                        {topic}
                                    </Text>
                                </TouchableOpacity>
                            ))
                        ) : (
                            <Text style={[styles.chipText, themeStyles.chipText, {textAlign: 'center'}]}>
                                Brak tematów dla tej klasy.
                            </Text>
                        )}
                    </View>

                    <TouchableOpacity
                        style={[styles.button, themeStyles.button, isLoading && styles.disabledButton]}
                        onPress={handleStartDuel}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <View style={styles.loadingWrapper}>
                                <ActivityIndicator size="small" color={COLORS.white} />
                                <Text style={styles.loadingText}>Czekam na akceptację...</Text>
                            </View>
                        ) : (
                            <Text style={[styles.buttonText, themeStyles.buttonText]}>Rozpocznij Pojedynek</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContainer: { flexGrow: 1, justifyContent: 'center', padding: PADDING.medium },
    card: {
        borderRadius: 20,
        padding: PADDING.large,
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        gap: MARGIN.medium,
    },
    title: { fontSize: FONT_SIZES.xlarge, fontWeight: 'bold' },
    subtitle: { fontSize: FONT_SIZES.medium },
    friendName: { fontWeight: 'bold', color: COLORS.primary },
    label: { fontSize: FONT_SIZES.medium, fontWeight: '500', alignSelf: 'flex-start' },
    chipScrollContainer: { width: '100%', maxHeight: 60 },
    topicContainer: { width: '100%', gap: MARGIN.small },
    chip: {
        paddingVertical: PADDING.small + 2,
        paddingHorizontal: PADDING.medium,
        borderRadius: 20,
        marginRight: MARGIN.small,
        alignItems: 'center',
        justifyContent: 'center',
    },
    topicChip: { marginRight: 0, paddingVertical: PADDING.medium - 2 },
    chipText: { fontSize: FONT_SIZES.medium, fontWeight: '500' },
    chipActive: {},
    chipTextActive: { fontWeight: 'bold' },
    button: { width: '100%', paddingVertical: PADDING.medium, borderRadius: 25, alignItems: 'center', marginTop: MARGIN.small },
    buttonText: { fontSize: FONT_SIZES.medium, fontWeight: 'bold' },
    disabledButton: { backgroundColor: COLORS.grey },
    loadingWrapper: { flexDirection: 'row', alignItems: 'center' },
    loadingText: { color: COLORS.white, marginLeft: 10, fontWeight: 'bold' }
});

export default DuelSetupScreen;