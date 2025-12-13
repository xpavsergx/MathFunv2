import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator,
    ImageBackground,
} from 'react-native';

import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

// 🚀 ID dokumentu dla "Jednostki Masy"
const LESSON_ID = 'massUnits'; // <--- NOWY ID DLA JEDNOSTEK MASY
// 🚀 Ustal maksymalną liczbę kroków dla tego tematu (dostosuj do danych z Firestore)
const MAX_STEPS = 6; // <--- Przykładowa wartość

export default function MassUnitsBlock() {
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

    // 🔥 NOWA FUNKCJA HIGHLIGHT: Wyróżnia liczby ORAZ jednostki masy
    const highlightElements = (text: string) => {
        // \d+ (liczby) ORAZ to, co jest w nawiasach: \([^)]+\)
        const parts = text.split(/(\d+|\([^)]+\))/g);

        return parts.map((part, index) =>
            /(\d+|\([^)]+\))/.test(part) ? (
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

        const calculationSteps = stepLines.map((stepText: string, index: number) => (
            <Text key={`step-${index}`} style={styles.stepText}>
                {highlightElements(stepText)}
            </Text>
        ));

        const finalBlock = lessonData.finalResult ? (
            <View key="final" style={styles.finalBlock}>
                <Text style={styles.finalResult}>
                    {highlightElements(lessonData.finalResult || '')}
                </Text>
                <Text style={styles.tip}>{highlightElements(lessonData.tip || '')}</Text>
            </View>
        ) : null;

        const allSteps = [introBlock, ...calculationSteps, finalBlock].filter(Boolean);
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
            source={require('../../assets/tloTeorii.png')}
            style={styles.backgroundImage}
            resizeMode="cover"
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <Text style={styles.title}>
                        {lessonData?.title || 'Jednostki Masy'}
                    </Text>

                    <ScrollView
                        style={styles.scrollArea}
                        contentContainerStyle={styles.scrollContent}
                    >
                        {getSteps()}

                        {/* Możesz dodać diagramy/tabelę jednostek masy tutaj */}
                        {step >= 1 && (
                            <View style={styles.diagramArea}>
                                <Text style={styles.diagramTitle}>Tabela jednostek masy:</Text>
                                {/*  */}
                                {step >= 2 && (
                                    <Text style={styles.diagramText}>
                                        1 tona (t) = 1000 kilogramów (kg)
                                    </Text>
                                )}
                                {step >= 3 && (
                                    <Text style={styles.diagramText}>
                                        1 kilogram (kg) = 100 dekagramów (dag) = 1000 gramów (g)
                                    </Text>
                                )}
                                {step >= 4 && (
                                    <Text style={styles.diagramText}>
                                        1 dekagram (dag) = 10 gramów (g)
                                    </Text>
                                )}
                            </View>
                        )}
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

// --- STYLE ---

const styles = StyleSheet.create({
    backgroundImage: { flex: 1, width: '100%', height: '100%', },
    overlay: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 20, },
    wrapper: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFAFA', paddingTop: 20, },
    loadingWrapper: { height: 300, padding: 20, },
    container: {
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
        borderRadius: 12,
        padding: 20,
        alignItems: 'center',
        width: '90%',
        elevation: 3,
        maxWidth: 600,
        marginBottom: 100,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1976D2',
        marginBottom: 10,
        textAlign: 'center',
    },
    scrollArea: { width: '100%', },
    scrollContent: {
        alignItems: 'center',
        paddingBottom: 50, // Wrócono do 50, ponieważ container ma duży marginBottom
    },
    introBlock: { alignItems: 'center', marginBottom: 10, },
    intro: { fontSize: 18, color: '#424242', textAlign: 'center', marginBottom: 6, },
    introBold: { fontSize: 20, fontWeight: 'bold', color: '#D84315', marginBottom: 10, },
    stepText: { fontSize: 20, textAlign: 'center', marginVertical: 8, color: '#5D4037', },
    numberHighlight: {
        color: '#1976D2',
        fontWeight: 'bold',
        fontSize: 20,
    },
    finalBlock: { alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#FFD54F', },
    finalResult: { fontSize: 24, fontWeight: 'bold', color: '#D84315', textAlign: 'center', marginTop: 10, },
    tip: { fontSize: 16, marginTop: 10, color: '#00796B', fontStyle: 'italic', textAlign: 'center', },
    button: { backgroundColor: '#FFD54F', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 25, marginTop: 20, },
    buttonText: { fontSize: 18, color: '#5D4037', fontWeight: 'bold', },

    diagramArea: {
        width: '100%',
        marginTop: 20,
        padding: 15,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 8,
        borderLeftWidth: 5,
        borderLeftColor: '#00796B',
        alignItems: 'center',
    },
    diagramTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#00796B',
        marginBottom: 10,
    },
    diagramText: {
        fontSize: 16,
        color: '#424242',
        textAlign: 'center',
        marginVertical: 4,
    }
});