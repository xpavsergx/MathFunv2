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
    Modal,
    useColorScheme,
    StatusBar,
    SafeAreaView
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainAppStackParamList } from '../../App';
import questionsDatabase from '../data/questionsDb.json';

// Firebase
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS } from '../styles/theme';
import Animated, { FadeInUp, ZoomIn } from 'react-native-reanimated';

// Serwis statystyk
import { saveTestResultToHistory } from '../services/userStatsService';

interface Question {
    id: string | number;
    type: 'practice' | 'theory';
    difficulty: 'łatwe' | 'średnie' | 'trudne';
    questionText: string;
    options: string[];
    correctAnswerIndex: number;
    correctAnswerExplanation: string;
}

type TestScreenProps = NativeStackScreenProps<MainAppStackParamList, 'Test'>;

const ASSESSMENT_TIME_SECONDS = 15 * 60;

function TestScreen({ route, navigation }: TestScreenProps) {
    const { grade, topic, subTopic, testType = 'subTopic', duelId, mode: navMode } = route.params;

    const isDarkMode = useColorScheme() === 'dark';
    const currentUser = auth().currentUser;

    // ✅ DYNAMICZNE KOLORY (DLA DARK MODE)
    const theme = {
        text: isDarkMode ? '#FFFFFF' : '#1E293B',
        subText: isDarkMode ? '#CBD5E1' : '#64748B',
        card: isDarkMode ? '#1E293B' : '#FFFFFF',
        border: isDarkMode ? '#334155' : '#E2E8F0',
        modalContent: isDarkMode ? '#1E293B' : '#F8FAFC',
        optionSelected: isDarkMode ? 'rgba(0, 188, 212, 0.3)' : '#E0F7FA',
        bg: isDarkMode ? require('../assets/background_dark.jpg') : require('../assets/images/tlo.png')
    };

    // --- STANY ---
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [selectedAnswerIndex, setSelectedAnswerIndex] = useState<number | null>(null);
    const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
    const [showFeedback, setShowFeedback] = useState(false);
    const [timeLeft, setTimeLeft] = useState(ASSESSMENT_TIME_SECONDS);
    const [inventory, setInventory] = useState<any>({ hint5050: 0, doubleXp: 0 });
    const [disabledAnswers, setDisabledAnswers] = useState<number[]>([]);
    const [isDoubleXpActive, setIsDoubleXpActive] = useState(false);
    const [hintUsedThisQ, setHintUsedThisQ] = useState(false);

    // ✅ PRZYWRÓCONA LOGIKA WYBORU TRYBU
    const isForcedAssess = !!(duelId || subTopic === 'Sprawdzian końcowy');
    const [activeMode, setActiveMode] = useState<'learn' | 'assess'>(
        isForcedAssess ? 'assess' : 'learn'
    );
    const [isModeSelectionVisible, setModeSelectionVisible] = useState(!isForcedAssess);

    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const scoreRef = useRef(score);
    useEffect(() => { scoreRef.current = score; }, [score]);

    // 1. ✅ BEZPIECZNY LOGOUT (ZABEZPIECZENIE PRZED BŁĘDEM 'exists' of null)
    useEffect(() => {
        if (!currentUser) return;

        const userRef = firestore().collection('users').doc(currentUser.uid);
        const unsubscribe = userRef.onSnapshot(
            (doc) => {
                // Sprawdzamy czy doc w ogóle istnieje (nie jest nullem)
                if (doc && doc.exists) {
                    setInventory(doc.data()?.inventory || { hint5050: 0, doubleXp: 0 });
                }
            },
            (error) => {
                console.log("Słuchacz Firebase odłączony pomyślnie.");
            }
        );

        return () => unsubscribe();
    }, [currentUser]);

    // 2. ŁADOWANIE PYTAŃ
    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const db: any = (questionsDatabase as any).default || questionsDatabase;
                let loaded: Question[] = [];

                if (duelId) {
                    const duelDoc = await firestore().collection('duels').doc(duelId).get();
                    if (duelDoc && duelDoc.exists) {
                        const ids = (duelDoc.data()?.questionIds || []).map(String);
                        const allQ: Question[] = [];
                        const find = (obj: any) => {
                            if (obj.questions) allQ.push(...obj.questions);
                            for (let k in obj) if (typeof obj[k] === 'object' && k !== 'questions') find(obj[k]);
                        };
                        find(db);
                        loaded = allQ.filter(q => ids.includes(String(q.id)));
                    }
                } else {
                    const data = db[String(grade)]?.[topic];
                    if (testType === 'mainTopic' || subTopic === 'Sprawdzian końcowy') {
                        const allQ: Question[] = [];
                        const find = (obj: any) => {
                            if (obj.questions) allQ.push(...obj.questions);
                            for (let k in obj) if (typeof obj[k] === 'object' && k !== 'questions') find(obj[k]);
                        };
                        find(data);
                        loaded = allQ.sort(() => 0.5 - Math.random()).slice(0, subTopic === 'Sprawdzian końcowy' ? 30 : 10);
                    } else {
                        loaded = data?.[subTopic]?.questions || [];
                    }
                }
                setQuestions(loaded);
            } catch (e) { console.error(e); }
            setLoading(false);
        };
        load();
    }, [duelId, grade, topic, subTopic]);

    // 3. TIMER
    useEffect(() => {
        if (activeMode === 'assess' && !isModeSelectionVisible && questions.length > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft(p => {
                    if (p <= 1) {
                        clearInterval(timerRef.current!);
                        finishTest(scoreRef.current);
                        return 0;
                    }
                    return p - 1;
                });
            }, 1000);
            return () => clearInterval(timerRef.current!);
        }
    }, [activeMode, isModeSelectionVisible, questions.length]);

    // 4. ZAKOŃCZENIE
    const finishTest = async (finalScore: number) => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (!currentUser) return;

        if (duelId) {
            await firestore().collection('duels').doc(duelId).update({
                [`results.${currentUser.uid}`]: {
                    score: finalScore,
                    time: ASSESSMENT_TIME_SECONDS - timeLeft,
                    nickname: currentUser.displayName || 'Gracz'
                }
            });
            navigation.replace('DuelResult', { duelId });
        } else {
            await saveTestResultToHistory(finalScore, questions.length, subTopic || topic);
            navigation.replace('Results', {
                score: finalScore,
                total: questions.length,
                originalTestParams: route.params,
                isDoubleXp: isDoubleXpActive,
                mode: activeMode
            });
        }
    };

    const handleAnswerSelect = (index: number) => {
        if (!isAnswerSubmitted) setSelectedAnswerIndex(index);
    };

    const handleSubmit = () => {
        if (selectedAnswerIndex === null) return Alert.alert("Uwaga!", "Proszę wybrać odpowiedź.");
        setIsAnswerSubmitted(true);
        const isCorrect = selectedAnswerIndex === questions[currentQuestionIndex].correctAnswerIndex;
        if (isCorrect) setScore(score + 1);

        if (activeMode === 'learn') setShowFeedback(true);
        else {
            setTimeout(() => {
                if (currentQuestionIndex + 1 < questions.length) handleNext();
                else finishTest(isCorrect ? score + 1 : score);
            }, 1000);
        }
    };

    const handleNext = () => {
        if (currentQuestionIndex + 1 < questions.length) {
            setCurrentQuestionIndex(prev => prev + 1);
            setSelectedAnswerIndex(null);
            setIsAnswerSubmitted(false);
            setShowFeedback(false);
            setDisabledAnswers([]);
            setHintUsedThisQ(false);
        } else finishTest(score);
    };

    const handleUseHint = async () => {
        if (hintUsedThisQ || (inventory.hint5050 || 0) <= 0) return;
        setHintUsedThisQ(true);
        const q = questions[currentQuestionIndex];
        const incorrect = q.options.map((_, i) => i).filter(i => i !== q.correctAnswerIndex);
        setDisabledAnswers(incorrect.sort(() => 0.5 - Math.random()).slice(0, 2));
        await firestore().collection('users').doc(currentUser!.uid).update({ 'inventory.hint5050': firestore.FieldValue.increment(-1) });
    };

    const handleUseDoubleXp = async () => {
        if (isDoubleXpActive || (inventory.doubleXp || 0) <= 0) return;
        setIsDoubleXpActive(true);
        await firestore().collection('users').doc(currentUser!.uid).update({ 'inventory.doubleXp': firestore.FieldValue.increment(-1) });
        Alert.alert("Aktywowano!", "Zdobędziesz 2x więcej XP!");
    };

    if (loading) return <View style={[styles.center, {backgroundColor: isDarkMode ? COLORS.backgroundDark : '#fff'}]}><ActivityIndicator size="large" color={COLORS.primary}/></View>;

    const curQ = questions[currentQuestionIndex];
    const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

    return (
        <ImageBackground source={theme.bg} style={styles.bgImage} resizeMode="cover">
            <SafeAreaView style={{ flex: 1 }}>
                <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

                {/* ✅ MODAL WYBORU TRYBU */}
                <Modal visible={isModeSelectionVisible} transparent animationType="fade">
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalContent, {backgroundColor: theme.modalContent}]}>
                            <Text style={[styles.modalTitle, {color: theme.text}]}>Wybierz tryb</Text>
                            <Text style={[styles.modalSubtitle, {color: theme.subText}]}>Jak chcesz rozwiązywać zadania?</Text>

                            <TouchableOpacity style={[styles.modeButton, {backgroundColor: '#4CAF50'}]} onPress={() => { setActiveMode('learn'); setModeSelectionVisible(false); }}>
                                <View style={styles.iconCircle}><Ionicons name="school" size={28} color="#4CAF50" /></View>
                                <View style={styles.textContainer}><Text style={styles.modeBtnTitle}>Trening</Text><Text style={styles.modeBtnDesc}>Widzę wyjaśnienia i uczę się.</Text></View>
                                <Ionicons name="chevron-forward" size={24} color="#FFF" />
                            </TouchableOpacity>

                            <TouchableOpacity style={[styles.modeButton, {backgroundColor: '#FF9800'}]} onPress={() => { setActiveMode('assess'); setModeSelectionVisible(false); }}>
                                <View style={styles.iconCircle}><Ionicons name="timer" size={28} color="#FF9800" /></View>
                                <View style={styles.textContainer}><Text style={styles.modeBtnTitle}>Sprawdzian</Text><Text style={styles.modeBtnDesc}>Na czas, bez podpowiedzi.</Text></View>
                                <Ionicons name="chevron-forward" size={24} color="#FFF" />
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.closeModalBtn} onPress={() => navigation.goBack()}><Text style={styles.closeModalText}>Anuluj</Text></TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                <ScrollView contentContainerStyle={styles.container}>
                    {activeMode === 'assess' && !isModeSelectionVisible && (
                        <Text style={styles.timerText}>⏱ {formatTime(timeLeft)}</Text>
                    )}

                    <View style={styles.headerContainer}>
                        <Text style={[styles.questionCounter, {color: theme.text}]}>Pytanie {currentQuestionIndex + 1} / {questions.length}</Text>
                        {curQ?.difficulty && <Text style={styles.difficultyText}>{curQ.difficulty.toUpperCase()}</Text>}
                    </View>

                    <Text style={[styles.questionText, {color: theme.text}]}>{curQ?.questionText}</Text>

                    <View style={styles.optionsContainer}>
                        {curQ?.options.map((option, index) => {
                            const isSelected = selectedAnswerIndex === index;
                            const isCorrect = curQ.correctAnswerIndex === index;
                            const isDis = disabledAnswers.includes(index);

                            let bCol = theme.card;
                            let tCol = theme.text;
                            if (isSelected) { bCol = theme.optionSelected; }
                            if (isAnswerSubmitted) {
                                if (isCorrect) { bCol = '#C8E6C9'; tCol = '#1B5E20'; }
                                else if (isSelected) { bCol = '#FFCDD2'; tCol = '#B71C1C'; }
                            }

                            return (
                                <TouchableOpacity
                                    key={index}
                                    disabled={isAnswerSubmitted || isDis}
                                    onPress={() => handleAnswerSelect(index)}
                                    style={[styles.optionButton, {backgroundColor: bCol, borderColor: isSelected ? COLORS.primary : theme.border, opacity: isDis ? 0.3 : 1}]}
                                >
                                    <Text style={[styles.optionText, {color: tCol}, isAnswerSubmitted && isCorrect && {fontWeight: 'bold'}]}>{option}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* ✅ POWER-UPY (Tylko w trybie Treningu) */}
                    {activeMode === 'learn' && !isAnswerSubmitted && (
                        <View style={styles.powerUpContainer}>
                            <TouchableOpacity onPress={handleUseHint} style={[styles.powerBtn, {backgroundColor: theme.card, opacity: (inventory.hint5050||0) > 0 ? 1 : 0.3}]}>
                                <Ionicons name="sparkles" size={20} color="#00796B" />
                                <Text style={styles.powerTxt}>50/50 ({(inventory.hint5050||0)})</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleUseDoubleXp} style={[styles.powerBtn, {backgroundColor: theme.card, borderColor: '#FF9800', opacity: (inventory.doubleXp||0) > 0 ? 1 : 0.3}]}>
                                <Ionicons name="flash" size={20} color="#FF9800" />
                                <Text style={[styles.powerTxt, {color: '#FF9800'}]}>2x XP ({(inventory.doubleXp||0)})</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {!isAnswerSubmitted && (
                        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                            <Text style={styles.submitButtonText}>{activeMode === 'learn' ? "Sprawdź" : "Dalej"}</Text>
                        </TouchableOpacity>
                    )}

                    {/* ✅ FEEDBACK Z WYJAŚNIENIEM */}
                    {isAnswerSubmitted && showFeedback && activeMode === 'learn' && (
                        <Animated.View entering={FadeInUp} style={[styles.feedbackContainer, {backgroundColor: theme.card}]}>
                            <View style={{alignItems:'center', marginBottom: 10}}>
                                <Ionicons name={selectedAnswerIndex === curQ.correctAnswerIndex ? "checkmark-circle" : "close-circle"} size={44} color={selectedAnswerIndex === curQ.correctAnswerIndex ? "#388E3C" : "#D32F2F"} />
                                <Text style={[styles.feedbackTitle, {color: selectedAnswerIndex === curQ.correctAnswerIndex ? "#388E3C" : "#D32F2F"}]}>
                                    {selectedAnswerIndex === curQ.correctAnswerIndex ? "Świetnie! 🌟" : "Niestety, pomyłka."}
                                </Text>
                            </View>
                            <Text style={[styles.feedbackHeader, {color: theme.text}]}>Wyjaśnienie:</Text>
                            <Text style={[styles.feedbackText, {color: theme.text}]}>{curQ.correctAnswerExplanation}</Text>
                            <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                                <Text style={styles.submitButtonText}>Następne pytanie</Text>
                                <Ionicons name="arrow-forward" size={20} color="#fff" style={{marginLeft: 10}} />
                            </TouchableOpacity>
                        </Animated.View>
                    )}
                </ScrollView>
            </SafeAreaView>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    bgImage: { flex: 1, width: '100%', height: '100%' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    container: { flexGrow: 1, padding: 20, paddingBottom: 50, justifyContent: 'center' },
    headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    questionCounter: { fontSize: 16, fontWeight: 'bold' },
    difficultyText: { fontSize: 12, color: '#1976D2', fontWeight: 'bold', backgroundColor: '#E3F2FD', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    timerText: { fontSize: 20, fontWeight: 'bold', color: '#D32F2F', textAlign: 'center', marginBottom: 15, backgroundColor: 'rgba(255,255,255,0.9)', padding: 5, borderRadius: 10, alignSelf: 'center' },
    questionText: { fontSize: 22, fontWeight: 'bold', marginBottom: 25, textAlign: 'center', lineHeight: 30 },
    optionsContainer: { marginBottom: 20 },
    optionButton: { paddingVertical: 15, paddingHorizontal: 15, marginVertical: 8, borderRadius: 15, borderWidth: 2, elevation: 2 },
    optionText: { fontSize: 18, textAlign: 'center' },
    submitButton: { backgroundColor: '#00BCD4', paddingVertical: 18, borderRadius: 25, alignItems: 'center', marginTop: 10, elevation: 4 },
    submitButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    nextButton: { flexDirection: 'row', backgroundColor: '#FF9800', paddingVertical: 15, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
    powerUpContainer: { flexDirection: 'row', justifyContent: 'center', gap: 15, marginBottom: 20 },
    powerBtn: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 20, borderWidth: 1, borderColor: '#00796B', elevation: 2 },
    powerTxt: { fontSize: 13, fontWeight: 'bold', marginLeft: 5, color: '#00796B' },
    feedbackContainer: { marginTop: 20, padding: 20, borderRadius: 20, elevation: 5 },
    feedbackTitle: { fontSize: 22, fontWeight: 'bold', marginTop: 5, textAlign: 'center' },
    feedbackHeader: { fontSize: 16, fontWeight: 'bold', marginTop: 10 },
    feedbackText: { fontSize: 16, lineHeight: 22, marginBottom: 10 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '90%', borderRadius: 30, padding: 25, elevation: 10 },
    modalTitle: { fontSize: 26, fontWeight: 'bold', textAlign: 'center', marginBottom: 5 },
    modalSubtitle: { fontSize: 16, textAlign: 'center', marginBottom: 25 },
    modeButton: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 20, marginBottom: 15, elevation: 5 },
    iconCircle: { width: 45, height: 45, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.9)', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    textContainer: { flex: 1 },
    modeBtnTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFF' },
    modeBtnDesc: { fontSize: 12, color: 'rgba(255,255,255,0.9)' },
    closeModalBtn: { marginTop: 10, padding: 10, alignSelf: 'center' },
    closeModalText: { color: '#888', fontSize: 16 }
});

export default TestScreen;
