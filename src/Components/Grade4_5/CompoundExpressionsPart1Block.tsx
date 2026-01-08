import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, ActivityIndicator } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import Svg, { Circle, Text as SvgText, G } from 'react-native-svg';

export default function CompoundExpressionsPart1Block() {
    const [step, setStep] = useState(0);
    const [lessonData, setLessonData] = useState<any>(null);
    const [stepsArray, setStepsArray] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

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
            <View style={styles.coinsContainer}>
                <Svg height="120" width="240" viewBox="0 0 240 120">
                    {/* KROK 1: Pokazujemy tylko 1 ZŁ, aby pasowało do tekstu o 100 groszach */}
                    {step === 1 ? (
                        <G>
                            <Circle cx="120" cy="60" r="48" fill="#E8E8E8" stroke="#A9A9A9" strokeWidth="2" />
                            <SvgText x="120" y="65" fontSize="34" fontWeight="bold" fill="#333" textAnchor="middle">1</SvgText>
                            <SvgText x="120" y="85" fontSize="14" fontWeight="bold" fill="#333" textAnchor="middle">ZŁOTY</SvgText>
                        </G>
                    ) : (
                        /* POZOSTAŁE KROKI: Przykład 2 zł 5 gr */
                        <G>
                            {/* Moneta 2 ZŁ */}
                            <Circle cx="70" cy="60" r="45" fill="#FFD700" stroke="#B8860B" strokeWidth="2" />
                            <Circle cx="70" cy="60" r="28" fill="#E8E8E8" stroke="#A9A9A9" strokeWidth="1" />
                            <SvgText x="70" y="65" fontSize="32" fontWeight="bold" fill="#333" textAnchor="middle">2</SvgText>
                            <SvgText x="70" y="85" fontSize="14" fontWeight="bold" fill="#333" textAnchor="middle">ZŁ</SvgText>

                            {/* Moneta 5 GR */}
                            <Circle cx="170" cy="65" r="35" fill="#CD7F32" stroke="#8B4513" strokeWidth="2" />
                            <SvgText x="170" y="70" fontSize="26" fontWeight="bold" fill="#333" textAnchor="middle">5</SvgText>
                            <SvgText x="170" y="88" fontSize="12" fontWeight="bold" fill="#333" textAnchor="middle">GR</SvgText>
                        </G>
                    )}
                </Svg>
                <Text style={styles.coinLabel}>
                    {step === 1 ? "1 zł = 100 gr" : (step === 0 ? "Pieniądze" : "2 zł 5 gr")}
                </Text>
            </View>
        );
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#FFB300" /></View>;

    return (
        <ImageBackground source={require('../../assets/tloTeorii.png')} style={styles.backgroundImage} resizeMode="cover">
            <View style={styles.container}>
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>{lessonData?.title}</Text>

                    {renderCoins()}

                    <View style={styles.mathRow}>
                        {/* KROK 1: 1 gr = 1/100 zł */}
                        {step === 1 && (
                            <View style={styles.flexRow}>
                                <Text style={styles.simpleText}>1 gr = </Text>
                                <View style={styles.fractionBoxSmall}>
                                    <Text style={styles.numSmall}>1</Text>
                                    <View style={styles.lineSmall} />
                                    <Text style={styles.denSmall}>100</Text>
                                </View>
                                <Text style={styles.simpleText}> zł</Text>
                            </View>
                        )}

                        {/* KROK 2: 2 i 5/100 zł */}
                        {step === 2 && (
                            <View style={styles.mixedContainer}>
                                <Text style={styles.wholeNumber}>2</Text>
                                <View style={styles.fractionBox}>
                                    <Text style={styles.num}>5</Text>
                                    <View style={styles.line} />
                                    <Text style={styles.den}>100</Text>
                                </View>
                                <Text style={styles.unitText}>zł</Text>
                            </View>
                        )}

                        {/* KROK 3 i 4: 2,05 zł */}
                        {step >= 3 && (
                            <View style={styles.decimalBox}>
                                <Text style={styles.decimalText}>
                                    2<Text style={styles.comma}>,</Text><Text style={styles.highlight}>05</Text> zł
                                </Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.infoBox}>
                        <Text style={styles.explanationText}>{stepsArray[step]?.text}</Text>
                    </View>

                    <TouchableOpacity
                        style={step < stepsArray.length - 1 ? styles.button : styles.buttonReset}
                        onPress={() => step < stepsArray.length - 1 ? setStep(step + 1) : setStep(0)}
                    >
                        <Text style={step < stepsArray.length - 1 ? styles.buttonText : styles.buttonResetText}>
                            {step < stepsArray.length - 1 ? "Dalej ➜" : "Od nowa ↺"}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    backgroundImage: { flex: 1, width: '100%', height: '100%' },
    container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    card: { backgroundColor: 'rgba(255, 255, 255, 0.98)', width: '94%', borderRadius: 25, padding: 20, alignItems: 'center', elevation: 10 },
    cardTitle: { fontSize: 22, fontWeight: 'bold', color: '#1565C0', marginBottom: 10, textAlign: 'center' },
    coinsContainer: {
        alignItems: 'center',
        marginBottom: 10,
        padding: 10,
        backgroundColor: '#FFFDE7',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#FFF59D',
        width: '100%'
    },
    coinLabel: { fontSize: 20, fontWeight: 'bold', color: '#5D4037', marginTop: 5 },
    mathRow: { height: 110, justifyContent: 'center', alignItems: 'center', width: '100%', marginBottom: 10 },
    flexRow: { flexDirection: 'row', alignItems: 'center' },
    simpleText: { fontSize: 26, fontWeight: 'bold', color: '#333' },
    fractionBoxSmall: { alignItems: 'center', marginHorizontal: 8 },
    numSmall: { fontSize: 22, fontWeight: 'bold', color: '#E65100' },
    denSmall: { fontSize: 22, fontWeight: 'bold', color: '#1565C0' },
    lineSmall: { width: 35, height: 2, backgroundColor: '#333', marginVertical: 2 },
    mixedContainer: { flexDirection: 'row', alignItems: 'center' },
    wholeNumber: { fontSize: 48, fontWeight: 'bold', color: '#2E7D32' },
    fractionBox: { alignItems: 'center', marginHorizontal: 10 },
    num: { fontSize: 26, fontWeight: 'bold', color: '#E65100' },
    den: { fontSize: 26, fontWeight: 'bold', color: '#1565C0' },
    line: { width: 45, height: 3, backgroundColor: '#333', marginVertical: 2 },
    unitText: { fontSize: 28, fontWeight: 'bold', color: '#333' },
    decimalBox: { backgroundColor: '#FFF9C4', paddingHorizontal: 25, paddingVertical: 15, borderRadius: 15, borderWidth: 2, borderColor: '#FBC02D' },
    decimalText: { fontSize: 44, fontWeight: 'bold', color: '#333' },
    comma: { color: '#C62828' },
    highlight: { color: '#E65100' },
    infoBox: { backgroundColor: '#E0F2F1', padding: 15, borderRadius: 15, width: '100%', minHeight: 90, justifyContent: 'center', borderWidth: 1.5, borderColor: '#B2DFDB' },
    explanationText: { fontSize: 17, color: '#00695C', textAlign: 'center', fontWeight: '600', lineHeight: 24 },
    button: { backgroundColor: '#FFD54F', paddingHorizontal: 50, paddingVertical: 14, borderRadius: 25, marginTop: 15 },
    buttonText: { fontSize: 20, color: '#5D4037', fontWeight: 'bold' },
    buttonReset: { backgroundColor: '#4CAF50', paddingHorizontal: 50, paddingVertical: 14, borderRadius: 25, marginTop: 15 },
    buttonResetText: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' },
});