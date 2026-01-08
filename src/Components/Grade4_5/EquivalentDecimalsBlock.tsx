import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, ActivityIndicator } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import Svg, { Rect, G, Line } from 'react-native-svg';

export default function EquivalentDecimalsBlock() {
    const [step, setStep] = useState(0);
    const [lessonData, setLessonData] = useState<any>(null);
    const [stepsArray, setStepsArray] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = firestore()
            .collection('lessons')
            .doc('equivalentDecimals')
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

    const renderGrid = () => {
        const size = 150;
        const cellSize = size / 10;

        return (
            <View style={styles.visualContainer}>
                <Svg height={size + 10} width={size + 10} viewBox={`0 0 ${size} ${size}`}>
                    <G>
                        {/* Tło kwadratu */}
                        <Rect x="0" y="0" width={size} height={size} fill="#F5F5F5" stroke="#333" strokeWidth="2" />

                        {/* Zamalowana część (zawsze połowa) */}
                        <Rect x="0" y="0" width={size / 2} height={size} fill="#FF9800" opacity="0.8" />

                        {/* Pionowe linie (dziesiąte) - widoczne zawsze */}
                        {[...Array(11)].map((_, i) => (
                            <Line key={`v-${i}`} x1={i * cellSize} y1="0" x2={i * cellSize} y2={size} stroke="#5D4037" strokeWidth="1" />
                        ))}

                        {/* Poziome linie (setne) - pojawiają się od kroku 1 */}
                        {step >= 1 && [...Array(11)].map((_, i) => (
                            <Line key={`h-${i}`} x1="0" y1={i * cellSize} x2={size} y2={i * cellSize} stroke="#5D4037" strokeWidth="0.5" opacity="0.6" />
                        ))}
                    </G>
                </Svg>
                <Text style={styles.subText}>
                    {step === 0 ? "5 części z 10" : "50 części ze 100"}
                </Text>
            </View>
        );
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#FFB300" /></View>;

    return (
        <ImageBackground source={require('../../assets/tloTeorii.png')} style={styles.backgroundImage} resizeMode="cover">
            <View style={styles.container}>
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>{lessonData?.title}</Text>

                    {renderGrid()}

                    <View style={styles.mathRow}>
                        {/* 0,5 */}
                        <View style={styles.numberBox}>
                            <Text style={styles.decimalText}>0,5</Text>
                        </View>

                        {/* Znak równości i 0,50 pojawiają się od kroku 2 */}
                        <View style={[styles.flexRow, { opacity: step >= 2 ? 1 : 0 }]}>
                            <Text style={styles.equalSign}>=</Text>
                            <View style={styles.numberBox}>
                                <Text style={styles.decimalText}>
                                    0,5<Text style={styles.ghostZero}>0</Text>
                                </Text>
                            </View>
                        </View>

                        {/* Dodatkowe zero w kroku 4 */}
                        {step === 4 && (
                            <View style={styles.flexRow}>
                                <Text style={styles.equalSign}>=</Text>
                                <View style={styles.numberBox}>
                                    <Text style={styles.decimalText}>0,500</Text>
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
    card: { backgroundColor: 'rgba(255, 255, 255, 0.98)', width: '94%', borderRadius: 25, padding: 20, alignItems: 'center', elevation: 10 },
    cardTitle: { fontSize: 20, fontWeight: 'bold', color: '#1565C0', marginBottom: 15, textAlign: 'center' },
    visualContainer: { alignItems: 'center', marginBottom: 15 },
    subText: { fontSize: 14, color: '#5D4037', marginTop: 5, fontWeight: 'bold' },
    mathRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 15, height: 80, width: '100%' },
    flexRow: { flexDirection: 'row', alignItems: 'center' },
    numberBox: { backgroundColor: '#FFF9C4', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#FBC02D' },
    decimalText: { fontSize: 32, fontWeight: 'bold', color: '#333' },
    ghostZero: { color: '#E65100' }, // Wyróżnione zero
    equalSign: { fontSize: 32, fontWeight: 'bold', marginHorizontal: 10, color: '#333' },
    infoBox: { backgroundColor: '#E0F2F1', padding: 15, borderRadius: 15, width: '100%', minHeight: 85, justifyContent: 'center', borderWidth: 1.5, borderColor: '#B2DFDB' },
    explanationText: { fontSize: 16, color: '#00695C', textAlign: 'center', fontWeight: '600', lineHeight: 22 },
    button: { backgroundColor: '#FFD54F', paddingHorizontal: 50, paddingVertical: 14, borderRadius: 25, marginTop: 15 },
    buttonText: { fontSize: 18, color: '#5D4037', fontWeight: 'bold' },
    buttonReset: { backgroundColor: '#4CAF50', paddingHorizontal: 50, paddingVertical: 14, borderRadius: 25, marginTop: 15 },
    buttonResetText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
});