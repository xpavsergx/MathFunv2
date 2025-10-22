import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainAppStackParamList } from '../../App';
import questionsDatabase from '../data/questionsDb.json';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

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
    questions?: Question[];
};

type QuestionsDatabase = {
    [grade: string]: {
        [topic: string]: {
            [subTopic: string]: SubTopicData;
        };
    };
};

type TestScreenProps = NativeStackScreenProps<MainAppStackParamList, 'Test'>;

const ASSESSMENT_TIME_SECONDS = 15 * 60; // 15 минут

function TestScreen({ route, navigation }: TestScreenProps) {
    const { grade, topic, subTopic, mode = 'learn', testType = 'subTopic', duelId } = route.params;

    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [selectedAnswerIndex, setSelectedAnswerIndex] = useState<number | null>(null);
    const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
    const [showFeedback, setShowFeedback] = useState(false);
    const [timeLeft, setTimeLeft] = useState(ASSESSMENT_TIME_SECONDS);

    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const scoreRef = useRef(score);

    useEffect(() => {
        scoreRef.current = score;
    }, [score]);

    useEffect(() => {
        const loadQuestions = async () => {
            setLoading(true);
            const db: QuestionsDatabase = questionsDatabase as QuestionsDatabase;
            let loadedQuestions: Question[] = [];

            // --- ЛОГИКА ДЛЯ ДУЕЛЕЙ ---
            if (mode === 'duel' && duelId) {
                try {
                    const duelDoc = await firestore().collection('duels').doc(duelId).get();
                    if (duelDoc.exists) {
                        const duelData = duelDoc.data();
                        const questionIds: string[] = duelData?.questionIds || [];
                        const allQuestionsFromDb: Question[] = Object.values(db).flatMap(gradeData =>
                            Object.values(gradeData).flatMap(topicData =>
                                Object.values(topicData).flatMap(subtopic => subtopic.questions || [])
                            )
                        );
                        loadedQuestions = allQuestionsFromDb.filter(q => questionIds.includes(q.id));
                    } else {
                        Alert.alert("Błąd", "Nie znaleziono pojedynku. Być może został anulowany.");
                    }
                } catch (error) {
                    console.error("Error fetching duel questions:", error);
                    Alert.alert("Błąd", "Nie udało się załadować pytań do pojedynku.");
                }
            }
            // --- ЛОГИКА ДЛЯ ЗВЫЧАЙНЫХ ТЕСТОВ ---
            else if (testType === 'mainTopic' && grade && topic) {
                const topicsForGrade = db[String(grade)];
                const subTopicsMap = topicsForGrade?.[topic];
                if (subTopicsMap) {
                    Object.keys(subTopicsMap).forEach(subTopicKey => {
                        loadedQuestions.push(...(subTopicsMap[subTopicKey]?.questions || []));
                    });
                    if (loadedQuestions.length > 0) {
                        loadedQuestions.sort(() => Math.random() - 0.5);
                        if (loadedQuestions.length > 20) loadedQuestions = loadedQuestions.slice(0, 20);
                    }
                }
            } else if (testType === 'subTopic' && grade && topic && subTopic) {
                loadedQuestions = db[String(grade)]?.[topic]?.[subTopic]?.questions || [];
            }

            setQuestions(loadedQuestions);
            setCurrentQuestionIndex(0);
            setScore(0);
            setSelectedAnswerIndex(null);
            setIsAnswerSubmitted(false);
            setShowFeedback(false);
            setTimeLeft(ASSESSMENT_TIME_SECONDS);
            if (timerRef.current) clearInterval(timerRef.current);
            setLoading(false);
        };

        loadQuestions();
    }, [grade, topic, subTopic, mode, testType, duelId]);

    useEffect(() => {
        if (mode === 'assess' && questions.length > 0 && !loading) {
            timerRef.current = setInterval(() => {
                setTimeLeft(prevTime => {
                    if (prevTime <= 1) {
                        if (timerRef.current) clearInterval(timerRef.current);
                        Alert.alert("Czas minął!", `Test zakończony. Twój wynik: ${scoreRef.current} z ${questions.length}`);
                        finishTest(scoreRef.current);
                        return 0;
                    }
                    return prevTime - 1;
                });
            }, 1000);
            return () => { if (timerRef.current) clearInterval(timerRef.current); };
        }
    }, [mode, questions.length, loading]);

    const finishTest = async (finalScore: number) => {
        if (timerRef.current) clearInterval(timerRef.current);
        const currentUser = auth().currentUser;

        if (mode === 'duel' && duelId && currentUser) {
            try {
                const duelRef = firestore().collection('duels').doc(duelId);
                const finalTime = ASSESSMENT_TIME_SECONDS - timeLeft; // или null, если не нужно
                await duelRef.update({
                    [`results.${currentUser.uid}.score`]: finalScore,
                    [`results.${currentUser.uid}.time`]: finalTime,
                    [`results.${currentUser.uid}.nickname`]: currentUser.displayName,
                });
            } catch (error) {
                console.error("Error saving duel result:", error);
            }
        }

        navigation.replace('Results', {
            score: finalScore,
            total: questions.length,
            originalTestParams: route.params,
        });
    };

    const handleAnswerSelect = (index: number) => {
        if (!isAnswerSubmitted) setSelectedAnswerIndex(index);
    };

    const handleNextQuestion = () => {
        if (currentQuestionIndex + 1 < questions.length) {
            setCurrentQuestionIndex(prev => prev + 1);
            setSelectedAnswerIndex(null);
            setIsAnswerSubmitted(false);
            setShowFeedback(false);
        } else {
            finishTest(score);
        }
    };

    const handleSubmitAnswer = () => {
        const currentQ = questions[currentQuestionIndex];
        if (selectedAnswerIndex === null && currentQ.type === 'practice') {
            Alert.alert("Uwaga!", "Proszę wybrać odpowiedź.");
            return;
        }

        setIsAnswerSubmitted(true);
        let isCorrect = false;

        if (currentQ.type === 'practice' && selectedAnswerIndex !== null) {
            isCorrect = selectedAnswerIndex === currentQ.correctAnswerIndex;
            if (isCorrect) setScore(prev => prev + 1);
        }

        if (mode === 'learn' || currentQ.type === 'theory') {
            setShowFeedback(true);
        } else {
            const nextIndex = currentQuestionIndex + 1;
            if (nextIndex >= questions.length) {
                finishTest(isCorrect ? score + 1 : score);
            } else {
                setTimeout(() => handleNextQuestion(), 1000);
            }
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color="#00BCD4" />
                <Text style={styles.loadingText}>Ładowanie pytań...</Text>
            </View>
        );
    }

    if (!questions || questions.length === 0) {
        return (
            <View style={[styles.container, { justifyContent: 'center' }]}>
                <Text style={styles.errorText}>Pytania do tego tematu nie zostały jeszcze dodane lub wystąpił błąd ładowania.</Text>
            </View>
        );
    }

    const currentQuestion = questions[currentQuestionIndex];

    const capitalizeFirstLetter = (str?: string) => str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
    const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;

    return (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.container}>
            {mode === 'assess' && <Text style={styles.timerText}>Pozostały czas: {formatTime(timeLeft)}</Text>}
            <View style={styles.headerContainer}>
                <Text style={styles.questionCounter}>Pytanie {currentQuestionIndex + 1} z {questions.length}</Text>
                {currentQuestion.difficulty && <Text style={styles.difficultyText}>Poziom: {capitalizeFirstLetter(currentQuestion.difficulty)}</Text>}
            </View>
            <Text style={styles.questionText}>{currentQuestion.questionText}</Text>

            {currentQuestion.type === 'practice' && (
                <View style={styles.optionsContainer}>
                    {currentQuestion.options.map((option, index) => {
                        const isSelected = selectedAnswerIndex === index;
                        const isCorrect = currentQuestion.correctAnswerIndex === index;
                        let buttonStyle: any = styles.optionButton;
                        let textStyle: any = styles.optionText;

                        if (isAnswerSubmitted) {
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
                            <TouchableOpacity key={index} style={buttonStyle} onPress={() => handleAnswerSelect(index)} disabled={isAnswerSubmitted}>
                                <Text style={textStyle}>{option}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            )}

            {!isAnswerSubmitted && (
                <TouchableOpacity style={styles.submitButton} onPress={handleSubmitAnswer}>
                    <Text style={styles.submitButtonText}>{currentQuestion.type === 'theory' ? "Dalej" : "Odpowiedz"}</Text>
                </TouchableOpacity>
            )}

            {isAnswerSubmitted && showFeedback && (
                <View style={styles.feedbackContainer}>
                    {currentQuestion.type === 'practice' && (
                        <>
                            <Text style={[styles.feedbackTitle, selectedAnswerIndex === currentQuestion.correctAnswerIndex ? styles.correctFeedbackTitle : styles.incorrectFeedbackTitle]}>
                                {selectedAnswerIndex === currentQuestion.correctAnswerIndex ? "Poprawnie!" : "Niepoprawnie!"}
                            </Text>
                            <Text style={styles.feedbackTextBold}>
                                Prawidłowa odpowiedź: <Text style={styles.feedbackTextNormal}>{currentQuestion.options[currentQuestion.correctAnswerIndex]}</Text>
                            </Text>
                        </>
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
                        <Text style={styles.submitButtonText}>{currentQuestionIndex + 1 < questions.length ? "Następne pytanie" : "Zakończ test"}</Text>
                    </TouchableOpacity>
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    scrollView: { flex:1, backgroundColor:'#f0f8ff' },
    container: { flexGrow:1, padding:20 },
    loadingText: { marginTop:10, fontSize:16, color:'#555', textAlign:'center' },
    errorText: { textAlign:'center', fontSize:16, color:'red' },
    headerContainer: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:15 },
    questionCounter: { fontSize:16, color:'#555' },
    difficultyText: { fontSize:16, color:'#007bff', fontWeight:'bold' },
    questionText: { fontSize:20, fontWeight:'bold', marginBottom:25, textAlign:'center', color:'#333', lineHeight:28 },
    optionsContainer: { marginBottom:20 },
    optionButton: { backgroundColor:'#fff', paddingVertical:15, paddingHorizontal:12, marginVertical:8, borderRadius:10, borderWidth:1.5, borderColor:'#b0bec5', elevation:2, shadowColor:"#000", shadowOffset:{width:0,height:1}, shadowOpacity:0.18, shadowRadius:1 },
    selectedOption: { borderColor:'#00BCD4', borderWidth:2.5, backgroundColor:'#e0f7fa' },
    correctOption: { backgroundColor:'#c8e6c9', borderColor:'#4caf50', borderWidth:2.5 },
    incorrectOption: { backgroundColor:'#ffcdd2', borderColor:'#f44336', borderWidth:2.5 },
    optionText: { fontSize:17, color:'#455a64', textAlign:'center' },
    correctOptionText: { fontWeight:'bold', color:'#2e7d32' },
    submitButton: { backgroundColor:'#00BCD4', paddingVertical:15, paddingHorizontal:20, borderRadius:25, alignItems:'center', marginTop:10, elevation:3 },
    nextButton: { backgroundColor:'#FF9800', paddingVertical:15, paddingHorizontal:20, borderRadius:25, alignItems:'center', marginTop:20, elevation:3 },
    submitButtonText: { color:'#fff', fontSize:18, fontWeight:'bold' },
    feedbackContainer: { marginTop:20, padding:15, backgroundColor:'#fff', borderRadius:8, borderWidth:1, borderColor:'#e0e0e0', marginBottom:20 },
    feedbackTitle: { fontSize:20, fontWeight:'bold', marginBottom:12, textAlign:'center' },
    correctFeedbackTitle: { color:'#388e3c' },
    incorrectFeedbackTitle: { color:'#d32f2f' },
    feedbackHeader: { fontSize:17, fontWeight:'bold', marginTop:10, marginBottom:5, color:'#424242' },
    feedbackText: { fontSize:16, color:'#555', marginBottom:8, lineHeight:22 },
    feedbackTextBold: { fontSize:16, color:'#555', marginBottom:8, fontWeight:'bold' },
    feedbackTextNormal: { fontWeight:'normal' },
    timerText: { fontSize:18, fontWeight:'bold', color:'#d32f2f', textAlign:'center', marginBottom:15 },
});

export default TestScreen;
