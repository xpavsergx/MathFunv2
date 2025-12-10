import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator,
    ImageBackground,
} from 'react-native';

import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

// 🚀 ZMIANA: Nowe ID dokumentu dla "Kolejność wykonywania działań"
const LESSON_ID = 'orderOfOperations';
// 🚀 ZMIANA: Max kroki do wyświetlenia (intro + 2 kroki + finalResult = 4 bloki)
const MAX_STEPS = 3;

export default function OrderOfOperationsBlock() {
    const [step, setStep] = useState(0);
    const [lessonData, setLessonData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const handleNextStep = () => {
        // Kontroluje przejście do następnego kroku, aż do MAX_STEPS
        setStep((prev) => (prev < MAX_STEPS ? prev + 1 : prev));
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const doc = await firestore()
                    .collection('lessons')
                    .doc(LESSON_ID)
                    .get();
                if (doc.exists) {
                    const data = doc.data();
                    if (data) {
                        // Parsowanie obiektów Firestore do tablicy dla łatwiejszego mapowania
                        setLessonData({
                            ...data,
                            intro: Object.values(data.intro || {}),
                            steps: Object.values(data.steps || {}),
                        });
                    }
                } else {
                    console.warn(`Nie znaleziono dokumentu dla ${LESSON_ID}.`);
                    setLessonData(null);
                }
            } catch (error) {
                console.error('Błąd ładowania danych Firestore:', error);
                setLessonData(null);
            } finally {
                setLoading(false);
            }
        };

        const prepareAndFetch = async () => {
            if (!auth().currentUser) {
                try {
                    await auth().signInAnonymously();
                } catch (error) {
                    console.error('Failed to sign in anonymously:', error);
                    setLoading(false);
                    return;
                }
            }
            fetchData();
        };

        prepareAndFetch();
    }, []);

    // Funkcja do wyróżniania liczb i operatorów
    const highlightElements = (text: string) => {
        // Wyróżnia liczby oraz nawiasy i operatory (+, -, *, /)
        const parts = text.split(/(\d+|\(|\)|\+|\-|\*|\/|=)/g);
        return parts.map((part, index) =>
            // Sprawdzamy czy to liczba lub operator
            /(\d+|\(|\)|\+|\-|\*|\/|=)/.test(part) ? (
                <Text key={index} style={styles.numberHighlight}>
                    {part}
                </Text>
            ) : (
                <Text key={index}>{part}</Text>
            )
        );
    };

    const getSteps = () => {
        if (!lessonData) return [];

        const introLines = lessonData.intro;
        const stepLines = lessonData.steps;

        // --- 1. KROK 0 (Blok Wprowadzający) ---
        const introBlock = (
            <View key="intro" style={styles.introBlock}>
                {introLines.map((line: string, index: number) => {
                    const isFirstLine = index === 0;
                    return (
                        <Text
                            key={`intro-${index}`}
                            style={[styles.intro, isFirstLine && styles.introBold]}
                        >
                            {highlightElements(line)}
                        </Text>
                    );
                })}
            </View>
        );


        // --- 2. Kroki Właściwe (Steps 1, 2...) ---
        const calculationSteps = stepLines.map((stepText: string, index: number) => (
            <Text key={`step-${index}`} style={styles.stepText}>
                {highlightElements(stepText)}
            </Text>
        ));


        // --- 3. Krok Końcowy (Final Block) ---
        const finalBlock = (
            <View key="final" style={styles.finalBlock}>
                <Text style={styles.finalResult}>
                    {highlightElements(lessonData.finalResult || '')}
                </Text>
                <Text style={styles.tip}>{highlightElements(lessonData.tip || '')}</Text>
            </View>
        );


        const allSteps = [introBlock, ...calculationSteps, finalBlock];
        return allSteps.slice(0, step + 1);
    };

    if (loading) {
        return (
            <View style={[styles.wrapper, styles.loadingWrapper]}>
                <ActivityIndicator size="large" color="#FF8F00" />
                <Text style={[styles.intro, {marginTop: 10}]}>Ładowanie danych...</Text>
            </View>
        );
    }

    if (!lessonData) {
        return (
            <View style={[styles.wrapper, styles.loadingWrapper]}>
                <Text style={[styles.intro, {color: '#D84315'}]}>Błąd: Nie znaleziono danych lekcji w Firestore dla ID: {LESSON_ID}.</Text>
            </View>
        );
    }

    return (
        <ImageBackground
            // 💡 Użycie tła z symbolami matematycznymi (jak w Dodawaniu)
            source={require('../assets/tloTeorii.png')}
            style={styles.backgroundImage}
            resizeMode="cover"
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <Text style={styles.title}>
                        {lessonData?.title || 'Kolejność wykonywania działań'}
                    </Text>

                    <ScrollView
                        style={styles.scrollArea}
                        contentContainerStyle={styles.scrollContent}
                    >
                        {getSteps()}
                    </ScrollView>

                    {/* Przycisk "Dalej" znika po osiągnięciu maksymalnego kroku */}
                    {step < MAX_STEPS && (
                        <TouchableOpacity style={styles.button} onPress={handleNextStep}>
                            <Text style={styles.buttonText}>Dalej ➜</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </ImageBackground>
    );
}


// --- STYLE ---

const styles = StyleSheet.create({
    // Ustawienia dla stanu ładowania/błędu
    wrapper: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FAFAFA',
        paddingTop: 20,
    },
    loadingWrapper: {
        height: 300,
        padding: 20,
    },

    // 🚀 Style dla tła i kontenera teorii
    backgroundImage: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    overlay: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-start', // Zapewnia, że zawartość zaczyna się od góry
        paddingTop: 20,
    },
    container: {
        //flex: 1, // 🔥 Zapewnia rozciągnięcie bloku na całą dostępną wysokość
        // Półprzezroczysty biały, by tło graficzne było widoczne
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
        borderRadius: 12,
        padding: 20,
        alignItems: 'center',
        width: '90%',
        elevation: 3,
        maxWidth: 600,
        marginBottom: 20,
    },
    scrollArea: {
        // flex: 1, // 🔥 Zapewnia, że ScrollView wypełnia całą dostępną przestrzeń wewnątrz container
        width: '100%',
    },
    scrollContent: {
        alignItems: 'center',
        paddingBottom: 50,
    },

    // 🚀 Style dla tekstu i kroków
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#FF8F00',
        marginBottom: 10,
        textAlign: 'center',
    },
    introBlock: {
        alignItems: 'center',
        marginBottom: 10,
    },
    intro: {
        fontSize: 18,
        color: '#424242',
        textAlign: 'center',
        marginBottom: 6,
    },
    introBold: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#D84315',
        marginBottom: 10,
    },
    stepText: {
        fontSize: 20,
        textAlign: 'center',
        marginVertical: 8,
        color: '#5D4037',
    },
    numberHighlight: {
        color: '#1976D2',
        fontWeight: 'bold',
        fontSize: 22,
    },
    finalBlock: {
        alignItems: 'center',
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#FFD54F',
    },
    finalResult: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#D84315',
        textAlign: 'center',
        marginTop: 10,
    },
    tip: {
        fontSize: 16,
        marginTop: 10,
        color: '#00796B',
        fontStyle: 'italic',
        textAlign: 'center',
    },

    // 🚀 Style dla przycisku
    button: {
        backgroundColor: '#FFD54F',
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 25,
        marginTop: 20,
    },
    buttonText: {
        fontSize: 18,
        color: '#5D4037',
        fontWeight: 'bold',
    },
});