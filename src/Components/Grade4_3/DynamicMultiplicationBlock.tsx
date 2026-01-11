import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator,
    ImageBackground, useColorScheme, StatusBar // 🔥 Dodano importy
} from 'react-native';

import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

const LESSON_ID = 'dynamicMultiplication';
const MAX_STEPS = 7;

const STATIC_LESSON_DATA = {
    title: "Mnożenie pisemne przez liczbę jednocyfrową",
};

export default function DynamicMultiplicationBlock() {
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
        textStep: isDarkMode ? '#CBD5E1' : '#5D4037',
        highlight: isDarkMode ? '#60A5FA' : '#1976D2',
        buttonBg: isDarkMode ? '#F59E0B' : '#FFD54F',
        buttonText: isDarkMode ? '#1E293B' : '#5D4037',
        diagramBg: isDarkMode ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        infoBox: isDarkMode ? '#1E293B' : '#E0F7FA',
        infoText: isDarkMode ? '#4ADE80' : '#00796B',
        line: isDarkMode ? '#F87171' : '#D84315',
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
                    setFactor2(data?.factor2 || '3');
                }
            } catch (error) {
                console.error('Błąd ładowania danych:', error);
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
                return <Text key={index} style={[styles.numberHighlight, { color: theme.highlight }]}>{part}</Text>;
            } else {
                return <Text key={index}>{part}</Text>;
            }
        });
    };

    if (loading || !factor1 || !factor2) {
        return (
            <View style={[styles.wrapper, { backgroundColor: isDarkMode ? '#0F172A' : '#FAFAFA' }]}>
                <ActivityIndicator size="large" color={theme.buttonBg} />
                <Text style={{ marginTop: 10, color: theme.textMain }}>Ładowanie zadania...</Text>
            </View>
        );
    }

    const getExplanationText = (visStep: number, f1: string, f2: string) => {
        const isHighlight = (current: number) => visStep === current;
        const unitMult = parseInt(f1[1]) * parseInt(f2);
        const tenMult = parseInt(f1[0]) * parseInt(f2);

        if (isHighlight(1)) return `Zapisujemy liczby, wyrównując je do prawej. Zaczynamy mnożyć od (jedności).`;
        if (isHighlight(2)) return `Rysujemy linię. Zadanie gotowe!`;
        if (isHighlight(3)) return `Krok 1: Podświetlamy JEDNOŚCI. Mnożymy: ${f1[1]} x ${f2} = ${unitMult}.`;
        if (isHighlight(4)) return `Wynik (${unitMult}): Zapisz 5 pod Jednościami, a (1) przenieś na górę kolumny Dziesiątek.`;
        if (isHighlight(5)) return `Krok 2: Podświetlamy DZIESIĄTKI. Mnożymy: ${f1[0]} x ${f2}.`;
        if (isHighlight(6)) return `Dodaj przeniesienie: ${tenMult} + 1 = ${tenMult + 1}. Zapisujemy 13.`;
        if (isHighlight(7)) return `Zapisujemy 13 pod Dziesiątkami. Wynik to 135. Zadanie wykonane!`;
        return `Kliknij "Dalej", aby rozpocząć mnożenie krok po kroku.`;
    };

    const renderWrittenMultiplicationDiagram = () => {
        const number1 = ' ' + factor1;
        const number2 = 'x ' + factor2;
        const result = (parseInt(factor1) * parseInt(factor2)).toString();
        const VIS_STEP = step;
        const isVisible = (start: number) => VIS_STEP >= start;
        const isHighlight = (current: number) => VIS_STEP === current;

        const renderRow = (text: string, isRes: boolean = false, visibleStartStep: number) => (
            <View style={styles.multiplicationRow}>
                {text.split('').map((char, index) => {
                    let opacity = 0;
                    if (isRes) {
                        if (index === text.length - 1) opacity = isVisible(4) ? 1 : 0;
                        else if (index === text.length - 2 || index === text.length - 3) opacity = isVisible(6) ? 1 : 0;
                    } else {
                        opacity = isVisible(visibleStartStep) ? 1 : 0;
                    }
                    const isColHighlight = (isHighlight(3) && index === text.length - 1) || (isHighlight(5) && index === text.length - 2);
                    return (
                        <Text key={index} style={[
                            styles.cyfra,
                            { opacity, color: isRes ? theme.highlight : theme.textMain },
                            isColHighlight && { backgroundColor: isDarkMode ? '#334155' : '#FFD54F', borderRadius: 4 }
                        ]}>
                            {char}
                        </Text>
                    );
                })}
            </View>
        );

        return (
            <View style={styles.additionCoreContainer}>
                <Text style={[styles.additionTitle, { color: theme.textMain }]}>Zadanie: {factor1} x {factor2}</Text>
                <View style={[styles.multiplicationRow, styles.carryRow]}>
                    <Text style={styles.cyfra}></Text>
                    {isVisible(4) ? <Text style={[styles.carry, { color: theme.line }]}>1</Text> : <Text style={styles.cyfra}></Text>}
                    <Text style={styles.cyfra}></Text>
                    <Text style={styles.cyfra}></Text>
                </View>
                {renderRow(number1, false, 1)}
                {renderRow(number2, false, 1)}
                <View style={[styles.additionLine, { opacity: isVisible(2) ? 1 : 0, backgroundColor: theme.line }]} />
                {renderRow(result, true, 4)}
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
                            {step >= 1 && (
                                <View style={[styles.diagramArea, { backgroundColor: theme.diagramBg }]}>
                                    {renderWrittenMultiplicationDiagram()}
                                </View>
                            )}
                            <View style={styles.additionInfoWrapper}>
                                <Text style={[styles.additionInfo, { backgroundColor: theme.infoBox, color: theme.infoText }]}>
                                    {getExplanationText(step, factor1, factor2)}
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
    backgroundImage: { flex: 1 },
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
    title: { fontSize: 22, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
    scrollArea: { width: '100%' },
    scrollContent: { alignItems: 'center', paddingBottom: 50 },
    button: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 25, marginTop: 20 },
    buttonText: { fontSize: 18, fontWeight: 'bold' },
    diagramArea: {
        width: '100%',
        marginTop: 20,
        padding: 15,
        borderRadius: 8,
        borderLeftWidth: 5,
        borderLeftColor: '#00796B',
        alignItems: 'center',
    },
    additionCoreContainer: { marginTop: 10, marginBottom: 10, alignItems: 'flex-end', width: 150 },
    additionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
    multiplicationRow: { flexDirection: 'row', justifyContent: 'flex-end', width: '100%' },
    carryRow: { height: 20 },
    carry: {
        fontSize: 16,
        fontWeight: 'bold',
        position: 'absolute',
        top: 0,
        right: 42,
    },
    cyfra: { fontSize: 28, width: 40, textAlign: 'center' },
    additionLine: { width: 120, height: 3, marginBottom: 5, marginTop: 2 },
    additionInfoWrapper: { width: '100%', marginTop: 15, alignItems: 'center' },
    additionInfo: { fontSize: 16, textAlign: 'center', minHeight: 40, padding: 8, borderRadius: 4, width: '90%' },
    numberHighlight: { fontWeight: 'bold', fontSize: 20 },
});