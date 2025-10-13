// src/Components/OileExplanationBlock.tsx

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

const OileExplanationBlock = () => {
    const [showTheory, setShowTheory] = useState(true);
    const [exampleIndex, setExampleIndex] = useState(0);
    const [scale] = useState(new Animated.Value(1));

    const examples = [
        {
            question: 'Ala ma 8 jabłek. Basia ma o 3 jabłka więcej. Ile jabłek ma Basia?',
            explanation: 'Skoro ma **o 3 więcej**, dodajemy:\n\n8 + 3 = 11',
            answer: 'Basia ma 11 jabłek.',
        },
        {
            question: 'Karol ma 15 zł. Michał ma o 5 zł mniej. Ile ma Michał?',
            explanation: 'Skoro ma **o 5 mniej**, odejmujemy:\n\n15 - 5 = 10',
            answer: 'Michał ma 10 zł.',
        },
        {
            question: 'W klasie jest 12 dziewczynek, a chłopców o 4 więcej. Ilu jest chłopców?',
            explanation: 'Dodajemy:\n\n12 + 4 = 16',
            answer: 'Jest 16 chłopców.',
        },
    ];

    const animateCard = () => {
        Animated.sequence([
            Animated.timing(scale, { toValue: 1.05, duration: 200, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
            Animated.timing(scale, { toValue: 1, duration: 200, useNativeDriver: true, easing: Easing.in(Easing.ease) }),
        ]).start();
    };

    const handleNextExample = () => {
        const next = (exampleIndex + 1) % examples.length;
        setExampleIndex(next);
        animateCard();
    };

    return (
        <View style={styles.container}>
            <Text style={styles.header}>🧠 O ile więcej / o ile mniej</Text>

            {showTheory ? (
                <View style={styles.theoryBlock}>
                    <Text style={styles.theoryText}>
                        W matematyce, słowo **"o"** oznacza, że coś jest **większe lub mniejsze** w porównaniu do innej wartości.
                    </Text>
                    <Text style={styles.theoryText}>
                        Jeśli mamy **"o X więcej"** → dodajemy liczbę.\n\n
                        Jeśli mamy **"o X mniej"** → odejmujemy liczbę.
                    </Text>

                    <TouchableOpacity style={styles.button} onPress={() => setShowTheory(false)}>
                        <Ionicons name="play" size={20} color="#fff" />
                        <Text style={styles.buttonText}>Zobacz przykłady</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
                    <Text style={styles.questionText}>{examples[exampleIndex].question}</Text>
                    <Text style={styles.explanationText}>{examples[exampleIndex].explanation}</Text>
                    <Text style={styles.answerText}>{examples[exampleIndex].answer}</Text>

                    <TouchableOpacity style={styles.button} onPress={handleNextExample}>
                        <Ionicons name="refresh" size={20} color="#fff" />
                        <Text style={styles.buttonText}>Następny przykład</Text>
                    </TouchableOpacity>
                </Animated.View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
        backgroundColor: '#E3F2FD',
        borderRadius: 12,
        margin: 16,
    },
    header: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1E88E5',
        marginBottom: 16,
        textAlign: 'center',
    },
    theoryBlock: {
        backgroundColor: '#FFFDE7',
        padding: 16,
        borderRadius: 8,
    },
    theoryText: {
        fontSize: 16,
        color: '#424242',
        marginBottom: 12,
        lineHeight: 24,
    },
    button: {
        flexDirection: 'row',
        backgroundColor: '#1E88E5',
        padding: 10,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 16,
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        marginLeft: 8,
    },
    card: {
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderRadius: 12,
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
    },
    questionText: {
        fontSize: 17,
        fontWeight: '600',
        color: '#37474F',
        marginBottom: 12,
    },
    explanationText: {
        fontSize: 15,
        color: '#546E7A',
        marginBottom: 10,
        lineHeight: 22,
    },
    answerText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2E7D32',
        marginBottom: 16,
    },
});

export default OileExplanationBlock;
