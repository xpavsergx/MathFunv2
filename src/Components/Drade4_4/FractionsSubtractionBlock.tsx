import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, ActivityIndicator } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import Svg, { Path, G } from 'react-native-svg';

export default function FractionsSubtractionBlock() {
    const [step, setStep] = useState(0);
    const [lessonData, setLessonData] = useState<any>(null);
    const [stepsArray, setStepsArray] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = firestore()
            .collection('lessons')
            .doc('fractionsSubtraction')
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
        const radius = 50;
        const centerX = 60;
        const centerY = 60;

        return (
            <Svg height="120" width="120" viewBox="0 0 120 120">
                <G rotation="-90" origin="60, 60">
                    {[0, 1, 2, 3].map(i => {
                        const startAngle = (i * 360) / 4;
                        const endAngle = ((i + 1) * 360) / 4;
                        const x1 = centerX + radius * Math.cos((Math.PI * startAngle) / 180);
                        const y1 = centerY + radius * Math.sin((Math.PI * startAngle) / 180);
                        const x2 = centerX + radius * Math.cos((Math.PI * endAngle) / 180);
                        const y2 = centerY + radius * Math.sin((Math.PI * endAngle) / 180);
                        const pathData = `M${centerX},${centerY} L${x1},${y1} A${radius},${radius} 0 0,1 ${x2},${y2} Z`;

                        let fillColor = "#F5F5F5";
                        if (i < 2) fillColor = "#FF9800";
                        if (i === 2) fillColor = step < 2 ? "#FF9800" : "#F5F5F5";

                        return (
                            <Path
                                key={i}
                                d={pathData}
                                fill={fillColor}
                                stroke="#5D4037"
                                strokeWidth="2"
                                opacity={i === 2 && step === 1 ? 0.5 : 1}
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
                        {renderPizza()}
                    </View>

                    <View style={styles.mathRow}>
                        <View style={styles.fractionBox}>
                            <Text style={[styles.num, { color: step === 4 ? '#C62828' : '#E65100' }]}>3</Text>
                            <View style={styles.line} />
                            <Text style={styles.den}>4</Text>
                        </View>

                        <View style={[styles.flexRow, { opacity: step >= 1 ? 1 : 0 }]}>
                            <Text style={styles.operationSymbol}>-</Text>
                            <View style={styles.fractionBox}>
                                <Text style={[styles.num, { color: step === 4 ? '#C62828' : '#E65100' }]}>1</Text>
                                <View style={styles.line} />
                                <Text style={styles.den}>4</Text>
                            </View>
                        </View>

                        <View style={[styles.flexRow, { opacity: step >= 3 ? 1 : 0 }]}>
                            <Text style={styles.operationSymbol}>=</Text>
                            <View style={styles.fractionBox}>
                                <Text style={[styles.num, { color: step === 4 ? '#C62828' : '#E65100' }]}>2</Text>
                                <View style={styles.line} />
                                <Text style={styles.den}>4</Text>
                            </View>
                        </View>
                    </View>

                    {/* PRZYWRÓCONE TŁO I STYL WYJAŚNIEŃ */}
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
    visualRow: { marginBottom: 20, height: 120, justifyContent: 'center' },
    mathRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20, height: 90 },
    flexRow: { flexDirection: 'row', alignItems: 'center' },
    fractionBox: { alignItems: 'center', width: 45 },
    line: { width: 35, height: 3, backgroundColor: '#333', marginVertical: 2 },
    num: { fontSize: 30, fontWeight: 'bold' },
    den: { fontSize: 30, fontWeight: 'bold', color: '#1565C0' },
    operationSymbol: { fontSize: 30, fontWeight: 'bold', marginHorizontal: 10, color: '#333' },

    // PRZYWRÓCONE KOLORY INFOBOX
    infoBox: {
        backgroundColor: '#E0F2F1',
        padding: 15,
        borderRadius: 15,
        width: '100%',
        minHeight: 90,
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: '#B2DFDB'
    },
    explanationText: {
        fontSize: 17,
        color: '#00695C',
        textAlign: 'center',
        fontWeight: '600'
    },

    button: { backgroundColor: '#FFD54F', paddingHorizontal: 45, paddingVertical: 12, borderRadius: 25, marginTop: 20 },
    buttonText: { fontSize: 18, color: '#5D4037', fontWeight: 'bold' },
    buttonReset: { backgroundColor: '#4CAF50', paddingHorizontal: 45, paddingVertical: 12, borderRadius: 25, marginTop: 20 },
    buttonResetText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
});