import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ImageBackground,
    ActivityIndicator, useColorScheme, StatusBar // 🔥 Dodano importy
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import Svg, { Path, G } from 'react-native-svg';

export default function ImproperFractionsBlock() {
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
        numerator: isDarkMode ? '#FB923C' : '#E65100',
        denominator: isDarkMode ? '#60A5FA' : '#1565C0',
        wholeNumber: isDarkMode ? '#4ADE80' : '#2E7D32',
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
            .doc('improperFractionsIntro')
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

    const renderPizzas = () => {
        const radius = 40;
        const centerX = 45;
        const centerY = 45;

        const drawPizza = (highlightedSlices: number[]) => (
            <Svg height="90" width="90" viewBox="0 0 90 90">
                <G rotation="-90" origin="45, 45">
                    {[0, 1, 2, 3].map(i => {
                        const startAngle = (i * 360) / 4;
                        const endAngle = ((i + 1) * 360) / 4;
                        const x1 = centerX + radius * Math.cos((Math.PI * startAngle) / 180);
                        const y1 = centerY + radius * Math.sin((Math.PI * startAngle) / 180);
                        const x2 = centerX + radius * Math.cos((Math.PI * endAngle) / 180);
                        const y2 = centerY + radius * Math.sin((Math.PI * endAngle) / 180);
                        const pathData = `M${centerX},${centerY} L${x1},${y1} A${radius},${radius} 0 0,1 ${x2},${y2} Z`;

                        return (
                            <Path
                                key={i}
                                d={pathData}
                                fill={highlightedSlices.includes(i) ? "#FF9800" : theme.pizzaEmpty}
                                stroke={theme.pizzaStroke}
                                strokeWidth="1.5"
                            />
                        );
                    })}
                </G>
            </Svg>
        );

        return (
            <View style={styles.pizzasRow}>
                <View style={styles.pizzaContainer}>{drawPizza([0, 1, 2, 3])}</View>
                <View style={styles.pizzaContainer}>{drawPizza([0])}</View>
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

                        {renderPizzas()}

                        <View style={styles.mathRow}>
                            {step >= 1 && step <= 3 && (
                                <View style={styles.fractionBox}>
                                    <Text style={[styles.num, { color: theme.numerator }]}>5</Text>
                                    <View style={[styles.line, { backgroundColor: theme.textMain }]} />
                                    <Text style={[styles.den, { color: theme.denominator }]}>4</Text>
                                </View>
                            )}

                            {step === 4 && (
                                <View style={styles.mixedRow}>
                                    <View style={styles.fractionBox}>
                                        <Text style={[styles.num, { color: theme.numerator }]}>5</Text>
                                        <View style={[styles.line, { backgroundColor: theme.textMain }]} />
                                        <Text style={[styles.den, { color: theme.denominator }]}>4</Text>
                                    </View>
                                    <Text style={[styles.equalSign, { color: theme.textMain }]}>=</Text>
                                    <View style={styles.mixedContainer}>
                                        <Text style={[styles.wholeNumber, { color: theme.wholeNumber }]}>1</Text>
                                        <View style={styles.fractionBoxSmall}>
                                            <Text style={[styles.numSmall, { color: theme.numerator }]}>1</Text>
                                            <View style={[styles.lineSmall, { backgroundColor: theme.textMain }]} />
                                            <Text style={[styles.denSmall, { color: theme.denominator }]}>4</Text>
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
    card: {
        width: '94%',
        borderRadius: 25,
        padding: 20,
        alignItems: 'center',
        elevation: 10,
    },
    cardTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    pizzasRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20 },
    pizzaContainer: { marginHorizontal: 5 },
    mathRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 100, marginBottom: 15 },
    fractionBox: { alignItems: 'center', width: 50 },
    line: { width: 40, height: 4, marginVertical: 2 },
    num: { fontSize: 36, fontWeight: 'bold' },
    den: { fontSize: 36, fontWeight: 'bold' },
    mixedRow: { flexDirection: 'row', alignItems: 'center' },
    equalSign: { fontSize: 32, marginHorizontal: 15, fontWeight: 'bold' },
    mixedContainer: { flexDirection: 'row', alignItems: 'center' },
    wholeNumber: { fontSize: 52, fontWeight: 'bold', marginRight: 5 },
    fractionBoxSmall: { alignItems: 'center' },
    numSmall: { fontSize: 24, fontWeight: 'bold' },
    lineSmall: { width: 25, height: 3, marginVertical: 2 },
    denSmall: { fontSize: 24, fontWeight: 'bold' },
    infoBox: { padding: 15, borderRadius: 15, width: '100%', minHeight: 80, justifyContent: 'center', borderWidth: 1.5 },
    explanationText: { fontSize: 17, textAlign: 'center', fontWeight: '600' },
    button: { paddingHorizontal: 45, paddingVertical: 12, borderRadius: 25, marginTop: 20 },
    buttonText: { fontSize: 18, fontWeight: 'bold' },
    buttonReset: { backgroundColor: '#4CAF50', paddingHorizontal: 45, paddingVertical: 12, borderRadius: 25, marginTop: 20 },
    buttonResetText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
});