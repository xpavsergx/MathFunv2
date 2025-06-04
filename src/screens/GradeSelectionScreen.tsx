// --- Фрагмент оновленого src/screens/GradeSelectionScreen.tsx ---
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
// Імпортуємо стилі теми
import { COLORS, FONT_SIZES, PADDING, MARGIN } from '../styles/theme';

type GradeSelectionProps = NativeStackScreenProps<RootStackParamList, 'GradeSelection'>;
const GRADES = [4, 5, 6, 7];

function GradeSelectionScreen({ navigation }: GradeSelectionProps) {
    const handleGradeSelect = (grade: number) => { /* ... логіка навігації ... */ navigation.navigate('TopicList', { grade: grade });};

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Wybierz swoją klasę:</Text>
            <View style={styles.buttonContainer}>
                {GRADES.map((grade) => (
                    <TouchableOpacity
                        key={grade}
                        style={styles.button} // Використовуємо оновлений стиль кнопки
                        onPress={() => handleGradeSelect(grade)}
                    >
                        {/* Використовуємо оновлений стиль тексту кнопки */}
                        <Text style={styles.buttonText}>Klasa {grade}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}

// Оновлені стилі з використанням теми
const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: PADDING.large, // Використовуємо константу
        backgroundColor: COLORS.backgroundLight, // Використовуємо колір з теми
    },
    title: {
        fontSize: FONT_SIZES.xlarge, // Використовуємо константу
        fontWeight: 'bold',
        marginBottom: MARGIN.large * 2, // Використовуємо константу
        color: COLORS.text, // Використовуємо колір з теми
    },
    buttonContainer: {
        width: '80%',
    },
    button: {
        backgroundColor: COLORS.primary, // Використовуємо колір з теми
        paddingVertical: PADDING.medium, // Використовуємо константу
        borderRadius: 25, // Зробимо їх більш круглими
        marginBottom: MARGIN.medium, // Використовуємо константу
        alignItems: 'center',
        elevation: 3,
    },
    buttonText: {
        color: COLORS.textLight, // Використовуємо колір з теми
        fontSize: FONT_SIZES.large, // Використовуємо константу
        fontWeight: 'bold',
    },
});

export default GradeSelectionScreen;
// --- Кінець фрагменту ---
