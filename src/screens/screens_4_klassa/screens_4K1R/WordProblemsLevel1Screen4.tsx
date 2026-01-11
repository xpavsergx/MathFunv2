import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    Button,
    Keyboard,
    ImageBackground,
    Animated,
    StatusBar,
    Image,
    Dimensions,
    TouchableOpacity,
    Modal,
    Platform,
    KeyboardAvoidingView,
    TouchableWithoutFeedback,
    ScrollView,
    InteractionManager
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';

import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { awardXpAndCoins } from '../../../services/xpService';

const EXERCISE_ID = "wordProblemsLevel1";
const TASKS_LIMIT = 50;
const screenWidth = Dimensions.get('window').width;

const rnd = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

// --- GENERACJA ZADAŃ ---
const generateTask = () => {
    const type = rnd(1, 8);
    switch (type) {
        case 1: {
            const total = rnd(120, 250);
            const read = rnd(30, total - 20);
            return {
                text: `Książka "Przygody w Kosmosie" ma ${total} stron. Bartek przeczytał już ${read} stron. Ile stron zostało mu do końca?`,
                answer: total - read,
                hint: `Odejmij liczbę przeczytanych stron (${read}) od całej liczby stron (${total}).`
            };
        }
        case 2: {
            const price = rnd(3, 6);
            const count = rnd(10, 40);
            const total = price * count;
            return {
                text: `Podczas szkolnego kiermaszu babeczki sprzedawano po ${price} zł za sztukę. Klasa 4b zarobiła łącznie ${total} zł. Ile babeczek sprzedali uczniowie?`,
                answer: count,
                hint: `Podziel zarobioną kwotę (${total}) przez cenę jednej babeczki (${price}).`
            };
        }
        case 3: {
            const gameBig = rnd(60, 120);
            const diff = rnd(15, 40);
            return {
                text: `Gra wyścigowa zajmuje na dysku ${gameBig} GB, a gra logiczna zajmuje o ${diff} GB mniej. Ile miejsca na dysku zajmuje gra logiczna?`,
                answer: gameBig - diff,
                hint: `Odejmij różnicę (${diff}) od wielkości gry wyścigowej (${gameBig}).`
            };
        }
        case 4: {
            const oldPrice = rnd(120, 200);
            const diff = rnd(20, 50);
            const newPrice = oldPrice - diff;
            return {
                text: `Przed promocją buty sportowe kosztowały ${oldPrice} zł, a teraz kosztują ${newPrice} zł. O ile złotych obniżono ich cenę?`,
                answer: diff,
                hint: `Odejmij nową cenę (${newPrice}) od starej (${oldPrice}).`
            };
        }
        case 5: {
            const newPrice = rnd(80, 150);
            const diff = rnd(15, 40);
            return {
                text: `Cenę plecaka obniżono o ${diff} zł i teraz kosztuje on ${newPrice} zł. Jaka była cena plecaka przed obniżką?`,
                answer: newPrice + diff,
                hint: `Dodaj kwotę obniżki (${diff}) do obecnej ceny (${newPrice}).`
            };
        }
        case 6: {
            const multiplier = rnd(2, 3);
            const morningPrice = rnd(12, 20);
            const eveningPrice = morningPrice * multiplier;
            return {
                text: `Bilet do kina na wieczorny seans kosztuje ${eveningPrice} zł. Bilet na poranny seans jest ${multiplier} razy tańszy. Ile kosztuje bilet rano?`,
                answer: morningPrice,
                hint: `Podziel cenę wieczorną (${eveningPrice}) przez ${multiplier}.`
            };
        }
        case 7: {
            const capacity = rnd(8, 15);
            const people = rnd(30, 80);
            const buses = Math.ceil(people / capacity);
            return {
                text: `Jeden bus zabiera na wycieczkę ${capacity} osób. Ile busów trzeba zamówić, aby przewieźć ${people} uczniów?`,
                answer: buses,
                hint: `Podziel liczbę uczniów przez miejsca w busie. Jeśli zostanie reszta, potrzebny jest jeszcze jeden bus.`
            };
        }
        case 8: {
            const ageKacper = rnd(4, 10);
            const diff = rnd(3, 8);
            const ageOlek = ageKacper + diff;
            return {
                text: `Kacper ma ${ageKacper} lat, a jego starszy brat Olek ma ${ageOlek} lat. Ile lat miał Olek, gdy urodził się Kacper?`,
                answer: diff,
                hint: `Oblicz różnicę wieku między braćmi: odejmij wiek Kacpra od wieku Olka.`
            };
        }
        default: return { text: 'Ile to 2+2?', answer: 4, hint: 'Dodaj liczby.' };
    }
};

