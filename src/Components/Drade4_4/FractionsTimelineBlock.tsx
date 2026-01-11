import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ImageBackground,
    ActivityIndicator, useColorScheme, StatusBar // 🔥 Dodano importy
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import Svg, { Line, Circle, G, Text as SvgText } from 'react-native-svg';

export default function FractionsTimelineBlock() {
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
        mathLine: isDarkMode ? '#F1F5F9' : '#333',
        wholeNumber: isDarkMode ? '#4ADE80' : '#2E7D32',
        numerator: isDarkMode ? '#FB923C' : '#E65100',
        denominator: isDarkMode ? '#60A5FA' : '#1565C0',
        infoBox: isDarkMode ? '#1E293B' : '#E0F2F1',
        infoBorder: isDarkMode ? '#334155' : '#B2DFDB',
        infoText: isDarkMode ? '#4ADE80' : '#00695C',
        buttonBg: isDarkMode ? '#F59E0B' : '#FFD54F',
        buttonText: isDarkMode ? '#1E293B' : '#5D4037',
    };

    useEffect(() => {
        const unsubscribe = firestore()
            .collection('lessons')
            .doc('fractionsOnTimeline')
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
            }, error => {
                console.error("Błąd Firestore:", error);
                setLoading(false);
            });
        return () => unsubscribe();
    }, []);

    const renderTimeline = () => {
        const width = 300;
        const startX = 30;
        const endX = 270;
        const y = 60;
        const unitWidth = (endX - startX) / 2;

        return (
            <View style={styles.illustrationContainer}>
                <Svg height="120" width={width} viewBox={`0 0 ${width} 120`}>
                    <Line x1={startX - 10} y1={y} x2={endX + 15} y2={y} stroke={theme.mathLine} strokeWidth="3" />
                    <Line x1={endX + 15} y1={y} x2={endX + 5} y2={y - 5} stroke={theme.mathLine} strokeWidth="3" />
                    <Line x1={endX + 15} y1={y} x2={endX + 5} y2={y + 5} stroke={theme.mathLine} strokeWidth="3" />

                    {[0, 1, 2].map((num) => {
                        const posX = startX + num * unitWidth;
                        return (
                            <G key={num}>
                                <Line x1={posX} y1={y - 12} x2={posX} y2={y + 12} stroke={theme.denominator} strokeWidth="3" />
                                <SvgText x={posX - 5} y={y + 35} fontSize="18" fontWeight="bold" fill={theme.denominator}>{num}</SvgText>
                            </G>
                        );
                    })}

                    {step >= 1 && [0, 1].map(whole =>
                        [1, 2, 3].map(part => {
                            const posX = startX + whole * unitWidth + (part * unitWidth) / 4;
                            return (
                                <Line key={`${whole}-${part}`} x1={posX} y1={y - 6} x2={posX} y2={y + 6} stroke="#FF9800" strokeWidth="2" />
                            );
                        })
                    )}

                    {step === 2 && (
                        <G>
                            <Circle cx={startX + (1 * unitWidth) / 4} cy={y} r="6" fill={theme.numerator} />
                            <SvgText x={startX + (1 * unitWidth) / 4 - 10} y={y - 20} fontSize="14" fontWeight="bold" fill={theme.numerator}>1/4</SvgText>
                        </G>
                    )}

                    {step >= 3 && (
                        <G>
                            <Circle cx={startX + 1 * unitWidth + (3 * unitWidth) / 4} cy={y} r="7" fill={theme.wholeNumber} />
                            <SvgText x={startX + 1 * unitWidth + (3 * unitWidth) / 4 - 15} y={y - 20} fontSize="16" fontWeight="bold" fill={theme.wholeNumber}>1 ¾</SvgText>
                        </G>
                    )}
                </Svg>
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

                        {renderTimeline()}

                        <View style={styles.fractionStepWrapper}>
                            <View style={[styles.mixedContainer, { opacity: step >= 3 ? 1 : 0 }]}>
                                <Text style={[styles.wholeNumber, { color: theme.wholeNumber }]}>1</Text>
                                <View style={styles.fractionBox}>
                                    <Text style={[styles.num, { color: theme.numerator }]}>3</Text>
                                    <View style={[styles.line, { backgroundColor: theme.mathLine }]} />
                                    <Text style={[styles.den, { color: theme.denominator }]}>4</Text>
                                </View>
                            </View>
                        </View>

                        <View style={[styles.infoBox, { backgroundColor: theme.infoBox, borderColor: theme.infoBorder }]}>
                            <Text style={[styles.explanationText, { color: theme.infoText }]}>{stepsArray[step]?.text}</Text>
                        </View>

                        {step < stepsArray.length - 1 ? (
                            <TouchableOpacity style={[styles.button, { backgroundColor: theme.buttonBg }]} onPress={() => setStep(step + 1)}>
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
    cardTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
    illustrationContainer: { marginVertical: 15, alignItems: 'center' },
    fractionStepWrapper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 110, width: '100%' },
    mixedContainer: { flexDirection: 'row', alignItems: 'center' },
    wholeNumber: { fontSize: 60, fontWeight: 'bold', marginRight: 8 },
    fractionBox: { alignItems: 'center', width: 45 },
    line: { width: 40, height: 4, marginVertical: 4 },
    num: { fontSize: 32, fontWeight: 'bold' },
    den: { fontSize: 32, fontWeight: 'bold' },
    infoBox: { padding: 15, borderRadius: 15, width: '100%', minHeight: 80, justifyContent: 'center', borderWidth: 1.5 },
    explanationText: { fontSize: 18, textAlign: 'center', fontWeight: '600' },
    button: { paddingHorizontal: 45, paddingVertical: 12, borderRadius: 25, marginTop: 20 },
    buttonText: { fontSize: 18, fontWeight: 'bold' },
    buttonReset: { backgroundColor: '#4CAF50', paddingHorizontal: 45, paddingVertical: 12, borderRadius: 25, marginTop: 20 },
    buttonResetText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
});