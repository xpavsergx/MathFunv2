import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ImageBackground,
    ActivityIndicator,
    useColorScheme, // 🔥 Dodano
    StatusBar, // 🔥 Dodano
} from 'react-native';

import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

export default function MultiplyDivideBlock() {
    const [step, setStep] = useState(0);
    const [mode, setMode] = useState<'division' | 'multiplication'>('division');
    const [lessonData, setLessonData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // 🔥 LOGIKA TRYBU CIEMNEGO
    const isDarkMode = useColorScheme() === 'dark';
    const theme = {
        bgImage: require('../assets/tloTeorii.png'),
        bgOverlay: isDarkMode ? 'rgba(0, 0, 0, 0.75)' : 'rgba(255, 255, 255, 0.2)',
        cardBg: isDarkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.85)',
        title: isDarkMode ? '#FBBF24' : '#FF8F00',
        textMain: isDarkMode ? '#F1F5F9' : '#424242',
        textStep: isDarkMode ? '#CBD5E1' : '#5D4037',
        highlight: isDarkMode ? '#60A5FA' : '#1976D2',
        buttonBg: isDarkMode ? '#F59E0B' : '#FFD54F',
        buttonText: isDarkMode ? '#1E293B' : '#5D4037',
        switchInactive: isDarkMode ? '#334155' : '#E0E0E0',
    };

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
                const doc = await firestore().collection('lessons').doc(mode).get();
                if (doc.exists) {
                    const data = doc.data();
                    if (data) {
                        setLessonData({
                            ...data,
                            intro: Object.values(data.intro || {}),
                            steps: Object.values(data.steps || {}),
                        });
                    }
                }
            } catch (error) {
                console.error('Błąd ładowania danych:', error);
            } finally {
                setLoading(false);
            }
        };

        const prepareAndFetch = async () => {
            if (!auth().currentUser) {
                try {
                    await auth().signInAnonymously();
                } catch (error) {
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
                <Text key={index} style={[styles.numberHighlight, { color: theme.highlight }]}>
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
                    <Text key={`intro-${index}`} style={[styles.intro, { color: theme.textMain }]}>
                        {highlightNumbers(line)}
                    </Text>
                ))}
            </View>,
            ...stepLines.map((stepText: string, index: number) => (
                <Text key={`step-${index}`} style={[styles.stepText, { color: theme.textStep }]}>
                    {highlightNumbers(stepText)}
                </Text>
            )),
            <View key="final" style={[styles.finalBlock, { borderTopColor: isDarkMode ? '#475569' : '#FFD54F' }]}>
                <Text style={[styles.finalResult, { color: isDarkMode ? '#F87171' : '#D84315' }]}>
                    {highlightNumbers(lessonData.finalResult || '')}
                </Text>
                <Text style={[styles.tip, { color: isDarkMode ? '#34D399' : '#00796B' }]}>{lessonData.tip || ''}</Text>
            </View>,
        ];

        return steps.slice(0, step + 1);
    };

    if (loading) {
        return (
            <View style={[styles.wrapper, { backgroundColor: isDarkMode ? '#0F172A' : '#FAFAFA' }]}>
                <ActivityIndicator size="large" color={theme.title} />
                <Text style={[styles.intro, { color: theme.textMain, marginTop: 10 }]}>Ładowanie danych...</Text>
            </View>
        );
    }

    return (
        <View style={{ flex: 1 }}>
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
            <ImageBackground source={theme.bgImage} style={styles.backgroundImage} resizeMode="cover">
                {/* Przyciemnienie tła */}
                <View style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.bgOverlay }]} />

                <View style={styles.overlay}>
                    <View style={[styles.container, { backgroundColor: theme.cardBg }]}>
                        <Text style={[styles.title, { color: theme.title }]}>
                            {lessonData?.title || 'Mnożenie i dzielenie'}
                        </Text>



                        <View style={styles.switcher}>
                            <TouchableOpacity
                                style={[
                                    styles.switchButton,
                                    { backgroundColor: mode === 'division' ? theme.buttonBg : theme.switchInactive }
                                ]}
                                onPress={() => handleModeChange('division')}
                            >
                                <Text style={[styles.switchText, { color: theme.buttonText }]}>÷ Dzielenie</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.switchButton,
                                    { backgroundColor: mode === 'multiplication' ? theme.buttonBg : theme.switchInactive }
                                ]}
                                onPress={() => handleModeChange('multiplication')}
                            >
                                <Text style={[styles.switchText, { color: theme.buttonText }]}>× Mnożenie</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
                            {getSteps()}
                        </ScrollView>

                        {step < 5 && (
                            <TouchableOpacity
                                style={[styles.button, { backgroundColor: theme.buttonBg }]}
                                onPress={handleNextStep}
                            >
                                <Text style={[styles.buttonText, { color: theme.buttonText }]}>Dalej ➜</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </ImageBackground>
        </View>
    );
}

const styles = StyleSheet.create({
    backgroundImage: { flex: 1 },
    overlay: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: 40,
    },
    wrapper: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    container: {
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
        width: '92%',
        maxWidth: 600,
        marginBottom: 20,
        elevation: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
    },
    switcher: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 20,
    },
    switchButton: {
        paddingVertical: 10,
        paddingHorizontal: 18,
        marginHorizontal: 5,
        borderRadius: 20,
    },
    switchText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    scrollArea: { width: '100%', maxHeight: 400 },
    scrollContent: { alignItems: 'center', paddingBottom: 40 },
    introBlock: { alignItems: 'center', marginBottom: 10 },
    intro: { fontSize: 18, textAlign: 'center', marginBottom: 6 },
    stepText: { fontSize: 20, textAlign: 'center', marginVertical: 8 },
    numberHighlight: { fontWeight: 'bold', fontSize: 22 },
    finalBlock: {
        width: '100%',
        alignItems: 'center',
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
    },
    finalResult: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginTop: 10 },
    tip: { fontSize: 16, marginTop: 10, fontStyle: 'italic', textAlign: 'center' },
    button: {
        paddingHorizontal: 30,
        paddingVertical: 12,
        borderRadius: 25,
        marginTop: 20,
    },
    buttonText: { fontSize: 18, fontWeight: 'bold' },
});