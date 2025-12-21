import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator,
    ImageBackground,
} from 'react-native';

import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

// 🚀 ID dokumentu dla "Dynamiczne Odejmowanie Pisemne"
const LESSON_ID = 'dynamicSubtraction';
// 🚀 Ustal maksymalną liczbę kroków (1 Intro + 6 Akcji Wizualizacji = 7)
const MAX_STEPS = 6;

// --- STAŁE DANE DLA TEORII (zaszyte w kodzie - używamy tylko tytułu) ---
const STATIC_LESSON_DATA = {
    title: "Odejmowanie pisemne",
};

// --- KOMPONENT ---

export default function DynamicSubtractionBlock() {
    const [step, setStep] = useState(0);
    const [num1, setNum1] = useState('');
    const [num2, setNum2] = useState('');
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
                    // Zakładamy, że number1 > number2
                    setNum1(data?.number1 || '72');
                    setNum2(data?.number2 || '45');
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

    if (loading || !num1 || !num2) {
        return (
            <View style={[styles.wrapper, styles.loadingWrapper]}>
                <ActivityIndicator size="large" color="#FF8F00" />
                <Text style={[styles.intro, {marginTop: 10}]}>Ładowanie zadania z bazy...</Text>
            </View>
        );
    }

    // --- LOGIKA WIZUALIZACJI "PISANIA" ---
    const getExplanationText = (visStep: number, num1: string, num2: string) => {
        const isHighlight = (current: number) => visStep === current;

        if (isHighlight(1)) {
            return `Zapisujemy liczby, wyrównując kolumny. Pamiętaj: większa liczba (${num1}) jest na górze.`;
        } else if (isHighlight(2)) {
            return `Rysujemy linię. Zadanie gotowe!`;
        } else if (isHighlight(3)) {
            return `Krok 1: Podświetlamy JEDNOŚCI. Odejmujemy: ${num1[1]} - ${num2[1]}? Nie da się (2 < 5).`;
        } else if (isHighlight(4)) {
            // W tym kroku: Zmienia się 7 na 6, a wynik jedności pojawia się
            return `POŻYCZAMY 10 z kolumny dziesiątek: 7 staje się 6, a 2 staje się 12. Odejmij: 12 - 5 = 7.`;
        } else if (isHighlight(5)) {
            return `Krok 2: Podświetlamy DZIESIĄTKI. Odejmujemy: 6 (po pożyczce) - ${num2[0]}.`;
        } else if (isHighlight(6)) {
            return `Wynik (2): Zapisujemy 2. Zadanie wykonane!`;
        } else {
            return `Kliknij "Dalej", aby rozpocząć pisanie zadania.`;
        }
    };

    const renderWrittenSubtractionDiagram = () => {
        const number1 = ' ' + num1; // np. ' 72'
        const number2 = '-' + num2; // np. '-45'
        const rawResult = (parseInt(num1) - parseInt(num2)).toString(); // np. '27'
        const result = ' ' + rawResult;

        const VIS_STEP = step;

        const isVisible = (start: number) => VIS_STEP >= start;
        const isHighlight = (current: number) => VIS_STEP === current;

        // Liczba po pożyczce (7 -> 6)
        const borrowedElement = (
            <Text
                style={styles.subtractionBorrowed}
            >
                6
            </Text>
        );

        // Funkcja renderująca wiersz liczb
        const renderRow = (text: string, isResult: boolean = false, visibleStartStep: number) => (
            <View style={styles.subtractionRow}>
                {text.split('').map((char, index) => {
                    let opacity = 0;

                    if (isResult) {
                        // Wynik Jedności (index 2)
                        if (index === 2) opacity = isVisible(4) ? 1 : 0; // Pojawia się po pożyczeniu (VIS_STEP 4)
                        // Wynik Dziesiątek (index 1)
                        else if (index === 1) opacity = isVisible(6) ? 1 : 0; // Pojawia się po obliczeniu dziesiątek (VIS_STEP 6)
                    } else {
                        // LICZBY WEJŚCIOWE
                        opacity = isVisible(visibleStartStep) ? 1 : 0;
                    }

                    // Podświetlenie: Jedności (index 2) w VIS_STEP 3, Dziesiątki (index 1) w VIS_STEP 5
                    const isColHighlight = (isHighlight(3) && index === 2) || (isHighlight(5) && index === 1);

                    // ZACERNIENIE STAREJ CYFRY (7) w kolumnie DZIESIĄTEK (index 1)
                    const isOriginalDigit = !isResult && index === 1; // Sprawdza, czy to jest '7' w 72
                    const shouldDim = isOriginalDigit && isVisible(4); // Zaciemnia się od Kroku 4

                    return (
                        <Text
                            key={index}
                            style={[
                                styles.cyfra,
                                isResult && styles.resultCyfra,
                                {opacity: opacity},
                                isColHighlight ? styles.highlightJednosci : styles.normalCyfra,

                                // APLIKACJA ZACERNIENIA
                                shouldDim && styles.cyfraOpacity,
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
                <Text style={styles.additionTitle}>Zadanie: {num1} - {num2}</Text>

                {/* Wiersz Pożyczki (6) - RENDEROWANY WARUNKOWO */}
                <View style={[styles.subtractionRow, styles.borrowRow]}>
                    <Text style={styles.cyfra}></Text>
                    {isVisible(4) ? borrowedElement : <Text style={styles.cyfra}></Text>}
                    <Text style={styles.cyfra}></Text>
                </View>

                {/* Wiersz 1: 72. Widoczny od VIS_STEP 1 */}
                {renderRow(number1, false, 1)}

                {/* Wiersz 2: -45. Widoczny od VIS_STEP 1 */}
                {renderRow(number2, false, 1)}

                {/* Kreska. Widoczna od VIS_STEP 2 */}
                <View style={[styles.additionLine, { opacity: isVisible(2) ? 1 : 0 }]} />

                {/* Wynik: 27 */}
                {renderRow(result, true, 4)}
            </View>
        );
    };

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
                        {/* 1. KONTENER GŁÓWNEJ WIZUALIZACJI */}
                        <View style={styles.diagramArea}>
                            {renderWrittenSubtractionDiagram()}
                        </View>

                        {/* 2. TEKST WYJAŚNIAJĄCY */}
                        <View style={styles.additionInfoWrapper}>
                            <Text style={styles.additionInfo}>
                                {getExplanationText(step, num1, num2)}
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
    additionCoreContainer: { // Kontener dla operacji
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
    subtractionRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        width: '100%',
    },
    borrowRow: {
        height: 20,
    },
    subtractionBorrowed: { // Styl dla pożyczonej/zmienionej cyfry
        fontSize: 16,
        fontWeight: 'bold',
        color: '#D84315',
        position: 'absolute',
        top: 0,
        right: 82,
    },
    cyfra: {
        fontSize: 28,
        fontWeight: 'normal',
        width: 40,
        textAlign: 'center',
        color: '#5D4037',
    },
    cyfraOpacity: { // Styl dla cyfry, która ma zostać "zamazana" po pożyczeniu
        opacity: 0.3,
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
    highlightJednosci: {
        backgroundColor: '#FFD54F',
        borderRadius: 4,
    },
    normalCyfra: {
        backgroundColor: 'transparent',
    },
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