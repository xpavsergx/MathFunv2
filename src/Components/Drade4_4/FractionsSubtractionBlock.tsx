import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ImageBackground,
    ActivityIndicator, useColorScheme, StatusBar // 🔥 Dodano importy
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import Svg, { Path, G } from 'react-native-svg';

export default function FractionsSubtractionBlock() {
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
        numeratorFinal: isDarkMode ? '#F87171' : '#C62828',
        denominator: isDarkMode ? '#60A5FA' : '#1565C0',
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
            .doc('fractionsSubtraction')
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

    const renderPizza = () => {
        const radius = 50;
        const centerX = 60;
        const centerY = 60;

        return (
            <Svg height="120" width="120" viewBox="0 0 120 120">
                <G rotation="-90" origin="60, 60">
                    {[0, 1, 2, 3].map(i => {
                        const startAngle = (i * 360) / 4;
                        const endAngle = ((i + 1) * 360) / 4;
                        const x1 = centerX + radius * Math.cos((Math.PI * startAngle) / 180);
                        const y1 = centerY + radius * Math.sin((Math.PI * startAngle) / 180);
                        const x2 = centerX + radius * Math.cos((Math.PI * endAngle) / 180);
                        const y2 = centerY + radius * Math.sin((Math.PI * endAngle) / 180);
                        const pathData = `M${centerX},${centerY} L${x1},${y1} A${radius},${radius} 0 0,1 ${x2},${y2} Z`;

                        let fillColor = theme.pizzaEmpty;
                        if (i < 2) fillColor = "#FF9800";
                        if (i === 2) fillColor = step < 2 ? "#FF9800" : theme.pizzaEmpty;

                        return (
                            <Path
                                key={i}
                                d={pathData}
                                fill={fillColor}
                                stroke={theme.pizzaStroke}
                                strokeWidth="2"
                                opacity={i === 2 && step === 1 ? 0.5 : 1}
                            />
                        );
                    })}
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

                        <View style={styles.visualRow}>
                            {renderPizza()}
                        </View>

                        <View style={styles.mathRow}>
                            <View style={styles.fractionBox}>
                                <Text style={[styles.num, { color: step === 4 ? theme.numeratorFinal : theme.numerator }]}>3</Text>
                                <View style={[styles.line, { backgroundColor: theme.textMain }]} />
                                <Text style={[styles.den, { color: theme.denominator }]}>4</Text>
                            </View>

                            <View style={[styles.flexRow, { opacity: step >= 1 ? 1 : 0 }]}>
                                <Text style={[styles.operationSymbol, { color: theme.textMain }]}>-</Text>
                                <View style={styles.fractionBox}>
                                    <Text style={[styles.num, { color: step === 4 ? theme.numeratorFinal : theme.numerator }]}>1</Text>
                                    <View style={[styles.line, { backgroundColor: theme.textMain }]} />
                                    <Text style={[styles.den, { color: theme.denominator }]}>4</Text>
                                </View>
                            </View>

                            <View style={[styles.flexRow, { opacity: step >= 3 ? 1 : 0 }]}>
                                <Text style={[styles.operationSymbol, { color: theme.textMain }]}>=</Text>
                                <View style={styles.fractionBox}>
                                    <Text style={[styles.num, { color: step === 4 ? theme.numeratorFinal : theme.numerator }]}>2</Text>
                                    <View style={[styles.line, { backgroundColor: theme.textMain }]} />
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
    card: { width: '94%', borderRadius: 25, padding: 20, alignItems: 'center', elevation: 10 },
    cardTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
    visualRow: { marginBottom: 20, height: 120, justifyContent: 'center' },
    mathRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20, height: 90 },
    flexRow: { flexDirection: 'row', alignItems: 'center' },
    fractionBox: { alignItems: 'center', width: 45 },
    line: { width: 35, height: 3, marginVertical: 2 },
    num: { fontSize: 30, fontWeight: 'bold' },
    den: { fontSize: 30, fontWeight: 'bold' },
    operationSymbol: { fontSize: 30, fontWeight: 'bold', marginHorizontal: 10 },
    infoBox: { padding: 15, borderRadius: 15, width: '100%', minHeight: 90, justifyContent: 'center', borderWidth: 1.5 },
    explanationText: { fontSize: 17, textAlign: 'center', fontWeight: '600' },
    button: { paddingHorizontal: 45, paddingVertical: 12, borderRadius: 25, marginTop: 20 },
    buttonText: { fontSize: 18, fontWeight: 'bold' },
    buttonReset: { backgroundColor: '#4CAF50', paddingHorizontal: 45, paddingVertical: 12, borderRadius: 25, marginTop: 20 },
    buttonResetText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
});