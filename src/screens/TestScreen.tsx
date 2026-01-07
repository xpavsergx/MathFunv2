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

    // --- СТАНИ ---
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

    // Стан режиму та видимості вікна
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

    // 1. ЗАВАНТАЖЕННЯ ІНВЕНТАРЯ
    useEffect(() => {
        if (!currentUser) { setIsPowerupLoading(false); return; }
        const userRef = firestore().collection('users').doc(currentUser.uid);
        const unsubscribe = userRef.onSnapshot(doc => {
            if (doc.exists) setInventory(doc.data()?.inventory || { hint5050: 0, doubleXp: 0 });
            setIsPowerupLoading(false);
        });
        return () => unsubscribe();
    }, [currentUser]);

    // 2. ЗАВАНТАЖЕННЯ ПИТАНЬ
    useEffect(() => {
        const loadQuestions = async () => {
            setLoading(true);
            const db: QuestionsDatabase = (questionsDatabase as any).default || questionsDatabase;
            let loadedQuestions: Question[] = [];

            if (activeMode === 'assess' && duelId) {
                try {
                    const duelDoc = await firestore().collection('duels').doc(duelId).get();
                    if (duelDoc.exists) {
                        const questionIds = duelDoc.data()?.questionIds || [];
                        const allQ = Object.values(db).flatMap(g => Object.values(g).flatMap(t => Object.values(t).flatMap(s => s.questions || [])));
                        loadedQuestions = allQ.filter(q => questionIds.includes(q.id));
                    }
                } catch (e) { console.error(e); }
            } else if (testType === 'mainTopic' && grade && topic) {
                const subTopicsMap = db[String(grade)]?.[topic];
                if (subTopicsMap) {
                    Object.values(subTopicsMap).forEach(s => loadedQuestions.push(...(s.questions || [])));
                    if (loadedQuestions.length > 0) loadedQuestions = loadedQuestions.sort(() => Math.random() - 0.5).slice(0, 20);
                }
            } else if (testType === 'subTopic' && grade && topic && subTopic) {
                loadedQuestions = db[String(grade)]?.[topic]?.[subTopic]?.questions || [];
            }

            if (subTopic === 'Sprawdzian końcowy') setTimeLeft(45 * 60);

            setQuestions(loadedQuestions);
            setLoading(false);
        };
        loadQuestions();
    }, [grade, topic, subTopic, testType, duelId, activeMode]);

    // 3. ТАЙМЕР
    useEffect(() => {
        if (activeMode === 'assess' && !isModeSelectionVisible && questions.length > 0 && !loading) {
            timerRef.current = setInterval(() => {
                setTimeLeft(prevTime => {
                    if (prevTime <= 1) {
                        if (timerRef.current) clearInterval(timerRef.current);
                        Alert.alert("Czas minął!", `Wynik: ${scoreRef.current}`);
                        finishTest(scoreRef.current);
                        return 0;
                    }
                    return prevTime - 1;
                });
            }, 1000);
            return () => { if (timerRef.current) clearInterval(timerRef.current); };
        }
    }, [activeMode, isModeSelectionVisible, questions.length, loading]);

    const finishTest = async (finalScore: number) => {
        if (timerRef.current) clearInterval(timerRef.current);
        navigation.replace('Results', {
            score: finalScore,
            total: questions.length,
            originalTestParams: route.params,
            isDoubleXp: isDoubleXpActive,
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
        setInventory(p => ({ ...p, hint5050: (p.hint5050 || 1) - 1 }));
        await firestore().collection('users').doc(currentUser.uid).update({ 'inventory.hint5050': firestore.FieldValue.increment(-1) });
    };

    const handleUseDoubleXp = async () => {
        if (!currentUser || isDoubleXpActive || (inventory.doubleXp || 0) <= 0) return;
        setIsDoubleXpActive(true);
        setInventory(p => ({ ...p, doubleXp: (p.doubleXp || 1) - 1 }));
        await firestore().collection('users').doc(currentUser.uid).update({ 'inventory.doubleXp': firestore.FieldValue.increment(-1) });
        Alert.alert("Aktywowano!", "Podwójne XP włączone!");
    };

    const selectMode = (mode: 'learn' | 'assess') => {
        setActiveMode(mode);
        setModeSelectionVisible(false);
    };

    const getRandomPraise = () => ["Super! 🌟", "Brawo! 👏", "Mistrzowsko! 🏆", "Świetnie! 🔥"][Math.floor(Math.random() * 4)];

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#00BCD4" /></View>;

    if (!questions || questions.length === 0) return (
        <ImageBackground source={require('../assets/images/tlo.png')} style={styles.bgImage} resizeMode="cover">
            <View style={styles.center}>
                <Text style={styles.errorText}>Brak pytań.</Text>
                <TouchableOpacity style={styles.nextButton} onPress={() => navigation.goBack()}><Text style={styles.submitButtonText}>Wróć</Text></TouchableOpacity>
            </View>
        </ImageBackground>
    );

    const currentQuestion = questions[currentQuestionIndex];
    const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

    return (
        <ImageBackground source={require('../assets/images/tlo.png')} style={styles.bgImage} resizeMode="cover">

            {/* ✅ КРАСИВЕ ВІКНО ВИБОРУ РЕЖИМУ */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={isModeSelectionVisible}
                onRequestClose={() => navigation.goBack()}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Wybierz tryb</Text>
                        <Text style={styles.modalSubtitle}>Jak chcesz rozwiązywać zadania?</Text>

                        {/* Кнопка Тренування */}
                        <TouchableOpacity
                            style={[styles.modeButton, {backgroundColor: '#4CAF50', shadowColor: '#4CAF50'}]}
                            onPress={() => selectMode('learn')}
                            activeOpacity={0.9}
                        >
                            <View style={styles.iconCircle}>
                                <Ionicons name="school" size={28} color="#4CAF50" />
                            </View>
                            <View style={styles.textContainer}>
                                <Text style={styles.modeBtnTitle}>Trening</Text>
                                <Text style={styles.modeBtnDesc}>Uczę się. Mam czas na zastanowienie i widzę wyjaśnienia.</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={24} color="#FFF" style={{opacity: 0.7}}/>
                        </TouchableOpacity>

                        {/* Кнопка Тест */}
                        <TouchableOpacity
                            style={[styles.modeButton, {backgroundColor: '#FF9800', shadowColor: '#FF9800'}]}
                            onPress={() => selectMode('assess')}
                            activeOpacity={0.9}
                        >
                            <View style={styles.iconCircle}>
                                <Ionicons name="timer" size={28} color="#FF9800" />
                            </View>
                            <View style={styles.textContainer}>
                                <Text style={styles.modeBtnTitle}>Sprawdzian</Text>
                                <Text style={styles.modeBtnDesc}>Sprawdzam się. Ograniczony czas, brak podpowiedzi.</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={24} color="#FFF" style={{opacity: 0.7}}/>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.closeModalBtn} onPress={() => navigation.goBack()}>
                            <Text style={styles.closeModalText}>Anuluj</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.container}>

                {activeMode === 'assess' && !isModeSelectionVisible && (
                    <Text style={styles.timerText}>⏱ {formatTime(timeLeft)}</Text>
                )}

                <View style={styles.headerContainer}>
                    <Text style={styles.questionCounter}>Pytanie {currentQuestionIndex + 1} / {questions.length}</Text>
                    {currentQuestion.difficulty && <Text style={styles.difficultyText}>{currentQuestion.difficulty.toUpperCase()}</Text>}
                </View>

                <Text style={styles.questionText}>{currentQuestion.questionText}</Text>

                <View style={styles.optionsContainer}>
                    {currentQuestion.options.map((option, index) => {
                        const isSelected = selectedAnswerIndex === index;
                        const isCorrect = currentQuestion.correctAnswerIndex === index;
                        const isDisabled = disabledAnswers.includes(index);

                        let btnStyle: any = styles.optionButton;
                        if (isAnswerSubmitted) {
                            if (isCorrect) btnStyle = [styles.optionButton, styles.correctOption];
                            else if (isSelected) btnStyle = [styles.optionButton, styles.incorrectOption];
                            else btnStyle = [styles.optionButton, styles.disabledOption];
                        } else if (isSelected) {
                            btnStyle = [styles.optionButton, styles.selectedOption];
                        } else if (isDisabled) {
                            btnStyle = [styles.optionButton, styles.disabledOption];
                        }

                        return (
                            <TouchableOpacity
                                key={index}
                                style={btnStyle}
                                onPress={() => handleAnswerSelect(index)}
                                disabled={isAnswerSubmitted || isDisabled}
                            >
                                <Text style={[styles.optionText, isAnswerSubmitted && isCorrect && styles.correctOptionText]}>
                                    {option}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Бонуси */}
                {activeMode === 'learn' && !isAnswerSubmitted && (
                    <View style={styles.powerUpContainer}>
                        <TouchableOpacity style={[styles.powerUpButton, ((inventory.hint5050||0)<=0 || hintUsedForThisQuestion) && styles.powerUpDisabled]} onPress={handleUseHint5050}>
                            <Ionicons name="sparkles" size={20} color="#00796B" />
                            <Text style={styles.powerUpText}>50/50 ({inventory.hint5050 || 0})</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.powerUpButton, ((inventory.doubleXp||0)<=0 || isDoubleXpActive) && styles.powerUpDisabled, {borderColor:'#FF9800'}]} onPress={handleUseDoubleXp}>
                            <Ionicons name="flash" size={20} color="#FF9800" />
                            <Text style={[styles.powerUpText, {color:'#FF9800'}]}>2x XP ({inventory.doubleXp || 0})</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {!isAnswerSubmitted && (
                    <TouchableOpacity style={styles.submitButton} onPress={handleSubmitAnswer}>
                        <Text style={styles.submitButtonText}>{activeMode === 'learn' ? "Sprawdź" : "Dalej"}</Text>
                    </TouchableOpacity>
                )}

                {/* Фідбек */}
                {isAnswerSubmitted && showFeedback && activeMode === 'learn' && (
                    <View style={styles.feedbackContainer}>
                        <View style={{alignItems:'center', marginBottom: 10}}>
                            {selectedAnswerIndex === currentQuestion.correctAnswerIndex ? (
                                <Ionicons name="checkmark-circle" size={40} color="#388E3C" />
                            ) : (
                                <Ionicons name="close-circle" size={40} color="#D32F2F" />
                            )}
                            <Text style={[styles.feedbackTitle, selectedAnswerIndex === currentQuestion.correctAnswerIndex ? styles.correctFeedbackTitle : styles.incorrectFeedbackTitle]}>
                                {selectedAnswerIndex === currentQuestion.correctAnswerIndex ? getRandomPraise() : "Niestety, pomyłka."}
                            </Text>
                        </View>

                        <Text style={styles.feedbackHeader}>Wyjaśnienie:</Text>
                        <Text style={styles.feedbackText}>{currentQuestion.correctAnswerExplanation}</Text>

                        {currentQuestion.theorySnippet && (
                            <View style={styles.theoryBox}>
                                <Text style={styles.theoryTitle}>💡 Wskazówka</Text>
                                <Text style={styles.theoryText}>{currentQuestion.theorySnippet}</Text>
                            </View>
                        )}

                        <TouchableOpacity style={styles.nextButton} onPress={handleNextQuestion}>
                            <Text style={styles.submitButtonText}>{currentQuestionIndex + 1 < questions.length ? "Następne pytanie" : "Zakończ"}</Text>
                            <Ionicons name="arrow-forward" size={20} color="#fff" style={{marginLeft:10}} />
                        </TouchableOpacity>
                    </View>
                )}

            </ScrollView>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    bgImage: { flex: 1, width: '100%', height: '100%' },
    scrollView: { flex: 1, backgroundColor: 'transparent' },
    container: { flexGrow: 1, padding: 20, paddingBottom: 50, justifyContent: 'center' },
    center: { flex:1, justifyContent:'center', alignItems:'center' },

    // Header & Info
    headerContainer: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:15 },
    questionCounter: { fontSize:16, color:'#555', fontWeight:'bold' },
    difficultyText: { fontSize:14, color:'#1976D2', fontWeight:'bold', backgroundColor:'#E3F2FD', paddingHorizontal:8, paddingVertical:4, borderRadius:8 },
    timerText: { fontSize:20, fontWeight:'bold', color:'#D32F2F', textAlign:'center', marginBottom:15, backgroundColor:'rgba(255,255,255,0.9)', padding:5, borderRadius:10, alignSelf:'center', minWidth:100 },
    questionText: { fontSize:22, fontWeight:'bold', marginBottom:25, textAlign:'center', color:'#333', lineHeight:30 },
    errorText: { textAlign:'center', fontSize:16, color:'#D32F2F', backgroundColor:'rgba(255,255,255,0.9)', padding:15, borderRadius:10, marginBottom:20 },

    // Options
    optionsContainer: { marginBottom:20 },
    optionButton: { backgroundColor:'#fff', paddingVertical:15, paddingHorizontal:15, marginVertical:8, borderRadius:15, borderWidth:2, borderColor:'#e0e0e0', elevation:2 },
    selectedOption: { borderColor:'#00BCD4', backgroundColor:'#E0F7FA' },
    correctOption: { backgroundColor:'#C8E6C9', borderColor:'#4CAF50' },
    incorrectOption: { backgroundColor:'#FFCDD2', borderColor:'#F44336' },
    disabledOption: { backgroundColor:'#F5F5F5', borderColor:'#EEE', opacity:0.6 },
    optionText: { fontSize:18, color:'#444', textAlign:'center' },
    correctOptionText: { fontWeight:'bold', color:'#1B5E20' },

    // Main Buttons
    submitButton: { backgroundColor:'#00BCD4', paddingVertical:15, borderRadius:25, alignItems:'center', marginTop:10, elevation:4 },
    submitButtonText: { color:'#fff', fontSize:18, fontWeight:'bold' },
    nextButton: { flexDirection:'row', backgroundColor:'#FF9800', paddingVertical:15, borderRadius:25, alignItems:'center', justifyContent:'center', marginTop:20, elevation:4 },

    // PowerUps
    powerUpContainer: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
    powerUpButton: { flexDirection: 'row', alignItems: 'center', padding:10, borderRadius:20, borderWidth:1, borderColor:'#00796B', backgroundColor:'#FFF', elevation:2 },
    powerUpText: { fontSize:14, fontWeight:'bold', marginLeft:5, color:'#00796B' },
    powerUpDisabled: { backgroundColor:'#E0E0E0', borderColor:'#BDBDBD', opacity:0.6 },

    // Feedback
    feedbackContainer: { marginTop:20, padding:20, backgroundColor:'#FFF', borderRadius:20, elevation:5 },
    feedbackTitle: { fontSize:22, fontWeight:'bold', marginTop:5, textAlign:'center' },
    correctFeedbackTitle: { color:'#388E3C' },
    incorrectFeedbackTitle: { color:'#D32F2F' },
    feedbackHeader: { fontSize:16, fontWeight:'bold', color:'#555', marginTop:10 },
    feedbackText: { fontSize:16, color:'#333', lineHeight:22, marginBottom:10 },
    theoryBox: { backgroundColor:'#FFF8E1', padding:15, borderRadius:10, marginTop:10, borderLeftWidth:4, borderLeftColor:'#FFC107' },
    theoryTitle: { fontWeight:'bold', color:'#FFA000', marginBottom:5 },
    theoryText: { fontStyle:'italic', color:'#5D4037' },

    // --- MODAL STYLES (Оновлені) ---
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '90%', backgroundColor: '#F5F5F5', borderRadius: 25, padding: 25, elevation: 10 },
    modalTitle: { fontSize: 26, fontWeight: 'bold', textAlign: 'center', marginBottom: 5, color: '#333' },
    modalSubtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 25 },

    // Кнопка режиму
    modeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        borderRadius: 20,
        marginBottom: 15,
        elevation: 5,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    // Кружок іконки
    iconCircle: {
        width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.9)',
        justifyContent: 'center', alignItems: 'center', marginRight: 15
    },
    // Текст всередині кнопки (flex: 1 вирішує проблему випирання)
    textContainer: { flex: 1 },
    modeBtnTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFF', marginBottom: 2 },
    modeBtnDesc: { fontSize: 13, color: 'rgba(255,255,255,0.9)', lineHeight: 18 },

    closeModalBtn: { marginTop: 10, padding: 10, alignSelf: 'center' },
    closeModalText: { color: '#888', fontSize: 16 }
});

export default TestScreen;
