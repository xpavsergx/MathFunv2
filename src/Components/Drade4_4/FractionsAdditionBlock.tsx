import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, ActivityIndicator } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import Svg, { Path, G } from 'react-native-svg';

export default function FractionsAdditionBlock() {
    const [step, setStep] = useState(0);
    const [lessonData, setLessonData] = useState<any>(null);
    const [stepsArray, setStepsArray] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = firestore()
            .collection('lessons')
            .doc('fractionsAddition')
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

    const renderPizza = (count: number, isActive: boolean) => {
        const radius = 35;
        const centerX = 40;
        const centerY = 40;

        return (
            <Svg height="80" width="80" viewBox="0 0 80 80">
                <G rotation="-90" origin="40, 40">
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
                                fill={i < count && isActive ? "#FF9800" : "#F5F5F5"}
                                stroke="#5D4037"
                                strokeWidth="1.5"
                            />
                        );
                    })}
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

                    <View style={styles.visualRow}>
                        {/* Ilustracje pojawiają się od razu (Krok 0-1) */}
                        {step < 2 ? (
                            <>
                                <View style={styles.pizzaWithLabel}>
                                    {renderPizza(1, true)}
                                    {/* Liczba pod pizzą pojawia się od razu, bo opis o niej mówi */}
                                    <View style={styles.smallFraction}><Text style={styles.smallNum}>1</Text><View style={styles.smallLine}/><Text style={styles.smallDen}>4</Text></View>
                                </View>
                                <Text style={styles.plusSign}>+</Text>
                                <View style={styles.pizzaWithLabel}>
                                    {renderPizza(2, true)}
                                    <View style={styles.smallFraction}><Text style={styles.smallNum}>2</Text><View style={styles.smallLine}/><Text style={styles.smallDen}>4</Text></View>
                                </View>
                            </>
                        ) : (
                            /* W Kroku 2+ pokazujemy tylko wynikową pizzę */
                            <View style={styles.pizzaWithLabel}>
                                {renderPizza(3, true)}
                                <Text style={styles.resultText}>Wszystkie kawałki razem!</Text>
                            </View>
                        )}
                    </View>

                    {/* mathRow: Tutaj kontrolujemy pojawianie się liczb */}
                    <View style={styles.mathRow}>
                        {/* Składnik 1: Widoczny zawsze od Kroku 0 */}
                        <View style={styles.fractionBox}>
                            <Text style={[styles.num, { color: step >= 4 ? '#2E7D32' : '#E65100' }]}>1</Text>
                            <View style={styles.line} />
                            <Text style={styles.den}>4</Text>
                        </View>

                        {/* Plus i Składnik 2: Widoczne od początku */}
                        <Text style={styles.operationSymbol}>+</Text>

                        <View style={styles.fractionBox}>
                            <Text style={[styles.num, { color: step >= 4 ? '#2E7D32' : '#E65100' }]}>2</Text>
                            <View style={styles.line} />
                            <Text style={styles.den}>4</Text>
                        </View>

                        {/* Znak równości i Wynik: Pojawiają się dopiero od Kroku 2, gdy opis mówi o sumie */}
                        <View style={[styles.resultContainer, { opacity: step >= 2 ? 1 : 0 }]}>
                            <Text style={styles.operationSymbol}>=</Text>
                            <View style={styles.fractionBox}>
                                <Text style={[styles.num, { color: step >= 4 ? '#2E7D32' : '#E65100' }]}>3</Text>
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
    card: { backgroundColor: 'rgba(255, 255, 255, 0.98)', width: '94%', borderRadius: 25, padding: 20, alignItems: 'center', elevation: 10 },
    cardTitle: { fontSize: 22, fontWeight: 'bold', color: '#1565C0', marginBottom: 15 },
    visualRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 10, height: 110 },
    pizzaWithLabel: { alignItems: 'center' },
    resultText: { fontWeight: 'bold', color: '#2E7D32', marginTop: 5 },
    plusSign: { fontSize: 30, fontWeight: 'bold', marginHorizontal: 15, color: '#333' },
    smallFraction: { marginTop: 5, alignItems: 'center' },
    smallNum: { fontSize: 14, fontWeight: 'bold', color: '#E65100' },
    smallDen: { fontSize: 14, fontWeight: 'bold', color: '#1565C0' },
    smallLine: { width: 15, height: 2, backgroundColor: '#333', marginVertical: 1 },
    mathRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20, height: 80 },
    resultContainer: { flexDirection: 'row', alignItems: 'center' },
    fractionBox: { alignItems: 'center', width: 45 },
    line: { width: 35, height: 3, backgroundColor: '#333', marginVertical: 2 },
    num: { fontSize: 28, fontWeight: 'bold' },
    den: { fontSize: 28, fontWeight: 'bold', color: '#1565C0' },
    operationSymbol: { fontSize: 28, fontWeight: 'bold', marginHorizontal: 10 },
    infoBox: { backgroundColor: '#E0F2F1', padding: 15, borderRadius: 15, width: '100%', minHeight: 90, justifyContent: 'center', borderWidth: 1.5, borderColor: '#B2DFDB' },
    explanationText: { fontSize: 17, color: '#00695C', textAlign: 'center', fontWeight: '600' },
    button: { backgroundColor: '#FFD54F', paddingHorizontal: 45, paddingVertical: 12, borderRadius: 25, marginTop: 20 },
    buttonText: { fontSize: 18, color: '#5D4037', fontWeight: 'bold' },
    buttonReset: { backgroundColor: '#4CAF50', paddingHorizontal: 45, paddingVertical: 12, borderRadius: 25, marginTop: 20 },
    buttonResetText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
});