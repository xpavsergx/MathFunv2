import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator,
    ImageBackground, Dimensions
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

    if (loading || !dividend || !divisor) {
        return (
            <View style={[styles.wrapper, styles.loadingWrapper]}>
                <ActivityIndicator size="large" color="#FF8F00" />
                <Text style={{marginTop: 10}}>Ładowanie zadania...</Text>
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
            { r: 3, c: 1, text: D[1], visible: 5, isHighlight: 6, style: styles.broughtDown },
            { r: 4, c: 1, text: (parseInt(d) * parseInt(Q[1])).toString(), visible: 7, isHighlight: 7 },
            { r: 4, c: 0, text: '-', visible: 7 },
            { r: 5, c: 1, text: '0', visible: 7, style: styles.finalRemainder },
        ];

        const numRows = 6;
        const numCols = 4;
        const grid = Array(numRows).fill(0).map(() => Array(numCols).fill(''));

        return (
            <View style={styles.additionCoreContainer}>
                {isVisible(1) && (
                    <View style={styles.divisionHeader}>
                        <View style={styles.divisionLineFull} />
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
                                            <Text style={styles.minusSign}>{minusItem.text}</Text>
                                        )}
                                        <Text style={[
                                            styles.cyfra,
                                            item && isHighlight(item.isHighlight) && styles.highlight,
                                            r === 0 && styles.quotientText,
                                            item?.style,
                                            { opacity }
                                        ]}>
                                            {content}
                                        </Text>
                                        {showUnderline && (c === 0 || c === 1) && <View style={styles.subtractionLine} />}
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
        <ImageBackground source={require('../../assets/tloTeorii.png')} style={styles.backgroundImage} resizeMode="cover">
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <Text style={styles.title}>{STATIC_LESSON_DATA.title}</Text>
                    <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
                        <Text style={styles.taskDisplay}>Zadanie: {dividend} : {divisor}</Text>

                        {step >= 1 && (
                            <View style={styles.diagramArea}>
                                {renderWrittenDivisionDiagram()}
                            </View>
                        )}

                        <View style={styles.additionInfoWrapper}>
                            <Text style={styles.explanationText}>
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

const styles = StyleSheet.create({
    backgroundImage: { flex: 1, width: '100%', height: '100%' },
    overlay: { flex: 1, alignItems: 'center', paddingTop: 20 },
    wrapper: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    loadingWrapper: { padding: 20 },
    container: {
        backgroundColor: 'rgba(255, 255, 255, 0.92)',
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
        width: '95%',
        maxWidth: 500,
        minHeight: 500,
        elevation: 5,
        marginBottom: 50,
    },
    title: { fontSize: 20, fontWeight: 'bold', color: '#1565C0', textAlign: 'center', marginBottom: 15 },
    scrollArea: { width: '100%' },
    scrollContent: { alignItems: 'center', paddingBottom: 30 },
    taskDisplay: { fontSize: 22, fontWeight: 'bold', color: '#37474F', marginBottom: 20 },
    diagramArea: {
        width: '100%',
        paddingTop: 40,
        paddingBottom: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 8,
        borderLeftWidth: 5,
        borderLeftColor: '#00796B',
        alignItems: 'center',
    },
    additionCoreContainer: { alignItems: 'flex-start', width: 200, marginTop: 10 },
    divisionHeader: { width: '100%', height: 3, zIndex: 2 },
    divisionLineFull: {
        height: 3,
        backgroundColor: '#37474F',
        width: 85,
    },
    divisionGrid: {
        width: '100%',
        marginTop: -10, // Podciągnięcie 84 : 4 bliżej kreski
    },
    divisionRow: { flexDirection: 'row' },
    cyfraContainer: {
        width: 40,
        height: 38, // Ciaśniejsze rzędy
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative'
    },
    cyfra: { fontSize: 28, fontWeight: '600', color: '#37474F' },
    quotientText: {
        position: 'absolute',
        top: -42,
        color: '#E65100',
        fontWeight: 'bold'
    },
    highlight: { backgroundColor: '#FFF9C4', borderRadius: 5 },
    subtractionLine: { position: 'absolute', bottom: 0, height: 2, width: '100%', backgroundColor: '#C62828' },
    minusSign: { position: 'absolute', left: -15, fontSize: 24, color: '#C62828' },
    broughtDown: { color: '#00796B', fontWeight: 'bold' },
    finalRemainder: { color: '#1565C0', fontWeight: 'bold' },
    additionInfoWrapper: { marginTop: 20, width: '100%' },
    explanationText: {
        fontSize: 16, color: '#00695C', textAlign: 'center',
        backgroundColor: '#E0F2F1', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#B2DFDB'
    },
    // POWRÓT DO PIERWOTNEGO STYLU PRZYCISKU
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