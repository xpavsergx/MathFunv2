import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ImageBackground,
    ActivityIndicator, useColorScheme, StatusBar // 🔥 Dodano importy
} from 'react-native';
import firestore from '@react-native-firebase/firestore';

export default function DecimalComparisonBlock() {
    const [step, setStep] = useState(0);
    const [lessonData, setLessonData] = useState<any>(null);
    const [stepsArray, setStepsArray] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // 🔥 LOGIKA TRYBU CIEMNEGO
    const isDarkMode = useColorScheme() === 'dark';
    const theme = {
        bgImage: require('../../assets/tloTeorii.png'),
        bgOverlay: isDarkMode ? 'rgba(0, 0, 0, 0.75)' : 'rgba(255, 255, 255, 0.2)',
        cardBg: isDarkMode ? 'rgba(30, 41, 59, 0.98)' : 'rgba(255, 255, 255, 0.98)',
        title: isDarkMode ? '#60A5FA' : '#1565C0',
        textMain: isDarkMode ? '#F1F5F9' : '#333',
        label: isDarkMode ? '#94A3B8' : '#757575',
        decimalBoxBg: isDarkMode ? '#1E293B' : '#FFF9C4',
        decimalBoxBorder: isDarkMode ? '#F59E0B' : '#FBC02D',
        ghostZero: isDarkMode ? '#FBBF24' : '#FF9800',
        sign: isDarkMode ? '#4ADE80' : '#2E7D32',
        infoBox: isDarkMode ? '#0F172A' : '#E0F2F1',
        infoBorder: isDarkMode ? '#1E293B' : '#B2DFDB',
        infoText: isDarkMode ? '#4ADE80' : '#00695C',
        buttonBg: isDarkMode ? '#F59E0B' : '#FFD54F',
        buttonText: isDarkMode ? '#1E293B' : '#5D4037',
    };

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

    if (loading) return (
        <View style={[styles.center, { backgroundColor: isDarkMode ? '#0F172A' : '#FAFAFA' }]}>
            <ActivityIndicator size="large" color={theme.buttonBg} />
        </View>
    );

    return (
        <View style={{ flex: 1 }}>
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
            <ImageBackground source={theme.bgImage} style={styles.backgroundImage} resizeMode="cover">
                <View style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.bgOverlay }]} />
                <View style={styles.container}>
                    <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
                        <Text style={[styles.cardTitle, { color: theme.title }]}>{lessonData?.title}</Text>

                        <View style={styles.comparisonArea}>
                            {/* Lewa liczba: 0,3 -> 0,30 */}
                            <View style={styles.numberWrapper}>
                                <Text style={[styles.comparisonLabel, { color: theme.label }]}>Liczba A</Text>
                                <View style={[styles.decimalBox, { backgroundColor: theme.decimalBoxBg, borderColor: theme.decimalBoxBorder }]}>
                                    <Text style={[styles.decimalText, { color: theme.textMain }]}>
                                        0,3{step >= 2 && <Text style={[styles.ghostZero, { color: theme.ghostZero }]}>0</Text>}
                                    </Text>
                                </View>
                            </View>

                            {/* Znak porównania */}
                            <View style={styles.signWrapper}>
                                <Text style={[styles.comparisonSign, { opacity: step >= 3 ? 1 : 0, color: theme.sign }]}>
                                    {">"}
                                </Text>
                            </View>

                            {/* Prawa liczba: 0,15 */}
                            <View style={styles.numberWrapper}>
                                <Text style={[styles.comparisonLabel, { color: theme.label }]}>Liczba B</Text>
                                <View style={[
                                    styles.decimalBox,
                                    {
                                        backgroundColor: theme.decimalBoxBg,
                                        borderColor: step >= 3 ? (isDarkMode ? '#334155' : '#E0E0E0') : theme.decimalBoxBorder
                                    }
                                ]}>
                                    <Text style={[styles.decimalText, { color: theme.textMain }]}>0,15</Text>
                                </View>
                            </View>
                        </View>

                        <View style={[styles.infoBox, { backgroundColor: theme.infoBox, borderColor: theme.infoBorder }]}>
                            <Text style={[styles.explanationText, { color: theme.infoText }]}>{stepsArray[step]?.text}</Text>
                        </View>

                        <TouchableOpacity
                            style={step < stepsArray.length - 1 ? [styles.button, { backgroundColor: theme.buttonBg }] : styles.buttonReset}
                            onPress={() => step < stepsArray.length - 1 ? setStep(step + 1) : setStep(0)}
                        >
                            <Text style={step < stepsArray.length - 1 ? [styles.buttonText, { color: theme.buttonText }] : styles.buttonResetText}>
                                {step < stepsArray.length - 1 ? "Dalej ➜" : "Od nowa ↺"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ImageBackground>
        </View>
    );
}

const styles = StyleSheet.create({
    backgroundImage: { flex: 1, width: '100%', height: '100%' },
    container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    card: { width: '94%', borderRadius: 25, padding: 20, alignItems: 'center', elevation: 10 },
    cardTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 25, textAlign: 'center' }, // 🔥 Przywrócono rozmiar 22
    comparisonArea: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 30, height: 120 },
    numberWrapper: { alignItems: 'center' },
    comparisonLabel: { fontSize: 14, marginBottom: 5, fontWeight: 'bold' },
    decimalBox: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 15, borderWidth: 2, minWidth: 80, alignItems: 'center' },
    decimalText: { fontSize: 32, fontWeight: 'bold' },
    ghostZero: { fontStyle: 'italic' },
    signWrapper: { width: 60, alignItems: 'center' },
    comparisonSign: { fontSize: 48, fontWeight: 'bold' },
    infoBox: { padding: 15, borderRadius: 15, width: '100%', minHeight: 90, justifyContent: 'center', borderWidth: 1.5 },
    explanationText: { fontSize: 16, textAlign: 'center', fontWeight: '600', lineHeight: 22 },
    button: { paddingHorizontal: 50, paddingVertical: 14, borderRadius: 25, marginTop: 20 },
    buttonText: { fontSize: 18, fontWeight: 'bold' },
    buttonReset: { backgroundColor: '#4CAF50', paddingHorizontal: 50, paddingVertical: 14, borderRadius: 25, marginTop: 20 },
    buttonResetText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
});