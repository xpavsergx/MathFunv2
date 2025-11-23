import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
} from 'react-native';

import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

// Stałe ID dokumentu w Firestore dla tego bloku lekcji
const LESSON_ID = 'timesMoreLess';
// MAX_STEPS = 3 (linie steps) + 1 (finalBlock) = 4
const MAX_STEPS = 4;

export default function TimesMoreLessBlock() {
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

    /**
     * Generuje widok kroków. Zaczyna od razu od Kroku 1 (obliczeń).
     */
    const getSteps = () => {
        if (!lessonData) return [];

        // Pole intro jest usunięte z bazy, więc nie jest używane.
        const stepLines = Array.isArray(lessonData.steps) ? lessonData.steps : [];

        // --- 1. Kroki Właściwe (Kroki 0, 1, 2...) ---
        const calculationSteps = stepLines.map((stepText: string, index: number) => (
            <Text key={`step-${index}`} style={styles.stepText}>
                {highlightNumbers(stepText)}
            </Text>
        ));


        // --- 2. Krok Końcowy (Final Block) ---
        const finalBlock = (
            <View key="final" style={styles.finalBlock}>
                <Text style={styles.finalResult}>
                    {highlightNumbers(lessonData.finalResult || '')}
                </Text>
                <Text style={styles.tip}>{highlightNumbers(lessonData.tip || '')}</Text>
            </View>
        );


        // Budujemy tablicę wszystkich elementów: [Step1, Step2, Step3, FinalBlock]
        // Zaczynamy od razu od kroków obliczeniowych
        const allSteps = [...calculationSteps, finalBlock];

        // Zwracamy tylko elementy do bieżącego stanu 'step'
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
        <View style={styles.wrapper}>
            <View style={styles.container}>
                <Text style={styles.title}>
                    {lessonData?.title || 'Ile razy więcej, ile razy mniej'}
                </Text>

                <ScrollView
                    style={styles.scrollArea}
                    contentContainerStyle={styles.scrollContent}
                >
                    {getSteps()}
                </ScrollView>

                {/* Zabezpieczenie przed przejściem poza maksymalny krok */}
                {step < MAX_STEPS && (
                    <TouchableOpacity style={styles.button} onPress={handleNextStep}>
                        <Text style={styles.buttonText}>Dalej ➜</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FAFAFA',
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
        maxWidth: 600,
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
    // Styl podstawowy dla reszty tekstu wprowadzającego (nie jest już używany)
    intro: {
        fontSize: 18,
        color: '#424242',
        textAlign: 'center',
        marginBottom: 6,
    },
    // Styl gwarantujący widoczność (dla całego introBlock)
    introVisibleStyle: {
        fontSize: 18,
        color: '#333333',
        fontWeight: '500',
        textAlign: 'center',
        marginVertical: 4,
    },
    // Styl dla pierwszej linii intro (pytania) - nadpisuje introVisibleStyle
    introFirstLine: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#D84315',
        marginBottom: 10,
        marginTop: 5,
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