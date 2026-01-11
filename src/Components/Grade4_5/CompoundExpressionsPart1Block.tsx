import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ImageBackground,
    ActivityIndicator, useColorScheme, StatusBar // 🔥 Dodano importy
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import Svg, { Circle, Text as SvgText, G } from 'react-native-svg';

export default function CompoundExpressionsPart1Block() {
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
        coinContainer: isDarkMode ? '#1E293B' : '#FFFDE7',
        coinBorder: isDarkMode ? '#334155' : '#FFF59D',
        coinLabel: isDarkMode ? '#FBBF24' : '#5D4037',
        numerator: isDarkMode ? '#FB923C' : '#E65100',
        denominator: isDarkMode ? '#60A5FA' : '#1565C0',
        wholeNumber: isDarkMode ? '#4ADE80' : '#2E7D32',
        decimalBg: isDarkMode ? '#334155' : '#FFF9C4',
        decimalBorder: isDarkMode ? '#F59E0B' : '#FBC02D',
        infoBox: isDarkMode ? '#0F172A' : '#E0F2F1',
        infoBorder: isDarkMode ? '#1E293B' : '#B2DFDB',
        infoText: isDarkMode ? '#4ADE80' : '#00695C',
        buttonBg: isDarkMode ? '#F59E0B' : '#FFD54F',
        buttonText: isDarkMode ? '#1E293B' : '#5D4037',
    };

    useEffect(() => {
        const unsubscribe = firestore()
            .collection('lessons')
            .doc('compoundExpressionsPart1')
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

    const renderCoins = () => {
        return (
            <View style={[styles.coinsContainer, { backgroundColor: theme.coinContainer, borderColor: theme.coinBorder }]}>
                <Svg height="120" width="240" viewBox="0 0 240 120">
                    {step === 1 ? (
                        <G>
                            <Circle cx="120" cy="60" r="48" fill="#E8E8E8" stroke="#A9A9A9" strokeWidth="2" />
                            <SvgText x="120" y="65" fontSize="34" fontWeight="bold" fill="#333" textAnchor="middle">1</SvgText>
                            <SvgText x="120" y="85" fontSize="14" fontWeight="bold" fill="#333" textAnchor="middle">ZŁOTY</SvgText>
                        </G>
                    ) : (
                        <G>
                            <Circle cx="70" cy="60" r="45" fill="#FFD700" stroke="#B8860B" strokeWidth="2" />
                            <Circle cx="70" cy="60" r="28" fill="#E8E8E8" stroke="#A9A9A9" strokeWidth="1" />
                            <SvgText x="70" y="65" fontSize="32" fontWeight="bold" fill="#333" textAnchor="middle">2</SvgText>
                            <SvgText x="70" y="85" fontSize="14" fontWeight="bold" fill="#333" textAnchor="middle">ZŁ</SvgText>

                            <Circle cx="170" cy="65" r="35" fill="#CD7F32" stroke="#8B4513" strokeWidth="2" />
                            <SvgText x="170" y="70" fontSize="26" fontWeight="bold" fill="#333" textAnchor="middle">5</SvgText>
                            <SvgText x="170" y="88" fontSize="12" fontWeight="bold" fill="#333" textAnchor="middle">GR</SvgText>
                        </G>
                    )}
                </Svg>
                <Text style={[styles.coinLabel, { color: theme.coinLabel }]}>
                    {step === 1 ? "1 zł = 100 gr" : (step === 0 ? "Pieniądze" : "2 zł 5 gr")}
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

                        {renderCoins()}

                        <View style={styles.mathRow}>
                            {step === 1 && (
                                <View style={styles.flexRow}>
                                    <Text style={[styles.simpleText, { color: theme.textMain }]}>1 gr = </Text>
                                    <View style={styles.fractionBoxSmall}>
                                        <Text style={[styles.numSmall, { color: theme.numerator }]}>1</Text>
                                        <View style={[styles.lineSmall, { backgroundColor: theme.textMain }]} />
                                        <Text style={[styles.denSmall, { color: theme.denominator }]}>100</Text>
                                    </View>
                                    <Text style={[styles.simpleText, { color: theme.textMain }]}> zł</Text>
                                </View>
                            )}

                            {step === 2 && (
                                <View style={styles.mixedContainer}>
                                    <Text style={[styles.wholeNumber, { color: theme.wholeNumber }]}>2</Text>
                                    <View style={styles.fractionBox}>
                                        <Text style={[styles.num, { color: theme.numerator }]}>5</Text>
                                        <View style={[styles.line, { backgroundColor: theme.textMain }]} />
                                        <Text style={[styles.den, { color: theme.denominator }]}>100</Text>
                                    </View>
                                    <Text style={[styles.unitText, { color: theme.textMain }]}>zł</Text>
                                </View>
                            )}

                            {step >= 3 && (
                                <View style={[styles.decimalBox, { backgroundColor: theme.decimalBg, borderColor: theme.decimalBorder }]}>
                                    <Text style={[styles.decimalText, { color: theme.textMain }]}>
                                        2<Text style={styles.comma}>,</Text><Text style={styles.highlight}>05</Text> zł
                                    </Text>
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
    cardTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
    coinsContainer: {
        alignItems: 'center',
        marginBottom: 10,
        padding: 10,
        borderRadius: 20,
        borderWidth: 1,
        width: '100%'
    },
    coinLabel: { fontSize: 20, fontWeight: 'bold', marginTop: 5 },
    mathRow: { height: 110, justifyContent: 'center', alignItems: 'center', width: '100%', marginBottom: 10 },
    flexRow: { flexDirection: 'row', alignItems: 'center' },
    simpleText: { fontSize: 26, fontWeight: 'bold' },
    fractionBoxSmall: { alignItems: 'center', marginHorizontal: 8 },
    numSmall: { fontSize: 22, fontWeight: 'bold' },
    denSmall: { fontSize: 22, fontWeight: 'bold' },
    lineSmall: { width: 35, height: 2, marginVertical: 2 },
    mixedContainer: { flexDirection: 'row', alignItems: 'center' },
    wholeNumber: { fontSize: 48, fontWeight: 'bold' },
    fractionBox: { alignItems: 'center', marginHorizontal: 10 },
    num: { fontSize: 26, fontWeight: 'bold' },
    den: { fontSize: 26, fontWeight: 'bold' },
    line: { width: 45, height: 3, marginVertical: 2 },
    unitText: { fontSize: 28, fontWeight: 'bold' },
    decimalBox: { paddingHorizontal: 25, paddingVertical: 15, borderRadius: 15, borderWidth: 2 },
    decimalText: { fontSize: 44, fontWeight: 'bold' },
    comma: { color: '#C62828' },
    highlight: { color: '#E65100' },
    infoBox: { padding: 15, borderRadius: 15, width: '100%', minHeight: 90, justifyContent: 'center', borderWidth: 1.5 },
    explanationText: { fontSize: 17, textAlign: 'center', fontWeight: '600', lineHeight: 24 },
    button: { paddingHorizontal: 50, paddingVertical: 14, borderRadius: 25, marginTop: 15 },
    buttonText: { fontSize: 20, fontWeight: 'bold' },
    buttonReset: { backgroundColor: '#4CAF50', paddingHorizontal: 50, paddingVertical: 14, borderRadius: 25, marginTop: 15 },
    buttonResetText: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' },
});