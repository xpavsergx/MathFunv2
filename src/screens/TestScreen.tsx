// src/screens/TestScreen.tsx

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainAppStackParamList } from '@/App';
import questionsDatabase from '@/data/questionsDb.json';

// ... (інтерфейси Question, SubTopicData, QuestionsDatabase) ...
interface Question {
    id: string;
    type: 'practice' | 'theory';
    difficulty: 'łatwe' | 'średnie' | 'trudne';
    questionText: string;
    options: string[];
    correctAnswerIndex: number;
    correctAnswerExplanation: string;
    theorySnippet: string;
}

type SubTopicData = {
    theoryTitle?: string;
    theoryContent?: any[];
    questions?: Question[];
};

type QuestionsDatabase = {
    [grade: string]: {
        [topic:string]: {
            [subTopic: string]: SubTopicData;
        };
    };
};


type TestScreenProps = NativeStackScreenProps<MainAppStackParamList, 'Test'>;

const ASSESSMENT_TIME_SECONDS = 15 * 60;

function TestScreen({ route, navigation }: TestScreenProps) {
    const { grade, topic, subTopic, mode = 'learn', testType = 'subTopic' } = route.params;

    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [selectedAnswerIndex, setSelectedAnswerIndex] = useState<number | null>(null);
    const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
    const [showFeedback, setShowFeedback] = useState(false);
    const [timeLeft, setTimeLeft] = useState(ASSESSMENT_TIME_SECONDS);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        console.log("ЗАПУСК ТЕСТУ (TestScreen):", { grade, topic, subTopic, mode, testType });
        const db: QuestionsDatabase = questionsDatabase as QuestionsDatabase;
        let loadedQuestions: Question[] = [];
        const currentTestType = testType || 'subTopic';
        console.log(`Завантаження питань для типу: ${currentTestType}`);
        if (currentTestType === 'mainTopic' && grade && topic) {
            const topicsForGrade = db[String(grade)];
            const subTopicsMap = topicsForGrade?.[topic];
            if (subTopicsMap) {
                Object.keys(subTopicsMap).forEach(subTopicKey => {
                    const questionsForSubtopic = subTopicsMap[subTopicKey]?.questions || [];
                    loadedQuestions = loadedQuestions.concat(questionsForSubtopic);
                });
                console.log(`Зібрано ${loadedQuestions.length} питань для розділу ${topic}`);
                if(loadedQuestions.length > 0) {
                    loadedQuestions.sort(() => Math.random() - 0.5);
                    if (loadedQuestions.length > 20) loadedQuestions = loadedQuestions.slice(0, 20);
                }
            }
        } else if (currentTestType === 'subTopic' && grade && topic && subTopic) {
            loadedQuestions = db[String(grade)]?.[topic]?.[subTopic]?.questions || [];
            console.log(`Załadowano ${loadedQuestions.length} pytań dla podtematu ${subTopic}`);
        }
        setQuestions(loadedQuestions);
        setCurrentQuestionIndex(0);
        setScore(0);
        setSelectedAnswerIndex(null);
        setIsAnswerSubmitted(false);
        setShowFeedback(false);
        setTimeLeft(ASSESSMENT_TIME_SECONDS);
        if (timerRef.current) clearInterval(timerRef.current);
    }, [grade, topic, subTopic, mode, testType]);

    useEffect(() => {
        if (mode === 'assess' && questions.length > 0 && currentQuestionIndex < questions.length) {
            timerRef.current = setInterval(() => {
                setTimeLeft((prevTime) => {
                    if (prevTime <= 1) {
                        if(timerRef.current) clearInterval(timerRef.current);
                        Alert.alert("Czas minął!", `Test zakończony. Twój wynik: ${score} z ${questions.length}`);
                        // Передаємо фінальний score, який є на момент закінчення таймера
                        finishTest(score);
                        return 0;
                    }
                    return prevTime - 1;
                });
            }, 1000);
            return () => { if (timerRef.current) clearInterval(timerRef.current); };
        } else if (timerRef.current) {
            clearInterval(timerRef.current);
        }
    }, [mode, questions.length, currentQuestionIndex]); // Видалив залежності, що можуть викликати перезапуск таймера

    // === НОВА ФУНКЦІЯ для завершення тесту ===
    const finishTest = (finalScore: number) => {
        if (timerRef.current) clearInterval(timerRef.current);
        console.log(`КОНЕЦ ТЕСТА! Переход на ResultsScreen з результатом: ${finalScore}/${questions.length}`);
        navigation.replace('Results', {
            score: finalScore,
            total: questions.length,
            originalTestParams: route.params,
        });
    };

    const handleAnswerSelect = (index: number) => {
        if (!isAnswerSubmitted || (mode === 'learn' && !showFeedback)) {
            setSelectedAnswerIndex(index);
        }
    };

    const handleNextQuestion = () => {
        const nextIndex = currentQuestionIndex + 1;
        if (nextIndex < questions.length) {
            setCurrentQuestionIndex(nextIndex);
            setSelectedAnswerIndex(null);
            setIsAnswerSubmitted(false);
            setShowFeedback(false);
        } else {
            // Викликаємо нову функцію finishTest з поточним рахунком
            finishTest(score);
        }
    };

    const handleSubmitAnswer = () => {
        if (selectedAnswerIndex === null && questions[currentQuestionIndex]?.type === 'practice') {
            Alert.alert("Uwaga!", "Proszę wybrać odpowiedź.");
            return;
        }

        setIsAnswerSubmitted(true);
        const currentQ = questions[currentQuestionIndex];
        let currentScore = score; // Використовуємо локальну змінну

        if (currentQ.type === 'practice') {
            const isCorrect = selectedAnswerIndex === currentQ.correctAnswerIndex;
            if (isCorrect) {
                currentScore += 1; // Оновлюємо локальну змінну
                setScore(currentScore); // Оновлюємо стан для UI
            }
        }

        if (mode === 'learn' || currentQ.type === 'theory') {
            setShowFeedback(true);
        } else {
            // === КЛЮЧОВА ЗМІНА №2 ===
            // Перевіряємо, чи це останнє питання, і передаємо оновлений рахунок
            const nextIndex = currentQuestionIndex + 1;
            if (nextIndex >= questions.length) {
                finishTest(currentScore);
            } else {
                handleNextQuestion();
            }
        }
    };

    // ... (решта коду рендерингу)
    if (!questions || questions.length === 0) {
        return <View style={styles.container}><Text style={styles.loadingText}>Pytania do tego tematu nie zostały jeszcze dodane lub wystąpił błąd ładowania.</Text></View>;
    }
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) {
        return <View style={styles.container}><Text style={styles.errorText}>Błąd: Nie można załadować pytania.</Text></View>;
    }
    const capitalizeFirstLetter = (string: string | undefined) => {
        if (!string) return '';
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
    const formatTime = (seconds: number): string => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    return (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.container}>
            {mode === 'assess' && (
                <Text style={styles.timerText}>Pozostały czas: {formatTime(timeLeft)}</Text>
            )}
            <View style={styles.headerContainer}>
                <Text style={styles.questionCounter}>Pytanie {currentQuestionIndex + 1} z {questions.length}</Text>
                {currentQuestion.difficulty && (
                    <Text style={styles.difficultyText}>
                        Poziom: {capitalizeFirstLetter(currentQuestion.difficulty)}
                    </Text>
                )}
            </View>
            <Text style={styles.questionText}>{currentQuestion.questionText}</Text>
            {currentQuestion.type === 'practice' && (
                <View style={styles.optionsContainer}>
                    {currentQuestion.options.map((option: string, index: number) => {
                        const isSelected = selectedAnswerIndex === index;
                        const isCorrect = currentQuestion.correctAnswerIndex === index;
                        let buttonStyle = styles.optionButton;
                        let textStyle = styles.optionText;
                        if (isAnswerSubmitted && showFeedback && mode === 'learn') {
                            if (isCorrect) {
                                buttonStyle = [styles.optionButton, styles.correctOption];
                                textStyle = [styles.optionText, styles.correctOptionText];
                            } else if (isSelected) {
                                buttonStyle = [styles.optionButton, styles.incorrectOption];
                            }
                        } else if (isSelected) {
                            buttonStyle = [styles.optionButton, styles.selectedOption];
                        }
                        return (
                            <TouchableOpacity
                                key={index}
                                style={buttonStyle}
                                onPress={() => handleAnswerSelect(index)}
                                disabled={isAnswerSubmitted && mode === 'assess'}
                            >
                                <Text style={textStyle}>{option}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            )}
            {(!isAnswerSubmitted || (isAnswerSubmitted && !showFeedback && mode === 'assess' && currentQuestion.type === 'practice' )) && (
                <TouchableOpacity style={styles.submitButton} onPress={handleSubmitAnswer}>
                    <Text style={styles.submitButtonText}>
                        {currentQuestion.type === 'theory' ? "Dalej" : "Odpowiedz"}
                    </Text>
                </TouchableOpacity>
            )}
            {isAnswerSubmitted && showFeedback && (
                <View style={styles.feedbackContainer}>
                    {currentQuestion.type === 'practice' && (
                        <Text style={[
                            styles.feedbackTitle,
                            selectedAnswerIndex === currentQuestion.correctAnswerIndex ? styles.correctFeedbackTitle : styles.incorrectFeedbackTitle
                        ]}>
                            {selectedAnswerIndex === currentQuestion.correctAnswerIndex ? "Poprawnie!" : "Niepoprawnie!"}
                        </Text>
                    )}
                    {currentQuestion.type === 'practice' && (
                        <Text style={styles.feedbackTextBold}>
                            Prawidłowa odpowiedź: <Text style={styles.feedbackTextNormal}>{currentQuestion.options[currentQuestion.correctAnswerIndex]}</Text>
                        </Text>
                    )}
                    <Text style={styles.feedbackHeader}>Wyjaśnienie:</Text>
                    <Text style={styles.feedbackText}>{currentQuestion.correctAnswerExplanation}</Text>

                    {currentQuestion.theorySnippet && (
                        <>
                            <Text style={styles.feedbackHeader}>Wskazówka teoretyczna:</Text>
                            <Text style={styles.feedbackText}>{currentQuestion.theorySnippet}</Text>
                        </>
                    )}
                    <TouchableOpacity style={styles.nextButton} onPress={handleNextQuestion}>
                        <Text style={styles.submitButtonText}>
                            {currentQuestionIndex + 1 < questions.length ? "Następne pytanie" : "Zakończ test"}
                        </Text>
                    </TouchableOpacity>
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    scrollView: { flex: 1, backgroundColor: '#f0f8ff', },
    container: { padding: 20, paddingBottom: 40, },
    loadingText: { flex: 1, textAlign: 'center', textAlignVertical: 'center', fontSize: 16, paddingTop: 50, color: '#555', },
    errorText: { flex: 1, textAlign: 'center', textAlignVertical: 'center', fontSize: 16, color: 'red', paddingTop: 50, },
    headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, },
    questionCounter: { fontSize: 16, color: '#555', },
    difficultyText: { fontSize: 16, color: '#007bff', fontWeight: 'bold', },
    questionText: { fontSize: 20, fontWeight: 'bold', marginBottom: 25, textAlign: 'center', color: '#333', lineHeight: 28, },
    optionsContainer: { marginBottom: 20, },
    optionButton: { backgroundColor: '#ffffff', paddingVertical: 15, paddingHorizontal: 12, marginVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: '#b0bec5', elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.18, shadowRadius: 1.00, },
    selectedOption: { borderColor: '#00BCD4', borderWidth: 2.5, backgroundColor: '#e0f7fa', },
    correctOption: { backgroundColor: '#c8e6c9', borderColor: '#4caf50', borderWidth: 2.5, },
    incorrectOption: { backgroundColor: '#ffcdd2', borderColor: '#f44336', borderWidth: 2.5, },
    optionText: { fontSize: 17, color: '#455a64', textAlign: 'center', },
    correctOptionText: { fontWeight: 'bold', color: '#2e7d32', },
    submitButton: { backgroundColor: '#00BCD4', paddingVertical: 15, paddingHorizontal: 20, borderRadius: 25, alignItems: 'center', marginTop: 10, elevation: 3, },
    nextButton: { backgroundColor: '#FF9800', paddingVertical: 15, paddingHorizontal: 20, borderRadius: 25, alignItems: 'center', marginTop: 20, elevation: 3, },
    submitButtonText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', },
    feedbackContainer: { marginTop: 20, padding: 15, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#e0e0e0', marginBottom: 20, },
    feedbackTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 12, textAlign: 'center', },
    correctFeedbackTitle: { color: '#388e3c', },
    incorrectFeedbackTitle: { color: '#d32f2f', },
    feedbackHeader: { fontSize: 17, fontWeight: 'bold', marginTop: 10, marginBottom: 5, color: '#424242', },
    feedbackText: { fontSize: 16, color: '#555', marginBottom: 8, lineHeight: 22, },
    feedbackTextBold: { fontSize: 16, color: '#555', marginBottom: 8, fontWeight: 'bold', },
    feedbackTextNormal: { fontWeight: 'normal', },
    timerText: { fontSize: 18, fontWeight: 'bold', color: '#d32f2f', textAlign: 'center', marginBottom: 15, },
});

export default TestScreen;
