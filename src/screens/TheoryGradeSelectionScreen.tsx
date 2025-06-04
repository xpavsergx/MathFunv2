import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { TheoryStackParamList } from '../../App'; // Імпортуємо типи
// Можна імпортувати стилі теми, якщо є
// import { COLORS, FONT_SIZES, PADDING, MARGIN } from '../../styles/theme';

// Типізуємо props
type TheoryGradeSelectionScreenProps = NativeStackScreenProps<TheoryStackParamList, 'TheoryGradeSelection'>;

const GRADES = ["4", "5", "6", "7"]; // Класи як рядки, відповідно до ключів у questionsDb.json

function TheoryGradeSelectionScreen({ navigation }: TheoryGradeSelectionScreenProps) {
    const handleGradeSelect = (grade: string) => {
        navigation.navigate('TheoryTopicList', { grade: grade });
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Wybierz klasę dla teorii:</Text>
            <View style={styles.buttonContainer}>
                {GRADES.map((grade) => (
                    <TouchableOpacity
                        key={grade}
                        style={styles.button}
                        onPress={() => handleGradeSelect(grade)}
                    >
                        <Text style={styles.buttonText}>Klasa {grade}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20, // PADDING.large,
        backgroundColor: '#E0F7FA', // COLORS.backgroundLight,
    },
    title: {
        fontSize: 22, // FONT_SIZES.xlarge,
        fontWeight: 'bold',
        marginBottom: 40, // MARGIN.large * 2,
        color: '#00796B', // COLORS.text,
        textAlign: 'center',
    },
    buttonContainer: {
        width: '80%',
    },
    button: {
        backgroundColor: '#00BCD4', // COLORS.primary,
        paddingVertical: 15, // PADDING.medium,
        borderRadius: 25,
        marginBottom: 15, // MARGIN.medium,
        alignItems: 'center',
        elevation: 3,
    },
    buttonText: {
        color: '#FFFFFF', // COLORS.textLight,
        fontSize: 18, // FONT_SIZES.large,
        fontWeight: 'bold',
    },
});

export default TheoryGradeSelectionScreen;
