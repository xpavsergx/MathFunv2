import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ImageBackground,
    ActivityIndicator,
} from 'react-native';

import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

// 🚀 Maksymalna liczba kroków do wyświetlenia (MAX_STEPS = 4, czyli 5 bloków: 2 intro + 2 steps + final)
// W strukturze Large mamy: 3 intro + 3 steps + final. Ustalmy, że 6 kroków do przejścia (indeksy 0-6).
// MAX_STEPS = 6. (Dostosuj tę wartość, jeśli Twoja finalna struktura Firestore wymaga innej liczby kliknięć 'Dalej').
const MAX_STEPS = 4;

export default function largeCalculationsBlock() {
    const [step, setStep] = useState(0);
    // 🔥 ZMIANA: Używamy 'subtractLarge' lub 'addLarge' jako ID dokumentu
    const [mode, setMode] = useState<'subtractLarge' | 'addLarge'>('subtractLarge');
    const [lessonData, setLessonData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const handleNextStep = () => {
        setStep((prev) => (prev < MAX_STEPS ? prev + 1 : prev));
    };

    // 🔥 ZMIANA: Typy przełączania dostosowane do dużych liczb
    const handleModeChange = (newMode: 'subtractLarge' | 'addLarge') => {
        setMode(newMode);
        setStep(0); // Resetujemy kroki przy zmianie trybu
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                // 🔥 Używamy trybu ('addLarge' lub 'subtractLarge') jako ID dokumentu
                const doc = await firestore().collection('lessons').doc(mode).get();
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
                    console.warn(`Nie znaleziono dokumentu dla trybu: ${mode}.`);
                    setLessonData(null);
                }
            } catch (error) {
                console.error('Błąd ładowania danych:', error);
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
    }, [mode]);

    // 🔥 ZMIANA: Modyfikacja regex, aby uwzględniał operatory (+,-) jeśli są częścią wyróżnienia
    const highlightElements = (text: string) => {
        const parts = text.split(/(\d+|\+|\-)/g);
        return parts.map((part, index) =>
            /(\d+|\+|\-)/.test(part) ? (
                <Text key={index} style={styles.numberHighlight}>
                    {part}
                </Text>
            ) : (
                <Text key={index}>{part}</Text>
            )
        );
    };


    const getSteps = () => {
        if (!lessonData || !lessonData.intro || !lessonData.steps) return [];

        const introLines = lessonData.intro;
        const stepLines = lessonData.steps;


        const steps = [
            <View key="intro" style={styles.introBlock}>
                {introLines.map((line: string, index: number) => {
                    // Wyróżnienie pierwszego wiersza (pytania/zadania)
                    const isFirstLine = index === 0;
                    return(
                        <Text
                            key={`intro-${index}`}
                            style={[styles.intro, isFirstLine && styles.introBold]}
                        >
                            {highlightElements(line)}
                        </Text>
                    );
                })}
            </View>,
            // Mapujemy wszystkie kroki z bazy
            ...stepLines.map((stepText: string, index: number) => (
                <Text key={`step-${index}`} style={styles.stepText}>
                    {highlightElements(stepText)}
                </Text>
            )),
            <View key="final" style={styles.finalBlock}>
                <Text style={styles.finalResult}>
                    {highlightElements(lessonData.finalResult || '')}
                </Text>
                <Text style={styles.tip}>{lessonData.tip || ''}</Text>
            </View>,
        ];

        return steps.slice(0, step + 1);
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
                <Text style={[styles.intro, {color: '#D84315'}]}>Błąd: Nie znaleziono danych lekcji w Firestore dla trybu: {mode}.</Text>
            </View>
        );
    }

    return (
        <ImageBackground
            // 🔥 POPRAWIONA ŚCIEŻKA DLA FOLDERU Grade4_2
            source={require('../../assets/tloTeorii.png')}
            style={styles.backgroundImage}
            resizeMode="cover"
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <Text style={styles.title}>
                        {lessonData?.title || 'Rachunki pamięciowe na dużych liczbach'}
                    </Text>

                    {/* Mode Switch */}
                    <View style={styles.switcher}>
                        {/* Przełącznik na odejmowanie dużych liczb */}
                        <TouchableOpacity
                            style={[
                                styles.switchButton,
                                mode === 'subtractLarge' && styles.activeSwitch,
                            ]}
                            onPress={() => handleModeChange('subtractLarge')}
                        >
                            <Text style={styles.switchText}>➖ Odejmowanie</Text>
                        </TouchableOpacity>
                        {/* Przełącznik na dodawanie dużych liczb */}
                        <TouchableOpacity
                            style={[
                                styles.switchButton,
                                mode === 'addLarge' && styles.activeSwitch,
                            ]}
                            onPress={() => handleModeChange('addLarge')}
                        >
                            <Text style={styles.switchText}>➕ Dodawanie</Text>
                        </TouchableOpacity>
                    </View>

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
        marginBottom: 20,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1976D2', // 🔥 NIEBIESKI KOLOR ZGODNY Z LICZBAMI
        marginBottom: 10,
        textAlign: 'center',
    },
    switcher: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 15,
    },
    switchButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        marginHorizontal: 5,
        borderRadius: 20,
        backgroundColor: '#E0E0E0',
    },
    activeSwitch: {
        backgroundColor: '#FFD54F',
    },
    switchText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#5D4037',
    },
    scrollArea: { width: '100%', },
    scrollContent: { alignItems: 'center', paddingBottom: 50, },
    introBlock: { alignItems: 'center', marginBottom: 10, },
    intro: { fontSize: 18, color: '#424242', textAlign: 'center', marginBottom: 6, },
    introBold: { fontSize: 20, fontWeight: 'bold', color: '#D84315', marginBottom: 10, },
    stepText: { fontSize: 20, textAlign: 'center', marginVertical: 8, color: '#5D4037', },
    numberHighlight: {
        color: '#1976D2',
        fontWeight: 'bold',
        fontSize: 22,
    },
    finalBlock: { alignItems: 'center', marginTop: 10, },
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