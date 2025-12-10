import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator,
    ImageBackground, // 🔥 DODANO IMPORT ImageBackground
} from 'react-native';

import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

// 🔥 KLUCZ DOKUMENTU Z FIREBASE
const LESSON_ID = 'oileWiecejoileMniej';
// MAX_STEPS = 6 (jeśli treść ma 7 bloków: intro, steps, final)
const MAX_STEPS = 5; // Zmieniam na 6, aby upewnić się, że finalResult i tip są widoczne na końcu.

export default function OileExplanationBlock() {
    const [step, setStep] = useState(0);
    const [lessonData, setLessonData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const handleNextStep = () => {
        setStep((prev) => (prev < MAX_STEPS ? prev + 1 : prev));
    };

    // --- LOGIKA POBIERANIA DANYCH Z FIREBASE ---
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
                        // Przekształcenie Map z Firebase na Array
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
    // ---------------------------------------------


    // FUNKCJA WIZUALNIE PODKREŚLAJĄCA LICZBY
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


    // FUNKCJA GENERUJĄCA KOLEJNE KROKI LEKCJI
    const getSteps = () => {
        if (!lessonData) return [];

        const introLines = lessonData.intro;
        const stepLines = lessonData.steps;

        // --- 1. KROK 0, 1 (Blok Wprowadzający) ---
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


        // --- 2. Kroki Właściwe (Steps 2, 3, 4, 5) ---
        // Pamiętaj, że w Firebase masz 4 elementy w 'steps' (0 do 3)
        const calculationSteps = stepLines.map((stepText: string, index: number) => (
            <Text key={`step-${index}`} style={styles.stepText}>
                {highlightNumbers(stepText)}
            </Text>
        ));


        // --- 3. Krok Końcowy (Final Block, index 6) ---
        const finalBlock = (
            <View key="final" style={styles.finalBlock}>
                <Text style={styles.finalResult}>
                    {highlightNumbers(lessonData.finalResult || '')}
                </Text>
                {/* TIP jest teraz polem w dokumencie, więc go renderujemy */}
                <Text style={styles.tip}>{highlightNumbers(lessonData.tip || '')}</Text>
            </View>
        );


        const allSteps = [introBlock, ...calculationSteps, finalBlock];
        return allSteps.slice(0, step + 1);
    };

    // --- Renderowanie stanu ładowania/błędu ---
    if (loading) {
        return (
            <View style={[styles.wrapper, styles.loadingWrapper]}>
                <ActivityIndicator size="large" color="#FF8F00" />
                <Text style={[styles.intro, {marginTop: 10}]}>Ładowanie danych...</Text>
            </View>
        );
    }

    if (!lessonData || lessonData.intro.length === 0) {
        return (
            <View style={[styles.wrapper, styles.loadingWrapper]}>
                <Text style={[styles.intro, {color: '#D84315'}]}>Błąd: Nie znaleziono danych lekcji w Firestore dla ID: {LESSON_ID}.</Text>
            </View>
        );
    }

    // --- Renderowanie głównej treści krok po kroku ---
    return (
        // 🔥 Wstawienie ImageBackground
        <ImageBackground
            source={require('../assets/tloTeorii.png')} // Zmień na właściwą ścieżkę do Twojego pliku graficznego
            style={styles.backgroundImage}
            resizeMode="cover"
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <Text style={styles.title}>
                        {lessonData?.title || 'O ile więcej, o ile mniej'}
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
    // 🔥 NOWE STYLE DLA TŁA I WARSTWY
    backgroundImage: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    overlay: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: 20,
    },

    // Zmieniono 'wrapper' na 'overlay' dla widoku głównego, ale zachowano dla ładowania
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
    // 🔥 ZMIENIONO TŁO NA PÓŁPRZEZROCZYSTE DLA WIDOCZNOŚCI GRAFIKI
    container: {
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
        borderRadius: 12,
        padding: 20,
        alignItems: 'center',
        width: '90%',
        elevation: 3,
        maxWidth: 600,
        marginBottom: 20,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#FF8F00',
        marginBottom: 10,
        textAlign: 'center',
    },
    scrollArea: {
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