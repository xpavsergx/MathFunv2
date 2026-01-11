import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator,
    ImageBackground, Dimensions, useColorScheme, StatusBar
} from 'react-native';

import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

// ID dokumentu dla lekcji
const LESSON_ID = 'dynamicDivision';
const MAX_STEPS = 8;
const { width } = Dimensions.get('window');

const STATIC_LESSON_DATA = {
    title: "Dzielenie pisemne przez liczby jednocyfrowe",
};

export default function DynamicDivisionBlock() {
    const [step, setStep] = useState(0);
    const [dividend, setDividend] = useState('');
    const [divisor, setDivisor] = useState('');
    const [loading, setLoading] = useState(true);

    // 🔥 LOGIKA TRYBU CIEMNEGO
    const isDarkMode = useColorScheme() === 'dark';
    const theme = {
        bgImage: require('../../assets/tloTeorii.png'),
        bgOverlay: isDarkMode ? 'rgba(0, 0, 0, 0.75)' : 'rgba(255, 255, 255, 0.2)',
        cardBg: isDarkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.92)',
        title: isDarkMode ? '#FBBF24' : '#1565C0',
        textMain: isDarkMode ? '#F1F5F9' : '#37474F',
        diagramBg: isDarkMode ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        highlight: isDarkMode ? '#334155' : '#FFF9C4',
        explanationBg: isDarkMode ? '#1E293B' : '#E0F2F1',
        explanationBorder: isDarkMode ? '#334155' : '#B2DFDB',
        explanationText: isDarkMode ? '#4ADE80' : '#00695C',
        quotient: isDarkMode ? '#FB923C' : '#E65100',
        buttonBg: isDarkMode ? '#F59E0B' : '#FFD54F',
        buttonText: isDarkMode ? '#1E293B' : '#5D4037',
        line: isDarkMode ? '#94A3B8' : '#37474F',
        subLine: isDarkMode ? '#F87171' : '#C62828',
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
                    setDividend(data?.dividend || '84');
                    setDivisor(data?.divisor || '4');
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

    if (loading || !dividend || !divisor) {
        return (
            <View style={[styles.wrapper, { backgroundColor: isDarkMode ? '#0F172A' : '#FAFAFA' }]}>
                <ActivityIndicator size="large" color={theme.buttonBg} />
                <Text style={{marginTop: 10, color: theme.textMain}}>Ładowanie zadania...</Text>
            </View>
        );
    }

    const getExplanationText = (visStep: number, dividend: string, divisor: string) => {
        const partialResult1 = Math.floor(parseInt(dividend[0]) / parseInt(divisor));
        const remainder1 = parseInt(dividend[0]) % parseInt(divisor);
        const result = (parseInt(dividend) / parseInt(divisor)).toString();

        switch(visStep) {
            case 1: return `Zapisujemy dzielną (${dividend}) i dzielnik (${divisor}) obok siebie.`;
            case 2: return `Krok 1: Dzielenie. Sprawdzamy, ile razy ${divisor} mieści się w ${dividend[0]}.`;
            case 3: return `Wynik (${partialResult1}) zapisujemy na górze nad cyfrą ${dividend[0]}.`;
            case 4: return `Mnożymy: ${partialResult1} x ${divisor} = ${partialResult1 * parseInt(divisor)}. Odejmujemy od ${dividend[0]}, zostaje ${remainder1}.`;
            case 5: return `Sprowadzamy kolejną cyfrę (${dividend[1]}). Mamy teraz liczbę ${remainder1}${dividend[1]}.`;
            case 6: return `Dzielimy ${remainder1}${dividend[1]} przez ${divisor}. Wynik (${dividend[1]}) dopisujemy na górze.`;
            case 7: return `Mnożymy: ${dividend[1]} x ${divisor} = ${parseInt(dividend[1]) * parseInt(divisor)}. Reszta wynosi 0.`;
            case 8: return `Brak cyfr do sprowadzenia. Dzielenie zakończone. Wynik to ${result}.`;
            default: return `Kliknij "Dalej", aby rozpocząć dzielenie krok po kroku.`;
        }
    };

    const renderWrittenDivisionDiagram = () => {
        const D = dividend;
        const d = divisor;
        const Q = (parseInt(D) / parseInt(d)).toString();
        const VIS_STEP = step;
        const isVisible = (start: number) => VIS_STEP >= start;
        const isHighlight = (current: number) => VIS_STEP === current;

        const items = [
            { r: 0, c: 0, text: Q[0], visible: 3, isHighlight: 2 },
            { r: 0, c: 1, text: Q[1], visible: 6, isHighlight: 6 },
            { r: 1, c: 0, text: D[0], visible: 1, isHighlight: 2 },
            { r: 1, c: 1, text: D[1], visible: 1, isHighlight: 5 },
            { r: 1, c: 2, text: ':', visible: 1 },
            { r: 1, c: 3, text: d, visible: 1 },
            { r: 2, c: 0, text: (parseInt(d) * parseInt(Q[0])).toString(), visible: 4, isHighlight: 4 },
            { r: 2, c: -1, text: '-', visible: 4 },
            { r: 3, c: 0, text: '0', visible: 4 },
            { r: 3, c: 1, text: D[1], visible: 5, isHighlight: 6, color: isDarkMode ? '#4ADE80' : '#00796B' },
            { r: 4, c: 1, text: (parseInt(d) * parseInt(Q[1])).toString(), visible: 7, isHighlight: 7 },
            { r: 4, c: 0, text: '-', visible: 7 },
            { r: 5, c: 1, text: '0', visible: 7, color: isDarkMode ? '#60A5FA' : '#1565C0' },
        ];

        const numRows = 6;
        const numCols = 4;
        const grid = Array(numRows).fill(0).map(() => Array(numCols).fill(''));

        return (
            <View style={styles.additionCoreContainer}>
                {isVisible(1) && (
                    <View style={styles.divisionHeader}>
                        <View style={[styles.divisionLineFull, { backgroundColor: theme.line }]} />
                    </View>
                )}

                <View style={styles.divisionGrid}>
                    {grid.map((rowArr, r) => (
                        <View key={r} style={styles.divisionRow}>
                            {rowArr.map((_, c) => {
                                const item = items.find(i => i.r === r && i.c === c);
                                const minusItem = items.find(i => i.r === r && i.c === -1);
                                let content = item ? item.text : '';
                                let opacity = item && isVisible(item.visible) ? 1 : 0;
                                const showUnderline = (r === 2 && isVisible(4)) || (r === 4 && isVisible(7));

                                return (
                                    <View key={c} style={styles.cyfraContainer}>
                                        {c === 0 && minusItem && isVisible(minusItem.visible) && (
                                            <Text style={[styles.minusSign, { color: theme.subLine }]}>{minusItem.text}</Text>
                                        )}
                                        <Text style={[
                                            styles.cyfra,
                                            { color: theme.textMain },
                                            item && isHighlight(item.isHighlight) && { backgroundColor: theme.highlight, borderRadius: 5 },
                                            r === 0 && { color: theme.quotient, fontWeight: 'bold', position: 'absolute', top: -42 },
                                            item?.color ? { color: item.color, fontWeight: 'bold' } : {},
                                            { opacity }
                                        ]}>
                                            {content}
                                        </Text>
                                        {showUnderline && (c === 0 || c === 1) && <View style={[styles.subtractionLine, { backgroundColor: theme.subLine }]} />}
                                    </View>
                                );
                            })}
                        </View>
                    ))}
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
                            <Text style={[styles.taskDisplay, { color: theme.textMain }]}>Zadanie: {dividend} : {divisor}</Text>

                            {step >= 1 && (
                                <View style={[styles.diagramArea, { backgroundColor: theme.diagramBg, borderLeftColor: isDarkMode ? '#334155' : '#00796B' }]}>
                                    {renderWrittenDivisionDiagram()}
                                </View>
                            )}

                            <View style={styles.additionInfoWrapper}>
                                <Text style={[styles.explanationText, {
                                    backgroundColor: theme.explanationBg,
                                    borderColor: theme.explanationBorder,
                                    color: theme.explanationText
                                }]}>
                                    {getExplanationText(step, dividend, divisor)}
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
    overlay: { flex: 1, alignItems: 'center', paddingTop: 20 },
    wrapper: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    loadingWrapper: { padding: 20 },
    container: {
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
        width: '95%',
        elevation: 5,
        marginBottom: 50,
    },
    // PRZYWRÓCONO ROZMIAR 22
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 15
    },
    scrollArea: { width: '100%' },
    scrollContent: { alignItems: 'center', paddingBottom: 30 },
    taskDisplay: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
    diagramArea: {
        width: '100%',
        paddingTop: 40,
        paddingBottom: 20,
        borderRadius: 8,
        borderLeftWidth: 5,
        alignItems: 'center',
    },
    additionCoreContainer: { alignItems: 'flex-start', width: 200, marginTop: 10 },
    divisionHeader: { width: '100%', height: 3, zIndex: 2 },
    divisionLineFull: {
        height: 3,
        width: 85,
    },
    divisionGrid: {
        width: '100%',
        marginTop: -10,
    },
    divisionRow: { flexDirection: 'row' },
    cyfraContainer: {
        width: 40,
        height: 38,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative'
    },
    cyfra: { fontSize: 28, fontWeight: '600' },
    subtractionLine: { position: 'absolute', bottom: 0, height: 2, width: '100%' },
    minusSign: { position: 'absolute', left: -15, fontSize: 24 },
    additionInfoWrapper: { marginTop: 20, width: '100%' },
    explanationText: {
        fontSize: 16, textAlign: 'center',
        padding: 12, borderRadius: 10, borderWidth: 1
    },
    button: {
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 25,
        marginTop: 20,
    },
    buttonText: {
        fontSize: 18,
        fontWeight: 'bold',
    },
});