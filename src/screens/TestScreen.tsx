// src/screens/TestScreen.tsx

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainAppStackParamList } from '../../App';
import questionsDatabase from '../data/questionsDb.json';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Ionicons from '@expo/vector-icons/Ionicons';

// --- ТИПИ ---
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
interface Inventory {
    hint5050?: number;
    doubleXp?: number;
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

const ASSESSMENT_TIME_SECONDS = 15 * 60; // 15 хвилин

function TestScreen({ route, navigation }: TestScreenProps) {
    const { grade, topic, subTopic, mode: initialMode, testType = 'subTopic', duelId } = route.params;

    // 🔥 ПРИНУДИТЕЛЬНЫЙ РЕЖИМ ЭКЗАМЕНА ДЛЯ КОНТРОЛЬНОЙ
    const mode = subTopic === 'Sprawdzian końcowy' ? 'assess' : (initialMode || 'learn');

    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [selectedAnswerIndex, setSelectedAnswerIndex] = useState<number | null>(null);
    const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
    const [showFeedback, setShowFeedback] = useState(false);
    const [timeLeft, setTimeLeft] = useState(ASSESSMENT_TIME_SECONDS);
    const [inventory, setInventory] = useState<Inventory>({});
    const [isPowerupLoading, setIsPowerupLoading] = useState(true);
    const [isDoubleXpActive, setIsDoubleXpActive] = useState(false);
    const [hintUsedForThisQuestion, setHintUsedForThisQuestion] = useState(false);
    const [disabledAnswers, setDisabledAnswers] = useState<number[]>([]);

    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const scoreRef = useRef(score);
    const currentUser = auth().currentUser;

    useEffect(() => {
        scoreRef.current = score;
    }, [score]);

    // --- ЗАГРУЗКА ИНВЕНТАРЯ ---
    useEffect(() => {
        if (!currentUser) {
            setIsPowerupLoading(false);
            return;
        }
        const userRef = firestore().collection('users').doc(currentUser.uid);
        const unsubscribe = userRef.onSnapshot(doc => {
            if (doc.exists) {
                const data = doc.data();
                setInventory(data?.inventory || { hint5050: 0, doubleXp: 0 });
            }
            setIsPowerupLoading(false);
        }, error => {
            console.error("Błąd pobierania inwentarza:", error);
            setIsPowerupLoading(false);
        });
        return () => unsubscribe();
    }, [currentUser]);

    // --- ЗАГРУЗКА ВОПРОСОВ ---
    useEffect(() => {
        const loadQuestions = async () => {
            setLoading(true);
            const db: QuestionsDatabase = questionsDatabase as QuestionsDatabase;
            let loadedQuestions: Question[] = [];

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
                        Alert.alert("Błąd", "Nie znaleziono pojedynku.");
                    }
                } catch (error) {
                    console.error("Error fetching duel questions:", error);
                }
            }
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
            }
            else if (testType === 'subTopic' && grade && topic && subTopic) {
                const rawQuestions = db[String(grade)]?.[topic]?.[subTopic]?.questions || [];

                // 🔥 ЛОГИКА ДЛЯ КОНТРОЛЬНОЙ
                if (subTopic === 'Sprawdzian końcowy') {
                    const shuffled = [...rawQuestions].sort(() => Math.random() - 0.5);
                    loadedQuestions = shuffled.slice(0, 20);
                } else {
                    loadedQuestions = rawQuestions;
                }
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

    // --- ТАЙМЕР ---
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

    // --- ФИНИШ ---
    const finishTest = async (finalScore: number) => {
        if (timerRef.current) clearInterval(timerRef.current);
        const currentUser = auth().currentUser;

        if (mode === 'duel' && duelId && currentUser) {
            try {
                const duelRef = firestore().collection('duels').doc(duelId);
                const finalTime = ASSESSMENT_TIME_SECONDS - timeLeft;
                await duelRef.update({
                    [`results.${currentUser.uid}.score`]: finalScore,
                    [`results.${currentUser.uid}.time`]: finalTime,
                });
                navigation.replace('DuelResult', { duelId: duelId });
            } catch (error) {
                console.error("Error saving duel result:", error);
                navigation.replace('DuelResult', { duelId: duelId });
            }
        } else {
            navigation.replace('Results', {
                score: finalScore,
                total: questions.length,
                originalTestParams: route.params,
                isDoubleXp: isDoubleXpActive,
            });
        }
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
            setHintUsedForThisQuestion(false);
            setDisabledAnswers([]);
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

        // --- ЛОГИКА ПЕРЕХОДА ---
        if (mode === 'learn' || currentQ.type === 'theory') {
            // В режиме обучения показываем объяснение
            setShowFeedback(true);
        } else {
            // 🔥 В РЕЖИМЕ ЭКЗАМЕНА (SPRAWDZIAN) — МГНОВЕННЫЙ ПЕРЕХОД
            // Убрали setTimeout, теперь "зависания" не будет
            const nextIndex = currentQuestionIndex + 1;
            if (nextIndex >= questions.length) {
                finishTest(isCorrect ? score + 1 : score);
            } else {
                handleNextQuestion(); // <-- Сразу следующий вопрос!
            }
        }
    };

    // --- POWER-UPS ---
    const handleUseHint5050 = async () => {
        if (!currentUser || hintUsedForThisQuestion || (inventory.hint5050 || 0) <= 0) {
            Alert.alert("Brak wskazówek", "Nie masz więcej wskazówek 50/50.");
            return;
        }
        setHintUsedForThisQuestion(true);
        const currentQuestion = questions[currentQuestionIndex];
        const correctAnswerIndex = currentQuestion.correctAnswerIndex;
        const incorrectIndexes = currentQuestion.options.map((opt, index) => index).filter(index => index !== correctAnswerIndex);
        const shuffledIncorrect = incorrectIndexes.sort(() => 0.5 - Math.random());
        const indexesToDisable = shuffledIncorrect.slice(0, 2);
        setDisabledAnswers(indexesToDisable);
        const newHintCount = (inventory.hint5050 || 0) - 1;
        setInventory(prev => ({ ...prev, hint5050: newHintCount }));
        try {
            await firestore().collection('users').doc(currentUser.uid).update({ 'inventory.hint5050': firestore.FieldValue.increment(-1) });
        } catch (error) { console.error(error); }
    };

    const handleUseDoubleXp = async () => {
        if (!currentUser || isDoubleXpActive || (inventory.doubleXp || 0) <= 0) {
            Alert.alert("Brak bonusu", "Nie masz więcej bonusów XP.");
            return;
        }
        setIsDoubleXpActive(true);
        const newDoubleXpCount = (inventory.doubleXp || 0) - 1;
        setInventory(prev => ({ ...prev, doubleXp: newDoubleXpCount }));
        try {
            await firestore().collection('users').doc(currentUser.uid).update({ 'inventory.doubleXp': firestore.FieldValue.increment(-1) });
            Alert.alert("Aktywowano!", "Podwójne XP zostało aktywowane!");
        } catch (error) { console.error(error); setIsDoubleXpActive(false); }
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
                <Text style={styles.errorText}>Pytania do tego tematu nie zostały jeszcze dodane.</Text>
            </View>
        );
    }

