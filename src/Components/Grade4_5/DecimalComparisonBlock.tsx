import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, ActivityIndicator } from 'react-native';
import firestore from '@react-native-firebase/firestore';

export default function DecimalComparisonBlock() {
    const [step, setStep] = useState(0);
    const [lessonData, setLessonData] = useState<any>(null);
    const [stepsArray, setStepsArray] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = firestore()
            .collection('lessons')
            .doc('decimalComparison')
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

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#FFB300" /></View>;

    return (
        <ImageBackground source={require('../../assets/tloTeorii.png')} style={styles.backgroundImage} resizeMode="cover">
            <View style={styles.container}>
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>{lessonData?.title}</Text>

                    <View style={styles.comparisonArea}>
                        {/* Lewa liczba: 0,3 -> 0,30 */}
                        <View style={styles.numberWrapper}>
                            <Text style={styles.comparisonLabel}>Liczba A</Text>
                            <View style={styles.decimalBox}>
                                <Text style={styles.decimalText}>
                                    0,3{step >= 2 && <Text style={styles.ghostZero}>0</Text>}
                                </Text>
                            </View>
                        </View>

                        {/* Znak porównania - pojawia się w kroku 3 */}
                        <View style={styles.signWrapper}>
                            <Text style={[styles.comparisonSign, { opacity: step >= 3 ? 1 : 0 }]}>
                                {">"}
                            </Text>
                        </View>

                        {/* Prawa liczba: 0,15 */}
                        <View style={styles.numberWrapper}>
                            <Text style={styles.comparisonLabel}>Liczba B</Text>
                            <View style={[styles.decimalBox, { borderColor: step >= 3 ? '#E0E0E0' : '#FBC02D' }]}>
                                <Text style={styles.decimalText}>0,15</Text>
                            </View>
                        </View>
                    </View>

                    {/* Wizualizacja na paskach (opcjonalnie dla lepszego zrozumienia) */}
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
    cardTitle: { fontSize: 20, fontWeight: 'bold', color: '#1565C0', marginBottom: 25, textAlign: 'center' },
    comparisonArea: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 30, height: 120 },
    numberWrapper: { alignItems: 'center' },
    comparisonLabel: { fontSize: 14, color: '#757575', marginBottom: 5, fontWeight: 'bold' },
    decimalBox: { backgroundColor: '#FFF9C4', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 15, borderWidth: 2, borderColor: '#FBC02D', minWidth: 80, alignItems: 'center' },
    decimalText: { fontSize: 32, fontWeight: 'bold', color: '#333' },
    ghostZero: { color: '#FF9800', fontStyle: 'italic' },
    signWrapper: { width: 60, alignItems: 'center' },
    comparisonSign: { fontSize: 48, fontWeight: 'bold', color: '#2E7D32' },
    infoBox: { backgroundColor: '#E0F2F1', padding: 15, borderRadius: 15, width: '100%', minHeight: 90, justifyContent: 'center', borderWidth: 1.5, borderColor: '#B2DFDB' },
    explanationText: { fontSize: 16, color: '#00695C', textAlign: 'center', fontWeight: '600', lineHeight: 22 },
    button: { backgroundColor: '#FFD54F', paddingHorizontal: 50, paddingVertical: 14, borderRadius: 25, marginTop: 20 },
    buttonText: { fontSize: 18, color: '#5D4037', fontWeight: 'bold' },
    buttonReset: { backgroundColor: '#4CAF50', paddingHorizontal: 50, paddingVertical: 14, borderRadius: 25, marginTop: 20 },
    buttonResetText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
});