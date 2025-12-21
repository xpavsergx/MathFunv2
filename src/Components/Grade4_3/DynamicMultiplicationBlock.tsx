import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator,
    ImageBackground,
} from 'react-native';

import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

// 🚀 ID dokumentu dla "Dynamiczne Mnożenie Pisemne"
const LESSON_ID = 'dynamicMultiplication';
// 🚀 Ustal maksymalną liczbę kroków (0 do 7 = 8 kroków)
const MAX_STEPS = 7;

// --- STAŁE DANE DLA TEORII (zaszyte w kodzie - używamy tylko tytułu) ---
const STATIC_LESSON_DATA = {
    title: "Mnożenie pisemne przez liczbę jednocyfrową",
};

// --- KOMPONENT ---

export default function DynamicMultiplicationBlock() {
    const [step, setStep] = useState(0);
    const [factor1, setFactor1] = useState(''); // Górna liczba (np. 45)
    const [factor2, setFactor2] = useState(''); // Jednocyfrowy mnożnik (np. 3)
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
                    setFactor2(data?.factor2 || '3');
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

        // Obliczenia dla objaśnień (45 * 3 = 135)
        const unitMult = parseInt(factor1[1]) * parseInt(factor2); // 5 * 3 = 15
        const tenMult = parseInt(factor1[0]) * parseInt(factor2); // 4 * 3 = 12

        if (isHighlight(1)) {
            return `Zapisujemy liczby, wyrównując je do prawej. Zaczynamy mnożyć od (jedności).`;
        } else if (isHighlight(2)) {
            return `Rysujemy linię. Zadanie gotowe!`;
        } else if (isHighlight(3)) {
            return `Krok 1: Podświetlamy JEDNOŚCI. Mnożymy: ${factor1[1]} x ${factor2} = ${unitMult}.`;
        } else if (isHighlight(4)) {
            return `Wynik (${unitMult}): Zapisz 5 pod Jednościami, a (1) przenieś na górę kolumny Dziesiątek.`;
        } else if (isHighlight(5)) {
            return `Krok 2: Podświetlamy DZIESIĄTKI. Mnożymy: ${factor1[0]} x ${factor2}.`;
        } else if (isHighlight(6)) {
            return `Dodaj przeniesienie: ${tenMult} + 1 = ${tenMult + 1}. Zapisujemy 13.`;
        } else if (isHighlight(7)) {
            return `Zapisujemy 13 pod Dziesiątkami. Wynik to 135. Zadanie wykonane!`;
        } else {
            return `Kliknij "Dalej", aby rozpocząć pisanie zadania.`;
        }
    };

    const renderWrittenMultiplicationDiagram = () => {
        // Górna liczba (45)
        const number1 = ' ' + factor1;
        // Dolna liczba (*3)
        const number2 = 'x ' + factor2;
        // Wynik (135)
        const rawResult = (parseInt(factor1) * parseInt(factor2)).toString();
        const result = rawResult;

        const VIS_STEP = step;

        const isVisible = (start: number) => VIS_STEP >= start;
        const isHighlight = (current: number) => VIS_STEP === current;

        // Przeniesienie (Mała jedynka na górze)
        const carryElement = (
            <Text
                style={styles.carry}
            >
                1
            </Text>
        );

        // Renderowanie wiersza liczb
        const renderRow = (text: string, isResult: boolean = false, visibleStartStep: number) => (
            <View style={styles.multiplicationRow}>
                {text.split('').map((char, index) => {
                    let opacity = 0;

                    if (isResult) {
                        // Cyfry wyniku (135)
                        // Jedności (index 2) - Pojawia się VIS_STEP 4
                        if (index === text.length - 1) opacity = isVisible(4) ? 1 : 0;
                        // Dziesiątki (index 1) i Setki (index 0) - Pojawiają się VIS_STEP 6
                        else if (index === text.length - 2 || index === text.length - 3) opacity = isVisible(6) ? 1 : 0;
                    } else {
                        // LICZBY WEJŚCIOWE
                        opacity = isVisible(visibleStartStep) ? 1 : 0;
                    }

                    // Podświetlenie: Jedności (index 2) w VIS_STEP 3, Dziesiątki (index 1) w VIS_STEP 5
                    const isColHighlight = (isHighlight(3) && index === text.length - 1) || (isHighlight(5) && index === text.length - 2);

                    return (
                        <Text
                            key={index}
                            style={[
                                styles.cyfra,
                                isResult && styles.resultCyfra,
                                {opacity: opacity},
                                isColHighlight ? styles.highlightJednosci : styles.normalCyfra,
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

                {/* Wiersz Przeniesienia (Carry) */}
                <View style={[styles.multiplicationRow, styles.carryRow]}>
                    <Text style={styles.cyfra}></Text>
                    {isVisible(4) ? carryElement : <Text style={styles.cyfra}></Text>}
                    <Text style={styles.cyfra}></Text>
                    <Text style={styles.cyfra}></Text>
                </View>

                {/* Wiersz 1: 45. Widoczny od VIS_STEP 1 */}
                {renderRow(number1, false, 1)}

                {/* Wiersz 2: x3. Widoczny od VIS_STEP 1 */}
                {renderRow(number2, false, 1)}

                {/* Kreska. Widoczna od VIS_STEP 2 */}
                <View style={[styles.additionLine, { opacity: isVisible(2) ? 1 : 0 }]} />

                {/* Wynik: 135 */}
                {renderRow(result, true, 4)}
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
        width: 150, // Szerokość operacji
    },
    additionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#5D4037',
        marginBottom: 8,
    },
    // ZMIANA: Styl dla wiersza mnożenia
    multiplicationRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        width: '100%',
    },
    carryRow: {
        height: 20,
    },
    // ZMIANA: Styl dla przeniesienia w mnożeniu
    carry: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#D84315',
        position: 'absolute',
        top: 0,
        right: 42,
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