    const currentQuestion = questions[currentQuestionIndex];
    const hintCount = inventory.hint5050 || 0;
    const doubleXpCount = inventory.doubleXp || 0;
    const capitalizeFirstLetter = (str?: string) => str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
    const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;

    // --- UI ---
    return (
        <View style={{ flex: 1, backgroundColor: '#f0f8ff' }}>

            {mode === 'assess' && (
                <View style={styles.timerHeader}>
                    <Ionicons name="timer-outline" size={24} color="#d32f2f" />
                    <Text style={styles.timerText}> {formatTime(timeLeft)}</Text>
                </View>
            )}

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.container}>

                <View style={styles.headerContainer}>
                    <Text style={styles.questionCounter}>Pytanie {currentQuestionIndex + 1} z {questions.length}</Text>
                    {currentQuestion.difficulty && <Text style={styles.difficultyText}>Poziom: {capitalizeFirstLetter(currentQuestion.difficulty)}</Text>}
                </View>

                <Text style={styles.questionText}>{currentQuestion.questionText}</Text>

                {currentQuestion.type === 'practice' && (
                    <View style={styles.optionsContainer}>
                        {currentQuestion.options.map((option, index) => {
                            const isSelected = selectedAnswerIndex === index;
                            const isDisabledByHint = disabledAnswers.includes(index);

                            let buttonStyle: any = styles.optionButton;

                            if (isSelected) {
                                buttonStyle = [styles.optionButton, styles.selectedOption];
                            } else if (isDisabledByHint) {
                                buttonStyle = [styles.optionButton, styles.disabledOption];
                            }

                            if (mode === 'learn' && isAnswerSubmitted) {
                                const isCorrect = currentQuestion.correctAnswerIndex === index;
                                if (isCorrect) buttonStyle = [styles.optionButton, styles.correctOption];
                                else if (isSelected) buttonStyle = [styles.optionButton, styles.incorrectOption];
                            }

                            return (
                                <TouchableOpacity
                                    key={index}
                                    style={buttonStyle}
                                    onPress={() => handleAnswerSelect(index)}
                                    disabled={isAnswerSubmitted || isDisabledByHint}
                                >
                                    <Text style={styles.optionText}>{option}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}

                {currentQuestion.type === 'practice' && !isAnswerSubmitted && (
                    <View style={styles.powerUpContainer}>
                        <TouchableOpacity
                            style={[styles.powerUpButton, (hintCount <= 0 || hintUsedForThisQuestion || isPowerupLoading) && styles.powerUpDisabled]}
                            disabled={hintCount <= 0 || hintUsedForThisQuestion || isPowerupLoading}
                            onPress={handleUseHint5050}
                        >
                            <Ionicons name="sparkles-outline" size={20} color="#00796B" />
                            <Text style={styles.powerUpText}>50/50 ({hintCount})</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.powerUpButton, (doubleXpCount <= 0 || isDoubleXpActive || isPowerupLoading) && styles.powerUpDisabled, {borderColor: '#FF9800'}]}
                            disabled={doubleXpCount <= 0 || isDoubleXpActive || isPowerupLoading}
                            onPress={handleUseDoubleXp}
                        >
                            <Ionicons name="flash-outline" size={20} color="#FF9800" />
                            <Text style={[styles.powerUpText, {color: "#FF9800"}]}>XP x2 ({doubleXpCount})</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {!isAnswerSubmitted && (
                    <TouchableOpacity style={styles.submitButton} onPress={handleSubmitAnswer}>
                        <Text style={styles.submitButtonText}>
                            {currentQuestion.type === 'theory' ? "Dalej" : "Odpowiedz"}
                        </Text>
                    </TouchableOpacity>
                )}

                {mode === 'learn' && isAnswerSubmitted && showFeedback && (
                    <View style={styles.feedbackContainer}>
                        <Text style={[styles.feedbackTitle, selectedAnswerIndex === currentQuestion.correctAnswerIndex ? styles.correctFeedbackTitle : styles.incorrectFeedbackTitle]}>
                            {selectedAnswerIndex === currentQuestion.correctAnswerIndex ? "Poprawnie!" : "Niepoprawnie!"}
                        </Text>
                        <Text style={styles.feedbackTextBold}>
                            Prawidłowa odpowiedź: <Text style={styles.feedbackTextNormal}>{currentQuestion.options[currentQuestion.correctAnswerIndex]}</Text>
                        </Text>
                        <Text style={styles.feedbackHeader}>Wyjaśnienie:</Text>
                        <Text style={styles.feedbackText}>{currentQuestion.correctAnswerExplanation}</Text>
                        <TouchableOpacity style={styles.nextButton} onPress={handleNextQuestion}>
                            <Text style={styles.submitButtonText}>{currentQuestionIndex + 1 < questions.length ? "Następne pytanie" : "Zakończ test"}</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    scrollView: {
        flex: 1,
    },
    container: {
        flexGrow: 1,
        padding: 20,
        paddingBottom: 40,
    },
    timerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffebee',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#ffcdd2',
    },
    timerText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#d32f2f',
        marginLeft: 8
    },
    loadingText: { marginTop:10, fontSize:16, color:'#555', textAlign:'center' },
    errorText: { textAlign:'center', fontSize:16, color:'red' },
    headerContainer: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:15, marginTop: 10 },
    questionCounter: { fontSize:16, color:'#555' },
    difficultyText: { fontSize:16, color:'#007bff', fontWeight:'bold' },
    questionText: { fontSize:20, fontWeight:'bold', marginBottom:25, textAlign:'center', color:'#333', lineHeight:28 },
    optionsContainer: { marginBottom:20 },
    optionButton: { backgroundColor:'#fff', paddingVertical:15, paddingHorizontal:12, marginVertical:8, borderRadius:10, borderWidth:1.5, borderColor:'#b0bec5', elevation:2 },
    selectedOption: { borderColor:'#00BCD4', borderWidth:2.5, backgroundColor:'#e0f7fa' },
    correctOption: { backgroundColor:'#c8e6c9', borderColor:'#4caf50', borderWidth:2.5 },
    incorrectOption: { backgroundColor:'#ffcdd2', borderColor:'#f44336', borderWidth:2.5 },
    disabledOption: { backgroundColor: '#BDBDBD', borderColor: '#9E9E9E', opacity: 0.7 },
    optionText: { fontSize:17, color:'#455a64', textAlign:'center' },
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
    powerUpContainer: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 5, marginBottom: 10 },
    powerUpButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: '#00796B', backgroundColor: '#FFFFFF' },
    powerUpText: { fontSize: 16, fontWeight: 'bold', marginLeft: 8, color: '#00796B' },
    powerUpDisabled: { backgroundColor: '#E0E0E0', opacity: 0.6 },
});

export default TestScreen;