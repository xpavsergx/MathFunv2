import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator,
    ImageBackground,
} from 'react-native';

import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

// 🚀 ID dokumentu dla "Dynamiczne Dzielenie Pisemne"
const LESSON_ID = 'dynamicDivision';
// 🚀 Ustal maksymalną liczbę kroków (0 do 8 = 9 kroków)
const MAX_STEPS = 8;

// --- STAŁE DANE DLA TEORII (zaszyte w kodzie - używamy tylko tytułu) ---
const STATIC_LESSON_DATA = {
    title: "Dzielenie Pisemne przez Liczby Jednocyfrowe",
};

// --- KOMPONENT ---

export default function DynamicDivisionBlock() {
    const [step, setStep] = useState(0);
    const [dividend, setDividend] = useState(''); // Dzielna (np. 84)
    const [divisor, setDivisor] = useState('');   // Dzielnik (np. 4)
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
                    setDividend(data?.dividend || '84');
                    setDivisor(data?.divisor || '4');
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

    if (loading || !dividend || !divisor) {
        return (
            <View style={[styles.wrapper, styles.loadingWrapper]}>
                <ActivityIndicator size="large" color="#FF8F00" />
                <Text style={[styles.intro, {marginTop: 10}]}>Ładowanie zadania z bazy...</Text>
            </View>
        );
    }

    // --- LOGIKA WIZUALIZACJI "PISANIA" ---
    const getExplanationText = (visStep: number, dividend: string, divisor: string) => {
        const isHighlight = (current: number) => visStep === current;

        // Obliczenia dla objaśnień (84 / 4)
        const partialResult1 = Math.floor(parseInt(dividend[0]) / parseInt(divisor)); // 8/4 = 2
        const remainder1 = parseInt(dividend[0]) % parseInt(divisor); // 8%4 = 0
        const result = (parseInt(dividend) / parseInt(divisor)).toString(); // 21

        if (isHighlight(1)) {
            return `Zapisujemy dzielną (${dividend}) i dzielnik (${divisor}).`;
        } else if (isHighlight(2)) {
            return `Krok 1: Dzielenie. Bierzemy pierwszą cyfrę (${dividend[0]}). Dzielimy ${dividend[0]} przez ${divisor}.`;
        } else if (isHighlight(3)) {
            return `Wynik dzielenia to ${partialResult1}. Zapisujemy go w ilorazie (na górze).`;
        } else if (isHighlight(4)) {
            return `Mnożenie i odejmowanie: ${partialResult1} x ${divisor} = ${partialResult1 * parseInt(divisor)}. Odejmowanie daje resztę ${remainder1}.`;
        } else if (isHighlight(5)) {
            return `Sprowadzanie: Sprowadzamy kolejną cyfrę (${dividend[1]}). Nowa liczba do dzielenia to ${remainder1}${dividend[1]}.`;
        } else if (isHighlight(6)) {
            return `Krok 2: Dzielenie. Dzielimy ${remainder1}${dividend[1]} przez ${divisor}. Wynik to ${dividend[1]}. Zapisujemy go w ilorazie.`;
        } else if (isHighlight(7)) {
            return `Mnożenie i odejmowanie: ${dividend[1]} x ${divisor} = ${parseInt(dividend[1]) * parseInt(divisor)}. Reszta wynosi 0.`;
        } else if (isHighlight(8)) {
            return `Brak cyfr do sprowadzenia. Dzielenie zakończone. Wynik: ${result}.`;
        } else {
            return `Kliknij "Dalej", aby rozpocząć pisanie zadania.`;
        }
    };

    const renderWrittenDivisionDiagram = () => {
        // Dividend: 84
        const D = dividend;
        // Divisor: 4
        const d = divisor;
        // Quotient: 21
        const Q = (parseInt(D) / parseInt(d)).toString();

        const VIS_STEP = step;
        const isVisible = (start: number) => VIS_STEP >= start;
        const isHighlight = (current: number) => VIS_STEP === current;

        // Wiersze pomocnicze do wizualizacji:
        // Row 0: Iloraz (Q: 21)
        // Row 1: Dzielna (D: 84)
        // Row 2: Mnożenie 1 (4*2=8)
        // Row 3: Reszta 1 (0) + Sprowadzanie (4)
        // Row 4: Mnożenie 2 (4*1=4)
        // Row 5: Reszta 2 (0)

        // Cyfra/Tekst, pozycja (w kolumnach od lewej, start od 0)
        const items = [
            // Row 0: Iloraz (Q: 21)
            { r: 0, c: 1, text: Q[0], visible: 3, isHighlight: 2 }, // 2
            { r: 0, c: 2, text: Q[1], visible: 6, isHighlight: 6 }, // 1

            // Row 1: Dzielna (D: 84) - Zapisane od początku
            { r: 1, c: 1, text: D[0], visible: 1, isHighlight: 2 }, // 8
            { r: 1, c: 2, text: D[1], visible: 1, isHighlight: 5 }, // 4

            // Row 2: Mnożenie 1 (d*Q[0] = 4*2=8)
            { r: 2, c: 1, text: (parseInt(d) * parseInt(Q[0])).toString(), visible: 4, isHighlight: 4 }, // 8
            { r: 2, c: 0, text: '-', visible: 4 }, // Znak minus

            // Row 3: Reszta 1 (0) + Sprowadzanie (4)
            { r: 3, c: 1, text: '0', visible: 4 }, // Reszta 0
            { r: 3, c: 2, text: D[1], visible: 5, isHighlight: 6, style: styles.broughtDown }, // Sprowadzone 4

            // Row 4: Mnożenie 2 (d*Q[1] = 4*1=4)
            { r: 4, c: 2, text: (parseInt(d) * parseInt(Q[1])).toString(), visible: 7, isHighlight: 7 }, // 4
            { r: 4, c: 1, text: '-', visible: 7 }, // Znak minus

            // Row 5: Reszta 2 (0)
            { r: 5, c: 2, text: '0', visible: 7, style: styles.finalRemainder }, // Reszta 0
        ];

        // Struktura siatki (tablica tablic)
        const numRows = 6;
        const numCols = 3;
        const grid = Array(numRows).fill(0).map(() => Array(numCols).fill(''));

        // Wypełnianie siatki i stosowanie stylów
        const styledGrid = grid.map((rowArr, r) => (
            <View key={r} style={styles.divisionRow}>
                {rowArr.map((_, c) => {
                    const item = items.find(i => i.r === r && i.c === c);

                    let content = item ? item.text : '';
                    let opacity = item && isVisible(item.visible) ? 1 : 0;
                    let highlightStyle = styles.normalCyfra;
                    let customStyle = {};

                    if (item && isHighlight(item.isHighlight)) {
                        // Podświetlenie aktywnej cyfry/operacji
                        highlightStyle = styles.highlightJednosci;
                    }

                    if (item && item.style) {
                        customStyle = item.style;
                    }

                    // Linia pod odejmowaniem (wiersze 2 i 4)
                    const showLine = (r === 2 && isVisible(4)) || (r === 4 && isVisible(7));

                    // Dzielnik (4) jest renderowany tylko w kolumnie 0, w wierszu 1
                    const isDivisor = (r === 1 && c === 0 && isVisible(1));

                    return (
                        <View key={c} style={styles.cyfraContainer}>
                            <Text
                                style={[
                                    styles.cyfra,
                                    highlightStyle,
                                    customStyle,
                                    r === 0 && styles.quotientCyfra, // Styl dla ilorazu (na górze)
                                    // RENDEROWANIE DZIELNIKA JAKO OSOBNEGO ELEMENTU
                                    isDivisor && styles.divisorText,
                                    isDivisor ? {opacity: 1} : {opacity: opacity}, // Zapewnienie, że 4 jest zawsze widoczne od step 1
                                ]}
                            >
                                {isDivisor ? d : content}
                            </Text>
                            {showLine && c >= 1 && <View style={styles.subtractionLine} />}
                        </View>
                    );
                })}
            </View>
        ));

        return (
            <View style={styles.additionCoreContainer}>
                {/* USUWAMY TYTUŁ ZADANIA Z TEGO KONTEKNERA */}

                {/* Linia oddzielająca dzielną od ilorazu (Nawias graficzny) */}
                <View style={styles.divisionHeader}>
                    <View style={styles.divisorSpacer} /> {/* Pusta kolumna dla dzielnika (4) */}
                    <View style={styles.divisionBracket}>
                        <View style={styles.divisionLine} />
                    </View>
                </View>

                <View style={styles.divisionGrid}>
                    {styledGrid}
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
                        {/* WIZUALIZACJA ZADANIA POZA OBLASZAREM WIZUALIZACJI */}
                        <Text style={styles.taskDisplay}>
                            Zadanie: {dividend} / {divisor}
                        </Text>

                        {/* WŁAŚCIWA WIZUALIZACJA DZIELENIA */}
                        {step >= 1 && (
                            <View style={styles.diagramArea}>
                                {renderWrittenDivisionDiagram()}
                            </View>
                        )}

                        {/* TEKST WYJAŚNIAJĄCY (Pod kwadratem, na pełną szerokość) */}
                        <View style={styles.additionInfoWrapper}>
                            <Text style={styles.additionInfo}>
                                {getExplanationText(step, dividend, divisor)}
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
        padding: 30,
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

    // --- NOWY STYL DLA WYŚWIETLENIA ZADANIA NAD DIAGRAMEM ---
    taskDisplay: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#5D4037',
        alignSelf: 'flex-start',
        marginLeft: 15, // Wyrównanie z lewym marginesem diagramu
        marginBottom: 10,
    },
    // --- STYLE DLA WIZUALIZACJI "PISANIA" ---
    diagramArea: {
        width: '100%',
        marginTop: 5, // Zmniejszony margines górny
        padding: 40,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 8,
        borderLeftWidth: 5,
        borderLeftColor: '#00796B',
        alignItems: 'center',
        paddingHorizontal: 15,
    },
    additionCoreContainer: {
        marginTop: 0, // Zaczynamy od samej góry
        marginBottom: 10,
        alignItems: 'center',
        width: 250,
        position: 'relative',
    },
    additionTitle: {
        // TEN STYL NIE JEST JUŻ UŻYWANY W DIAGRAMIE
        fontSize: 16,
        fontWeight: 'bold',
        color: '#5D4037',
        marginBottom: 8,
        textAlign: 'center',
    },
    // Nagłówek dzielenia (Divisor + Bracket)
    divisionHeader: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        width: '100%',
        marginBottom: -5,
        marginTop: 0, // Zaczynamy od góry kontenera
    },
    divisorSpacer: { // Pusta kolumna dla 40px
        width: 40,
        height: 1,
    },
    divisorText: { // Używany w siatce do renderowania 4
        fontSize: 28,
        fontWeight: 'normal',
        width: 40,
        textAlign: 'center',
        color: '#5D4037',
        paddingBottom: 5,
    },
    divisionBracket: {
        flex: 1,
        borderTopWidth: 3,
        borderRightWidth: 3,
        borderColor: '#5D4037',
        height: 35,
        borderTopRightRadius: 10,
        marginLeft: 5,
        paddingTop: 5,
        paddingRight: 5,
    },
    divisionLine: {
        height: 0,
    },
    // Siatka dla całej operacji
    divisionGrid: {
        width: '100%',
        marginTop: -30, // Przesunięcie siatki w górę pod nawias
    },
    divisionRow: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        width: '100%',
    },
    cyfraContainer: {
        width: 40,
        alignItems: 'center',
    },
    // Style dla cyfr
    cyfra: {
        fontSize: 28,
        fontWeight: 'normal',
        textAlign: 'center',
        color: '#5D4037',
        zIndex: 1,
    },
    quotientCyfra: {
        position: 'absolute',
        top: -37, // Powinien być teraz OK, bo nagłówek startuje wyżej
    },
    highlightJednosci: {
        backgroundColor: '#FFD54F', // Podświetlenie aktywnej cyfry/operacji
        borderRadius: 4,
    },
    normalCyfra: {
        backgroundColor: 'transparent',
    },
    // Linie odejmowania
    subtractionLine: {
        position: 'absolute',
        bottom: 0,
        height: 2,
        width: 40,
        backgroundColor: '#D84315',
    },
    // Style specjalne
    broughtDown: {
        color: '#00796B', // Kolor sprowadzanej cyfry
        fontWeight: 'bold',
    },
    finalRemainder: {
        fontWeight: 'bold',
        color: '#1976D2', // Kolor reszty końcowej
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