import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator,
    ImageBackground, useColorScheme, StatusBar // 🔥 Dodano importy
} from 'react-native';

import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

const LESSON_ID = 'textProblems1';
const MAX_STEPS = 5;

export default function TextProblems1Block() {
    const [step, setStep] = useState(0);
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
        textIntro: isDarkMode ? '#F87171' : '#D84315',
        textStep: isDarkMode ? '#CBD5E1' : '#5D4037',
        highlight: isDarkMode ? '#60A5FA' : '#1976D2',
        operator: isDarkMode ? '#FFFFFF' : '#000000',
        buttonBg: isDarkMode ? '#F59E0B' : '#FFD54F',
        buttonText: isDarkMode ? '#1E293B' : '#5D4037',
        borderFinal: isDarkMode ? '#475569' : '#FFD54F',
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
            } catch (error) {
                console.error('Błąd ładowania danych Firestore:', error);
            } finally {
                setLoading(false);
            }
        };

        const prepareAndFetch = async () => {
            if (!auth().currentUser) {
                try { await auth().signInAnonymously(); } catch (e) {}
            }
            fetchData();
        };
        prepareAndFetch();
    }, []);

    const highlightElements = (text: string) => {
        const parts = text.split(/(\d+ sneak|\(|\)|\+|\-|\*|\/|=|:)/g);

        return parts.map((part, index) => {
            // 🔵 liczby
            if (/^\d+$/.test(part)) {
                return (
                    <Text key={index} style={[styles.numberHighlight, { color: theme.highlight }]}>
                        {part}
                    </Text>
                );
            }
            // ⚫ operatory
            if (/^[\(\)\+\-\*\/=:]$/.test(part)) {
                return (
                    <Text key={index} style={[styles.operatorNormal, { color: theme.operator }]}>
                        {part}
                    </Text>
                );
            }
            return <Text key={index}>{part}</Text>;
        });
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
                        {highlightElements(line)}
                    </Text>
                ))}
            </View>
        );

        const calculationSteps = stepLines.map((stepText: string, index: number) => (
            <Text key={`step-${index}`} style={[styles.stepText, { color: theme.textStep }]}>
                {highlightElements(stepText)}
            </Text>
        ));

        const finalBlock = (
            <View key="final" style={[styles.finalBlock, { borderTopColor: theme.borderFinal }]}>
                <Text style={[styles.finalResult, { color: theme.textIntro }]}>
                    {highlightElements(lessonData.finalResult || '')}
                </Text>
                <Text style={[styles.tip, { color: isDarkMode ? '#34D399' : '#00796B' }]}>
                    {highlightElements(lessonData.tip || '')}
                </Text>
            </View>
        );

        return [introBlock, ...calculationSteps, finalBlock].slice(0, step + 1);
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
                <View style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.bgOverlay }]} />

                <View style={styles.overlay}>
                    <View style={[styles.container, { backgroundColor: theme.cardBg }]}>
                        <Text style={[styles.title, { color: theme.title }]}>
                            {lessonData?.title || 'Zadania tekstowe, cz. 1'}
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
        paddingTop: 30,
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
        marginBottom: 10,
        textAlign: 'center',
    },
    scrollArea: { width: '100%' },
    scrollContent: { alignItems: 'center', paddingBottom: 40 },
    introBlock: { alignItems: 'center', marginBottom: 10 },
    intro: { fontSize: 18, textAlign: 'center', marginBottom: 6 },
    introBold: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
    stepText: { fontSize: 20, textAlign: 'center', marginVertical: 8 },
    numberHighlight: { fontWeight: 'bold', fontSize: 22 },
    operatorNormal: { fontSize: 20, fontWeight: 'normal' },
    finalBlock: {
        width: '100%',
        alignItems: 'center',
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 2,
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