import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, ActivityIndicator } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import Svg, { Path, G } from 'react-native-svg';

export default function FractionsExpansionBlock() {
    const [step, setStep] = useState(0);
    const [lessonData, setLessonData] = useState<any>(null);
    const [stepsArray, setStepsArray] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = firestore()
            .collection('lessons')
            .doc('fractionsExpansion')
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

    const renderPizza = () => {
        const radius = 60;
        const centerX = 70;
        const centerY = 70;

        // Pizza pokazuje 1/2 w kroku 0 i 4, a 2/4 w krokach 1, 2, 3
        const isSimplified = step === 0 || step === 4;
        const parts = isSimplified ? 2 : 4;
        const highlightCount = isSimplified ? 1 : 2;

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
                    fill={i < highlightCount ? "#FF9800" : "#F5F5F5"}
                    stroke="#5D4037"
                    strokeWidth="2"
                />
            );
        }

        return (
            <View style={styles.illustrationContainer}>
                <Svg height="140" width="140" viewBox="0 0 140 140">
                    <G rotation="-90" origin="70, 70">
                        {slices}
                    </G>
                </Svg>
            </View>
        );
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#FFB300" /></View>;

    return (
        <ImageBackground source={require('../../assets/tloTeorii.png')} style={styles.backgroundImage} resizeMode="cover">
            <View style={styles.container}>
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>{lessonData?.title}</Text>

                    {renderPizza()}

                    {/* mathRow: Jeśli krok to 4, ustawiamy justifyContent na 'center' dla jednego elementu */}
                    <View style={[styles.mathRow, step === 4 && { justifyContent: 'center' }]}>

                        {/* LEWY UŁAMEK: Ukryty całkowicie w kroku 4 za pomocą null */}
                        {step !== 4 && (
                            <View style={styles.fractionBox}>
                                <Text style={styles.num}>{step <= 2 ? "1" : "2"}</Text>
                                <View style={styles.line} />
                                <Text style={styles.den}>{step <= 2 ? "2" : "4"}</Text>
                            </View>
                        )}

                        {/* OPERACJA: Widoczna tylko w krokach 1, 2, 3 */}
                        {(step > 0 && step < 4) && (
                            <View style={styles.operationBox}>
                                <Text style={styles.equalSign}>=</Text>
                                <Text style={styles.opText}>{step <= 2 ? "· 2" : ": 2"}</Text>
                            </View>
                        )}

                        {/* PRAWY UŁAMEK: W kroku 4 staje się jedynym widocznym i wycentrowanym elementem */}
                        {(step > 1 || step === 4) && (
                            <View style={styles.fractionBox}>
                                <Text style={styles.num}>{step <= 2 ? "2" : "1"}</Text>
                                <View style={styles.line} />
                                <Text style={styles.den}>{step <= 2 ? "4" : "2"}</Text>
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
    illustrationContainer: { marginVertical: 10 },
    mathRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20, height: 90, width: '100%' },
    fractionBox: { alignItems: 'center', width: 60 },
    line: { width: 45, height: 3, backgroundColor: '#333', marginVertical: 2 },
    num: { fontSize: 32, fontWeight: 'bold', color: '#E65100' },
    den: { fontSize: 32, fontWeight: 'bold', color: '#1565C0' },
    operationBox: { alignItems: 'center', marginHorizontal: 15 },
    equalSign: { fontSize: 36, fontWeight: 'bold', color: '#333' },
    opText: { fontSize: 24, fontWeight: 'bold', color: '#2E7D32' },
    infoBox: { backgroundColor: '#E0F2F1', padding: 15, borderRadius: 15, width: '100%', minHeight: 90, justifyContent: 'center', borderWidth: 1.5, borderColor: '#B2DFDB' },
    explanationText: { fontSize: 18, color: '#00695C', textAlign: 'center', fontWeight: '600' },
    button: { backgroundColor: '#FFD54F', paddingHorizontal: 45, paddingVertical: 12, borderRadius: 25, marginTop: 20 },
    buttonText: { fontSize: 18, color: '#5D4037', fontWeight: 'bold' },
    buttonReset: { backgroundColor: '#4CAF50', paddingHorizontal: 45, paddingVertical: 12, borderRadius: 25, marginTop: 20 },
    buttonResetText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
});