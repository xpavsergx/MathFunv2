import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator,
    ImageBackground, useColorScheme, StatusBar
} from 'react-native';

import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

// 🚀 ID dokumentu dla "Mnożenie Pisemne przez Liczby Wielocyfrowe"
const LESSON_ID = 'multiplicationTwoDigits';
const MAX_STEPS = 9;

const STATIC_LESSON_DATA = {
    title: "Mnożenie pisemne przez liczby wielocyfrowe",
};

export default function DynamicMultiplicationTwoDigitsBlock() {
    const [step, setStep] = useState(0);
    const [factor1, setFactor1] = useState('');
    const [factor2, setFactor2] = useState('');
    const [loading, setLoading] = useState(true);

    // 🔥 LOGIKA TRYBU CIEMNEGO
    const isDarkMode = useColorScheme() === 'dark';
    const theme = {
        bgImage: require('../../assets/tloTeorii.png'),
        bgOverlay: isDarkMode ? 'rgba(0, 0, 0, 0.75)' : 'rgba(255, 255, 255, 0.2)',
        cardBg: isDarkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.85)',
        title: isDarkMode ? '#FBBF24' : '#1976D2',
        textMain: isDarkMode ? '#F1F5F9' : '#5D4037',
        highlight: isDarkMode ? '#60A5FA' : '#1976D2',
        buttonBg: isDarkMode ? '#F59E0B' : '#FFD54F',
        buttonText: isDarkMode ? '#1E293B' : '#5D4037',
        diagramBg: isDarkMode ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        infoBox: isDarkMode ? '#1E293B' : '#E0F7FA',
        infoText: isDarkMode ? '#4ADE80' : '#00796B',
        line: isDarkMode ? '#F87171' : '#D84315',
        partialSumBg: isDarkMode ? '#334155' : '#E0F7FA',
        resultFinal: isDarkMode ? '#F87171' : '#D84315',
    };

    const handleNextStep = () => {
        setStep((prev) => (prev < MAX_STEPS ? prev + 1 : prev));
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const doc = await firestore().collection('lessons').doc(LESSON_ID).get();
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
            <View style={[styles.wrapper, { backgroundColor: isDarkMode ? '#0F172A' : '#FAFAFA' }]}>
                <ActivityIndicator size="large" color={theme.buttonBg} />
                <Text style={{ marginTop: 10, color: theme.textMain }}>Ładowanie zadania...</Text>
            </View>
        );
    }

    const F1 = parseInt(factor1);
    const F2_jednosci = parseInt(factor2[1]);
    const F2_dziesiatki = parseInt(factor2[0]);
    const partial1 = F1 * F2_jednosci;
    const partial2 = F1 * F2_dziesiatki * 10;
    const finalResult = partial1 + partial2;

    const getExplanationText = (visStep: number) => {
        const isHighlight = (current: number) => visStep === current;
        if (isHighlight(1)) return `Zapisujemy czynniki (${factor1} i ${factor2}) i rysujemy linię.`;
        if (isHighlight(2)) return `Krok 1: Mnożenie przez jedności. Mnożymy ${factor1} przez ${F2_jednosci}.`;
        if (isHighlight(3)) return `Wynik cząstkowy (1) to ${partial1}. Zapisujemy go pod linią.`;
        if (isHighlight(4)) return `Krok 2: Mnożenie przez dziesiątki. Mnożymy ${factor1} przez ${F2_dziesiatki}.`;
        if (isHighlight(5)) return `Zaczynamy zapisywać wynik cząstkowy (2) (${partial2 / 10}) od kolumny dziesiątek, czyli pod ${F2_dziesiatki}.`;
        if (isHighlight(6)) return `Wynik cząstkowy (2) to ${partial2 / 10} (90). Dopisujemy zero w kolumnie jedności.`;
        if (isHighlight(7)) return `Rysujemy drugą linię i dodajemy znak plus.`;
        if (isHighlight(8)) return `Krok 3: Dodawanie pisemne. Sumujemy wiersze cząstkowe: ${partial1} + ${partial2}.`;
        if (isHighlight(9)) return `Wynik końcowy to ${finalResult}.`;
        return `Kliknij "Dalej", aby rozpocząć mnożenie pisemne.`;
    };

    const renderWrittenMultiplicationDiagram = () => {
        const F1_str = factor1;
        const F2_str = factor2;
        const P1_str = partial1.toString();
        const P2_raw = (F1 * F2_dziesiatki).toString();
        const Final_str = finalResult.toString();

        const VIS_STEP = step;
        const isVisible = (start: number) => VIS_STEP >= start;
        const isHighlight = (current: number) => VIS_STEP === current;

        const TOTAL_COLS = Final_str.length;
        const COL_WIDTH = 40;

        const renderRowContent = (text: string, rowType: 'input' | 'partial' | 'final') => {
            const isFinal = rowType === 'final';
            const isPartial1 = rowType === 'partial' && text === P1_str;
            const isPartial2Raw = rowType === 'partial' && text === P2_raw;
            const paddedText = ' '.repeat(TOTAL_COLS - text.length) + text;

            return paddedText.split('').map((char, index) => {
                let opacity = 1;
                let highlightStyle = {};

                if (isPartial1 && VIS_STEP < 3) opacity = 0;
                if (isPartial2Raw && VIS_STEP < 5) opacity = 0;
                if (isFinal && VIS_STEP < 9) opacity = 0;

                if ((isPartial1 || isPartial2Raw) && isHighlight(8)) {
                    highlightStyle = { backgroundColor: theme.partialSumBg, borderRadius: 4 };
                }

                return (
                    <Text
                        key={index}
                        style={[
                            styles.cyfra,
                            { opacity, color: isFinal ? (isHighlight(9) ? theme.resultFinal : theme.highlight) : theme.textMain },
                            highlightStyle,
                            isFinal && { fontWeight: 'bold' }
                        ]}
                    >
                        {char}
                    </Text>
                );
            });
        };

        return (
            <View style={styles.additionCoreContainer}>
                <View style={styles.multiplicationRow}>
                    {F1_str.split('').map((char, index) => (
                        <Text key={index} style={[styles.cyfra, { color: theme.textMain, opacity: isVisible(1) ? 1 : 0 }, (isHighlight(2) || isHighlight(4)) && { backgroundColor: isDarkMode ? '#334155' : '#FFD54F', borderRadius: 4 }]}>
                            {char}
                        </Text>
                    ))}
                </View>

                <View style={styles.multiplicationRow}>
                    <Text style={[styles.cyfra, { color: theme.line, opacity: isVisible(1) ? 1 : 0 }]}>x</Text>
                    <View style={{width: COL_WIDTH * (TOTAL_COLS - factor2.length - 1)}} />
                    {F2_str.split('').map((char, index) => (
                        <Text key={index} style={[styles.cyfra, { color: theme.textMain, opacity: isVisible(1) ? 1 : 0 }, ((index === 0 && isHighlight(4)) || (index === 1 && isHighlight(2))) && { backgroundColor: isDarkMode ? '#334155' : '#FFD54F', borderRadius: 4 }]}>
                            {char}
                        </Text>
                    ))}
                </View>

                <View style={[styles.additionLine, { width: COL_WIDTH * TOTAL_COLS, opacity: isVisible(1) ? 1 : 0, backgroundColor: theme.line }]} />

                <View style={[styles.multiplicationRow, isHighlight(8) && { backgroundColor: theme.partialSumBg, borderRadius: 4 }]}>
                    {renderRowContent(P1_str, 'partial')}
                </View>

                <View style={[styles.multiplicationRow, isHighlight(8) && { backgroundColor: theme.partialSumBg, borderRadius: 4 }]}>
                    <View style={{width: COL_WIDTH * (TOTAL_COLS - P2_raw.length)}} />
                    {P2_raw.split('').map((char, index) => (
                        <Text key={index} style={[styles.cyfra, { color: theme.textMain, opacity: isVisible(5) ? 1 : 0 }, isHighlight(4) && { backgroundColor: isDarkMode ? '#334155' : '#FFD54F', borderRadius: 4 }]}>
                            {char}
                        </Text>
                    ))}
                    <Text style={[styles.cyfra, { opacity: isVisible(6) ? 1 : 0, color: theme.textMain, fontStyle: 'italic' }]}>0</Text>
                </View>

                <View style={styles.multiplicationRow}>
                    <Text style={[styles.cyfra, { color: theme.line, opacity: isVisible(7) ? 1 : 0 }]}>+</Text>
                    <View style={{width: COL_WIDTH * (TOTAL_COLS - 1)}} />
                </View>

                <View style={[styles.additionLine, { width: COL_WIDTH * TOTAL_COLS, opacity: isVisible(7) ? 1 : 0, backgroundColor: theme.line, marginTop: 0, marginBottom: 5 }]} />

                <View style={styles.multiplicationRow}>
                    {renderRowContent(Final_str, 'final')}
                </View>
            </View>
        );
    };

    return (
        <View style={{ flex: 1 }}>
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
            <ImageBackground source={theme.bgImage} style={styles.backgroundImage} resizeMode="cover">
                <View style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.bgOverlay }]} />
                <View style={styles.overlay}>
                    <View style={[styles.container, { backgroundColor: theme.cardBg }]}>
                        <Text style={[styles.title, { color: theme.title }]}>{STATIC_LESSON_DATA.title}</Text>
                        <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
                            <Text style={[styles.taskDisplay, { color: theme.textMain }]}>Zadanie: {factor1} x {factor2}</Text>
                            {step >= 1 && (
                                <View style={[styles.diagramArea, { backgroundColor: theme.diagramBg, borderLeftColor: isDarkMode ? '#334155' : '#00796B' }]}>
                                    {renderWrittenMultiplicationDiagram()}
                                </View>
                            )}
                            <View style={styles.additionInfoWrapper}>
                                <Text style={[styles.additionInfo, { backgroundColor: theme.infoBox, color: theme.infoText }]}>
                                    {getExplanationText(step)}
                                </Text>
                            </View>
                        </ScrollView>
                        {step < MAX_STEPS && (
                            <TouchableOpacity style={[styles.button, { backgroundColor: theme.buttonBg }]} onPress={handleNextStep}>
                                <Text style={[styles.buttonText, { color: theme.buttonText }]}>Dalej ➜</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </ImageBackground>
        </View>
    );
}

