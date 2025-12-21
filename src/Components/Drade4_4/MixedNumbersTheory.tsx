import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, ActivityIndicator } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import Svg, { Circle, Path, G } from 'react-native-svg';

export default function MixedNumbersTheory() {
    const [step, setStep] = useState(0);
    const [lessonData, setLessonData] = useState<any>(null);
    const [stepsArray, setStepsArray] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = firestore()
            .collection('lessons')
            .doc('mixedNumbersIntro')
            .onSnapshot(doc => {
                if (doc.exists) {
                    const data = doc.data();
                    setLessonData(data);
                    if (data?.steps) {
                        // Konwersja mapy na posortowaną tablicę (kroki 0, 1, 2, 3, 4)
                        const converted = Object.keys(data.steps)
                            .sort((a, b) => parseInt(a) - parseInt(b))
                            .map(key => ({ text: data.steps[key] }));
                        setStepsArray(converted);
                    }
                }
                setLoading(false);
            });
        return () => unsubscribe();
    }, []);

    const handleNext = () => {
        if (step < stepsArray.length - 1) setStep(step + 1);
    };

    const renderPizza = (isWhole: boolean, isPart: boolean) => {
        const parts = 4;
        const radius = 35;
        const centerX = 40;
        const centerY = 40;

        const slices = [];
        for (let i = 0; i < parts; i++) {
            const startAngle = (i * 360) / parts;
            const endAngle = ((i + 1) * 360) / parts;
            const x1 = centerX + radius * Math.cos((Math.PI * startAngle) / 180);
            const y1 = centerY + radius * Math.sin((Math.PI * startAngle) / 180);
            const x2 = centerX + radius * Math.cos((Math.PI * endAngle) / 180);
            const y2 = centerY + radius * Math.sin((Math.PI * endAngle) / 180);

            const pathData = `M${centerX},${centerY} L${x1},${y1} A${radius},${radius} 0 0,1 ${x2},${y2} Z`;

            let fillColor = "#F5F5F5"; // Tło pustego kawałka
            if (isWhole && step >= 1) fillColor = "#FF9800"; // Kolorujemy całe pizze od kroku 1
            if (isPart && i === 0 && step >= 3) fillColor = "#FF9800"; // Kolorujemy ułamek od kroku 3

            slices.push(
                <Path key={i} d={pathData} fill={fillColor} stroke="#5D4037" strokeWidth="1.5" />
            );
        }

        return (
            <Svg height="80" width="80" viewBox="0 0 80 80">
                <G rotation="-90" origin="40, 40">
                    {/* Krok 0 pokazuje pizzę jako jeden żółty obiekt, od kroku 1 widać podziały */}
                    {step === 0 && isWhole ?
                        <Circle cx="40" cy="40" r="35" fill="#FFD54F" stroke="#5D4037" strokeWidth="2" /> :
                        slices
                    }
                </G>
            </Svg>
        );
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#FFB300" /></View>;

    return (
        <ImageBackground source={require('../../assets/tloTeorii.png')} style={styles.backgroundImage} resizeMode="cover">
            <View style={styles.container}>
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>{lessonData?.title}</Text>

                    <View style={styles.pizzasRow}>
                        {renderPizza(true, false)}
                        {renderPizza(true, false)}
                        {renderPizza(false, true)}
                    </View>

                    <View style={styles.fractionStepWrapper}>
                        {/* KROK 1: Pojawia się CAŁOŚĆ (2) */}
                        <Text style={[styles.wholeNumber, { opacity: step >= 1 ? 1 : 0 }]}>2</Text>

                        <View style={styles.fractionBox}>
                            {/* KROK 3: Pojawia się LICZNIK (1) */}
                            <Text style={[styles.num, { opacity: step >= 3 ? 1 : 0 }]}>1</Text>

                            {/* KROK 2: Pojawia się KRESKA I MIANOWNIK (4) */}
                            <View style={[styles.line, { opacity: step >= 2 ? 1 : 0 }]} />
                            <Text style={[styles.den, { opacity: step >= 2 ? 1 : 0 }]}>4</Text>
                        </View>

                        {/* KROK 4: Pojawiają się oba podpisy naraz */}
                        <View style={styles.labelsBox}>
                            {step >= 4 && (
                                <>
                                    <Text style={[styles.labelPointer, { marginTop: -5 }]}>← Liczba mieszana</Text>
                                </>
                            )}
                        </View>
                    </View>

                    <View style={styles.infoBox}>
                        <Text style={styles.explanationText}>
                            {stepsArray[step]?.text || "Ładowanie..."}
                        </Text>
                    </View>

                    {step < stepsArray.length - 1 ? (
                        <TouchableOpacity style={styles.button} onPress={handleNext}>
                            <Text style={styles.buttonText}>Dalej ➜</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={styles.buttonReset} onPress={() => setStep(0)}>
                            <Text style={styles.buttonResetText}>Od nowa ↺</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    backgroundImage: { flex: 1, width: '100%', height: '100%' },
    container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    card: {
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        width: '94%',
        borderRadius: 25,
        padding: 20,
        alignItems: 'center',
        elevation: 10,
    },
    cardTitle: { fontSize: 22, fontWeight: 'bold', color: '#1565C0', marginBottom: 20, textAlign: 'center' },
    pizzasRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20 },
    fractionStepWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 120,
        marginBottom: 15,
        width: '100%'
    },
    wholeNumber: {
        fontSize: 72,
        fontWeight: 'bold',
        color: '#2E7D32',
        marginRight: 12
    },
    fractionBox: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 50
    },
    line: { width: 45, height: 4, backgroundColor: '#333', marginVertical: 4 },
    num: { fontSize: 36, fontWeight: 'bold', color: '#E65100' },
    den: { fontSize: 36, fontWeight: 'bold', color: '#1565C0' },
    labelsBox: {
        marginLeft: 15,
        width: 140,
        height: 100,
        justifyContent: 'center'
    },
    labelPointer: {
        fontSize: 14,
        fontWeight: '900',
        color: '#5D4037'
    },
    infoBox: {
        backgroundColor: '#E0F2F1',
        padding: 15,
        borderRadius: 15,
        width: '100%',
        minHeight: 80,
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: '#B2DFDB'
    },
    explanationText: { fontSize: 18, color: '#00695C', textAlign: 'center', fontWeight: '600' },
    button: { backgroundColor: '#FFD54F', paddingHorizontal: 45, paddingVertical: 12, borderRadius: 25, marginTop: 25 },
    buttonText: { fontSize: 18, color: '#5D4037', fontWeight: 'bold' },
    // ZIELONY PRZYCISK OD NOWA
    buttonReset: { backgroundColor: '#4CAF50', paddingHorizontal: 45, paddingVertical: 12, borderRadius: 25, marginTop: 25 },
    buttonResetText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
});