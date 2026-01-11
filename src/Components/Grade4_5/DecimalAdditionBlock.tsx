import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ImageBackground,
    ActivityIndicator, useColorScheme, StatusBar
} from 'react-native';
import firestore from '@react-native-firebase/firestore';

export default function DecimalAdditionBlock() {
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
        mathContainer: isDarkMode ? '#0F172A' : '#FFFFFF',
        mathBorder: isDarkMode ? '#334155' : '#E0E0E0',
        textMain: isDarkMode ? '#F1F5F9' : '#333',
        highlightComma: isDarkMode ? '#F87171' : '#C62828',
        ghostZero: isDarkMode ? '#FBBF24' : '#FF9800',
        infoBox: isDarkMode ? '#1E293B' : '#E0F2F1',
        infoBorder: isDarkMode ? '#334155' : '#B2DFDB',
        infoText: isDarkMode ? '#4ADE80' : '#00695C',
        buttonBg: isDarkMode ? '#F59E0B' : '#FFD54F',
        buttonText: isDarkMode ? '#1E293B' : '#5D4037',
    };

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

    if (loading) return <View style={[styles.center, {backgroundColor: isDarkMode ? '#0F172A' : '#FAFAFA'}]}><ActivityIndicator size="large" color={theme.buttonBg} /></View>;

    return (
        <View style={{ flex: 1 }}>
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
            <ImageBackground source={theme.bgImage} style={styles.backgroundImage} resizeMode="cover">
                <View style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.bgOverlay }]} />
                <View style={styles.container}>
                    <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
                        <Text style={[styles.cardTitle, { color: theme.title }]}>{lessonData?.title}</Text>

                        <View style={[styles.additionContainer, { backgroundColor: theme.mathContainer, borderColor: theme.mathBorder }]}>
                            {/* Pierwsza liczba */}
                            <View style={styles.row}>
                                <Text style={[styles.mathText, { color: theme.textMain }]}>  1</Text>
                                <Text style={[styles.comma, { color: theme.textMain }]}>,</Text>
                                <Text style={[styles.mathText, { color: theme.textMain }]}>2 7</Text>
                            </View>

                            {/* Druga liczba */}
                            <View style={styles.row}>
                                <Text style={[styles.plusSign, { color: theme.textMain }]}>+</Text>
                                <Text style={[styles.mathText, { color: theme.textMain }]}> 0</Text>
                                <Text style={[styles.comma, { color: theme.textMain }, step >= 1 && { color: theme.highlightComma }]}>,</Text>
                                <Text style={[styles.mathText, { color: theme.textMain }]}>
                                    5{step >= 2 ? <Text style={[styles.ghostZero, { color: theme.ghostZero }]}>0</Text> : " "}
                                </Text>
                            </View>

                            {/* Kreska */}
                            <View style={[styles.line, { backgroundColor: theme.textMain }]} />

                            {/* Wynik */}
                            <View style={[styles.row, { opacity: step >= 3 ? 1 : 0 }]}>
                                <Text style={[styles.mathText, { color: theme.textMain }]}>  1</Text>
                                <Text style={[styles.comma, { color: theme.textMain }, step === 4 && { color: theme.highlightComma }]}>,</Text>
                                <Text style={[styles.mathText, { color: theme.textMain }]}>7 7</Text>
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
    card: {
        width: '94%',
        borderRadius: 25,
        padding: 20,
        alignItems: 'center',
        elevation: 10,
    },
    cardTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    additionContainer: {
        padding: 20,
        borderRadius: 15,
        borderWidth: 1,
        marginBottom: 20,
        alignItems: 'flex-end',
        width: '65%'
    },
    row: { flexDirection: 'row', alignItems: 'center', height: 40 },
    mathText: { fontSize: 36, fontFamily: 'monospace', fontWeight: 'bold', letterSpacing: 5 },
    comma: { fontSize: 36, fontWeight: 'bold', width: 15, textAlign: 'center' },
    plusSign: { fontSize: 28, fontWeight: 'bold', marginRight: 10 },
    ghostZero: { opacity: 0.6 },
    line: { width: '100%', height: 3, marginVertical: 5 },
    infoBox: { padding: 15, borderRadius: 15, width: '100%', minHeight: 90, justifyContent: 'center', borderWidth: 1.5 },
    explanationText: { fontSize: 16, textAlign: 'center', fontWeight: '600', lineHeight: 22 },
    button: { paddingHorizontal: 50, paddingVertical: 14, borderRadius: 25, marginTop: 20 },
    buttonText: { fontSize: 18, fontWeight: 'bold' },
    buttonReset: { backgroundColor: '#4CAF50', paddingHorizontal: 50, paddingVertical: 14, borderRadius: 25, marginTop: 20 },
    buttonResetText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
});