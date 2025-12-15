// src/screens/GradeSelectionScreen.tsx

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainAppStackParamList } from '../../App';
import { COLORS, FONT_SIZES, PADDING, MARGIN } from '../styles/theme';

type GradeSelectionProps = NativeStackScreenProps<MainAppStackParamList, 'GradeSelection'>;

const GRADES = [4, 5, 6, 7];

function GradeSelectionScreen({ navigation, route }: GradeSelectionProps) {
    const { mode } = route.params;

    const handleGradeSelect = (grade: number) => {
        navigation.navigate('TopicList', { grade: grade, mode: mode });
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>
                {mode === 'test' ? 'Testy: Wybierz klasę' : 'Ćwiczenia: Wybierz klasę'}
            </Text>

            <View style={styles.buttonContainer}>
                {GRADES.map((grade) => (
                    <TouchableOpacity
                        key={grade}
                        style={[
                            styles.button,
                            mode === 'test' ? { backgroundColor: '#2196F3' } : { backgroundColor: '#4CAF50' }
                        ]}
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
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: PADDING.large, backgroundColor: COLORS.backgroundLight },
    title: { fontSize: FONT_SIZES.xlarge, fontWeight: 'bold', marginBottom: MARGIN.large * 2, color: COLORS.text },
    buttonContainer: { width: '80%' },
    button: { paddingVertical: PADDING.medium, borderRadius: 25, marginBottom: MARGIN.medium, alignItems: 'center', elevation: 3 },
    buttonText: { color: COLORS.textLight, fontSize: FONT_SIZES.large, fontWeight: 'bold' },
});

export default GradeSelectionScreen;
