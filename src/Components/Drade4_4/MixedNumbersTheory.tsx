import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ImageBackground,
    ActivityIndicator, useColorScheme, StatusBar // 🔥 Dodano importy
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import Svg, { Circle, Path, G } from 'react-native-svg';

export default function MixedNumbersTheory() {
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
        wholeNumber: isDarkMode ? '#4ADE80' : '#2E7D32',
        numerator: isDarkMode ? '#FB923C' : '#E65100',
        denominator: isDarkMode ? '#60A5FA' : '#1565C0',
        mathLine: isDarkMode ? '#F1F5F9' : '#333',
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
            .doc('mixedNumbersIntro')
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

    const handleNext = () => {
        if (step < stepsArray.length - 1) setStep(step + 1);
    };

    const renderPizza = (isWhole: boolean, isPart: boolean) => {
        const parts = 4;
        const radius = 35;
        const centerX = 40;
        const centerY = 40;

        const slices = [];
        for (let i = 0; i < parts; i++) {
            const startAngle = (i * 360) / parts;
            const endAngle = ((i + 1) * 360) / parts;
            const x1 = centerX + radius * Math.cos((Math.PI * startAngle) / 180);
            const y1 = centerY + radius * Math.sin((Math.PI * startAngle) / 180);
            const x2 = centerX + radius * Math.cos((Math.PI * endAngle) / 180);
            const y2 = centerY + radius * Math.sin((Math.PI * endAngle) / 180);
            const pathData = `M${centerX},${centerY} L${x1},${y1} A${radius},${radius} 0 0,1 ${x2},${y2} Z`;

            let fillColor = theme.pizzaEmpty;
            if (isWhole && step >= 1) fillColor = "#FF9800";
            if (isPart && i === 0 && step >= 3) fillColor = "#FF9800";

            slices.push(
                <Path key={i} d={pathData} fill={fillColor} stroke={theme.pizzaStroke} strokeWidth="1.5" />
            );
        }

        return (
            <Svg height="80" width="80" viewBox="0 0 80 80">
                <G rotation="-90" origin="40, 40">
                    {step === 0 && isWhole ?
                        <Circle cx="40" cy="40" r="35" fill="#FFD54F" stroke={theme.pizzaStroke} strokeWidth="2" /> :
                        slices
                    }
                </G>
            </Svg>
        );
    };

    if (loading) return <View style={[styles.center, {backgroundColor: isDarkMode ? '#0F172A' : '#FAFAFA'}]}><ActivityIndicator size="large" color={theme.buttonBg} /></View>;

    return (
        <View style={{ flex: 1 }}>
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
            <ImageBackground source={theme.bgImage} style={styles.backgroundImage} resizeMode="cover">
                <View style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.bgOverlay }]} />
                <View style={styles.container}>
                    <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
                        <Text style={[styles.cardTitle, { color: theme.title }]}>{lessonData?.title}</Text>

                        <View style={styles.pizzasRow}>
                            {renderPizza(true, false)}
                            {renderPizza(true, false)}
                            {renderPizza(false, true)}
                        </View>

                        <View style={styles.fractionStepWrapper}>
                            <Text style={[styles.wholeNumber, { opacity: step >= 1 ? 1 : 0, color: theme.wholeNumber }]}>2</Text>

                            <View style={styles.fractionBox}>
                                <Text style={[styles.num, { opacity: step >= 3 ? 1 : 0, color: theme.numerator }]}>1</Text>
                                <View style={[styles.line, { opacity: step >= 2 ? 1 : 0, backgroundColor: theme.mathLine }]} />
                                <Text style={[styles.den, { opacity: step >= 2 ? 1 : 0, color: theme.denominator }]}>4</Text>
                            </View>

                            <View style={styles.labelsBox}>
                                {step >= 4 && (
                                    <Text style={[styles.labelPointer, { color: theme.textMain }]}>← Liczba mieszana</Text>
                                )}
                            </View>
                        </View>

                        <View style={[styles.infoBox, { backgroundColor: theme.infoBox, borderColor: theme.infoBorder }]}>
                            <Text style={[styles.explanationText, { color: theme.infoText }]}>
                                {stepsArray[step]?.text || "Ładowanie..."}
                            </Text>
                        </View>

                        {step < stepsArray.length - 1 ? (
                            <TouchableOpacity style={[styles.button, { backgroundColor: theme.buttonBg }]} onPress={handleNext}>
                                <Text style={[styles.buttonText, { color: theme.buttonText }]}>Dalej ➜</Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity style={styles.buttonReset} onPress={() => setStep(0)}>
                                <Text style={styles.buttonResetText}>Od nowa ↺</Text>
                            </TouchableOpacity>
                        )}
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
    fractionStepWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 120,
        marginBottom: 15,
        width: '100%'
    },
    wholeNumber: { fontSize: 72, fontWeight: 'bold', marginRight: 12 },
    fractionBox: { alignItems: 'center', justifyContent: 'center', width: 50 },
    line: { width: 45, height: 4, marginVertical: 4 },
    num: { fontSize: 36, fontWeight: 'bold' },
    den: { fontSize: 36, fontWeight: 'bold' },
    labelsBox: { marginLeft: 15, width: 140, height: 100, justifyContent: 'center' },
    labelPointer: { fontSize: 14, fontWeight: '900' },
    infoBox: { padding: 15, borderRadius: 15, width: '100%', minHeight: 80, justifyContent: 'center', borderWidth: 1.5 },
    explanationText: { fontSize: 18, textAlign: 'center', fontWeight: '600' },
    button: { paddingHorizontal: 45, paddingVertical: 12, borderRadius: 25, marginTop: 25 },
    buttonText: { fontSize: 18, fontWeight: 'bold' },
    buttonReset: { backgroundColor: '#4CAF50', paddingHorizontal: 45, paddingVertical: 12, borderRadius: 25, marginTop: 25 },
    buttonResetText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
});