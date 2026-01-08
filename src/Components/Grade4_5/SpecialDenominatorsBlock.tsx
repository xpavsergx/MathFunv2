import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, ActivityIndicator } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import Svg, { Rect, G } from 'react-native-svg';

export default function SpecialDenominatorsBlock() {
    const [step, setStep] = useState(0);
    const [lessonData, setLessonData] = useState<any>(null);
    const [stepsArray, setStepsArray] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = firestore()
            .collection('lessons')
            .doc('specialDenominators')
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

    const renderDecimalBar = () => {
        const width = 250;
        const height = 40;
        const segments = 10;
        const segmentWidth = width / segments;

        return (
            <View style={styles.visualContainer}>
                <Svg height={height + 10} width={width + 5} viewBox={`0 0 ${width} ${height}`}>
                    <G>
                        {[...Array(segments)].map((_, i) => (
                            <Rect
                                key={i}
                                x={i * segmentWidth}
                                y={0}
                                width={segmentWidth}
                                height={height}
                                fill={step >= 2 && i < 3 ? "#FF9800" : "#F5F5F5"}
                                stroke="#5D4037"
                                strokeWidth="2"
                            />
                        ))}
                    </G>
                </Svg>
                <Text style={styles.subText}>
                    {step === 0 ? "Zaczynamy od podziału na 10..." : "Model ułamka o mianowniku 10"}
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

                    {renderDecimalBar()}

                    <View style={styles.mathRow}>
                        {/* 3/10 widoczne w kroku 2 i 3 */}
                        {(step === 2 || step === 3) && (
                            <View style={styles.fractionBox}>
                                <Text style={styles.num}>3</Text>
                                <View style={styles.line} />
                                <Text style={styles.den}>10</Text>
                            </View>
                        )}

                        {/* 'lub' i 3/100 pojawia się w kroku 3 */}
                        {step === 3 && (
                            <View style={styles.flexRow}>
                                <Text style={styles.orText}>lub</Text>
                                <View style={styles.fractionBox}>
                                    <Text style={styles.num}>3</Text>
                                    <View style={styles.line} />
                                    <Text style={styles.den}>100</Text>
                                </View>
                            </View>
                        )}

                        {/* PODSUMOWANIE: Pełne ułamki w kroku 4 */}
                        {step === 4 && (
                            <View style={styles.summaryBox}>
                                <Text style={styles.summaryTitle}>To ułamki dziesiętne!</Text>
                                <View style={styles.summaryFractionsRow}>
                                    <View style={styles.smallFractionBox}>
                                        <Text style={styles.smallNum}>3</Text>
                                        <View style={styles.smallLine} />
                                        <Text style={styles.smallDen}>10</Text>
                                    </View>
                                    <Text style={styles.comma}>,</Text>
                                    <View style={styles.smallFractionBox}>
                                        <Text style={styles.smallNum}>3</Text>
                                        <View style={styles.smallLine} />
                                        <Text style={styles.smallDen}>100</Text>
                                    </View>
                                    <Text style={styles.comma}>,</Text>
                                    <View style={styles.smallFractionBox}>
                                        <Text style={styles.smallNum}>3</Text>
                                        <View style={styles.smallLine} />
                                        <Text style={styles.smallDen}>1000</Text>
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
    card: { backgroundColor: 'rgba(255, 255, 255, 0.98)', width: '94%', borderRadius: 25, padding: 20, alignItems: 'center', elevation: 10 },
    cardTitle: { fontSize: 20, fontWeight: 'bold', color: '#1565C0', marginBottom: 15, textAlign: 'center' },
    visualContainer: { alignItems: 'center', marginBottom: 15, height: 75 },
    subText: { fontSize: 13, color: '#5D4037', marginTop: 4, fontStyle: 'italic', fontWeight: '600' },
    mathRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 15, height: 100, width: '100%' },
    flexRow: { flexDirection: 'row', alignItems: 'center' },
    fractionBox: { alignItems: 'center', width: 60 },
    line: { width: 40, height: 3, backgroundColor: '#333', marginVertical: 2 },
    num: { fontSize: 30, fontWeight: 'bold', color: '#E65100' },
    den: { fontSize: 30, fontWeight: 'bold', color: '#1565C0' },
    orText: { fontSize: 18, marginHorizontal: 10, fontWeight: 'bold', color: '#777' },

    // Style dla podsumowania w Kroku 4
    summaryBox: { alignItems: 'center', backgroundColor: '#FFF9C4', padding: 12, borderRadius: 15, borderWidth: 1.5, borderColor: '#FBC02D', width: '95%' },
    summaryTitle: { fontSize: 16, color: '#2E7D32', fontWeight: 'bold', marginBottom: 8 },
    summaryFractionsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    smallFractionBox: { alignItems: 'center', marginHorizontal: 5 },
    smallNum: { fontSize: 18, fontWeight: 'bold', color: '#E65100' },
    smallDen: { fontSize: 18, fontWeight: 'bold', color: '#1565C0' },
    smallLine: { width: 30, height: 2, backgroundColor: '#333', marginVertical: 1 },
    comma: { fontSize: 22, fontWeight: 'bold', color: '#333', marginTop: 10 },

    infoBox: { backgroundColor: '#E0F2F1', padding: 15, borderRadius: 15, width: '100%', minHeight: 85, justifyContent: 'center', borderWidth: 1.5, borderColor: '#B2DFDB' },
    explanationText: { fontSize: 16, color: '#00695C', textAlign: 'center', fontWeight: '600', lineHeight: 22 },
    button: { backgroundColor: '#FFD54F', paddingHorizontal: 45, paddingVertical: 12, borderRadius: 25, marginTop: 15 },
    buttonText: { fontSize: 18, color: '#5D4037', fontWeight: 'bold' },
    buttonReset: { backgroundColor: '#4CAF50', paddingHorizontal: 45, paddingVertical: 12, borderRadius: 25, marginTop: 15 },
    buttonResetText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
});