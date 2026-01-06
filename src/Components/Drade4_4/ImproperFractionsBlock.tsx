import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, ActivityIndicator } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import Svg, { Path, G } from 'react-native-svg';

export default function ImproperFractionsBlock() {
    const [step, setStep] = useState(0);
    const [lessonData, setLessonData] = useState<any>(null);
    const [stepsArray, setStepsArray] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = firestore()
            .collection('lessons')
            .doc('improperFractionsIntro')
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

    const renderPizzas = () => {
        const radius = 40;
        const centerX = 45;
        const centerY = 45;

        // Funkcja pomocnicza do rysowania pojedynczej pizzy
        const drawPizza = (highlightedSlices: number[]) => (
            <Svg height="90" width="90" viewBox="0 0 90 90">
                <G rotation="-90" origin="45, 45">
                    {[0, 1, 2, 3].map(i => {
                        const startAngle = (i * 360) / 4;
                        const endAngle = ((i + 1) * 360) / 4;
                        const x1 = centerX + radius * Math.cos((Math.PI * startAngle) / 180);
                        const y1 = centerY + radius * Math.sin((Math.PI * startAngle) / 180);
                        const x2 = centerX + radius * Math.cos((Math.PI * endAngle) / 180);
                        const y2 = centerY + radius * Math.sin((Math.PI * endAngle) / 180);
                        const pathData = `M${centerX},${centerY} L${x1},${y1} A${radius},${radius} 0 0,1 ${x2},${y2} Z`;

                        return (
                            <Path
                                key={i}
                                d={pathData}
                                fill={highlightedSlices.includes(i) ? "#FF9800" : "#F5F5F5"}
                                stroke="#5D4037"
                                strokeWidth="1.5"
                            />
                        );
                    })}
                </G>
            </Svg>
        );

        return (
            <View style={styles.pizzasRow}>
                {/* Pierwsza pizza - zawsze pełna (4/4) */}
                <View style={styles.pizzaContainer}>{drawPizza([0, 1, 2, 3])}</View>
                {/* Druga pizza - tylko 1 kawałek (1/4) */}
                <View style={styles.pizzaContainer}>{drawPizza([0])}</View>
            </View>
        );
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#FFB300" /></View>;

    return (
        <ImageBackground source={require('../../assets/tloTeorii.png')} style={styles.backgroundImage} resizeMode="cover">
            <View style={styles.container}>
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>{lessonData?.title}</Text>

                    {renderPizzas()}

                    <View style={styles.mathRow}>
                        {/* KROKI 1-3: Ułamek niewłaściwy 5/4 */}
                        {step >= 1 && step <= 3 && (
                            <View style={styles.fractionBox}>
                                <Text style={styles.num}>5</Text>
                                <View style={styles.line} />
                                <Text style={styles.den}>4</Text>
                            </View>
                        )}

                        {/* KROK 4: Zamiana na liczbę mieszaną */}
                        {step === 4 && (
                            <View style={styles.mixedRow}>
                                <View style={styles.fractionBox}>
                                    <Text style={styles.num}>5</Text>
                                    <View style={styles.line} />
                                    <Text style={styles.den}>4</Text>
                                </View>
                                <Text style={styles.equalSign}>=</Text>
                                <View style={styles.mixedContainer}>
                                    <Text style={styles.wholeNumber}>1</Text>
                                    <View style={styles.fractionBoxSmall}>
                                        <Text style={styles.numSmall}>1</Text>
                                        <View style={styles.lineSmall} />
                                        <Text style={styles.denSmall}>4</Text>
                                    </View>
                                </View>
                            </View>
                        )}
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
    pizzasRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20 },
    pizzaContainer: { marginHorizontal: 5 },
    mathRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 100, marginBottom: 15 },
    fractionBox: { alignItems: 'center', width: 50 },
    line: { width: 40, height: 4, backgroundColor: '#333', marginVertical: 2 },
    num: { fontSize: 36, fontWeight: 'bold', color: '#E65100' },
    den: { fontSize: 36, fontWeight: 'bold', color: '#1565C0' },

    // Liczba mieszana
    mixedRow: { flexDirection: 'row', alignItems: 'center' },
    equalSign: { fontSize: 32, marginHorizontal: 15, fontWeight: 'bold' },
    mixedContainer: { flexDirection: 'row', alignItems: 'center' },
    wholeNumber: { fontSize: 52, fontWeight: 'bold', color: '#2E7D32', marginRight: 5 },
    fractionBoxSmall: { alignItems: 'center' },
    numSmall: { fontSize: 24, fontWeight: 'bold', color: '#E65100' },
    lineSmall: { width: 25, height: 3, backgroundColor: '#333', marginVertical: 2 },
    denSmall: { fontSize: 24, fontWeight: 'bold', color: '#1565C0' },

    infoBox: { backgroundColor: '#E0F2F1', padding: 15, borderRadius: 15, width: '100%', minHeight: 80, justifyContent: 'center', borderWidth: 1.5, borderColor: '#B2DFDB' },
    explanationText: { fontSize: 17, color: '#00695C', textAlign: 'center', fontWeight: '600' },
    button: { backgroundColor: '#FFD54F', paddingHorizontal: 45, paddingVertical: 12, borderRadius: 25, marginTop: 20 },
    buttonText: { fontSize: 18, color: '#5D4037', fontWeight: 'bold' },
    buttonReset: { backgroundColor: '#4CAF50', paddingHorizontal: 45, paddingVertical: 12, borderRadius: 25, marginTop: 20 },
    buttonResetText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
});