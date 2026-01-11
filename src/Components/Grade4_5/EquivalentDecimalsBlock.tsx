import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ImageBackground,
    ActivityIndicator, useColorScheme, StatusBar // 🔥 Dodano importy
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import Svg, { Rect, G, Line } from 'react-native-svg';

export default function EquivalentDecimalsBlock() {
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
        subText: isDarkMode ? '#CBD5E1' : '#5D4037',
        numberBoxBg: isDarkMode ? '#1E293B' : '#FFF9C4',
        numberBoxBorder: isDarkMode ? '#F59E0B' : '#FBC02D',
        ghostZero: isDarkMode ? '#FBBF24' : '#E65100',
        infoBox: isDarkMode ? '#0F172A' : '#E0F2F1',
        infoBorder: isDarkMode ? '#1E293B' : '#B2DFDB',
        infoText: isDarkMode ? '#4ADE80' : '#00695C',
        gridBg: isDarkMode ? '#334155' : '#F5F5F5',
        gridLine: isDarkMode ? '#F1F5F9' : '#5D4037',
        buttonBg: isDarkMode ? '#F59E0B' : '#FFD54F',
        buttonText: isDarkMode ? '#1E293B' : '#5D4037',
    };

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
                        <Rect x="0" y="0" width={size} height={size} fill={theme.gridBg} stroke={theme.gridLine} strokeWidth="2" />

                        {/* Zamalowana część */}
                        <Rect x="0" y="0" width={size / 2} height={size} fill="#FF9800" opacity="0.8" />

                        {/* Pionowe linie */}
                        {[...Array(11)].map((_, i) => (
                            <Line key={`v-${i}`} x1={i * cellSize} y1="0" x2={i * cellSize} y2={size} stroke={theme.gridLine} strokeWidth="1" />
                        ))}

                        {/* Poziome linie */}
                        {step >= 1 && [...Array(11)].map((_, i) => (
                            <Line key={`h-${i}`} x1="0" y1={i * cellSize} x2={size} y2={i * cellSize} stroke={theme.gridLine} strokeWidth="0.5" opacity={isDarkMode ? 0.3 : 0.6} />
                        ))}
                    </G>
                </Svg>
                <Text style={[styles.subText, { color: theme.subText }]}>
                    {step === 0 ? "5 części z 10" : "50 części ze 100"}
                </Text>
            </View>
        );
    };

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

                        {renderGrid()}

                        <View style={styles.mathRow}>
                            <View style={[styles.numberBox, { backgroundColor: theme.numberBoxBg, borderColor: theme.numberBoxBorder }]}>
                                <Text style={[styles.decimalText, { color: theme.textMain }]}>0,5</Text>
                            </View>

                            <View style={[styles.flexRow, { opacity: step >= 2 ? 1 : 0 }]}>
                                <Text style={[styles.equalSign, { color: theme.textMain }]}>=</Text>
                                <View style={[styles.numberBox, { backgroundColor: theme.numberBoxBg, borderColor: theme.numberBoxBorder }]}>
                                    <Text style={[styles.decimalText, { color: theme.textMain }]}>
                                        0,5<Text style={[styles.ghostZero, { color: theme.ghostZero }]}>0</Text>
                                    </Text>
                                </View>
                            </View>

                            {step === 4 && (
                                <View style={styles.flexRow}>
                                    <Text style={[styles.equalSign, { color: theme.textMain }]}>=</Text>
                                    <View style={[styles.numberBox, { backgroundColor: theme.numberBoxBg, borderColor: theme.numberBoxBorder }]}>
                                        <Text style={[styles.decimalText, { color: theme.textMain }]}>0,500</Text>
                                    </View>
                                </View>
                            )}
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
    cardTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
    visualContainer: { alignItems: 'center', marginBottom: 15 },
    subText: { fontSize: 14, marginTop: 5, fontWeight: 'bold' },
    mathRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 15, height: 80, width: '100%' },
    flexRow: { flexDirection: 'row', alignItems: 'center' },
    numberBox: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
    decimalText: { fontSize: 32, fontWeight: 'bold' },
    ghostZero: { fontWeight: 'bold' },
    equalSign: { fontSize: 32, fontWeight: 'bold', marginHorizontal: 10 },
    infoBox: { padding: 15, borderRadius: 15, width: '100%', minHeight: 85, justifyContent: 'center', borderWidth: 1.5 },
    explanationText: { fontSize: 16, textAlign: 'center', fontWeight: '600', lineHeight: 22 },
    button: { paddingHorizontal: 50, paddingVertical: 14, borderRadius: 25, marginTop: 15 },
    buttonText: { fontSize: 18, fontWeight: 'bold' },
    buttonReset: { backgroundColor: '#4CAF50', paddingHorizontal: 50, paddingVertical: 14, borderRadius: 25, marginTop: 15 },
    buttonResetText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
});