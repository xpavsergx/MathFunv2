import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, ActivityIndicator } from 'react-native';
import firestore from '@react-native-firebase/firestore';

export default function DecimalAdditionBlock() {
    const [step, setStep] = useState(0);
    const [lessonData, setLessonData] = useState<any>(null);
    const [stepsArray, setStepsArray] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = firestore()
            .collection('lessons')
            .doc('decimalAddition')
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

                    <View style={styles.additionContainer}>
                        {/* Pierwsza liczba */}
                        <View style={styles.row}>
                            <Text style={styles.mathText}>  1</Text>
                            <Text style={styles.comma}>,</Text>
                            <Text style={styles.mathText}>2 7</Text>
                        </View>

                        {/* Druga liczba */}
                        <View style={styles.row}>
                            <Text style={styles.plusSign}>+</Text>
                            <Text style={styles.mathText}> 0</Text>
                            <Text style={[styles.comma, step >= 1 && styles.highlightComma]}>,</Text>
                            <Text style={styles.mathText}>
                                5{step >= 2 ? <Text style={styles.ghostZero}>0</Text> : " "}
                            </Text>
                        </View>

                        {/* Kreska ułamkowa */}
                        <View style={styles.line} />

                        {/* Wynik - pojawia się w krokach 3 i 4 */}
                        <View style={[styles.row, { opacity: step >= 3 ? 1 : 0 }]}>
                            <Text style={styles.mathText}>  1</Text>
                            <Text style={[styles.comma, step === 4 && styles.highlightComma]}>,</Text>
                            <Text style={styles.mathText}>7 7</Text>
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
    cardTitle: { fontSize: 22, fontWeight: 'bold', color: '#1565C0', marginBottom: 20 },

    additionContainer: {
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        marginBottom: 20,
        alignItems: 'flex-end', // Wyrównanie do prawej jak w matematyce
        width: '60%'
    },
    row: { flexDirection: 'row', alignItems: 'center', height: 40 },
    mathText: { fontSize: 36, fontFamily: 'monospace', fontWeight: 'bold', color: '#333', letterSpacing: 5 },
    comma: { fontSize: 36, fontWeight: 'bold', color: '#333', width: 15, textAlign: 'center' },
    highlightComma: { color: '#C62828' }, // Czerwony przecinek dla podkreślenia zasady
    plusSign: { fontSize: 28, fontWeight: 'bold', color: '#333', marginRight: 10 },
    ghostZero: { color: '#FF9800', opacity: 0.6 },
    line: { width: '100%', height: 3, backgroundColor: '#333', marginVertical: 5 },

    infoBox: { backgroundColor: '#E0F2F1', padding: 15, borderRadius: 15, width: '100%', minHeight: 90, justifyContent: 'center', borderWidth: 1.5, borderColor: '#B2DFDB' },
    explanationText: { fontSize: 16, color: '#00695C', textAlign: 'center', fontWeight: '600', lineHeight: 22 },
    button: { backgroundColor: '#FFD54F', paddingHorizontal: 50, paddingVertical: 14, borderRadius: 25, marginTop: 20 },
    buttonText: { fontSize: 18, color: '#5D4037', fontWeight: 'bold' },
    buttonReset: { backgroundColor: '#4CAF50', paddingHorizontal: 50, paddingVertical: 14, borderRadius: 25, marginTop: 20 },
    buttonResetText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
});