import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, ActivityIndicator } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import Svg, { Circle, Path, G } from 'react-native-svg';

export default function FractionsComparisonBlock() {
    const [step, setStep] = useState(0);
    const [lessonData, setLessonData] = useState<any>(null);
    const [stepsArray, setStepsArray] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = firestore()
            .collection('lessons')
            .doc('fractionsComparison')
            .onSnapshot(doc => {
                if (doc.exists) {
                    const data = doc.data();
                    setLessonData(data);
                    if (data?.steps) {
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

    const renderPizza = (highlightCount: number) => {
        const parts = 4;
        const radius = 40;
        const centerX = 45;
        const centerY = 45;

        // Krok 0: Pełna, czysta pizza (bez kropek)
        if (step === 0) {
            return (
                <Svg height="90" width="90" viewBox="0 0 90 90">
                    <Circle cx={centerX} cy={centerY} r={radius} fill="#FF9800" stroke="#5D4037" strokeWidth="2" />
                </Svg>
            );
        }

        // Krok 1+: Pizza z podziałami i kolorowaniem
        const slices = [];
        for (let i = 0; i < parts; i++) {
            const startAngle = (i * 360) / parts;
            const endAngle = ((i + 1) * 360) / parts;
            const x1 = centerX + radius * Math.cos((Math.PI * startAngle) / 180);
            const y1 = centerY + radius * Math.sin((Math.PI * startAngle) / 180);
            const x2 = centerX + radius * Math.cos((Math.PI * endAngle) / 180);
            const y2 = centerY + radius * Math.sin((Math.PI * endAngle) / 180);

            const pathData = `M${centerX},${centerY} L${x1},${y1} A${radius},${radius} 0 0,1 ${x2},${y2} Z`;

            slices.push(
                <Path
                    key={i}
                    d={pathData}
                    fill={i < highlightCount && step >= 2 ? "#FF9800" : "#F5F5F5"}
                    stroke="#5D4037"
                    strokeWidth="1.5"
                />
            );
        }

        return (
            <Svg height="90" width="90" viewBox="0 0 90 90">
                <G rotation="-90" origin="45, 45">
                    {slices}
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

                    <View style={styles.comparisonRow}>
                        {/* Lewa strona */}
                        <View style={styles.pizzaBox}>
                            {renderPizza(1)}
                            <View style={[styles.fractionBox, { opacity: step >= 2 ? 1 : 0 }]}>
                                <Text style={styles.num}>1</Text>
                                <View style={styles.line} />
                                <Text style={styles.den}>4</Text>
                            </View>
                        </View>

                        {/* Środek: Znak zapytania lub symbol porównania */}
                        <View style={styles.symbolBox}>
                            {step < 4 ? (
                                <Text style={styles.questionMarkText}>?</Text>
                            ) : (
                                <Text style={styles.symbolText}>{"<"}</Text>
                            )}
                        </View>

                        {/* Prawa strona */}
                        <View style={styles.pizzaBox}>
                            {renderPizza(3)}
                            <View style={[styles.fractionBox, { opacity: step >= 2 ? 1 : 0 }]}>
                                <Text style={styles.num}>3</Text>
                                <View style={styles.line} />
                                <Text style={styles.den}>4</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.infoBox}>
                        <Text style={styles.explanationText}>{stepsArray[step]?.text}</Text>
                    </View>

                    <TouchableOpacity
                        style={step < stepsArray.length - 1 ? styles.button : styles.buttonReset}
                        onPress={() => step < stepsArray.length - 1 ? setStep(step + 1) : setStep(0)}
                    >
                        <Text style={step < stepsArray.length - 1 ? styles.buttonText : styles.buttonResetText}>
                            {step < stepsArray.length - 1 ? "Dalej ➜" : "Od nowa ↺"}
                        </Text>
                    </TouchableOpacity>
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
    comparisonRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', width: '100%', marginBottom: 15 },
    pizzaBox: { alignItems: 'center', minHeight: 140 },
    symbolBox: { width: 60, alignItems: 'center', justifyContent: 'center', height: 90 },

    // Styl dużego znaku zapytania
    questionMarkText: { fontSize: 60, fontWeight: 'bold', color: '#1565C0', opacity: 0.8 },

    // Styl znaku <
    symbolText: { fontSize: 64, fontWeight: 'bold', color: '#E65100' },

    fractionBox: { alignItems: 'center', marginTop: 10 },
    line: { width: 30, height: 3, backgroundColor: '#333', marginVertical: 2 },
    num: { fontSize: 26, fontWeight: 'bold', color: '#E65100' },
    den: { fontSize: 26, fontWeight: 'bold', color: '#1565C0' },
    infoBox: { backgroundColor: '#E0F2F1', padding: 15, borderRadius: 15, width: '100%', minHeight: 80, justifyContent: 'center', borderWidth: 1.5, borderColor: '#B2DFDB' },
    explanationText: { fontSize: 18, color: '#00695C', textAlign: 'center', fontWeight: '600' },
    button: { backgroundColor: '#FFD54F', paddingHorizontal: 45, paddingVertical: 12, borderRadius: 25, marginTop: 15 },
    buttonText: { fontSize: 18, color: '#5D4037', fontWeight: 'bold' },
    buttonReset: { backgroundColor: '#4CAF50', paddingHorizontal: 45, paddingVertical: 12, borderRadius: 25, marginTop: 15 },
    buttonResetText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
});