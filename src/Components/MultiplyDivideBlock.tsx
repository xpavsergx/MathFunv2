import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ImageBackground, // 🔥 Dodano import ImageBackground
    ActivityIndicator, // Dodano import ActivityIndicator dla stanu ładowania
} from 'react-native';

import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

export default function MultiplyDivideBlock() {
    const [step, setStep] = useState(0);
    const [mode, setMode] = useState<'division' | 'multiplication'>('division');
    const [lessonData, setLessonData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // MAX_STEPS = 7 oznacza 8 bloków (0 do 7)
    const handleNextStep = () => {
        setStep((prev) => (prev < 7 ? prev + 1 : prev));
    };

    const handleModeChange = (newMode: 'division' | 'multiplication') => {
        setMode(newMode);
        setStep(0);
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const doc = await firestore()
                    .collection('lessons')
                    .doc(mode) // W Firestore powinny być dokumenty 'division' i 'multiplication'
                    .get();
                if (doc.exists) {
                    const data = doc.data();
                    if (data) {
                        // Zapewnienie, że intro i steps to tablice (nawet jeśli są mapami w bazie)
                        setLessonData({
                            ...data,
                            intro: Object.values(data.intro || {}),
                            steps: Object.values(data.steps || {}),
                        });
                    }
                } else {
                    console.warn('Nie znaleziono dokumentu.');
                    setLessonData(null);
                }
            } catch (error) {
                console.error('Błąd ładowania danych:', error);
                setLessonData(null);
            } finally {
                setLoading(false);
            }
        };

        const prepareAndFetch = async () => {
            if (!auth().currentUser) {
                try {
                    await auth().signInAnonymously();
                    console.log('Signed in anonymously');
                } catch (error) {
                    console.error('Failed to sign in anonymously:', error);
                    setLoading(false);
                    return;
                }
            }
            fetchData();
        };

        prepareAndFetch();
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
        if (!lessonData || !lessonData.intro || !lessonData.steps) return [];

        const introLines = lessonData.intro;
        const stepLines = lessonData.steps;

        const steps = [
            <View key="intro" style={styles.introBlock}>
                {introLines.map((line: string, index: number) => (
                    <Text key={`intro-${index}`} style={styles.intro}>
                        {highlightNumbers(line)}
                    </Text>
                ))}
            </View>,
            ...stepLines.map((stepText: string, index: number) => (
                <Text key={`step-${index}`} style={styles.stepText}>
                    {highlightNumbers(stepText)}
                </Text>
            )),
            <View key="final" style={styles.finalBlock}>
                <Text style={styles.finalResult}>
                    {highlightNumbers(lessonData.finalResult || '')}
                </Text>
                <Text style={styles.tip}>{lessonData.tip || ''}</Text>
            </View>,
        ];

        return steps.slice(0, step + 1);
    };

    if (loading) {
        return (
            // Używamy wrapper dla stanu ładowania/błędu
            <View style={[styles.wrapper, styles.loadingWrapper]}>
                <ActivityIndicator size="large" color="#FF8F00" />
                <Text style={styles.intro}>Ładowanie danych...</Text>
            </View>
        );
    }
    if (!lessonData) {
        return (
            <View style={[styles.wrapper, styles.loadingWrapper]}>
                <Text style={[styles.intro, {color: '#D84315'}]}>Błąd: Nie znaleziono danych lekcji w Firestore dla trybu: {mode}.</Text>
            </View>
        );
    }

    return (
        // 🔥 Krok 1: Wstawienie ImageBackground
        <ImageBackground
            source={require('../assets/tloTeorii.png')} // Zmień na właściwą ścieżkę do Twojego pliku graficznego
            style={styles.backgroundImage}
            resizeMode="cover"
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <Text style={styles.title}>
                        {lessonData?.title || 'Mnożenie i dzielenie'}
                    </Text>

                    <View style={styles.switcher}>
                        <TouchableOpacity
                            style={[
                                styles.switchButton,
                                mode === 'division' && styles.activeSwitch,
                            ]}
                            onPress={() => handleModeChange('division')}
                        >
                            <Text style={styles.switchText}>÷ Dzielenie</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.switchButton,
                                mode === 'multiplication' && styles.activeSwitch,
                            ]}
                            onPress={() => handleModeChange('multiplication')}
                        >
                            <Text style={styles.switchText}>× Mnożenie</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={styles.scrollArea}
                        contentContainerStyle={styles.scrollContent}
                    >
                        {getSteps()}
                    </ScrollView>

                    {step < 7 && (
                        <TouchableOpacity style={styles.button} onPress={handleNextStep}>
                            <Text style={styles.buttonText}>Dalej ➜</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    // 🔥 NOWE STYLE DLA TŁA I WARSTWY
    backgroundImage: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    overlay: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: 20,
    },

    wrapper: { // Zachowane dla stanu ładowania/błędu
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FAFAFA',
        paddingTop: 20,
    },
    loadingWrapper: {
        height: 300,
        padding: 20,
    },
    // 🔥 ZMIENIONO TŁO NA PÓŁPRZEZROCZYSTE DLA WIDOCZNOŚCI GRAFIKI
    container: {
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
        borderRadius: 12,
        padding: 20,
        alignItems: 'center',
        width: '90%',
        elevation: 3,
        maxWidth: 600,
        marginBottom: 20, // Dodano margines dolny dla spójności
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
        maxHeight: 450,
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