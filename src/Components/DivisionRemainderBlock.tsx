import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator,
    ImageBackground, // Dodano import ImageBackground
} from 'react-native';

import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

// Ustawienie klucza dokumentu
const LESSON_ID = 'remainder';
// Wartość MAX_STEPS zależy od zawartości Firebase (liczba linii intro + liczba linii steps + final block)
const MAX_STEPS = 4;

export default function DivisionRemainderBlock() {
    const [step, setStep] = useState(0);
    const [lessonData, setLessonData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const handleNextStep = () => {
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
                        // Spójne parsowanie danych: zakłada, że intro i steps to mapy w Firebase
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

    const highlightNumbers = (text: string) => {
        const parts = text.split(/(\d+)/g);
        return parts.map((part, index) =>
            /\d+/.test(part) ? (
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
                            {highlightNumbers(line)}
                        </Text>
                    );
                })}
            </View>
        );


        // --- 2. Kroki Właściwe (Steps 1, 2, 3...) ---
        const calculationSteps = stepLines.map((stepText: string, index: number) => (
            <Text key={`step-${index}`} style={styles.stepText}>
                {highlightNumbers(stepText)}
            </Text>
        ));


        // --- 3. Krok Końcowy (Final Block) ---
        const finalBlock = (
            <View key="final" style={styles.finalBlock}>
                <Text style={styles.finalResult}>
                    {highlightNumbers(lessonData.finalResult || '')}
                </Text>
                <Text style={styles.tip}>{highlightNumbers(lessonData.tip || '')}</Text>
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
        // 🚀 Krok 1: Wstawienie tła ImageBackground
        <ImageBackground
            source={require('../assets/tloTeorii.png')}
            style={styles.backgroundImage}
            resizeMode="cover"
        >
            {/* 🚀 Krok 2: Użycie warstwy overlay do pozycjonowania i centrowania */}
            <View style={styles.overlay}>
                {/* 🚀 Krok 3: Kontener teorii (żółty/biały blok) */}
                <View style={styles.container}>
                    <Text style={styles.title}>
                        {lessonData?.title || 'Dzielenie z resztą'}
                    </Text>

                    <ScrollView
                        style={styles.scrollArea}
                        contentContainerStyle={styles.scrollContent}
                    >
                        {getSteps()}
                    </ScrollView>

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

const styles = StyleSheet.create({
    // --- NOWE/ZModyfikowane Style ---
    backgroundImage: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    overlay: {
        flex: 1, // Wypełnia całe tło
        alignItems: 'center',
        // Zmieniono na 'flex-start', aby zawartość zaczynała się od góry
        justifyContent: 'flex-start',
        paddingTop: 20,
    },
    wrapper: { // Zostawiono dla stanu ładowania, ale bez tła
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FAFAFA',
        paddingTop: 20,
    },
    container: {
        // 🔥 Dodano flex: 1, aby żółty/biały blok rozciągał się na całą wysokość pod nagłówkiem
        flex: 1,
        // Zmieniono kolor na półprzezroczysty, aby tło graficzne przebijało
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
        borderRadius: 12,
        padding: 20,
        alignItems: 'center',
        width: '90%',
        elevation: 3,
        maxWidth: 600,
        marginBottom: 20, // Mały margines od dolnego paska nawigacji
    },

    // --- ISTNIEJĄCE STYLE ---
    loadingWrapper: {
        height: 300,
        padding: 20,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#FF8F00',
        marginBottom: 10,
        textAlign: 'center',
    },
    scrollArea: {
        // Usunięto maxHeight: 450, bo container ma flex: 1, scrollArea musi rosnąć elastycznie
        width: '100%',
    },
    scrollContent: {
        alignItems: 'center',
        paddingBottom: 50,
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