const styles = StyleSheet.create({
    backgroundImage: { flex: 1, width: '100%', height: '100%' },
    overlay: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 20 },
    wrapper: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    container: {
        borderRadius: 12,
        padding: 20,
        alignItems: 'center',
        width: '90%',
        elevation: 3,
        maxWidth: 600,
        marginBottom: 100,
    },
    scrollArea: { width: '100%' },
    scrollContent: { alignItems: 'center', paddingBottom: 50 },
    // PRZYWRÓCONO ORYGINALNY ROZMIAR NAGŁÓWKA
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center'
    },
    taskDisplay: { fontSize: 18, fontWeight: 'bold', alignSelf: 'flex-start', marginLeft: 15, marginBottom: 10 },
    diagramArea: {
        width: '100%',
        marginTop: 5,
        padding: 15,
        borderRadius: 8,
        borderLeftWidth: 5,
        alignItems: 'center',
    },
    additionCoreContainer: { marginTop: 10, marginBottom: 10, alignItems: 'flex-end', width: 250 },
    multiplicationRow: { flexDirection: 'row', justifyContent: 'flex-end', width: '100%' },
    cyfra: { fontSize: 28, width: 40, textAlign: 'center' },
    additionLine: { height: 3, marginBottom: 5, marginTop: 2, alignSelf: 'flex-end' },
    additionInfoWrapper: { width: '100%', marginTop: 15, alignItems: 'center' },
    additionInfo: { fontSize: 16, textAlign: 'center', minHeight: 40, padding: 8, borderRadius: 4, width: '95%' },
    button: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 25, marginTop: 20 },
    buttonText: { fontSize: 18, fontWeight: 'bold' },
});