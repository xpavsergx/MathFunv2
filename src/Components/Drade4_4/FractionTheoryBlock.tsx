import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, ActivityIndicator } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import Svg, { Circle, Path, G } from 'react-native-svg';

export default function FractionTheoryBlock() {
    const [step, setStep] = useState(0);
    const [lessonData, setLessonData] = useState(null);
    const [stepsArray, setStepsArray] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = firestore()
            .collection('lessons')
            .doc('fractionsIntro')
            .onSnapshot(doc => {
                if (doc.exists) {
                    const data = doc.data();
                    setLessonData(data);
                    if (data?.steps) {
                        const converted = Object.keys(data.steps)
                            .sort((a, b) => parseInt(a) - parseInt(b))
                            .map(key => ({
                                text: data.steps[key],
                                highlight: parseInt(key) >= 2 ? 1 : 0
                            }));
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

    const renderPizza = () => {
        const parts = 4;
        const radius = 80;
        const centerX = 100;
        const centerY = 100;
        const highlightCount = stepsArray[step]?.highlight || 0;

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
                    fill={i < highlightCount ? "#FFB300" : "#F5F5F5"}
                    stroke="#5D4037"
                    strokeWidth="2"
                    opacity={step >= 1 ? 1 : 0}
                />
            );
        }

        return (
            <View style={styles.illustrationContainer}>
                <Svg height="180" width="180" viewBox="0 0 200 200">
                    {step === 0 && (
                        <Circle cx="100" cy="100" r="80" fill="#FFD54F" stroke="#5D4037" strokeWidth="2" />
                    )}
                    <G rotation="-90" origin="100, 100">
                        {step > 0 && slices}
                    </G>
                </Svg>
            </View>
        );
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#FFB300" /></View>;

    return (
        <ImageBackground source={require('../../assets/tloTeorii.png')} style={styles.backgroundImage}>
            <View style={styles.container}>
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>{lessonData?.title}</Text>

                    {renderPizza()}

                    <View style={styles.fractionStepWrapper}>
                        <View style={styles.fractionBox}>
                            <Text style={[styles.num, { opacity: step >= 2 ? 1 : 0 }]}>1</Text>
                            <View style={[styles.line, { opacity: step >= 1 ? 1 : 0 }]} />
                            <Text style={[styles.den, { opacity: step >= 1 ? 1 : 0 }]}>4</Text>
                        </View>

                        <View style={styles.labelsBox}>
                            {step === 1 && (
                                <Text style={[styles.labelPointer, { marginTop: 45 }]}>← MIANOWNIK (dzielimy na 4)</Text>
                            )}

                            {step >= 2 && (
                                <>
                                    <Text style={styles.labelPointer}>← LICZNIK (mamy 1 część)</Text>
                                    {step === stepsArray.length - 1 && (
                                        <Text style={[styles.labelPointer, { marginTop: 25 }]}>← MIANOWNIK (całość)</Text>
                                    )}
                                </>
                            )}
                        </View>
                    </View>

                    <View style={styles.infoBox}>
                        <Text style={styles.explanationText}>
                            {stepsArray[step]?.text}
                        </Text>
                    </View>

                    {step < stepsArray.length - 1 ? (
                        <TouchableOpacity style={styles.button} onPress={handleNext}>
                            <Text style={styles.buttonText}>Dalej ➜</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={[styles.button, {backgroundColor: '#4CAF50'}]} onPress={() => setStep(0)}>
                            <Text style={[styles.buttonText, {color: '#FFF'}]}>Od nowa ↺</Text>
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
    cardTitle: { fontSize: 25, fontWeight: 'bold', color: '#1565C0', marginBottom: 5, textAlign: 'center' },
    illustrationContainer: { marginVertical: 10 },
    fractionStepWrapper: { flexDirection: 'row', alignItems: 'center', height: 100, marginBottom: 15 },
    fractionBox: { alignItems: 'center', width: 50 },
    line: { width: 40, height: 4, backgroundColor: '#333', marginVertical: 2 },
    num: { fontSize: 32, fontWeight: 'bold', color: '#E65100' },
    den: { fontSize: 32, fontWeight: 'bold', color: '#1565C0' },
    labelsBox: { marginLeft: 10, width: 220, justifyContent: 'center' }, // Zwiększona szerokość dla dłuższego tekstu
    labelPointer: { fontSize: 14, fontWeight: 'bold', color: '#5D4037' },
    infoBox: {
        backgroundColor: '#E0F2F1',
        padding: 15,
        borderRadius: 15,
        width: '100%',
        minHeight: 70,
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#B2DFDB'
    },
    explanationText: { fontSize: 20, color: '#00695C', textAlign: 'center', fontWeight: '500' },
    button: { backgroundColor: '#FFD54F', paddingHorizontal: 40, paddingVertical: 12, borderRadius: 25, marginTop: 20 },
    buttonText: { fontSize: 18, color: '#5D4037', fontWeight: 'bold' },
});