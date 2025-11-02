// src/screens/MatchstickEquationGame.tsx

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    Alert, useColorScheme
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS, FONT_SIZES, PADDING } from '../styles/theme';
import * as MatchstickEngine from '../utils/matchstickEngine';
import MatchstickSymbol from '../Components/MatchstickSymbol';

// База даних головоломок
const PUZZLE_LEVELS = [
    { id: 1, initial: "6+4=4", solution: "8-4=4", hint: "Spróbuj zmienić '6' na '8' i '+' на '-'." },
    { id: 2, initial: "9-5=6", solution: "9-3=6", hint: "Cyfra po znaku odejmowania jest błędna." },
    { id: 3, initial: "3+3=5", solution: "3+2=5", hint: "Zmień jedną cyfrę на inną." },
];

type HeldMatchstick = {
    symbolIndex: number;
    segmentIndex: number;
} | null;

function MatchstickEquationGame() {
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';
    const navigation = useNavigation();

    const [currentLevel, setCurrentLevel] = useState(0);
    const [status, setStatus] = useState<'playing' | 'solved'>('playing');
    const [equationChars, setEquationChars] = useState<string[]>([]);
    const [heldMatchstick, setHeldMatchstick] = useState<HeldMatchstick>(null);
    const [movesMade, setMovesMade] = useState(0);

    const puzzle = useMemo(() => PUZZLE_LEVELS[currentLevel], [currentLevel]);

    const resetLevel = useCallback(() => {
        setEquationChars(puzzle.initial.replace(/\s/g, '').split(''));
        setStatus('playing');
        setHeldMatchstick(null);
        setMovesMade(0);
    }, [puzzle.initial]);

    useEffect(() => {
        resetLevel();
    }, [currentLevel, resetLevel]);

    // ✅ --- ОНОВЛЕНА ЛОГІКА КЛІКІВ ---
    const handleSegmentPress = (symbolIndex: number, segmentIndex: number) => {
        if (status === 'solved') return;

        // Перевіряємо, чи ми не намагаємося зробити другий хід
        if (movesMade >= 1 && !heldMatchstick) {
            Alert.alert("Stop!", "Możesz wykonać only JEDEN ruch. Zresetuj poziom, aby spróbować ponownie.");
            return;
        }

        const char = equationChars[symbolIndex];
        const segmentsMapEntry = MatchstickEngine.SEGMENTS_MAP[char];
        if (!segmentsMapEntry) {
            console.error(`Brak definicji SEGMENTS_MAP dla symbolu: ${char}`);
            return;
        }

        const segments = [...segmentsMapEntry];

        if (!heldMatchstick) {
            // --- КРОК 1: ВЗЯТИ СІРНИК ---
            if (segments[segmentIndex] === 1) {
                setHeldMatchstick({ symbolIndex, segmentIndex });
                // Ми не змінюємо стан `equationChars` тут,
                // `MatchstickSymbol` сам оновить вигляд
            } else {
                Alert.alert("Pusto!", "Nie ma tu zapałki do wzięcia.");
            }
        } else {
            // --- КРОК 2: ПОСТАВИТИ СІРНИК ---

            // Якщо натиснули на те саме місце (скасування ходу)
            if (heldMatchstick.symbolIndex === symbolIndex && heldMatchstick.segmentIndex === segmentIndex) {
                setHeldMatchstick(null); // Просто кидаємо сірник
                return;
            }

            // Якщо місце зайняте
            if (segments[segmentIndex] === 1) {
                Alert.alert("Zajęte!", "Tu już jest zapałka. Odłóż najpierw tę, którą trzymasz.");
                return;
            }

            // --- МІСЦЕ ВІЛЬНЕ, ВИКОНУЄМО ХІД ---

            const newEquation = [...equationChars];

            // Перевіряємо, чи це рух В МЕЖАХ одного символу (напр. 5 -> 3)
            if (heldMatchstick.symbolIndex === symbolIndex) {

                // 'segments' вже є копією поточного символу
                segments[heldMatchstick.segmentIndex] = 0; // Забираємо старий
                segments[segmentIndex] = 1; // Ставимо новий

                const newChar = MatchstickEngine.segmentsToChar(segments);
                newEquation[symbolIndex] = newChar; // Оновлюємо символ у масиві

            } else {
                // Рух МІЖ ДВОМА СИМВОЛАMI (напр. 6+4=4)

                // 1. Оновлюємо символ, З ЯКОГО взяли
                const fromChar = equationChars[heldMatchstick.symbolIndex];
                const fromSegments = [...MatchstickEngine.SEGMENTS_MAP[fromChar]];
                fromSegments[heldMatchstick.segmentIndex] = 0; // Забираємо
                const newFromChar = MatchstickEngine.segmentsToChar(fromSegments);
                newEquation[heldMatchstick.symbolIndex] = newFromChar;

                // 2. Оновлюємо символ, НА ЯКИЙ поставили
                segments[segmentIndex] = 1; // Додаємо
                const newToChar = MatchstickEngine.segmentsToChar(segments);
                newEquation[symbolIndex] = newToChar;
            }

            setEquationChars(newEquation); // Оновлюємо стан рівняння
            setMovesMade(1); // Зараховуємо хід
            setHeldMatchstick(null); // Опускаємо сірник
        }
    };

    // Функція перевірки (без змін)
    const handleCheck = () => {
        if (heldMatchstick) {
            Alert.alert("Błąd", "Nadal trzymasz zapałkę! Odłóż ją gdzieś.");
            return;
        }
        if (movesMade !== 1) {
            Alert.alert("Błąd", "Musisz wykonać dokładnie jeden ruch.");
            return;
        }
        const finalEquation = equationChars.join('');
        const isCorrect = MatchstickEngine.isEquationCorrect(finalEquation);
        if (isCorrect) {
            setStatus('solved');
            Alert.alert("Brawo!", `Równanie jest poprawnie rozwiązane!`);
        } else {
            Alert.alert("Błąd", "Równanie jest niepoprawne. Spróbuj ponownie!");
        }
    }

    // Перехід до наступного рівня (без змін)
    const handleNext = () => {
        if (currentLevel < PUZZLE_LEVELS.length - 1) {
            setCurrentLevel(currentLevel + 1);
        } else {
            Alert.alert("Gratulacje!", "Ukończyłeś wszystkie poziomy!");
            navigation.goBack();
        }
    };

    // Стилі для теми (без змін)
    const themeStyles = {
        background: isDarkMode ? '#121212' : '#E0F7FA',
        title: { color: isDarkMode ? COLORS.primaryDarkTheme : COLORS.primaryDark },
        hint: { color: isDarkMode ? COLORS.grey : '#555' },
        matchstickArea: { backgroundColor: isDarkMode ? '#212121' : '#FFF', elevation: isDarkMode ? 3 : 1 },
    };

    return (
        <View style={[styles.container, { backgroundColor: themeStyles.background }]}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={[styles.title, themeStyles.title]}>Poziom {currentLevel + 1}</Text>

                <View style={[matchStyles.matchstickArea, themeStyles.matchstickArea]}>
                    <Text style={[matchStyles.label, themeStyles.hint]}>
                        {heldMatchstick ? "Kliknij, gdzie chcesz położyć zapałkę" : "Kliknij na zapałkę, aby ją podnieść"}
                    </Text>

                    {/* ВІДОБРАЖЕННЯ СІРНИКІВ */}
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

                    {status === 'solved' && (
                        <View style={matchStyles.solutionBox}>
                            <Text style={styles.buttonText}>✅ Równanie jest matematycznie poprawne!</Text>
                        </View>
                    )}
                </View>

                {status === 'playing' ? (
                    <>
                        <TouchableOpacity style={[styles.button, { backgroundColor: COLORS.primary }]} onPress={handleCheck}>
                            <Text style={styles.buttonText}>Sprawdź rozwiązanie</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.button, { backgroundColor: COLORS.grey }]} onPress={resetLevel}>
                            <Text style={styles.buttonText}>Resetuj</Text>
                        </TouchableOpacity>
                    </>
                ) : (
                    <>
                        <TouchableOpacity style={[styles.button, { backgroundColor: COLORS.correct }]} onPress={handleNext}>
                            <Text style={styles.buttonText}>Następny Poziom ➜</Text>
                        </TouchableOpacity>
                        <Text style={[styles.hintText, themeStyles.hint]}>Podpowiedź: {puzzle.hint}</Text>
                    </>
                )}
            </ScrollView>
        </View>
    );
}

