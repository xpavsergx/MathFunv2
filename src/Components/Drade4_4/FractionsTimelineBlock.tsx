import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, ActivityIndicator } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import Svg, { Line, Circle, G, Text as SvgText } from 'react-native-svg';

export default function FractionsTimelineBlock() {
    const [step, setStep] = useState(0);
    const [lessonData, setLessonData] = useState<any>(null);
    const [stepsArray, setStepsArray] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Upewnij się, że w Firebase dokument ma ID: fractionsOnTimeline
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
        const unitWidth = (endX - startX) / 2; // Odległość 0-1 i 1-2

        return (
            <View style={styles.illustrationContainer}>
                <Svg height="120" width={width} viewBox={`0 0 ${width} 120`}>
                    {/* Główna linia osi */}
                    <Line x1={startX - 10} y1={y} x2={endX + 15} y2={y} stroke="#333" strokeWidth="3" />

                    {/* Strzałka kierunkowa */}
                    <Line x1={endX + 15} y1={y} x2={endX + 5} y2={y - 5} stroke="#333" strokeWidth="3" />
                    <Line x1={endX + 15} y1={y} x2={endX + 5} y2={y + 5} stroke="#333" strokeWidth="3" />

                    {/* Punkty główne: 0, 1, 2 */}
                    {[0, 1, 2].map((num) => {
                        const posX = startX + num * unitWidth;
                        return (
                            <G key={num}>
                                <Line x1={posX} y1={y - 12} x2={posX} y2={y + 12} stroke="#1565C0" strokeWidth="3" />
                                <SvgText x={posX - 5} y={y + 35} fontSize="18" fontWeight="bold" fill="#1565C0">{num}</SvgText>
                            </G>
                        );
                    })}

                    {/* Małe podziałki (ćwiartki) - od Kroku 1 */}
                    {step >= 1 && [0, 1].map(whole =>
                        [1, 2, 3].map(part => {
                            const posX = startX + whole * unitWidth + (part * unitWidth) / 4;
                            return (
                                <Line key={`${whole}-${part}`} x1={posX} y1={y - 6} x2={posX} y2={y + 6} stroke="#FF9800" strokeWidth="2" />
                            );
                        })
                    )}

                    {/* Punkt dla 1/4 - tylko w Kroku 2 (pokazowy) */}
                    {step === 2 && (
                        <G>
                            <Circle cx={startX + (1 * unitWidth) / 4} cy={y} r="6" fill="#E65100" />
                            <SvgText x={startX + (1 * unitWidth) / 4 - 10} y={y - 20} fontSize="14" fontWeight="bold" fill="#E65100">1/4</SvgText>
                        </G>
                    )}

                    {/* Punkt dla 1 3/4 - od Kroku 3 */}
                    {step >= 3 && (
                        <G>
                            <Circle cx={startX + 1 * unitWidth + (3 * unitWidth) / 4} cy={y} r="7" fill="#2E7D32" />
                            <SvgText x={startX + 1 * unitWidth + (3 * unitWidth) / 4 - 15} y={y - 20} fontSize="16" fontWeight="bold" fill="#2E7D32">1 ¾</SvgText>
                        </G>
                    )}
                </Svg>
            </View>
        );
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#FFB300" /></View>;

    return (
        <ImageBackground source={require('../../assets/tloTeorii.png')} style={styles.backgroundImage} resizeMode="cover">
            <View style={styles.container}>
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>{lessonData?.title}</Text>

                    {renderTimeline()}

                    <View style={styles.fractionStepWrapper}>
                        {/* Zapis cyfrowy 1 3/4 - od kroku 3 */}
                        <View style={[styles.mixedContainer, { opacity: step >= 3 ? 1 : 0 }]}>
                            <Text style={styles.wholeNumber}>1</Text>
                            <View style={styles.fractionBox}>
                                <Text style={styles.num}>3</Text>
                                <View style={styles.line} />
                                <Text style={styles.den}>4</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.infoBox}>
                        <Text style={styles.explanationText}>{stepsArray[step]?.text}</Text>
                    </View>

                    {step < stepsArray.length - 1 ? (
                        <TouchableOpacity style={styles.button} onPress={() => setStep(step + 1)}>
                            <Text style={styles.buttonText}>Dalej ➜</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={styles.buttonReset} onPress={() => setStep(0)}>
                            <Text style={styles.buttonResetText}>Od nowa ↺</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    backgroundImage: { flex: 1, width: '100%', height: '100%' },
    container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    card: {
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        width: '94%',
        borderRadius: 25,
        padding: 20,
        alignItems: 'center',
        elevation: 10,
    },
    cardTitle: { fontSize: 22, fontWeight: 'bold', color: '#1565C0', marginBottom: 10, textAlign: 'center' },
    illustrationContainer: { marginVertical: 15, alignItems: 'center' },
    fractionStepWrapper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 110, width: '100%' },
    mixedContainer: { flexDirection: 'row', alignItems: 'center' },
    wholeNumber: { fontSize: 60, fontWeight: 'bold', color: '#2E7D32', marginRight: 8 },
    fractionBox: { alignItems: 'center', width: 45 },
    line: { width: 40, height: 4, backgroundColor: '#333', marginVertical: 4 },
    num: { fontSize: 32, fontWeight: 'bold', color: '#E65100' },
    den: { fontSize: 32, fontWeight: 'bold', color: '#1565C0' },
    labelsBox: { marginLeft: 15, width: 140, justifyContent: 'center' },
    labelPointer: { fontSize: 13, fontWeight: '900', color: '#5D4037' },
    infoBox: { backgroundColor: '#E0F2F1', padding: 15, borderRadius: 15, width: '100%', minHeight: 80, justifyContent: 'center', borderWidth: 1.5, borderColor: '#B2DFDB' },
    explanationText: { fontSize: 18, color: '#00695C', textAlign: 'center', fontWeight: '600' },
    button: { backgroundColor: '#FFD54F', paddingHorizontal: 45, paddingVertical: 12, borderRadius: 25, marginTop: 20 },
    buttonText: { fontSize: 18, color: '#5D4037', fontWeight: 'bold' },
    buttonReset: { backgroundColor: '#4CAF50', paddingHorizontal: 45, paddingVertical: 12, borderRadius: 25, marginTop: 20 },
    buttonResetText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
});