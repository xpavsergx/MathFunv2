// src/screens/MatchstickEquationGame.tsx

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    Alert, useColorScheme, ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS, FONT_SIZES, PADDING, MARGIN } from '../styles/theme';
import * as MatchstickEngine from '../utils/matchstickEngine';
import MatchstickSymbol from '../Components/MatchstickSymbol';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { awardXpAndCoins } from '../services/xpService';

// Розширена база рівнів
const PUZZLE_LEVELS = [
    { id: 1, initial: "6+4=4", solution: "8-4=4", hint: "Zmień '6' na '8' i znak." },
    { id: 2, initial: "9-5=6", solution: "3+3=6", hint: "Zmień '9' na '3' oraz znak." }, // Альтернатива: 8-2=6
    { id: 3, initial: "3+3=5", solution: "3+2=5", hint: "Zmień jedną cyfrę na inną." },
    { id: 4, initial: "9+3=5", solution: "8-3=5", hint: "Zabierz z '9', dodaj do '-'." },
    { id: 5, initial: "5+7=2", solution: "9-7=2", hint: "Zmień '5' na '9' i znak." },
];

type HeldMatchstick = {
    symbolIndex: number;
    segmentIndex: number;
} | null;

function MatchstickEquationGame() {
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';
    const navigation = useNavigation();
    const currentUser = auth().currentUser;

    const [currentLevel, setCurrentLevel] = useState(0);
    const [status, setStatus] = useState<'playing' | 'solved'>('playing');
    const [equationChars, setEquationChars] = useState<string[]>([]);
    const [heldMatchstick, setHeldMatchstick] = useState<HeldMatchstick>(null);
    const [movesMade, setMovesMade] = useState(0);

    // Стан монет для підказки
    const [userCoins, setUserCoins] = useState(0);
    const [hintRevealed, setHintRevealed] = useState(false);

    const puzzle = useMemo(() => PUZZLE_LEVELS[currentLevel], [currentLevel]);

    // Завантаження монет
    useEffect(() => {
        if (!currentUser) return;
        const sub = firestore().collection('users').doc(currentUser.uid)
            .onSnapshot(doc => {
                setUserCoins(doc.data()?.coins || 0);
            });
        return () => sub();
    }, [currentUser]);

    const resetLevel = useCallback(() => {
        setEquationChars(puzzle.initial.replace(/\s/g, '').split(''));
        setStatus('playing');
        setHeldMatchstick(null);
        setMovesMade(0);
        setHintRevealed(false);
    }, [puzzle.initial]);

    useEffect(() => {
        resetLevel();
    }, [currentLevel, resetLevel]);

    const handleSegmentPress = (symbolIndex: number, segmentIndex: number) => {
        if (status === 'solved') return;

        if (movesMade >= 1 && !heldMatchstick) {
            Alert.alert("Stop!", "Możesz wykonać tylko JEDEN ruch. Zresetuj poziom.");
            return;
        }

        const char = equationChars[symbolIndex];
        const segmentsMapEntry = MatchstickEngine.SEGMENTS_MAP[char];
        if (!segmentsMapEntry) return;

        const segments = [...segmentsMapEntry];

        if (!heldMatchstick) {
            // Взяти сірник
            if (segments[segmentIndex] === 1) {
                setHeldMatchstick({ symbolIndex, segmentIndex });
            } else {
                // Пусто
            }
        } else {
            // Покласти сірник
            if (heldMatchstick.symbolIndex === symbolIndex && heldMatchstick.segmentIndex === segmentIndex) {
                setHeldMatchstick(null); // Відміна
                return;
            }
            if (segments[segmentIndex] === 1) {
                Alert.alert("Zajęte!", "Tu już jest zapałka.");
                return;
            }

            // Виконуємо хід
            const newEquation = [...equationChars];

            if (heldMatchstick.symbolIndex === symbolIndex) {
                // В межах одного символу
                segments[heldMatchstick.segmentIndex] = 0;
                segments[segmentIndex] = 1;
                newEquation[symbolIndex] = MatchstickEngine.segmentsToChar(segments);
            } else {
                // Між символами
                const fromChar = equationChars[heldMatchstick.symbolIndex];
                const fromSegments = [...MatchstickEngine.SEGMENTS_MAP[fromChar]];
                fromSegments[heldMatchstick.segmentIndex] = 0;
                newEquation[heldMatchstick.symbolIndex] = MatchstickEngine.segmentsToChar(fromSegments);

                segments[segmentIndex] = 1;
                newEquation[symbolIndex] = MatchstickEngine.segmentsToChar(segments);
            }

            setEquationChars(newEquation);
            setMovesMade(1);
            setHeldMatchstick(null);
        }
    };

    const handleCheck = () => {
        if (heldMatchstick) {
            Alert.alert("Błąd", "Nadal trzymasz zapałkę!");
            return;
        }
        const finalEquation = equationChars.join('');
        const isCorrect = MatchstickEngine.isEquationCorrect(finalEquation);

        if (isCorrect) {
            setStatus('solved');
            // 🎉 НАГОРОДА 🎉
            awardXpAndCoins(20, 5);
            Alert.alert("Brawo!", "Rozwiązane! Otrzymujesz +20 XP i +5 Monet.");
        } else {
            Alert.alert("Błąd", "Równanie niepoprawne. Spróbuj jeszcze raz.");
        }
    }

    const handleNext = () => {
        if (currentLevel < PUZZLE_LEVELS.length - 1) {
            setCurrentLevel(currentLevel + 1);
        } else {
            Alert.alert("Mistrz!", "To były wszystkie poziomy!");
            navigation.goBack();
        }
    };

    const buyHint = () => {
        if (hintRevealed) return;
        if (userCoins < 10) {
            Alert.alert("Brak monet", "Potrzebujesz 10 monet na podpowiedź.");
            return;
        }

        Alert.alert(
            "Kupić podpowiedź?",
            "Koszt: 10 monet",
            [
                { text: "Anuluj", style: "cancel" },
                {
                    text: "Kup",
                    onPress: () => {
                        if (currentUser) {
                            firestore().collection('users').doc(currentUser.uid).update({
                                coins: firestore.FieldValue.increment(-10)
                            });
                            setHintRevealed(true);
                        }
                    }
                }
            ]
        );
    };

    const themeStyles = {
        background: isDarkMode ? COLORS.backgroundDark : '#E0F7FA',
        title: { color: isDarkMode ? COLORS.primaryDarkTheme : COLORS.primaryDark },
        matchstickArea: { backgroundColor: isDarkMode ? '#1E1E1E' : '#FFF' },
        textColor: { color: isDarkMode ? '#FFF' : '#333' }
    };

    return (
        <View style={[styles.container, { backgroundColor: themeStyles.background }]}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
                    </TouchableOpacity>
                    <Text style={[styles.title, themeStyles.title]}>Poziom {currentLevel + 1}</Text>
                    <View style={styles.coinContainer}>
                        <Ionicons name="logo-bitcoin" size={18} color="#FFD700" />
                        <Text style={styles.coinText}>{userCoins}</Text>
                    </View>
                </View>

                <View style={[matchStyles.matchstickArea, themeStyles.matchstickArea]}>
                    <Text style={[matchStyles.label, themeStyles.textColor]}>
                        {heldMatchstick ? "Gdzie położyć?" : "Przesuń 1 zapałkę"}
                    </Text>

                    <View style={matchStyles.equationContainer}>
                        {equationChars.map((char, index) => (
                            <MatchstickSymbol
                                key={index}
                                char={char}
                                symbolIndex={index}
                                onSegmentPress={(segIdx) => handleSegmentPress(index, segIdx)}
                                heldMatchstick={heldMatchstick}
                            />
                        ))}
                    </View>
                </View>

                {status === 'playing' ? (
                    <View style={styles.controls}>
                        <TouchableOpacity style={[styles.button, { backgroundColor: COLORS.primary }]} onPress={handleCheck}>
                            <Text style={styles.buttonText}>Sprawdź</Text>
                        </TouchableOpacity>

                        <View style={styles.secondaryButtons}>
                            <TouchableOpacity style={[styles.smallButton, { backgroundColor: COLORS.grey }]} onPress={resetLevel}>
                                <Ionicons name="refresh" size={20} color="white" />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.hintButton, hintRevealed && {backgroundColor: '#4CAF50'}]}
                                onPress={buyHint}
                                disabled={hintRevealed}
                            >
                                <Ionicons name={hintRevealed ? "bulb" : "bulb-outline"} size={20} color="white" />
                                <Text style={styles.hintBtnText}>{hintRevealed ? "Odkryta" : "Podpowiedź (10)"}</Text>
                            </TouchableOpacity>
                        </View>

                        {hintRevealed && (
                            <View style={styles.hintBox}>
                                <Text style={styles.hintText}>{puzzle.hint}</Text>
                            </View>
                        )}
                    </View>
                ) : (
                    <TouchableOpacity style={[styles.button, { backgroundColor: COLORS.correct }]} onPress={handleNext}>
                        <Text style={styles.buttonText}>Następny Poziom ➜</Text>
                    </TouchableOpacity>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { padding: PADDING.medium, paddingTop: 40 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    title: { fontSize: FONT_SIZES.large, fontWeight: 'bold' },
    coinContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.1)', padding: 5, borderRadius: 12 },
    coinText: { fontWeight: 'bold', marginLeft: 5, color: '#F57F17' },
    button: { paddingVertical: 15, borderRadius: 25, width: '100%', alignItems: 'center', marginBottom: 10, elevation: 3 },
    buttonText: { color: 'white', fontSize: FONT_SIZES.medium, fontWeight: 'bold' },
    secondaryButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 10 },
    smallButton: { padding: 12, borderRadius: 12, width: 50, alignItems: 'center', justifyContent: 'center' },
    hintButton: { flex: 1, marginLeft: 10, backgroundColor: '#FF9800', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
    hintBtnText: { color: 'white', fontWeight: 'bold', marginLeft: 5 },
    controls: { width: '100%' },
    hintBox: { padding: 10, backgroundColor: '#FFF3E0', borderRadius: 8, marginTop: 5, borderWidth: 1, borderColor: '#FFE0B2' },
    hintText: { color: '#E65100', textAlign: 'center' }
});

const matchStyles = StyleSheet.create({
    matchstickArea: { borderRadius: 16, paddingVertical: 40, width: '100%', alignItems: 'center', marginBottom: 20, elevation: 2 },
    label: { fontSize: 16, marginBottom: 20, opacity: 0.7 },
    equationContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }
});

export default MatchstickEquationGame;
