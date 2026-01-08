// src/screens/TestScreen.tsx

import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ScrollView,
    ActivityIndicator,
    ImageBackground,
    Modal
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainAppStackParamList } from '../../App';
import questionsDatabase from '../data/questionsDb.json';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Ionicons from '@expo/vector-icons/Ionicons';

// --- TYPY ---
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

const ASSESSMENT_TIME_SECONDS = 15 * 60;

function TestScreen({ route, navigation }: TestScreenProps) {
    const { grade, topic, subTopic, mode: initialMode, testType = 'subTopic', duelId } = route.params;

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

    const [activeMode, setActiveMode] = useState<'learn' | 'assess'>(
        (duelId || subTopic === 'Sprawdzian końcowy') ? 'assess' : 'learn'
    );
    const [isModeSelectionVisible, setModeSelectionVisible] = useState(
        !(duelId || subTopic === 'Sprawdzian końcowy')
    );

    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const scoreRef = useRef(score);
    const currentUser = auth().currentUser;

    useEffect(() => { scoreRef.current = score; }, [score]);

    useEffect(() => {
        if (!currentUser) { setIsPowerupLoading(false); return; }
        const userRef = firestore().collection('users').doc(currentUser.uid);
        const unsubscribe = userRef.onSnapshot(doc => {
            if (doc.exists) setInventory(doc.data()?.inventory || { hint5050: 0, doubleXp: 0 });
            setIsPowerupLoading(false);
        });
        return () => unsubscribe();
    }, [currentUser]);

    useEffect(() => {
        const loadQuestions = async () => {
            setLoading(true);
            const db: QuestionsDatabase = (questionsDatabase as any).default || questionsDatabase;
            let loadedQuestions: Question[] = [];

            if (duelId) {
                try {
                    const duelDoc = await firestore().collection('duels').doc(duelId).get();
                    if (duelDoc.exists) {
                        const dData = duelDoc.data();
                        const dGrade = String(dData?.grade || "4");
                        const dTopic = dData?.topic;
                        const topicContent = db[dGrade]?.[dTopic];

                        if (topicContent) {
                            // Szukamy zestawów dedykowanych dla pojedynków
                            const duelSetKey = Object.keys(topicContent).find(k => k.includes("Pojedynki"));
                            if (duelSetKey && topicContent[duelSetKey].questions) {
                                loadedQuestions = [...topicContent[duelSetKey].questions];
                            } else {
                                Object.values(topicContent).forEach(s => {
                                    if (s.questions) loadedQuestions.push(...s.questions);
                                });
                            }
                            // Losujemy 10-15 zadań dla sprawiedliwej rozgrywki
                            loadedQuestions = loadedQuestions.sort(() => 0.5 - Math.random()).slice(0, 15);
                        }
                    }
                } catch (e) { console.error("Duel load error:", e); }
            } else if (testType === 'mainTopic' && grade && topic) {
                const subTopicsMap = db[String(grade)]?.[topic];
                if (subTopicsMap) {
                    Object.values(subTopicsMap).forEach(s => loadedQuestions.push(...(s.questions || [])));
                    if (loadedQuestions.length > 0) loadedQuestions = loadedQuestions.sort(() => Math.random() - 0.5).slice(0, 20);
                }
            } else if (testType === 'subTopic' && grade && topic && subTopic) {
                loadedQuestions = db[String(grade)]?.[topic]?.[subTopic]?.questions || [];
            }

            setQuestions(loadedQuestions);
            setLoading(false);
        };
        loadQuestions();
    }, [grade, topic, subTopic, testType, duelId]);

    useEffect(() => {
        if (activeMode === 'assess' && !isModeSelectionVisible && questions.length > 0 && !loading) {
            timerRef.current = setInterval(() => {
                setTimeLeft(prevTime => {
                    if (prevTime <= 1) {
                        if (timerRef.current) clearInterval(timerRef.current);
                        finishTest(scoreRef.current);
                        return 0;
                    }
                    return prevTime - 1;
                });
            }, 1000);
            return () => { if (timerRef.current) clearInterval(timerRef.current); };
        }
    }, [activeMode, isModeSelectionVisible, questions.length, loading]);

    // --- ✅ POPRAWIONA FUNKCJA FINISHTEST (Logika statystyk) ---
    const finishTest = async (finalScore: number) => {
        if (timerRef.current) clearInterval(timerRef.current);

        if (duelId && currentUser) {
            try {
                const duelRef = firestore().collection('duels').doc(duelId);
                const userRef = firestore().collection('users').doc(currentUser.uid);

                // 1. Aktualizacja wyniku w kolekcji duels
                await duelRef.update({
                    [`scores.${currentUser.uid}`]: finalScore,
                    lastUpdated: firestore.FieldValue.serverTimestamp()
                });

                // 2. Pobranie danych by sprawdzić wynik przeciwnika
                const duelDoc = await duelRef.get();
                const dData = duelDoc.data();
                const scores = dData?.scores || {};
                const opponentId = dData?.challengerId === currentUser.uid
                    ? dData?.opponentId
                    : dData?.challengerId;

                const opponentScore = scores[opponentId];

                // 3. Jeśli obaj skończyli, rozstrzygamy pojedynek i aktualizujemy profil
                if (opponentScore !== null && opponentScore !== undefined) {
                    const opponentRef = firestore().collection('users').doc(opponentId);

                    await userRef.update({ duelsPlayed: firestore.FieldValue.increment(1) });
                    await opponentRef.update({ duelsPlayed: firestore.FieldValue.increment(1) });

                    if (finalScore > opponentScore) {
                        await userRef.update({ duelsWon: firestore.FieldValue.increment(1) });
                        await opponentRef.update({ duelsLost: firestore.FieldValue.increment(1) });
                    } else if (finalScore < opponentScore) {
                        await userRef.update({ duelsLost: firestore.FieldValue.increment(1) });
                        await opponentRef.update({ duelsWon: firestore.FieldValue.increment(1) });
                    } else {
                        await userRef.update({ duelsDraw: firestore.FieldValue.increment(1) });
                        await opponentRef.update({ duelsDraw: firestore.FieldValue.increment(1) });
                    }
                    await duelRef.update({ status: 'finished' });
                }
            } catch (e) { console.error("Error saving duel results:", e); }
        }

        navigation.replace('Results', {
            score: finalScore,
            total: questions.length,
            originalTestParams: route.params,
            isDoubleXp: isDoubleXpActive,
        });
    };

    const handleAnswerSelect = (index: number) => { if (!isAnswerSubmitted) setSelectedAnswerIndex(index); };

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
            Alert.alert("Uwaga!", "Wybierz odpowiedź.");
            return;
        }
        setIsAnswerSubmitted(true);
        let isCorrect = false;
        if (currentQ.type === 'practice' && selectedAnswerIndex !== null) {
            isCorrect = selectedAnswerIndex === currentQ.correctAnswerIndex;
            if (isCorrect) setScore(prev => prev + 1);
        }

        if (activeMode === 'learn' || currentQ.type === 'theory') {
            setShowFeedback(true);
        } else {
            const nextIndex = currentQuestionIndex + 1;
            if (nextIndex >= questions.length) finishTest(isCorrect ? score + 1 : score);
            else setTimeout(() => handleNextQuestion(), 1000);
        }
    };

    const handleUseHint5050 = async () => {
        if (!currentUser || hintUsedForThisQuestion || (inventory.hint5050 || 0) <= 0) return;
        setHintUsedForThisQuestion(true);
        const q = questions[currentQuestionIndex];
        const incorrect = q.options.map((_, i) => i).filter(i => i !== q.correctAnswerIndex);
        setDisabledAnswers(incorrect.sort(() => 0.5 - Math.random()).slice(0, 2));
        await firestore().collection('users').doc(currentUser.uid).update({ 'inventory.hint5050': firestore.FieldValue.increment(-1) });
    };

    const handleUseDoubleXp = async () => {
        if (!currentUser || isDoubleXpActive || (inventory.doubleXp || 0) <= 0) return;
        setIsDoubleXpActive(true);
        await firestore().collection('users').doc(currentUser.uid).update({ 'inventory.doubleXp': firestore.FieldValue.increment(-1) });
        Alert.alert("Sukces!", "Podwójne XP aktywne!");
    };

    const selectMode = (mode: 'learn' | 'assess') => { setActiveMode(mode); setModeSelectionVisible(false); };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#00BCD4" /></View>;

    const currentQuestion = questions[currentQuestionIndex];
    const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

    return (
        <ImageBackground source={require('../assets/images/tlo.png')} style={styles.bgImage} resizeMode="cover">
            <Modal animationType="fade" transparent={true} visible={isModeSelectionVisible}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Wybierz tryb</Text>
                        <TouchableOpacity style={[styles.modeButton, {backgroundColor: '#4CAF50'}]} onPress={() => selectMode('learn')}>
                            <Ionicons name="school" size={28} color="#FFF" />
                            <Text style={styles.modeBtnTitle}>Trening</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.modeButton, {backgroundColor: '#FF9800'}]} onPress={() => selectMode('assess')}>
                            <Ionicons name="timer" size={28} color="#FFF" />
                            <Text style={styles.modeBtnTitle}>Sprawdzian</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <ScrollView contentContainerStyle={styles.container}>
                {activeMode === 'assess' && <Text style={styles.timerText}>⏱ {formatTime(timeLeft)}</Text>}
                <View style={styles.headerContainer}>
                    <Text style={styles.questionCounter}>Pytanie {currentQuestionIndex + 1} / {questions.length}</Text>
                </View>
                <Text style={styles.questionText}>{currentQuestion.questionText}</Text>
                <View style={styles.optionsContainer}>
                    {currentQuestion.options.map((option, index) => (
                        <TouchableOpacity
                            key={index}
                            style={[
                                styles.optionButton,
                                selectedAnswerIndex === index && styles.selectedOption,
                                isAnswerSubmitted && index === currentQuestion.correctAnswerIndex && styles.correctOption,
                                isAnswerSubmitted && selectedAnswerIndex === index && index !== currentQuestion.correctAnswerIndex && styles.incorrectOption,
                                disabledAnswers.includes(index) && styles.disabledOption
                            ]}
                            onPress={() => handleAnswerSelect(index)}
                            disabled={isAnswerSubmitted || disabledAnswers.includes(index)}
                        >
                            <Text style={styles.optionText}>{option}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {!isAnswerSubmitted && (
                    <TouchableOpacity style={styles.submitButton} onPress={handleSubmitAnswer}>
                        <Text style={styles.submitButtonText}>Sprawdź</Text>
                    </TouchableOpacity>
                )}

                {isAnswerSubmitted && showFeedback && (
                    <View style={styles.feedbackContainer}>
                        <Text style={styles.feedbackText}>{currentQuestion.correctAnswerExplanation}</Text>
                        <TouchableOpacity style={styles.nextButton} onPress={handleNextQuestion}>
                            <Text style={styles.submitButtonText}>Dalej</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    bgImage: { flex: 1 },
    container: { padding: 20, paddingTop: 60 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    headerContainer: { marginBottom: 20 },
    questionCounter: { fontSize: 16, color: '#666', fontWeight: 'bold' },
    timerText: { fontSize: 24, fontWeight: 'bold', color: '#D32F2F', textAlign: 'center', marginBottom: 10 },
    questionText: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    optionsContainer: { marginBottom: 20 },
    optionButton: { backgroundColor: '#FFF', padding: 15, borderRadius: 12, marginVertical: 6, borderWidth: 1, borderColor: '#DDD' },
    selectedOption: { borderColor: '#00BCD4', backgroundColor: '#E0F7FA' },
    correctOption: { backgroundColor: '#C8E6C9', borderColor: '#4CAF50' },
    incorrectOption: { backgroundColor: '#FFCDD2', borderColor: '#F44336' },
    disabledOption: { opacity: 0.3 },
    optionText: { fontSize: 18, textAlign: 'center' },
    submitButton: { backgroundColor: '#00BCD4', padding: 15, borderRadius: 25, alignItems: 'center' },
    submitButtonText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
    feedbackContainer: { padding: 15, backgroundColor: '#FFF', borderRadius: 12, marginTop: 10 },
    feedbackText: { fontSize: 16, color: '#333', marginBottom: 10 },
    nextButton: { backgroundColor: '#FF9800', padding: 12, borderRadius: 20, alignItems: 'center' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '80%', backgroundColor: '#FFF', padding: 20, borderRadius: 20 },
    modalTitle: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
    modeButton: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 15, marginVertical: 10 },
    modeBtnTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginLeft: 10 }
});

export default TestScreen;