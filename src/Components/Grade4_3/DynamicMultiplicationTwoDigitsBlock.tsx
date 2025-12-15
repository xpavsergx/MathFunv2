import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator,
    ImageBackground,
} from 'react-native';

import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

// 🚀 ID dokumentu dla "Mnożenie Pisemne przez Liczby Wielocyfrowe"
const LESSON_ID = 'multiplicationTwoDigits';
// 🚀 Ustal maksymalną liczbę kroków
const MAX_STEPS = 9;

// --- STAŁE DANE DLA TEORII ---
const STATIC_LESSON_DATA = {
    title: "Mnożenie Pisemne przez Liczby Wielocyfrowe",
};

// --- KOMPONENT ---

export default function DynamicMultiplicationTwoDigitsBlock() {
    const [step, setStep] = useState(0);
    const [factor1, setFactor1] = useState(''); // Górna liczba (np. 45)
    const [factor2, setFactor2] = useState(''); // Mnożnik (np. 23)
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
                    setFactor2(data?.factor2 || '23');
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

    if (loading || !factor1 || !factor2) {
        return (
            <View style={[styles.wrapper, styles.loadingWrapper]}>
                <ActivityIndicator size="large" color="#FF8F00" />
                <Text style={[styles.intro, {marginTop: 10}]}>Ładowanie zadania z bazy...</Text>
            </View>
        );
    }

    // --- LOGIKA OBLICZEŃ ---
    const F1 = parseInt(factor1); // 45
    const F2_jednosci = parseInt(factor2[1]); // 3
    const F2_dziesiatki = parseInt(factor2[0]); // 2

    // Wyniki cząstkowe
    const partial1 = F1 * F2_jednosci; // 45 * 3 = 135
    const partial2 = F1 * F2_dziesiatki * 10; // 45 * 20 = 900
    const finalResult = partial1 + partial2; // 135 + 900 = 1035

    // --- LOGIKA WIZUALIZACJI "PISANIA" ---
    const getExplanationText = (visStep: number) => {
        const isHighlight = (current: number) => visStep === current;

        if (isHighlight(1)) {
            return `Zapisujemy czynniki (${factor1} i ${factor2}) i rysujemy linię.`;
        } else if (isHighlight(2)) {
            return `Krok 1: Mnożenie przez jedności. Mnożymy ${factor1} przez ${F2_jednosci}.`;
        } else if (isHighlight(3)) {
            return `Wynik cząstkowy (1) to ${partial1}. Zapisujemy go pod linią.`;
        } else if (isHighlight(4)) {
            return `Krok 2: Mnożenie przez dziesiątki. Mnożymy ${factor1} przez ${F2_dziesiatki}.`;
        } else if (isHighlight(5)) {
            return `Zaczynamy zapisywać wynik cząstkowy (2) (${partial2 / 10}) od kolumny dziesiątek, czyli pod ${F2_dziesiatki}.`;
        } else if (isHighlight(6)) {
            return `Wynik cząstkowy (2) to ${partial2 / 10} (90). Dopisujemy zero w kolumnie jedności.`;
        } else if (isHighlight(7)) {
            return `Rysujemy drugą linię i dodajemy znak plus.`;
        } else if (isHighlight(8)) {
            // Wiersz dostosowany do Pańskiej sugestii o jawnej sumie 135+900
            return `Krok 3: Dodawanie pisemne. Sumujemy wiersze cząstkowe: ${partial1} + ${partial2}.`;
        } else if (isHighlight(9)) {
            return `Wynik końcowy to ${finalResult}.`;
        } else {
            return `Kliknij "Dalej", aby rozpocząć mnożenie pisemne przez liczby wielocyfrowe.`;
        }
    };

    const renderWrittenMultiplicationDiagram = () => {
        const F1_str = factor1; // 45
        const F2_str = factor2; // 23
        const P1_str = partial1.toString(); // 135
        const P2_raw = (F1 * F2_dziesiatki).toString(); // 90
        const Final_str = finalResult.toString(); // 1035

        const VIS_STEP = step;
        const isVisible = (start: number) => VIS_STEP >= start;
        const isHighlight = (current: number) => VIS_STEP === current;

        const TOTAL_COLS = Final_str.length; // 4 (Tysiące, Setki, Dziesiątki, Jedności)
        const COL_WIDTH = 40;

        // Funkcja do renderowania zawartości wiersza, z uwzględnieniem widoczności i podświetlenia.
        const renderRowContent = (text: string, rowType: 'input' | 'partial' | 'final') => {
            const isFinal = rowType === 'final';
            const isPartial1 = rowType === 'partial' && text === P1_str;
            const isPartial2Raw = rowType === 'partial' && text === P2_raw; // Używamy dla 90

            // Wyrównanie tekstu do prawej (do kolumny jedności)
            const paddedText = ' '.repeat(TOTAL_COLS - text.length) + text;

            return paddedText.split('').map((char, index) => {
                let opacity = 1; // Domyślnie widoczne dla inputów
                let highlightStyle = styles.normalCyfra;

                // --- KONTROLA WIDOCZNOŚCI ---
                if (isPartial1 && VIS_STEP < 3) opacity = 0; // P1 widoczny od kroku 3
                if (isPartial2Raw && VIS_STEP < 5) opacity = 0; // P2 (90) widoczny od kroku 5
                if (isFinal && VIS_STEP < 9) opacity = 0; // Wynik końcowy widoczny od kroku 9

                // --- PODŚWIETLENIE DLA SUMOWANIA (KROK 8) ---
                if ((isPartial1 || isPartial2Raw) && isHighlight(8)) {
                    highlightStyle = styles.highlightPartialRowStyle;
                }

                // --- PODŚWIETLENIE WYNIKU KOŃCOWEGO (KROK 9) ---
                if (isFinal) {
                    highlightStyle = isHighlight(9) ? styles.resultCyfraFinal : styles.resultCyfra;
                }

                return (
                    <Text
                        key={index}
                        style={[
                            styles.cyfra,
                            isFinal && styles.resultCyfra,
                            highlightStyle,
                            {opacity: opacity}
                        ]}
                    >
                        {char}
                    </Text>
                );
            });
        };

        return (
            <View style={styles.additionCoreContainer}>
                {/* Wiersz 1: 45 (Mnożna) */}
                <View style={styles.multiplicationRow}>
                    {/* Renderowanie 45, podświetlane w step 2 i 4 */}
                    {F1_str.split('').map((char, index) => {
                        let highlightStyle = styles.normalCyfra;
                        if (isHighlight(2) || isHighlight(4)) highlightStyle = styles.highlightJednosci;
                        return (
                            <Text
                                key={index}
                                style={[styles.cyfra, highlightStyle, {opacity: isVisible(1) ? 1 : 0}]}
                            >
                                {char}
                            </Text>
                        );
                    })}
                </View>

                {/* Wiersz 2: x 23 (Mnożnik) */}
                <View style={styles.multiplicationRow}>
                    {/* Znak "x" */}
                    <Text style={[styles.cyfra, styles.signText, {opacity: isVisible(1) ? 1 : 0}]}>x</Text>

                    {/* Wyrównanie przestrzeni przed 23 */}
                    <View style={{width: COL_WIDTH * (TOTAL_COLS - factor2.length - 1)}} />

                    {/* 2 i 3 */}
                    {F2_str.split('').map((char, index) => {
                        let highlightStyle = styles.normalCyfra;
                        // Podświetlenie 2 (step 4)
                        if (index === 0 && isHighlight(4)) highlightStyle = styles.highlightJednosci;
                        // Podświetlenie 3 (step 2)
                        else if (index === 1 && isHighlight(2)) highlightStyle = styles.highlightJednosci;

                        return (
                            <Text
                                key={index}
                                style={[styles.cyfra, highlightStyle, {opacity: isVisible(1) ? 1 : 0}]}
                            >
                                {char}
                            </Text>
                        );
                    })}
                </View>


                {/* Kreska oddzielająca czynniki od wyników cząstkowych */}
                <View style={[styles.additionLine, { width: COL_WIDTH * TOTAL_COLS, opacity: isVisible(1) ? 1 : 0 }]} />

                {/* Wiersz 3: Wynik cząstkowy 1 (135). Mnożenie przez 3. */}
                <View style={[styles.multiplicationRow, isHighlight(8) && styles.highlightPartialRowStyle]}>
                    {renderRowContent(P1_str, 'partial')}
                </View>

                {/* Wiersz 4: Wynik cząstkowy 2 (900). Mnożenie przez 20. */}
                <View style={[styles.multiplicationRow, isHighlight(8) && styles.highlightPartialRowStyle]}>
                    {/* Przestrzeń pustych kolumn dla wyrównania P2 (90) do setek */}
                    {/* P2_raw = 90 (2 cyfry). TOTAL_COLS = 4. 4 - 2 = 2 kolumny przestrzeni */}
                    <View style={{width: COL_WIDTH * (TOTAL_COLS - P2_raw.length)}} />

                    {/* Cyfry wyniku cząstkowego 2 (90) */}
                    {P2_raw.split('').map((char, index) => (
                        <Text
                            key={index}
                            style={[
                                styles.cyfra,
                                isHighlight(4) ? styles.highlightJednosci : styles.normalCyfra,
                                {opacity: isVisible(5) ? 1 : 0} // Widoczne od Kroku 5
                            ]}
                        >
                            {char}
                        </Text>
                    ))}
                    {/* Zero dopisywane (placeholder) */}
                    <Text
                        style={[
                            styles.cyfra,
                            styles.cyfraDim,
                            {opacity: isVisible(6) ? 1 : 0} // Widoczne od Kroku 6
                        ]}
                    >
                        0
                    </Text>
                </View>

                {/* Wiersz dla znaku dodawania (+) */}
                <View style={styles.multiplicationRow}>
                    <Text style={[styles.cyfra, styles.signText, {opacity: isVisible(7) ? 1 : 0}]}>+</Text>
                    {/* Wyrównanie przestrzeni, aby znak "+" był obok kolumn */}
                    <View style={{width: COL_WIDTH * (TOTAL_COLS - 1)}} />
                </View>


                {/* Linia oddzielająca wyniki cząstkowe od sumy */}
                <View style={[styles.additionLine, { width: COL_WIDTH * (TOTAL_COLS), opacity: isVisible(7) ? 1 : 0, marginTop: 0, marginBottom: 5 }]} />

                {/* Wiersz 5: Wynik końcowy (1035) */}
                <View style={styles.multiplicationRow}>
                    {renderRowContent(Final_str, 'final')}
                </View>

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
                        {/* WIZUALIZACJA ZADANIA */}
                        <Text style={styles.taskDisplay}>
                            Zadanie: {factor1} x {factor2}
                        </Text>

                        {/* WŁAŚCIWA WIZUALIZACJA MNOŻENIA */}
                        {step >= 1 && (
                            <View style={styles.diagramArea}>
                                {renderWrittenMultiplicationDiagram()}
                            </View>
                        )}

                        {/* TEKST WYJAŚNIAJĄCY */}
                        <View style={styles.additionInfoWrapper}>
                            <Text style={styles.additionInfo}>
                                {getExplanationText(step)}
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

    // --- STYLE DLA WIZUALIZACJI MNOŻENIA ---
    taskDisplay: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#5D4037',
        alignSelf: 'flex-start',
        marginLeft: 15,
        marginBottom: 10,
    },
    diagramArea: {
        width: '100%',
        marginTop: 5,
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
        alignItems: 'flex-end', // Wyrównanie do prawej
        width: 250,
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
        fontWeight: 'bold',
        color: '#1976D2',
    },
    resultCyfraFinal: {
        fontWeight: 'bold',
        color: '#D84315',
    },
    additionLine: {
        height: 3,
        backgroundColor: '#D84315',
        marginBottom: 5,
        marginTop: 2,
        alignSelf: 'flex-end', // Wyrównanie kreski do prawej
    },
    highlightJednosci: {
        backgroundColor: '#FFD54F',
        borderRadius: 4,
    },
    highlightPartialRowStyle: { // Styl dla wierszy cząstkowych podczas dodawania
        backgroundColor: '#E0F7FA', // Jasnoniebieskie tło
        borderRadius: 4,
    },
    normalCyfra: {
        backgroundColor: 'transparent',
    },
    cyfraDim: {
        opacity: 0.5,
    },
    signText: {
        fontSize: 28,
        fontWeight: 'bold',
        width: 30, // Węższe pole dla znaku (x lub +)
        marginRight: -10, // Przesunięcie znaku bliżej liczb
        textAlign: 'right',
        color: '#D84315',
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