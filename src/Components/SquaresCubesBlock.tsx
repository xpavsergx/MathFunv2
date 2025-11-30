import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator,
} from 'react-native';

// 🔥 Importy Firebase pozostają bez zmian
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

// ZMIANA: Nowe ID dokumentu, które wczytamy z Firebase
const LESSON_ID = 'squaresCubes';
// 🔥 Dostosuj do liczby linii w Firestore: (introLines + stepLines + 1)
// Jeśli masz 2 linie intro, 4 kroki obliczeniowe, i 1 final block => 2+4+1 = 7.
// Na potrzeby przykładu: MAX_STEPS = 6 (0 do 6 = 7 kroków)
const MAX_STEPS = 5;

export default function SquaresCubesBlock() {
    const [step, setStep] = useState(0);
    const [lessonData, setLessonData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const handleNextStep = () => {
        setStep((prev) => (prev < MAX_STEPS ? prev + 1 : prev));
    };

    // --- ŁADOWANIE DANYCH Z FIREBASE ---
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const doc = await firestore()
                    .collection('lessons')
                    .doc(LESSON_ID)
                    .get();
                if (doc.exists) {
                    setLessonData(doc.data() || {});
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
                    // Logowanie anonimowe
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
    // ------------------------------------


    // 🔥 FUNKCJA WIZUALNIE PODKREŚLAJĄCA LICZBY
    const highlightNumbers = (text: string) => {
        // Dodajemy obsługę potęg (małe cyfry)
        const parts = text.split(/(\d+|\^2|\^3)/g);
        return parts.map((part, index) =>
            // Podświetlaj cyfry, oraz symbole potęg (^2, ^3)
            /(\d+|\^2|\^3)/.test(part) ? (
                <Text key={index} style={styles.numberHighlight}>
                    {part}
                </Text>
            ) : (
                <Text key={index}>{part}</Text>
            )
        );
    };


    // 🔥 FUNKCJA GENERUJĄCA KOLEJNE KROKI LEKCJI
    const getSteps = () => {
        if (!lessonData) return [];

        // Dane z Firebase są obiektami Map, przekształcamy na tablice, by zachować kolejność
        const introLines = Object.values(lessonData.intro || {});
        const stepLines = Object.values(lessonData.steps || {});

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


        // Zapewniamy, że tablica kroków będzie miała co najmniej 1 element (introBlock)
        const allSteps = [introBlock, ...calculationSteps, finalBlock];
        // Zwracamy tylko tyle elementów, ile wynosi aktualny 'step'
        return allSteps.slice(0, step + 1);
    };

    // --- Renderowanie ---

    if (loading) {
        return (
            <View style={[styles.wrapper, styles.loadingWrapper]}>
                <ActivityIndicator size="large" color="#FF8F00" />
                <Text style={[styles.intro, {marginTop: 10}]}>Ładowanie magicznych potęg...</Text>
            </View>
        );
    }

    if (!lessonData) {
        return (
            <View style={[styles.wrapper, styles.loadingWrapper]}>
                <Text style={[styles.intro, {color: '#D84315'}]}>Błąd: Nie znaleziono danych lekcji w Firestore dla ID: {LESSON_ID}. Upewnij się, że dokument 'squaresCubes' istnieje.</Text>
            </View>
        );
    }

    return (
        <View style={styles.wrapper}>
            <View style={styles.container}>
                <Text style={styles.title}>
                    {lessonData?.title || 'Kwadraty i sześciany liczb'}
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
    );
}

// ... (Styles pozostają niezmienione, aby pasowały do DivisionRemainderBlock)
const styles = StyleSheet.create({
    wrapper: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-start',
        backgroundColor: '#FAFAFA',
        paddingTop: 20,
    },
    loadingWrapper: {
        height: 300,
        padding: 20,
    },
    container: {
        backgroundColor: '#FFF8E1',
        borderRadius: 12,
        padding: 20,
        alignItems: 'center',
        width: '90%',
        elevation: 3,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#FF8F00',
        marginBottom: 10,
        textAlign: 'center',
    },
    scrollArea: {
        maxHeight: 450,
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