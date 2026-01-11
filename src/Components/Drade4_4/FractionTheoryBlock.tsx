import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ImageBackground,
    ActivityIndicator, useColorScheme, StatusBar // 🔥 Dodano importy
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import Svg, { Circle, Path, G } from 'react-native-svg';

export default function FractionTheoryBlock() {
    const [step, setStep] = useState(0);
    const [lessonData, setLessonData] = useState(null);
    const [stepsArray, setStepsArray] = useState([]);
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
            .doc('fractionsIntro')
            .onSnapshot(doc => {
                if (doc.exists) {
                    const data = doc.data();
                    setLessonData(data);
                    if (data?.steps) {
                        const converted = Object.keys(data.steps)
                            .sort((a, b) => parseInt(a) - parseInt(b))
                            .map(key => ({
                                text: data.steps[key],
                                highlight: parseInt(key) >= 2 ? 1 : 0
                            }));
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

    const renderPizza = () => {
        const parts = 4;
        const radius = 80;
        const centerX = 100;
        const centerY = 100;
        const highlightCount = stepsArray[step]?.highlight || 0;

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
                    fill={i < highlightCount ? "#FFB300" : theme.pizzaEmpty}
                    stroke={theme.pizzaStroke}
                    strokeWidth="2"
                    opacity={step >= 1 ? 1 : 0}
                />
            );
        }

        return (
            <View style={styles.illustrationContainer}>
                <Svg height="180" width="180" viewBox="0 0 200 200">
                    {step === 0 && (
                        <Circle cx="100" cy="100" r="80" fill="#FFD54F" stroke={theme.pizzaStroke} strokeWidth="2" />
                    )}
                    <G rotation="-90" origin="100, 100">
                        {step > 0 && slices}
                    </G>
                </Svg>
            </View>
        );
    };

    if (loading) return <View style={[styles.center, {backgroundColor: isDarkMode ? '#0F172A' : '#FAFAFA'}]}><ActivityIndicator size="large" color={theme.buttonBg} /></View>;

    return (
        <View style={{ flex: 1 }}>
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
            <ImageBackground source={theme.bgImage} style={styles.backgroundImage}>
                <View style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.bgOverlay }]} />
                <View style={styles.container}>
                    <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
                        <Text style={[styles.cardTitle, { color: theme.title }]}>{lessonData?.title}</Text>

                        {renderPizza()}

                        <View style={styles.fractionStepWrapper}>
                            <View style={styles.fractionBox}>
                                <Text style={[styles.num, { opacity: step >= 2 ? 1 : 0, color: theme.numerator }]}>1</Text>
                                <View style={[styles.line, { opacity: step >= 1 ? 1 : 0, backgroundColor: theme.mathLine }]} />
                                <Text style={[styles.den, { opacity: step >= 1 ? 1 : 0, color: theme.denominator }]}>4</Text>
                            </View>

                            <View style={styles.labelsBox}>
                                {step === 1 && (
                                    <Text style={[styles.labelPointer, { marginTop: 45, color: theme.textMain }]}>← MIANOWNIK (dzielimy na 4)</Text>
                                )}

                                {step >= 2 && (
                                    <>
                                        <Text style={[styles.labelPointer, { color: theme.textMain }]}>← LICZNIK (mamy 1 część)</Text>
                                        {step === stepsArray.length - 1 && (
                                            <Text style={[styles.labelPointer, { marginTop: 25, color: theme.textMain }]}>← MIANOWNIK (całość)</Text>
                                        )}
                                    </>
                                )}
                            </View>
                        </View>

                        <View style={[styles.infoBox, { backgroundColor: theme.infoBox, borderColor: theme.infoBorder }]}>
                            <Text style={[styles.explanationText, { color: theme.infoText }]}>
                                {stepsArray[step]?.text}
                            </Text>
                        </View>

                        {step < stepsArray.length - 1 ? (
                            <TouchableOpacity style={[styles.button, { backgroundColor: theme.buttonBg }]} onPress={handleNext}>
                                <Text style={[styles.buttonText, { color: theme.buttonText }]}>Dalej ➜</Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity style={[styles.button, {backgroundColor: '#4CAF50'}]} onPress={() => setStep(0)}>
                                <Text style={[styles.buttonText, {color: '#FFF'}]}>Od nowa ↺</Text>
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
    cardTitle: { fontSize: 25, fontWeight: 'bold', marginBottom: 5, textAlign: 'center' },
    illustrationContainer: { marginVertical: 10 },
    fractionStepWrapper: { flexDirection: 'row', alignItems: 'center', height: 100, marginBottom: 15 },
    fractionBox: { alignItems: 'center', width: 50 },
    line: { width: 40, height: 4, marginVertical: 2 },
    num: { fontSize: 32, fontWeight: 'bold' },
    den: { fontSize: 32, fontWeight: 'bold' },
    labelsBox: { marginLeft: 10, width: 220, justifyContent: 'center' },
    labelPointer: { fontSize: 14, fontWeight: 'bold' },
    infoBox: {
        padding: 15,
        borderRadius: 15,
        width: '100%',
        minHeight: 70,
        justifyContent: 'center',
        borderWidth: 1,
    },
    explanationText: { fontSize: 20, textAlign: 'center', fontWeight: '500' },
    button: { paddingHorizontal: 40, paddingVertical: 12, borderRadius: 25, marginTop: 20 },
    buttonText: { fontSize: 18, fontWeight: 'bold' },
});