// src/screens/MatchstickEquationGame.tsx

import React, { useState, useCallback, useMemo, useEffect } from 'react'; // ✅ ВИПРАВЛЕНО: Додано useEffect
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Dimensions, useColorScheme, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS, FONT_SIZES, PADDING } from '../styles/theme';
import * as MatchstickEngine from '../utils/matchstickEngine'; // ✅ ВИПРАВЛЕНО ШЛЯХ

// База даних головоломок: [початкове рівняння, правильне рівняння, підказка]
const PUZZLE_LEVELS = [
    { id: 1, initial: "6 + 4 = 4", solution: "8 - 4 = 4", hint: "Спробуй змінити 6 на 8 та + на -" },
    { id: 2, initial: "5 + 5 = 5", solution: "5 = 5 - 0", hint: "Зміни знак додавання на рівності." },
    { id: 3, initial: "3 + 3 = 5", solution: "3 + 2 = 5", hint: "Зміни одну цифру на іншу." },
    { id: 4, initial: "9 - 5 = 6", solution: "9 - 3 = 6", hint: "Цифра після знаку віднімання невірна." },
    { id: 5, initial: "5 + 5 = 550", solution: "5 + 5 = 550" , hint: "Недоступно для тесту" }, // Заглушка
];

// Утиліта для відображення рівняння зі стилями
const EquationDisplay = React.memo(({ equation, isSolved, setInputEquation }) => {
    return (
        <View style={matchStyles.equationContainer}>
            <TextInput
                style={[matchStyles.inputEquation, isSolved && matchStyles.solvedInput]}
                onChangeText={setInputEquation}
                value={equation}
                editable={!isSolved}
                keyboardType="default"
                placeholder="Wpisz rozwiązanie (np. 8-4=4)"
                placeholderTextColor={isSolved ? COLORS.white : "#A0A0A0"}
                autoCapitalize="none"
            />
        </View>
    );
});


function MatchstickEquationGame() {
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';
    const navigation = useNavigation();

    const [currentLevel, setCurrentLevel] = useState(0);
    const [status, setStatus] = useState<'playing' | 'solved'>('playing');
    const [inputEquation, setInputEquation] = useState(''); // Рівняння, яке вводить гравець

    // Вибрана головоломка
    const puzzle = useMemo(() => PUZZLE_LEVELS[currentLevel], [currentLevel]);

    // Ініціалізація або скидання рівня
    useEffect(() => {
        setInputEquation(puzzle.initial.replace(/\s/g, ''));
        setStatus('playing');
    }, [currentLevel, puzzle.initial]);


    // ✅ ФУНКЦІЯ ПЕРЕВІРКИ
    const handleCheck = () => {
        // 1. Перевіряємо, чи нове рівняння є математично правильним
        const isCorrectResult = MatchstickEngine.isEquationCorrect(inputEquation);

        // 2. Перевіряємо, чи рішення відрізняється від початкового
        const isDifferentFromInitial = inputEquation.replace(/\s/g, '') !== puzzle.initial.replace(/\s/g, '');

        if (!isDifferentFromInitial) {
            Alert.alert("Błąd", "Wprowadzone równanie jest takie samo jak początkowe.");
            return;
        }

        if (isCorrectResult) {
            // Тут має бути реальна перевірка правила "один сірник":
            // const isOneMoveValid = MatchstickEngine.checkMatchstickRule(puzzle.initial, inputEquation);
            // if (!isOneMoveValid) { Alert.alert("Błąd", "Równanie jest poprawne, ale wymaga więcej niż jednego ruchu zapałką."); return; }

            setStatus('solved');
            Alert.alert("Brawo!", `Równanie jest poprawne: ${inputEquation}`);
        } else {
            Alert.alert("Błąd", "Równanie jest niepoprawne lub niezgodne z zasadą jednej zapałki. Spróbuj ponownie!");
        }
    }

    // Обробка пропуску/завершення
    const handleNext = () => {
        if (currentLevel < PUZZLE_LEVELS.length - 1) {
            setCurrentLevel(currentLevel + 1);
        } else {
            Alert.alert("Gratulacje!", "Ukończyłeś wszystkie poziomy!");
            navigation.goBack();
        }
    };

    // Стилі для теми
    const themeStyles = {
        background: isDarkMode ? COLORS.backgroundDark : COLORS.backgroundLight,
        title: { color: isDarkMode ? COLORS.primaryDarkTheme : COLORS.primaryDark },
        hint: { color: isDarkMode ? COLORS.grey : '#555' },
        button: { backgroundColor: COLORS.primary }
    };

    return (
        <View style={[styles.container, { backgroundColor: themeStyles.background }]}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={[styles.title, themeStyles.title]}>Poziom {currentLevel + 1}</Text>

                <Text style={[matchStyles.currentEquation, {color: themeStyles.title.color}]}>
                    Początkowe: {puzzle.initial}
                </Text>

                {/* ✅ ПОЛЕ ВВЕДЕННЯ ДЛЯ РОЗВ'ЯЗКУ */}
                <View style={matchStyles.matchstickArea}>
                    <Text style={[matchStyles.label, {color: themeStyles.hint.color}]}>Twoje rozwiązanie:</Text>
                    <EquationDisplay
                        equation={inputEquation}
                        isSolved={status === 'solved'}
                        setInputEquation={setInputEquation}
                    />

                    {status === 'solved' && (
                        <View style={matchStyles.solutionBox}>
                            <Text style={matchStyles.solutionText}>✅ Równanie jest matematycznie poprawne!</Text>
                        </View>
                    )}
                </View>

                {status === 'playing' ? (
                    <>
                        <TouchableOpacity style={[styles.button, { backgroundColor: COLORS.primary }]} onPress={handleCheck} disabled={!inputEquation}>
                            <Text style={styles.buttonText}>Sprawdź rozwiązanie</Text>
                        </TouchableOpacity>

                        <Text style={[styles.hintText, themeStyles.hint]}>
                            Zasada: Przesuń tylko JEDNĄ zapałkę, aby równanie było poprawne.
                        </Text>
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
        marginTop: 30,
        width: '80%',
        alignItems: 'center',
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

// Стилі, що стосуються симуляції сірників
const matchStyles = StyleSheet.create({
    matchstickArea: {
        backgroundColor: '#D2B48C', // Колір дерева/поверхні
        borderRadius: 10,
        padding: 20,
        marginBottom: 20,
        width: '100%',
        alignItems: 'center',
        minHeight: 180, // Даємо більше місця
        justifyContent: 'center',
    },
    label: {
        fontSize: FONT_SIZES.medium,
        marginBottom: 10,
    },
    currentEquation: {
        fontSize: FONT_SIZES.large,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    equationContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        flexWrap: 'wrap',
    },
    inputEquation: {
        fontSize: 30,
        fontWeight: 'bold',
        textAlign: 'center',
        backgroundColor: COLORS.white,
        borderRadius: 8,
        padding: 10,
        borderWidth: 3,
        borderColor: '#5D4037', // Коричнева рамка
        width: '90%',
        color: COLORS.black,
    },
    solvedInput: {
        borderColor: COLORS.correct,
        backgroundColor: '#E8F5E9',
        color: COLORS.correct,
    },
    solutionBox: {
        marginTop: 20,
        padding: 10,
        backgroundColor: COLORS.correct,
        borderRadius: 8,
    },
    solutionText: {
        fontSize: FONT_SIZES.medium,
        fontWeight: 'bold',
        color: COLORS.white,
    }
});

export default MatchstickEquationGame;