// --- KOMPONENT BRUDNOPISU ---
const DrawingModal = ({ visible, onClose, problemText }: { visible: boolean; onClose: () => void, problemText: string }) => {
    const [paths, setPaths] = useState<string[]>([]);
    const [currentPath, setCurrentPath] = useState('');
    const handleClear = () => { setPaths([]); setCurrentPath(''); };
    const onTouchMove = (evt: any) => {
        const { locationX, locationY } = evt.nativeEvent;
        if (!currentPath) setCurrentPath(`M${locationX},${locationY}`);
        else setCurrentPath(`${currentPath} L${locationX},${locationY}`);
    };
    const onTouchEnd = () => { if (currentPath) { setPaths([...paths, currentPath]); setCurrentPath(''); } };

    return (
        <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={styles.drawingContainer}>
                    <View style={styles.drawingHeader}>
                        <TouchableOpacity onPress={handleClear} style={styles.headerButton}>
                            <Text style={styles.headerButtonText}>🗑️ Wyczyść</Text>
                        </TouchableOpacity>
                        <Text style={styles.drawingTitle}>Brudnopis</Text>
                        <TouchableOpacity onPress={onClose} style={styles.headerButton}>
                            <Text style={styles.headerButtonText}>❌ Zamknij</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.problemPreviewContainer}>
                        <Text style={styles.problemPreviewLabel}>Treść zadania:</Text>
                        <Text style={styles.problemPreviewTextSmall}>{problemText}</Text>
                    </View>
                    <View style={styles.canvas} onStartShouldSetResponder={() => true} onMoveShouldSetResponder={() => true} onResponderGrant={(evt) => {
                        const { locationX, locationY } = evt.nativeEvent;
                        setCurrentPath(`M${locationX},${locationY}`);
                    }} onResponderMove={onTouchMove} onResponderRelease={onTouchEnd}>
                        <Svg height="100%" width="100%">
                            {paths.map((d, index) => (<Path key={index} d={d} stroke="#000" strokeWidth={3} fill="none" />))}
                            <Path d={currentPath} stroke="#000" strokeWidth={3} fill="none" />
                        </Svg>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const WordProblemsLevel1Screen4 = () => {
    const navigation = useNavigation();
    const inputRef = useRef<TextInput>(null);

    const [taskData, setTaskData] = useState<{text: string, answer: number, hint: string}>({ text: '', answer: 0, hint: '' });
    const [userAnswer, setUserAnswer] = useState('');
    const [firstAttempt, setFirstAttempt] = useState(true);
    const [correctInput, setCorrectInput] = useState<boolean | null>(null);
    const [readyForNext, setReadyForNext] = useState(false);
    const [isFinished, setIsFinished] = useState(false);

    const [counter, setCounter] = useState(0);
    const [correctCount, setCorrectCount] = useState(0);
    const [wrongCount, setWrongCount] = useState(0);
    const [message, setMessage] = useState('');
    const [showHint, setShowHint] = useState(false);
    const [showScratchpad, setShowScratchpad] = useState(false);
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);

    const [showMilestone, setShowMilestone] = useState(false);
    const [sessionCorrect, setSessionCorrect] = useState(0);

    const backgroundColor = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const k1 = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
        const k2 = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
        nextTask();
        return () => { k1.remove(); k2.remove(); };
    }, []);

    const nextTask = () => {
        if (counter >= TASKS_LIMIT) {
            setIsFinished(true);
            return;
        }

        if (counter > 0 && counter % 10 === 0 && !showMilestone && counter < TASKS_LIMIT) {
            setShowMilestone(true);
            return;
        }

        const t = generateTask();
        setTaskData(t);
        setUserAnswer('');
        setFirstAttempt(true);
        setCorrectInput(null);
        setReadyForNext(false);
        setMessage('');
        setShowHint(false);
        setCounter(prev => prev + 1);
        backgroundColor.setValue(0);
        setTimeout(() => inputRef.current?.focus(), 100);
    };

    const handleRestart = () => {
        setIsFinished(false);
        setCounter(0);
        setCorrectCount(0);
        setWrongCount(0);
        setSessionCorrect(0);
        nextTask();
    };

    const handleCheck = () => {
        if (!userAnswer.trim()) {
            setMessage('Wpisz odpowiedź!');
            return;
        }
        Keyboard.dismiss();

        requestAnimationFrame(() => {
            const numAnswer = Number(userAnswer.replace(',', '.'));
            const isCorrect = Math.abs(numAnswer - taskData.answer) < 0.01;

            const currentUser = auth().currentUser;
            const statsDocRef = currentUser ? firestore().collection('users').doc(currentUser.uid).collection('exerciseStats').doc(EXERCISE_ID) : null;

            if (isCorrect) {
                setCorrectInput(true);
                setCorrectCount(prev => prev + 1);
                setSessionCorrect(prev => prev + 1);
                statsDocRef?.set({ totalCorrect: firestore.FieldValue.increment(1) }, { merge: true }).catch(console.error);

                Animated.timing(backgroundColor, { toValue: 1, duration: 500, useNativeDriver: false }).start();
                setMessage('Świetnie! ✅');
                awardXpAndCoins(5, 1);
                setReadyForNext(true);
            } else {
                setCorrectInput(false);
                Animated.sequence([
                    Animated.timing(backgroundColor, { toValue: -1, duration: 700, useNativeDriver: false }),
                    Animated.timing(backgroundColor, { toValue: 0, duration: 500, useNativeDriver: false }),
                ]).start();

                if (firstAttempt) {
                    setMessage('Błąd! Spróbuj jeszcze raz ✍️');
                    setUserAnswer('');
                    setFirstAttempt(false);
                } else {
                    setWrongCount(prev => prev + 1);
                    statsDocRef?.set({ totalWrong: firestore.FieldValue.increment(1) }, { merge: true }).catch(console.error);
                    setMessage(`Błąd! Poprawna odpowiedź: ${taskData.answer}`);
                    setUserAnswer(taskData.answer.toString());
                    setReadyForNext(true);
                }
            }
        });
    };

    const handleTextChange = (text: string) => {
        setUserAnswer(text);
        if (correctInput === false) setCorrectInput(null);
    };

    const getValidationStyle = () => correctInput === null ? styles.input : correctInput ? styles.correctFinal : styles.errorFinal;
    const bgInterpolation = backgroundColor.interpolate({ inputRange: [-1, 0, 1], outputRange: ['rgba(255, 0, 0, 0.2)', 'rgba(255, 255, 255, 0)', 'rgba(0, 255, 0, 0.2)'] });

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ flex: 1 }}>
                <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
                <ImageBackground source={require('../../../assets/background.jpg')} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: bgInterpolation }]} pointerEvents="none" />

                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardContainer}>
                    {!isKeyboardVisible && (
                        <View style={styles.topButtons}>
                            <TouchableOpacity onPress={() => setShowScratchpad(true)} style={{ marginRight: 20, alignItems: 'center' }}>
                                <Image source={require('../../../assets/pencil.png')} style={styles.iconTop} />
                                <Text style={styles.buttonLabel}>Brudnopis</Text>
                            </TouchableOpacity>
                            <View style={{ alignItems: 'center' }}>
                                <TouchableOpacity onPress={() => setShowHint(prev => !prev)}>
                                    <Image source={require('../../../assets/question.png')} style={styles.iconTop} />
                                </TouchableOpacity>
                                <Text style={styles.buttonLabel}>Pomoc</Text>
                            </View>
                        </View>
                    )}

                    {showHint && !isKeyboardVisible && (
                        <View style={styles.hintBox}>
                            <Text style={styles.hintTitle}>Podpowiedź:</Text>
                            <Text style={styles.hintText}>{taskData.hint}</Text>
                        </View>
                    )}

                    <DrawingModal visible={showScratchpad} onClose={() => setShowScratchpad(false)} problemText={taskData.text} />

                    {/* MODAL SERII */}
                    <Modal visible={showMilestone} transparent={true} animationType="slide">
                        <View style={styles.modalOverlay}>
                            <View style={styles.milestoneCard}>
                                <Text style={styles.milestoneTitle}>Podsumowanie serii 📊</Text>
                                <View style={styles.statsRow}>
                                    <Text style={styles.statsText}>Poprawne: {sessionCorrect} / 10</Text>
                                </View>
                                <View style={styles.milestoneButtons}>
                                    <TouchableOpacity style={[styles.mButton, { backgroundColor: '#28a745' }]}
                                                      onPress={() => { setShowMilestone(false); setSessionCorrect(0); nextTask(); }}>
                                        <Text style={styles.mButtonText}>Kontynuuj</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.mButton, { backgroundColor: '#007AFF' }]}
                                                      onPress={() => { setShowMilestone(false); navigation.goBack(); }}>
                                        <Text style={styles.mButtonText}>Wyjdź</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>

                    {/* MODAL KOŃCOWY */}
                    <Modal visible={isFinished} transparent={true} animationType="fade">
                        <View style={styles.modalOverlay}>
                            <View style={styles.milestoneCard}>
                                <Text style={styles.milestoneTitle}>Trening ukończony! 🏆</Text>
                                <Text style={styles.suggestionText}>Rozwiązałeś wszystkie zadania.</Text>
                                <View style={styles.statsRow}>
                                    <Text style={styles.statsText}>Wynik: {correctCount} / {TASKS_LIMIT}</Text>
                                </View>
                                <View style={styles.milestoneButtons}>
                                    <TouchableOpacity style={[styles.mButton, { backgroundColor: '#28a745' }]} onPress={handleRestart}>
                                        <Text style={styles.mButtonText}>Od nowa</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.mButton, { backgroundColor: '#dc3545' }]} onPress={() => { setIsFinished(false); navigation.goBack(); }}>
                                        <Text style={styles.mButtonText}>Wyjdź</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>

                    <ScrollView contentContainerStyle={styles.centerContent} keyboardShouldPersistTaps="handled">
                        <View style={styles.card}>
                            <View style={styles.overlayBackground} />
                            <Text style={styles.taskLabel}>Treść zadania:</Text>
                            <Text style={styles.taskText}>{taskData.text}</Text>
                            <TextInput
                                ref={inputRef}
                                style={[getValidationStyle(), styles.finalInput]}
                                keyboardType="numeric"
                                value={userAnswer}
                                onChangeText={handleTextChange}
                                placeholder="Twój wynik"
                                placeholderTextColor="#aaa"
                                editable={!readyForNext}
                                onSubmitEditing={readyForNext ? nextTask : handleCheck}
                            />
                            <View style={styles.buttonContainer}>
                                <TouchableOpacity
                                    style={[styles.customBtn, { backgroundColor: readyForNext ? '#28a745' : '#007AFF' }]}
                                    onPress={readyForNext ? nextTask : handleCheck}
                                >
                                    <Text style={styles.customBtnText}>{readyForNext ? 'Dalej' : 'Sprawdź'}</Text>
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.counterTextSmall}>Zadanie: {counter} / {TASKS_LIMIT}</Text>
                            {message ? <Text style={[styles.result, correctInput ? styles.correctText : styles.errorText]}>{message}</Text> : null}
                        </View>
                    </ScrollView>

                    {!isKeyboardVisible && (
                        <View style={styles.iconsBottom}>
                            <Image source={require('../../../assets/happy.png')} style={styles.iconSame} />
                            <Text style={styles.counterTextIcons}>{correctCount}</Text>
                            <Image source={require('../../../assets/sad.png')} style={styles.iconSame} />
                            <Text style={styles.counterTextIcons}>{wrongCount}</Text>
                        </View>
                    )}
                </KeyboardAvoidingView>
            </View>
        </TouchableWithoutFeedback>
    );
};

