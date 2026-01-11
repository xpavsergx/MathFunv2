import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ImageBackground,
    ActivityIndicator, useColorScheme, StatusBar // 🔥 Dodano importy
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import Svg, { Rect, G } from 'react-native-svg';

export default function SpecialDenominatorsBlock() {
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
        numerator: isDarkMode ? '#FB923C' : '#E65100',
        denominator: isDarkMode ? '#60A5FA' : '#1565C0',
        mathLine: isDarkMode ? '#F1F5F9' : '#333',
        summaryBg: isDarkMode ? '#1E293B' : '#FFF9C4',
        summaryBorder: isDarkMode ? '#F59E0B' : '#FBC02D',
        infoBox: isDarkMode ? '#0F172A' : '#E0F2F1',
        infoBorder: isDarkMode ? '#1E293B' : '#B2DFDB',
        infoText: isDarkMode ? '#4ADE80' : '#00695C',
        rectEmpty: isDarkMode ? '#334155' : '#F5F5F5',
        rectStroke: isDarkMode ? '#F1F5F9' : '#5D4037',
        buttonBg: isDarkMode ? '#F59E0B' : '#FFD54F',
        buttonText: isDarkMode ? '#1E293B' : '#5D4037',
    };

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
                                fill={step >= 2 && i < 3 ? "#FF9800" : theme.rectEmpty}
                                stroke={theme.rectStroke}
                                strokeWidth="2"
                            />
                        ))}
                    </G>
                </Svg>
                <Text style={[styles.subText, { color: theme.subText }]}>
                    {step === 0 ? "Zaczynamy od podziału na 10..." : "Model ułamka o mianowniku 10"}
                </Text>
            </View>
        );
    };

    if (loading) return <View style={[styles.center, { backgroundColor: isDarkMode ? '#0F172A' : '#FAFAFA' }]}><ActivityIndicator size="large" color={theme.buttonBg} /></View>;

    return (
        <View style={{ flex: 1 }}>
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
            <ImageBackground source={theme.bgImage} style={styles.backgroundImage} resizeMode="cover">
                <View style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.bgOverlay }]} />
                <View style={styles.container}>
                    <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
                        <Text style={[styles.cardTitle, { color: theme.title }]}>{lessonData?.title}</Text>

                        {renderDecimalBar()}

                        <View style={styles.mathRow}>
                            {(step === 2 || step === 3) && (
                                <View style={styles.fractionBox}>
                                    <Text style={[styles.num, { color: theme.numerator }]}>3</Text>
                                    <View style={[styles.line, { backgroundColor: theme.mathLine }]} />
                                    <Text style={[styles.den, { color: theme.denominator }]}>10</Text>
                                </View>
                            )}

                            {step === 3 && (
                                <View style={styles.flexRow}>
                                    <Text style={[styles.orText, { color: isDarkMode ? '#94A3B8' : '#777' }]}>lub</Text>
                                    <View style={styles.fractionBox}>
                                        <Text style={[styles.num, { color: theme.numerator }]}>3</Text>
                                        <View style={[styles.line, { backgroundColor: theme.mathLine }]} />
                                        <Text style={[styles.den, { color: theme.denominator }]}>100</Text>
                                    </View>
                                </View>
                            )}

                            {step === 4 && (
                                <View style={[styles.summaryBox, { backgroundColor: theme.summaryBg, borderColor: theme.summaryBorder }]}>
                                    <Text style={[styles.summaryTitle, { color: isDarkMode ? '#4ADE80' : '#2E7D32' }]}>To ułamki dziesiętne!</Text>
                                    <View style={styles.summaryFractionsRow}>
                                        <View style={styles.smallFractionBox}>
                                            <Text style={[styles.smallNum, { color: theme.numerator }]}>3</Text>
                                            <View style={[styles.smallLine, { backgroundColor: theme.mathLine }]} />
                                            <Text style={[styles.smallDen, { color: theme.denominator }]}>10</Text>
                                        </View>
                                        <Text style={[styles.comma, { color: theme.textMain }]}>,</Text>
                                        <View style={styles.smallFractionBox}>
                                            <Text style={[styles.smallNum, { color: theme.numerator }]}>3</Text>
                                            <View style={[styles.smallLine, { backgroundColor: theme.mathLine }]} />
                                            <Text style={[styles.smallDen, { color: theme.denominator }]}>100</Text>
                                        </View>
                                        <Text style={[styles.comma, { color: theme.textMain }]}>,</Text>
                                        <View style={styles.smallFractionBox}>
                                            <Text style={[styles.smallNum, { color: theme.numerator }]}>3</Text>
                                            <View style={[styles.smallLine, { backgroundColor: theme.mathLine }]} />
                                            <Text style={[styles.smallDen, { color: theme.denominator }]}>1000</Text>
                                        </View>
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
    visualContainer: { alignItems: 'center', marginBottom: 15, height: 75 },
    subText: { fontSize: 13, marginTop: 4, fontStyle: 'italic', fontWeight: '600' },
    mathRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 15, height: 100, width: '100%' },
    flexRow: { flexDirection: 'row', alignItems: 'center' },
    fractionBox: { alignItems: 'center', width: 60 },
    line: { width: 40, height: 3, marginVertical: 2 },
    num: { fontSize: 30, fontWeight: 'bold' },
    den: { fontSize: 30, fontWeight: 'bold' },
    orText: { fontSize: 18, marginHorizontal: 10, fontWeight: 'bold' },
    summaryBox: { alignItems: 'center', padding: 12, borderRadius: 15, borderWidth: 1.5, width: '95%' },
    summaryTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
    summaryFractionsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    smallFractionBox: { alignItems: 'center', marginHorizontal: 5 },
    smallNum: { fontSize: 18, fontWeight: 'bold' },
    smallDen: { fontSize: 18, fontWeight: 'bold' },
    smallLine: { width: 30, height: 2, marginVertical: 1 },
    comma: { fontSize: 22, fontWeight: 'bold', marginTop: 10 },
    infoBox: { padding: 15, borderRadius: 15, width: '100%', minHeight: 85, justifyContent: 'center', borderWidth: 1.5 },
    explanationText: { fontSize: 16, textAlign: 'center', fontWeight: '600', lineHeight: 22 },
    button: { paddingHorizontal: 45, paddingVertical: 12, borderRadius: 25, marginTop: 15 },
    buttonText: { fontSize: 18, fontWeight: 'bold' },
    buttonReset: { backgroundColor: '#4CAF50', paddingHorizontal: 45, paddingVertical: 12, borderRadius: 25, marginTop: 15 },
    buttonResetText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
});