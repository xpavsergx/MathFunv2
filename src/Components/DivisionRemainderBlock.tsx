import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator,
    ImageBackground, useColorScheme, StatusBar
} from 'react-native';

import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

const LESSON_ID = 'remainder';
const MAX_STEPS = 4;

export default function DivisionRemainderBlock() {
    const [step, setStep] = useState(0);
    const [lessonData, setLessonData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Динамическая тема
    const isDarkMode = useColorScheme() === 'dark';
    const theme = {
        bgImage: require('../assets/tloTeorii.png'), // Убедись, что путь верный
        bgOverlay: isDarkMode ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.2)',
        cardBg: isDarkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.9)',
        title: isDarkMode ? '#FBBF24' : '#FF8F00',
        textMain: isDarkMode ? '#F1F5F9' : '#424242',
        textIntro: isDarkMode ? '#F87171' : '#D84315', // Для жирного вступления
        textStep: isDarkMode ? '#CBD5E1' : '#555555',
        highlight: isDarkMode ? '#60A5FA' : '#1976D2',
        buttonBg: isDarkMode ? '#F59E0B' : '#FFD54F',
        buttonText: isDarkMode ? '#1E293B' : '#5D4037',
    };

    const handleNextStep = () => {
        setStep((prev) => (prev < MAX_STEPS ? prev + 1 : prev));
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const doc = await firestore().collection('lessons').doc(LESSON_ID).get();
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
                setLoading(false);
            } catch (error) {
                console.error('Błąd:', error);
                setLoading(false);
            }
        };

        const prepare = async () => {
            if (!auth().currentUser) await auth().signInAnonymously();
            fetchData();
        };
        prepare();
    }, []);

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
        if (!lessonData) return [];
        const introLines = lessonData.intro;
        const stepLines = lessonData.steps;

        const introBlock = (
            <View key="intro" style={styles.introBlock}>
                {introLines.map((line: string, index: number) => (
                    <Text
                        key={`intro-${index}`}
                        style={[
                            styles.intro,
                            { color: theme.textMain },
                            index === 0 && [styles.introBold, { color: theme.textIntro }]
                        ]}
                    >
                        {highlightNumbers(line)}
                    </Text>
                ))}
            </View>
        );

        const calculationSteps = stepLines.map((stepText: string, index: number) => (
            <Text key={`step-${index}`} style={[styles.stepText, { color: theme.textStep }]}>
                {highlightNumbers(stepText)}
            </Text>
        ));

        const finalBlock = (
            <View key="final" style={[styles.finalBlock, { borderTopColor: theme.buttonBg }]}>
                <Text style={[styles.finalResult, { color: theme.textIntro }]}>
                    {highlightNumbers(lessonData.finalResult || '')}
                </Text>
                <Text style={[styles.tip, { color: isDarkMode ? '#34D399' : '#00796B' }]}>
                    {highlightNumbers(lessonData.tip || '')}
                </Text>
            </View>
        );

        return [introBlock, ...calculationSteps, finalBlock].slice(0, step + 1);
    };

    if (loading) {
        return (
            <View style={[styles.wrapper, { backgroundColor: isDarkMode ? '#0F172A' : '#FAFAFA' }]}>
                <ActivityIndicator size="large" color={theme.title} />
            </View>
        );
    }

    return (
        <View style={{ flex: 1 }}>
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
            <ImageBackground source={theme.bgImage} style={styles.backgroundImage} resizeMode="cover">
                {/* Темная накладка на всё изображение */}
                <View style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.bgOverlay }]} />

                <View style={styles.overlay}>
                    <View style={[styles.container, { backgroundColor: theme.cardBg }]}>
                        <Text style={[styles.title, { color: theme.title }]}>
                            {lessonData?.title || 'Dzielenie z resztą'}
                        </Text>

                        <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
                            {getSteps()}
                        </ScrollView>

                        {step < MAX_STEPS && (
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
        paddingTop: 50,
    },
    wrapper: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    container: {
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
        width: '90%',
        maxWidth: 600,
        marginBottom: 20,
        // Тень для светлой темы / легкое свечение для темной
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 8,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
    },
    scrollArea: { width: '100%' },
    scrollContent: { alignItems: 'center', paddingBottom: 30 },
    introBlock: { alignItems: 'center', marginBottom: 15 },
    intro: { fontSize: 18, textAlign: 'center', marginBottom: 8 },
    introBold: { fontSize: 22, fontWeight: 'bold' },
    stepText: { fontSize: 20, textAlign: 'center', marginVertical: 10 },
    numberHighlight: { fontWeight: 'bold', fontSize: 22 },
    finalBlock: {
        width: '100%',
        alignItems: 'center',
        marginTop: 15,
        paddingTop: 15,
        borderTopWidth: 2,
    },
    finalResult: { fontSize: 26, fontWeight: 'bold', textAlign: 'center' },
    tip: { fontSize: 16, marginTop: 12, fontStyle: 'italic', textAlign: 'center' },
    button: {
        paddingHorizontal: 30,
        paddingVertical: 12,
        borderRadius: 25,
        marginTop: 20,
    },
    buttonText: { fontSize: 18, fontWeight: 'bold' },
});