// ... (styles) ...
const styles = StyleSheet.create({
    container: { flex: 1, },
    scrollContent: {
        padding: PADDING.large,
        alignItems: 'center',
        paddingTop: 40
    },
    title: {
        fontSize: FONT_SIZES.xlarge,
        fontWeight: 'bold',
        marginBottom: 30,
    },
    button: {
        paddingVertical: 15,
        paddingHorizontal: 30,
        borderRadius: 25,
        marginTop: 15,
        width: '80%',
        alignItems: 'center',
        elevation: 4,
    },
    buttonText: {
        color: 'white',
        fontSize: FONT_SIZES.medium,
        fontWeight: 'bold',
    },
    hintText: {
        marginTop: 20,
        fontSize: FONT_SIZES.medium - 1,
        textAlign: 'center'
    }
});

// ... (matchStyles) ...
const matchStyles = StyleSheet.create({
    matchstickArea: {
        borderRadius: 10,
        paddingVertical: 30,
        paddingHorizontal: 10,
        marginBottom: 20,
        width: '100%',
        alignItems: 'center',
        minHeight: 200,
        justifyContent: 'center',
    },
    label: {
        fontSize: FONT_SIZES.medium,
        marginBottom: 20,
        textAlign: 'center'
    },
    equationContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
    },
    solutionBox: {
        marginTop: 20,
        padding: 10,
        backgroundColor: COLORS.correct,
        borderRadius: 8,
    },
});

export default MatchstickEquationGame;