const iconSize = screenWidth * 0.25;

const styles = StyleSheet.create({
    keyboardContainer: { flex: 1, justifyContent: 'center' },
    centerContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 40 },
    topButtons: { position: 'absolute', top: 40, right: 20, flexDirection: 'row', alignItems: 'center', zIndex: 10 },
    iconTop: { width: 80, height: 80, resizeMode: 'contain' },
    buttonLabel: { fontSize: 14, fontWeight: 'bold', color: '#007AFF', marginTop: 2 },
    hintBox: { position: 'absolute', top: 130, right: 20, padding: 15, backgroundColor: 'rgba(255,255,255,0.98)', borderRadius: 15, maxWidth: 280, zIndex: 11, elevation: 5, borderWidth: 1, borderColor: '#007AFF' },
    hintTitle: { fontSize: 16, fontWeight: 'bold', color: '#007AFF', marginBottom: 5, textAlign: 'center' },
    hintText: { fontSize: 16, color: '#333', lineHeight: 22 },
    card: { width: '100%', maxWidth: 450, borderRadius: 20, padding: 30, alignItems: 'center' },
    overlayBackground: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 20 },
    taskLabel: { fontSize: 16, fontWeight: '700', marginBottom: 10, color: '#007AFF', textTransform: 'uppercase' },
    taskText: { fontSize: 20, fontWeight: '600', marginBottom: 25, color: '#333', textAlign: 'center', lineHeight: 28 },
    input: { width: 220, height: 56, borderWidth: 2, borderColor: '#ccc', borderRadius: 10, textAlign: 'center', fontSize: 22, backgroundColor: '#fafafa', marginBottom: 15, color: '#333' },
    finalInput: { width: 220 },
    buttonContainer: { marginTop: 10, width: '80%' },
    customBtn: { paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
    customBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    result: { fontSize: 18, fontWeight: '700', marginTop: 20, textAlign: 'center' },
    counterTextSmall: { fontSize: 14, color: '#555', marginTop: 15 },
    iconsBottom: { position: 'absolute', bottom: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' },
    iconSame: { width: iconSize, height: iconSize, resizeMode: 'contain', marginHorizontal: 10 },
    counterTextIcons: { fontSize: 22, marginHorizontal: 8, color: '#333', fontWeight: 'bold' },
    correctFinal: { width: 220, height: 56, borderWidth: 3, borderRadius: 10, textAlign: 'center', fontSize: 22, backgroundColor: '#d4edda', borderColor: '#28a745', color: '#155724', marginBottom: 15 },
    errorFinal: { width: 220, height: 56, borderWidth: 3, borderRadius: 10, textAlign: 'center', fontSize: 22, backgroundColor: '#f8d7da', borderColor: '#dc3545', color: '#721c24', marginBottom: 15 },
    correctText: { color: '#28a745' },
    errorText: { color: '#dc3545' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    drawingContainer: { width: '95%', height: '85%', backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden' },
    drawingHeader: { height: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, backgroundColor: '#f0f0f0', borderBottomWidth: 1, borderBottomColor: '#ccc' },
    drawingTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    headerButton: { padding: 5 },
    headerButtonText: { fontSize: 16, color: '#007AFF' },
    problemPreviewContainer: { backgroundColor: '#f9f9f9', padding: 10, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee', width: '100%' },
    problemPreviewLabel: { fontSize: 12, color: '#777', textTransform: 'uppercase', marginBottom: 4 },
    problemPreviewTextSmall: { fontSize: 16, fontWeight: '600', color: '#007AFF', textAlign: 'center' },
    canvas: { flex: 1, backgroundColor: '#ffffff' },
    milestoneCard: { width: '90%', backgroundColor: '#fff', borderRadius: 20, padding: 25, alignItems: 'center' },
    milestoneTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 15 },
    statsRow: { marginVertical: 10, alignItems: 'center', backgroundColor: '#f8f9fa', padding: 15, borderRadius: 15, width: '100%' },
    statsText: { fontSize: 18, color: '#333', fontWeight: 'bold' },
    suggestionText: { fontSize: 15, color: '#666', textAlign: 'center', marginVertical: 20 },
    milestoneButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
    mButton: { paddingVertical: 12, borderRadius: 12, width: '48%', alignItems: 'center' },
    mButtonText: { color: '#fff', fontWeight: 'bold' }
});

export default WordProblemsLevel1Screen4;