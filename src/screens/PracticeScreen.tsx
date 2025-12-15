// src/screens/PracticeScreen.tsx

import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    ActivityIndicator, SafeAreaView, Image, Alert, Animated
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainAppStackParamList } from '../../App';
import questionsDatabase from '../data/questionsDb.json';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS, FONT_SIZES, PADDING, MARGIN } from '../styles/theme';
import { awardXpAndCoins } from '../services/xpService';

type PracticeScreenProps = NativeStackScreenProps<MainAppStackParamList, 'Practice'>;
const QUESTIONS_PER_SESSION = 10;

const PracticeScreen = ({ route }: PracticeScreenProps) => {
    // Явно типізуємо навігацію, щоб мати доступ до popToTop та goBack
    const navigation = useNavigation<NativeStackScreenProps<MainAppStackParamList>['navigation']>();
    const { grade, topic, subTopic } = route.params;

    const [questions, setQuestions] = useState<any[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);

    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [isCorrect, setIsCorrect] = useState(false);

    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => { loadQuestions(); }, []);

    const loadQuestions = () => {
        const db: any = questionsDatabase;
        const rawQuestions = db[String(grade)]?.[topic]?.[subTopic]?.questions || [];

        if (!rawQuestions || rawQuestions.length === 0) {
            Alert.alert("Ups!", "Brak zadań w tej sekcji.");
            navigation.goBack();
            return;
        }

        const shuffled = [...rawQuestions].sort(() => Math.random() - 0.5).slice(0, QUESTIONS_PER_SESSION);
        setQuestions(shuffled);
        setLoading(false);
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    };

    const handleAnswer = (index: number) => {
        if (isAnswered) return;
        const currentQ = questions[currentIndex];
        const correct = index === currentQ.correctAnswerIndex;
        setSelectedOption(index);
        setIsAnswered(true);
        setIsCorrect(correct);
        if (correct) awardXpAndCoins(5, 1);
    };

    const handleNext = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setSelectedOption(null);
            setIsAnswered(false);
            setIsCorrect(false);
            fadeAnim.setValue(0);
            Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
        } else {
            // 🎉 КІНЕЦЬ ПРАКТИКИ: Показуємо меню вибору
            Alert.alert(
                "Trening zakończony! 🎉",
                "Świetna robota! Co robimy dalej?",
                [
                    {
                        text: "Menu",
                        onPress: () => navigation.popToTop() // На головну
                    },
                    {
                        text: "Do listy zadań",
                        onPress: () => navigation.goBack() // Назад до списку тем
                    },
                    {
                        text: "Jeszcze raz",
                        onPress: () => {
                            setLoading(true);
                            setCurrentIndex(0);
                            setSelectedOption(null);
                            setIsAnswered(false);
                            loadQuestions();
                        }
                    }
                ]
            );
        }
    };

    if (loading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
    const question = questions[currentIndex];

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <View style={styles.progressBarContainer}>
                    <View style={[styles.progressBarFill, { width: `${((currentIndex + 1) / questions.length) * 100}%` }]} />
                </View>
                <Text style={styles.progressText}>{currentIndex + 1}/{questions.length}</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.mascotContainer}>
                    <Image source={require('../assets/fox_mascot.png')} style={styles.mascot} />
                    <View style={styles.speechBubble}>
                        <Text style={styles.questionText}>{question.questionText}</Text>
                    </View>
                </View>

                <Animated.View style={[styles.optionsContainer, { opacity: fadeAnim }]}>
                    {question.options.map((opt: string, index: number) => {
                        let btnStyle = styles.optionButton;
                        if (isAnswered) {
                            if (index === question.correctAnswerIndex) btnStyle = styles.optionCorrect;
                            else if (index === selectedOption) btnStyle = styles.optionWrong;
                            else btnStyle = styles.optionDisabled;
                        } else if (index === selectedOption) {
                            btnStyle = styles.optionSelected;
                        }

                        return (
                            <TouchableOpacity key={index} style={btnStyle} onPress={() => handleAnswer(index)} disabled={isAnswered}>
                                <Text style={[styles.optionText, isAnswered && (index === question.correctAnswerIndex || index === selectedOption) && { color: 'white' }]}>{opt}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </Animated.View>

                {isAnswered && (
                    <View style={styles.feedbackSection}>
                        <View style={[styles.feedbackBox, isCorrect ? styles.feedbackBoxCorrect : styles.feedbackBoxWrong]}>
                            <Text style={[styles.feedbackTitle, isCorrect ? {color: COLORS.correct} : {color: COLORS.error}]}>
                                {isCorrect ? "Super! Poprawnie!" : "Ups, nie tym razem."}
                            </Text>
                            <Text style={styles.feedbackText}>{question.correctAnswerExplanation}</Text>
                        </View>
                        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                            <Text style={styles.nextButtonText}>{currentIndex < questions.length - 1 ? "Następne pytanie" : "Zakończ"}</Text>
                            <Ionicons name="arrow-forward" size={20} color="white" />
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F0F4F8' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', padding: PADDING.medium, backgroundColor: COLORS.white, elevation: 2, marginBottom: MARGIN.medium },
    backButton: { marginRight: MARGIN.medium },
    progressBarContainer: { flex: 1, height: 8, backgroundColor: '#E0E0E0', borderRadius: 4, overflow: 'hidden' },
    progressBarFill: { height: '100%', backgroundColor: COLORS.primary },
    progressText: { marginLeft: MARGIN.medium, fontWeight: 'bold', color: COLORS.grey },
    content: { padding: PADDING.medium, paddingBottom: 50 },
    mascotContainer: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: MARGIN.large },
    mascot: { width: 80, height: 80, resizeMode: 'contain', marginRight: MARGIN.small },
    speechBubble: { flex: 1, backgroundColor: COLORS.white, padding: PADDING.medium, borderRadius: 16, borderBottomLeftRadius: 0, elevation: 3, borderWidth: 1, borderColor: '#E0E0E0' },
    questionText: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, lineHeight: 24 },
    optionsContainer: { gap: MARGIN.medium },
    optionButton: { backgroundColor: COLORS.white, padding: PADDING.medium, borderRadius: 12, borderWidth: 2, borderColor: '#E0E0E0', elevation: 2 },
    optionSelected: { borderColor: COLORS.primary, backgroundColor: '#E3F2FD' },
    optionCorrect: { backgroundColor: COLORS.correct, borderColor: COLORS.correct, borderWidth: 2 },
    optionWrong: { backgroundColor: COLORS.error, borderColor: COLORS.error, borderWidth: 2 },
    optionDisabled: { opacity: 0.5, backgroundColor: '#F5F5F5' },
    optionText: { fontSize: 18, color: COLORS.text, fontWeight: '500' },
    feedbackSection: { marginTop: MARGIN.large },
    feedbackBox: { padding: PADDING.medium, borderRadius: 12, marginBottom: MARGIN.medium, borderWidth: 1 },
    feedbackBoxCorrect: { backgroundColor: '#E8F5E9', borderColor: '#C8E6C9' },
    feedbackBoxWrong: { backgroundColor: '#FFEBEE', borderColor: '#FFCDD2' },
    feedbackTitle: { fontWeight: 'bold', fontSize: 16, marginBottom: 5 },
    feedbackText: { fontSize: 15, color: COLORS.text },
    nextButton: { backgroundColor: COLORS.primary, padding: PADDING.medium, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', elevation: 3 },
    nextButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold', marginRight: 10 }
});

export default PracticeScreen;
