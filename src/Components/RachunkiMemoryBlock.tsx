import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
} from 'react-native';

import firestore from '@react-native-firebase/firestore';

export default function RachunkiMemoryBlock() {
    const [step, setStep] = useState(0);
    const [mode, setMode] = useState<'subtract' | 'add'>('subtract');
    const [lessonData, setLessonData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const handleNextStep = () => {
        setStep((prev) => (prev < 4 ? prev + 1 : prev));
    };

    const handleModeChange = (newMode: 'subtract' | 'add') => {
        setMode(newMode);
        setStep(0);
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const doc = await firestore().collection('lessons').doc(mode).get();
                if (doc.exists) {
                    setLessonData(doc.data());
                } else {
                    console.warn('Nie znaleziono dokumentu.');
                }
            } catch (error) {
                console.error('Błąd ładowania danych:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [mode]);

    const highlightNumbers = (text: string) => {
        const parts = text.split(/(\d+)/g);
        return parts.map((part, index) =>
            /\d+/.test(part) ? (
                <Text key={index} style={styles.numberHighlight}>
                    {part}
                </Text>
            ) : (
                <Text key={index}>{part}</Text>
            )
        );
    };

    const getSteps = () => {
        if (!lessonData) return [];

        const steps = [
            <View key="intro" style={styles.introBlock}>
                {lessonData.intro.map((line: string, index: number) => (
                    <Text key={`intro-${index}`} style={styles.intro}>
                        {highlightNumbers(line)}
                    </Text>
                ))}
            </View>,
            ...lessonData.steps.map((stepText: string, index: number) => (
                <Text key={`step-${index}`} style={styles.stepText}>
                    {highlightNumbers(stepText)}
                </Text>
            )),
            <View key="final" style={styles.finalBlock}>
                <Text style={styles.finalResult}>
                    {highlightNumbers(lessonData.finalResult)}
                </Text>
                <Text style={styles.tip}>{lessonData.tip}</Text>
            </View>,
        ];

        return steps.slice(0, step + 1);
    };

    if (loading) {
        return (
            <View style={styles.wrapper}>
                <Text style={styles.intro}>Ładowanie danych...</Text>
            </View>
        );
    }

    return (
        <View style={styles.wrapper}>
            <View style={styles.container}>
                <Text style={styles.title}>
                    {lessonData?.title || 'Rachunki pamięciowe'}
                </Text>

                {/* Mode Switch */}
                <View style={styles.switcher}>
                    <TouchableOpacity
                        style={[
                            styles.switchButton,
                            mode === 'subtract' && styles.activeSwitch,
                        ]}
                        onPress={() => handleModeChange('subtract')}
                    >
                        <Text style={styles.switchText}>➖ Odejmowanie</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.switchButton,
                            mode === 'add' && styles.activeSwitch,
                        ]}
                        onPress={() => handleModeChange('add')}
                    >
                        <Text style={styles.switchText}>➕ Dodawanie</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView
                    style={styles.scrollArea}
                    contentContainerStyle={styles.scrollContent}
                >
                    {getSteps()}
                </ScrollView>

                {step < 4 && (
                    <TouchableOpacity style={styles.button} onPress={handleNextStep}>
                        <Text style={styles.buttonText}>Dalej ➜</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FAFAFA',
        paddingTop: 20,
    },
    container: {
        backgroundColor: '#FFF8E1',
        borderRadius: 12,
        padding: 20,
        alignItems: 'center',
        width: '90%',
        elevation: 3,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#FF8F00',
        marginBottom: 10,
        textAlign: 'center',
    },
    switcher: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 15,
    },
    switchButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        marginHorizontal: 5,
        borderRadius: 20,
        backgroundColor: '#E0E0E0',
    },
    activeSwitch: {
        backgroundColor: '#FFD54F',
    },
    switchText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#5D4037',
    },
    scrollArea: {
        maxHeight: 400,
        width: '100%',
    },
    scrollContent: {
        alignItems: 'center',
        paddingBottom: 50,
    },
    introBlock: {
        alignItems: 'center',
        marginBottom: 10,
    },
    intro: {
        fontSize: 18,
        color: '#424242',
        textAlign: 'center',
        marginBottom: 6,
    },
    stepText: {
        fontSize: 20,
        textAlign: 'center',
        marginVertical: 8,
        color: '#5D4037',
    },
    numberHighlight: {
        color: '#1976D2',
        fontWeight: 'bold',
        fontSize: 22,
    },
    finalBlock: {
        alignItems: 'center',
        marginTop: 10,
    },
    finalResult: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#D84315',
        textAlign: 'center',
        marginTop: 10,
    },
    tip: {
        fontSize: 16,
        marginTop: 10,
        color: '#00796B',
        fontStyle: 'italic',
        textAlign: 'center',
    },
    button: {
        backgroundColor: '#FFD54F',
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 25,
        marginTop: 20,
    },
    buttonText: {
        fontSize: 18,
        color: '#5D4037',
        fontWeight: 'bold',
    },
});
