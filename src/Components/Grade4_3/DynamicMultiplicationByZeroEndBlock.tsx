import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator,
    ImageBackground,
} from 'react-native';

import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

// 🚀 ID dokumentu dla "Mnożenie przez Liczby z Zerami na Końcu"
const LESSON_ID = 'multiplicationByZeroEnd';
// 🚀 Ustal maksymalną liczbę kroków (0 do 5 = 6 kroków)
const MAX_STEPS = 5;

// --- STAŁE DANE DLA TEORII (zaszyte w kodzie - używamy tylko tytułu) ---
const STATIC_LESSON_DATA = {
    title: "Mnożenie Pisemne przez Liczby z Zerami na Końcu",
};

// --- KOMPONENT ---

export default function DynamicMultiplicationByZeroEndBlock() {
    const [step, setStep] = useState(0);
    const [factor1, setFactor1] = useState(''); // Górna liczba (np. 45)
    const [factor2, setFactor2] = useState(''); // Mnożnik z zerami (np. 20)
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
                    setFactor1(data?.factor1 || '45');
                    setFactor2(data?.factor2 || '20');
                }
            } catch (error) {
                console.error('Błąd ładowania danych Firestore:', error);
            } finally {
                setLoading(false);
            }
        };

        const prepareAndFetch = async () => {
            if (!auth().currentUser) {
                await auth().signInAnonymously().catch(e => console.error('Anon auth failed:', e));
            }
            fetchData();
        };

        prepareAndFetch();
    }, []);

    const highlightElements = (text: string) => {
        const parts = text.split(/(\d+|\([^)]+\))/g);
        return parts.map((part, index) => {
            if (/(\d+|\([^)]+\))/.test(part)) {
                return <Text key={index} style={styles.numberHighlight}>{part}</Text>;
            } else {
                return <Text key={index}>{part}</Text>;
            }
        });
    };

    if (loading || !factor1 || !factor2) {
        return (
            <View style={[styles.wrapper, styles.loadingWrapper]}>
                <ActivityIndicator size="large" color="#FF8F00" />
                <Text style={[styles.intro, {marginTop: 10}]}>Ładowanie zadania z bazy...</Text>
            </View>
        );
    }

    // --- LOGIKA WIZUALIZACJI "PISANIA" ---
    const getExplanationText = (visStep: number, factor1: string, factor2: string) => {
        const isHighlight = (current: number) => visStep === current;

        // Obliczenia dla objaśnień (45 x 20)
        const nonZeroFactor2 = parseInt(factor2.slice(0, -1)); // 2
        const partialResult = parseInt(factor1) * nonZeroFactor2; // 45 * 2 = 90

        if (isHighlight(1)) {
            return `Zapisujemy zadanie. Kluczem jest pominięcie zera na końcu, aby uprościć mnożenie.`;
        } else if (isHighlight(2)) {
            return `Rysujemy linię. Zadanie gotowe! Mnożymy tylko przez ${nonZeroFactor2}.`;
        } else if (isHighlight(3)) {
            return `Krok 1: Mnożenie. Mnożymy ${factor1} przez ${nonZeroFactor2} w kolumnach.`;
        } else if (isHighlight(4)) {
            return `Wynik częściowy to ${partialResult}. Zapisujemy go pod linią.`;
        } else if (isHighlight(5)) {
            return `Krok 2: Dopisujemy ZERA. Wracamy do pominiętego zera z ${factor2} i dopisujemy je na końcu wyniku. Wynik: ${partialResult}0.`;
        } else {
            return `Kliknij "Dalej", aby rozpocząć pisanie zadania.`;
        }
    };

    const renderWrittenMultiplicationDiagram = () => {
        // Górna liczba (45)
        const number1 = ' ' + factor1;
        // Dolna liczba (*20). Dodajemy spację, aby wyrównać "2" pod "5"
        const number2 = 'x' + factor2;
        // Wynik (900)
        const rawResult = (parseInt(factor1) * parseInt(factor2)).toString();
        const finalResult = rawResult; // 900
        const zeroIndex = number2.length - 1; // Index zera w "x20" (ostatni)
        const nonZeroIndex = zeroIndex - 1; // Index cyfry '2' w "x20"

        const VIS_STEP = step;

        const isVisible = (start: number) => VIS_STEP >= start;
        const isHighlight = (current: number) => VIS_STEP === current;

        // Renderowanie wiersza liczb
        const renderRow = (text: string, isResult: boolean = false, visibleStartStep: number) => (
            <View style={styles.multiplicationRow}>
                {text.split('').map((char, index) => {
                    let opacity = 0;

                    if (isResult) {
                        // Wynik częściowy (90) - pojawia się w VIS_STEP 4
                        if (index < text.length - 1) opacity = isVisible(4) ? 1 : 0;
                        // Zero końcowe (0) - pojawia się w VIS_STEP 5
                        else opacity = isVisible(5) ? 1 : 0;
                    } else {
                        // LICZBY WEJŚCIOWE
                        opacity = isVisible(visibleStartStep) ? 1 : 0;
                    }

                    // --- LOGIKA PODŚWIETLENIA MNOŻENIA (VIS_STEP 3) ---
                    let highlightStyle = styles.normalCyfra;
                    if (isHighlight(3)) {
                        // Cyfry biorące udział w mnożeniu: 4, 5, i 2
                        const isFactor1Digit = text === number1 && (index === text.length - 1 || index === text.length - 2);
                        const isFactor2NonZero = text === number2 && index === nonZeroIndex;

                        if (isFactor1Digit || isFactor2NonZero) {
                            highlightStyle = styles.highlightJednosci; // Używamy stylu aktywnego podświetlenia
                        }
                    }

                    // Zero w mnożniku: Zmniejsza przezroczystość od VIS_STEP 2, bo je pomijamy
                    const isZeroToIgnore = (index === zeroIndex) && !isResult;
                    const dimStyle = isZeroToIgnore && isVisible(2) ? styles.cyfraDim : {};

                    return (
                        <Text
                            key={index}
                            style={[
                                styles.cyfra,
                                isResult && styles.resultCyfra,
                                {opacity: opacity},
                                highlightStyle, // Stosujemy precyzyjne podświetlenie
                                dimStyle,
                            ]}
                        >
                            {char}
                        </Text>
                    );
                })}
            </View>
        );

        return (
            <View style={styles.additionCoreContainer}>
                <Text style={styles.additionTitle}>Zadanie: {factor1} x {factor2}</Text>

                {/* Wiersz 1: 45. Widoczny od VIS_STEP 1 */}
                {renderRow(number1, false, 1)}

                {/* Wiersz 2: x20. Widoczny od VIS_STEP 1 */}
                {renderRow(number2, false, 1)}

                {/* Kreska. Widoczna od VIS_STEP 2 */}
                <View style={[styles.additionLine, { opacity: isVisible(2) ? 1 : 0 }]} />

                {/* Wynik: 900 */}
                {renderRow(finalResult, true, 4)}
            </View>
        );
    };
    // --- KONIEC LOGIKI WIZUALIZACJI ---

    return (
        <ImageBackground
            source={require('../../assets/tloTeorii.png')}
            style={styles.backgroundImage}
            resizeMode="cover"
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <Text style={styles.title}>
                        {STATIC_LESSON_DATA.title}
                    </Text>

                    <ScrollView
                        style={styles.scrollArea}
                        contentContainerStyle={styles.scrollContent}
                    >
                        {/* WIZUALIZACJA jest teraz główną treścią */}
                        {step >= 1 && (
                            <View style={styles.diagramArea}>
                                {renderWrittenMultiplicationDiagram()}
                            </View>
                        )}

                        {/* TEKST WYJAŚNIAJĄCY (Pod kwadratem, na pełną szerokość) */}
                        <View style={styles.additionInfoWrapper}>
                            <Text style={styles.additionInfo}>
                                {getExplanationText(step, factor1, factor2)}
                            </Text>
                        </View>

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
    // Standardowe style...
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
        paddingBottom: 50,
    },
    button: { backgroundColor: '#FFD54F', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 25, marginTop: 20, },
    buttonText: { fontSize: 18, color: '#5D4037', fontWeight: 'bold', },

    // --- STYLE DLA WIZUALIZACJI "PISANIA" ---
    diagramArea: {
        width: '100%',
        marginTop: 20,
        padding: 15,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 8,
        borderLeftWidth: 5,
        borderLeftColor: '#00796B',
        alignItems: 'center',
        paddingHorizontal: 15,
    },
    additionCoreContainer: {
        marginTop: 10,
        marginBottom: 10,
        alignItems: 'flex-end',
        width: 150,
    },
    additionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#5D4037',
        marginBottom: 8,
    },
    multiplicationRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        width: '100%',
    },
    cyfra: {
        fontSize: 28,
        fontWeight: 'normal',
        width: 40,
        textAlign: 'center',
        color: '#5D4037',
    },
    resultCyfra: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1976D2',
    },
    additionLine: {
        width: 120,
        height: 3,
        backgroundColor: '#D84315',
        marginBottom: 5,
        marginTop: 2,
    },
    highlightJednosci: { // Używamy tego jako aktywne podświetlenie cyfry
        backgroundColor: '#FFD54F',
        borderRadius: 4,
    },
    normalCyfra: {
        backgroundColor: 'transparent',
    },
    cyfraDim: { // Styl dla zaciemnionego zera
        opacity: 0.3,
    },
    // Przeniesienie (nieużywane w tym bloku, ale style są zdefiniowane)
    carryRow: {
        height: 20,
    },
    carry: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#D84315',
        position: 'absolute',
        top: 0,
        right: 42,
    },
    // Wyjaśnienia
    additionInfoWrapper: {
        width: '100%',
        marginTop: 15,
        alignItems: 'center',
    },
    additionInfo: {
        fontSize: 16,
        color: '#00796B',
        textAlign: 'center',
        minHeight: 40,
        backgroundColor: '#E0F7FA',
        padding: 8,
        borderRadius: 4,
        width: '90%',
    },
    numberHighlight: {
        color: '#1976D2',
        fontWeight: 'bold',
        fontSize: 20,
    },
});