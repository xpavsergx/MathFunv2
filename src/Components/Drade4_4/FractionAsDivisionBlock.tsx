import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, ActivityIndicator } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import Svg, { Path, G, Circle } from 'react-native-svg';

export default function FractionAsDivisionBlock() {
    const [step, setStep] = useState(0);
    const [lessonData, setLessonData] = useState<any>(null);
    const [stepsArray, setStepsArray] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = firestore()
            .collection('lessons')
            .doc('fractionAsDivision')
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
        const radius = 35;
        const centerX = 40;
        const centerY = 40;

        const drawPizza = (isShared: boolean) => (
            <Svg height="80" width="80" viewBox="0 0 80 80">
                <G rotation="-90" origin="40, 40">
                    {step === 0 ? (
                        <Circle cx="40" cy="40" r="35" fill="#FF9800" stroke="#5D4037" strokeWidth="2" />
                    ) : (
                        [0, 1, 2, 3].map(i => {
                            const startAngle = (i * 360) / 4;
                            const endAngle = ((i + 1) * 360) / 4;
                            const x1 = centerX + radius * Math.cos((Math.PI * startAngle) / 180);
                            const y1 = centerY + radius * Math.sin((Math.PI * startAngle) / 180);
                            const x2 = centerX + radius * Math.cos((Math.PI * endAngle) / 180);
                            const y2 = centerY + radius * Math.sin((Math.PI * endAngle) / 180);
                            const pathData = `M${centerX},${centerY} L${x1},${y1} A${radius},${radius} 0 0,1 ${x2},${y2} Z`;

                            // W kroku 2 i 3 kolorujemy tylko 1 kawałek w każdej pizzy (ten dla jednej osoby)
                            const isHighlighted = step >= 2 && i === 0;
                            return (
                                <Path
                                    key={i}
                                    d={pathData}
                                    fill={isHighlighted ? "#FF9800" : "#F5F5F5"}
                                    stroke="#5D4037"
                                    strokeWidth="1.5"
                                />
                            );
                        })
                    )}
                </G>
            </Svg>
        );

        return (
            <View style={styles.pizzasContainer}>
                <View style={styles.pizzasRow}>
                    {drawPizza(true)}
                    {drawPizza(true)}
                    {drawPizza(true)}
                </View>
                <Text style={styles.peopleText}>{step >= 1 ? "Dzielimy na 4 osoby" : "3 całe pizze"}</Text>
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
                        {step >= 3 && (
                            <View style={styles.equationContainer}>
                                <Text style={styles.mathText}>3 : 4</Text>
                                <Text style={styles.equalSign}>=</Text>
                                <View style={styles.fractionBox}>
                                    <Text style={styles.num}>3</Text>
                                    <View style={styles.line} />
                                    <Text style={styles.den}>4</Text>
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
    cardTitle: { fontSize: 22, fontWeight: 'bold', color: '#1565C0', marginBottom: 15, textAlign: 'center' },
    pizzasContainer: { alignItems: 'center', marginBottom: 20 },
    pizzasRow: { flexDirection: 'row', justifyContent: 'center' },
    peopleText: { marginTop: 10, fontSize: 16, fontWeight: 'bold', color: '#5D4037' },
    mathRow: { height: 100, justifyContent: 'center', alignItems: 'center', width: '100%', marginBottom: 10 },
    equationContainer: { flexDirection: 'row', alignItems: 'center' },
    mathText: { fontSize: 36, fontWeight: 'bold', color: '#333' },
    equalSign: { fontSize: 36, fontWeight: 'bold', color: '#333', marginHorizontal: 15 },
    fractionBox: { alignItems: 'center', width: 50 },
    line: { width: 40, height: 4, backgroundColor: '#333', marginVertical: 4 },
    num: { fontSize: 36, fontWeight: 'bold', color: '#E65100' },
    den: { fontSize: 36, fontWeight: 'bold', color: '#1565C0' },
    infoBox: { backgroundColor: '#E0F2F1', padding: 15, borderRadius: 15, width: '100%', minHeight: 90, justifyContent: 'center', borderWidth: 1.5, borderColor: '#B2DFDB' },
    explanationText: { fontSize: 18, color: '#00695C', textAlign: 'center', fontWeight: '600' },
    button: { backgroundColor: '#FFD54F', paddingHorizontal: 45, paddingVertical: 12, borderRadius: 25, marginTop: 20 },
    buttonText: { fontSize: 18, color: '#5D4037', fontWeight: 'bold' },
    buttonReset: { backgroundColor: '#4CAF50', paddingHorizontal: 45, paddingVertical: 12, borderRadius: 25, marginTop: 20 },
    buttonResetText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
});