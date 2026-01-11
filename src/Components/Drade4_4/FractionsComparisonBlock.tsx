import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ImageBackground,
    ActivityIndicator, useColorScheme, StatusBar // 🔥 Dodano importy
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import Svg, { Circle, Path, G } from 'react-native-svg';

export default function FractionsComparisonBlock() {
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
        textMain: isDarkMode ? '#F1F5F9' : '#5D4037',
        numerator: isDarkMode ? '#FB923C' : '#E65100',
        denominator: isDarkMode ? '#60A5FA' : '#1565C0',
        mathLine: isDarkMode ? '#F1F5F9' : '#333',
        symbol: isDarkMode ? '#FBBF24' : '#E65100',
        infoBox: isDarkMode ? '#1E293B' : '#E0F2F1',
        infoBorder: isDarkMode ? '#334155' : '#B2DFDB',
        infoText: isDarkMode ? '#4ADE80' : '#00695C',
        pizzaEmpty: isDarkMode ? '#334155' : '#F5F5F5',
        pizzaStroke: isDarkMode ? '#F1F5F9' : '#5D4037',
        buttonBg: isDarkMode ? '#F59E0B' : '#FFD54F',
        buttonText: isDarkMode ? '#1E293B' : '#5D4037',
    };

    useEffect(() => {
        const unsubscribe = firestore()
            .collection('lessons')
            .doc('fractionsComparison')
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

    const renderPizza = (highlightCount: number) => {
        const parts = 4;
        const radius = 40;
        const centerX = 45;
        const centerY = 45;

        if (step === 0) {
            return (
                <Svg height="90" width="90" viewBox="0 0 90 90">
                    <Circle cx={centerX} cy={centerY} r={radius} fill="#FF9800" stroke={theme.pizzaStroke} strokeWidth="2" />
                </Svg>
            );
        }

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
                    fill={i < highlightCount && step >= 2 ? "#FF9800" : theme.pizzaEmpty}
                    stroke={theme.pizzaStroke}
                    strokeWidth="1.5"
                />
            );
        }

        return (
            <Svg height="90" width="90" viewBox="0 0 90 90">
                <G rotation="-90" origin="45, 45">
                    {slices}
                </G>
            </Svg>
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

                        <View style={styles.comparisonRow}>
                            <View style={styles.pizzaBox}>
                                {renderPizza(1)}
                                <View style={[styles.fractionBox, { opacity: step >= 2 ? 1 : 0 }]}>
                                    <Text style={[styles.num, { color: theme.numerator }]}>1</Text>
                                    <View style={[styles.line, { backgroundColor: theme.mathLine }]} />
                                    <Text style={[styles.den, { color: theme.denominator }]}>4</Text>
                                </View>
                            </View>

                            <View style={styles.symbolBox}>
                                {step < 4 ? (
                                    <Text style={[styles.questionMarkText, { color: theme.title }]}>?</Text>
                                ) : (
                                    <Text style={[styles.symbolText, { color: theme.symbol }]}>{"<"}</Text>
                                )}
                            </View>

                            <View style={styles.pizzaBox}>
                                {renderPizza(3)}
                                <View style={[styles.fractionBox, { opacity: step >= 2 ? 1 : 0 }]}>
                                    <Text style={[styles.num, { color: theme.numerator }]}>3</Text>
                                    <View style={[styles.line, { backgroundColor: theme.mathLine }]} />
                                    <Text style={[styles.den, { color: theme.denominator }]}>4</Text>
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
    card: {
        width: '94%',
        borderRadius: 25,
        padding: 20,
        alignItems: 'center',
        elevation: 10,
    },
    cardTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    comparisonRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', width: '100%', marginBottom: 15 },
    pizzaBox: { alignItems: 'center', minHeight: 140 },
    symbolBox: { width: 60, alignItems: 'center', justifyContent: 'center', height: 90 },
    questionMarkText: { fontSize: 60, fontWeight: 'bold', opacity: 0.8 },
    symbolText: { fontSize: 64, fontWeight: 'bold' },
    fractionBox: { alignItems: 'center', marginTop: 10 },
    line: { width: 30, height: 3, marginVertical: 2 },
    num: { fontSize: 26, fontWeight: 'bold' },
    den: { fontSize: 26, fontWeight: 'bold' },
    infoBox: { padding: 15, borderRadius: 15, width: '100%', minHeight: 80, justifyContent: 'center', borderWidth: 1.5 },
    explanationText: { fontSize: 18, textAlign: 'center', fontWeight: '600' },
    button: { paddingHorizontal: 45, paddingVertical: 12, borderRadius: 25, marginTop: 15 },
    buttonText: { fontSize: 18, fontWeight: 'bold' },
    buttonReset: { backgroundColor: '#4CAF50', paddingHorizontal: 45, paddingVertical: 12, borderRadius: 25, marginTop: 15 },
    buttonResetText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
});