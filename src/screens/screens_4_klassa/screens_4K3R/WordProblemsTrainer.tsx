import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TextInput, Button, Keyboard, ImageBackground,
    Animated, StatusBar, Image, Dimensions, TouchableOpacity, Modal,
    Platform, KeyboardAvoidingView, TouchableWithoutFeedback, ScrollView, InteractionManager
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { awardXpAndCoins } from '../../../services/xpService';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

const EXERCISE_ID = "WordProblemsTrainer";
const { width: screenWidth } = Dimensions.get('window');
const TASKS_LIMIT = 35;
const combinedIconSize = screenWidth * 0.25;

// --- MODAL BRUDNOPISU ---
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
                        <TouchableOpacity onPress={handleClear} style={styles.headerButton}><Text style={styles.headerButtonText}>🗑️ Wyczyść</Text></TouchableOpacity>
                        <Text style={styles.drawingTitle}>Brudnopis</Text>
                        <TouchableOpacity onPress={onClose} style={styles.headerButton}><Text style={styles.headerButtonText}>❌ Zamknij</Text></TouchableOpacity>
                    </View>
                    <View style={styles.problemPreviewContainer}>
                        <Text style={styles.problemPreviewLabel}>Twoje obliczenia do zadania:</Text>
                        <Text numberOfLines={2} style={styles.problemPreviewTextSmall}>{problemText}</Text>
                    </View>
                    <View style={styles.canvas} onStartShouldSetResponder={() => true} onMoveShouldSetResponder={() => true} onResponderGrant={(evt) => { const { locationX, locationY } = evt.nativeEvent; setCurrentPath(`M${locationX},${locationY}`); }} onResponderMove={onTouchMove} onResponderRelease={onTouchEnd}>
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

// --- GŁÓWNY KOMPONENT ---
const WordProblemsTrainer = () => {
    const [questionText, setQuestionText] = useState('');
    const [correctAnswer, setCorrectAnswer] = useState<number>(0);
    const [unit, setUnit] = useState('');
    const [currentHint, setCurrentHint] = useState('');

    const [userAnswer, setUserAnswer] = useState('');
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const [readyForNext, setReadyForNext] = useState<boolean>(false);
    const [attempts, setAttempts] = useState(0); // Licznik prób dla bieżącego zadania

    const [correctCount, setCorrectCount] = useState(0);
    const [wrongCount, setWrongCount] = useState(0);
    const [taskCount, setTaskCount] = useState(0);
    const [message, setMessage] = useState('');

    const [showScratchpad, setShowScratchpad] = useState(false);
    const [showHint, setShowHint] = useState(false);
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);

    const backgroundColor = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const k1 = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
        const k2 = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
        nextTask();
        return () => { k1.remove(); k2.remove(); };
    }, []);

    const generateProblem = () => {
        setMessage('');
        setIsCorrect(null);
        setReadyForNext(false);
        setUserAnswer('');
        setShowHint(false);
        setAttempts(0); // Resetujemy próby przy nowym zadaniu
        backgroundColor.setValue(0);

        const type = Math.floor(Math.random() * 13);
        let q = "";
        let ans = 0;
        let u = "";
        let h = "";

        const rnd = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

        switch (type) {
            case 0: // WYCIECZKA
                const students = rnd(15, 25);
                const studentPrice = rnd(12, 25);
                const teachers = rnd(2, 4);
                const teacherPrice = rnd(20, 40);
                ans = (students * studentPrice) + (teachers * teacherPrice);
                q = `Klasa wybrała się do muzeum. Kupiono ${students} biletów ulgowych po ${studentPrice} zł oraz ${teachers} bilety dla opiekunów po ${teacherPrice} zł. Ile zapłacono łącznie za wszystkie bilety?`;
                u = "zł";
                h = "Oblicz osobno koszt biletów dla uczniów i koszt biletów dla opiekunów. Potem dodaj do siebie te dwie kwoty.";
                break;
            case 1: // OSZCZĘDZANIE
                const weeks = rnd(8, 12);
                const weeklySave = rnd(15, 30);
                const piggBankStart = rnd(120, 250);
                ans = piggBankStart + (weeks * weeklySave);
                q = `Tomek zbiera na nowy rower. W skarbonce ma już ${piggBankStart} zł. Postanowił, że przez najbliższe ${weeks} tygodni będzie odkładał po ${weeklySave} zł tygodniowo. Ile pieniędzy uzbiera łącznie?`;
                u = "zł";
                h = "Najpierw policz, ile Tomek uzbiera przez te tygodnie. Potem dodaj to do pieniędzy, które już ma w skarbonce.";
                break;
            case 2: // PIŁKI
                const ballPrice = rnd(30, 60);
                const numBalls = rnd(3, 8);
                const netPrice = rnd(100, 300);
                const totalInvoice = netPrice + (numBalls * ballPrice);
                ans = ballPrice;
                q = `Szkoła zakupiła sprzęt za ${totalInvoice} zł. Kupiono siatkę za ${netPrice} zł oraz ${numBalls} jednakowych piłek. Ile kosztowała jedna piłka?`;
                u = "zł";
                h = "Od całej kwoty odejmij cenę siatki. Wynik podziel przez liczbę piłek, aby poznać cenę jednej.";
                break;
            case 3: // SŁOIKI
                const jars = rnd(6, 12);
                const honeyWeightDag = rnd(30, 60);
                const emptyJarWeightDag = rnd(20, 35);
                const totalWeightDag = jars * (honeyWeightDag + emptyJarWeightDag);
                ans = emptyJarWeightDag;
                q = `Babcia przygotowała ${jars} słoików z miodem. Pełne słoiki ważą razem ${totalWeightDag} dag. W każdym słoiku jest ${honeyWeightDag} dag miodu. Ile waży pysty słoik?`;
                u = "dag";
                h = "Oblicz wagę samego miodu (pomnóż ilość słoików przez wagę miodu). Odejmij to od wagi całkowitej, a wynik podziel przez liczbę słoików.";
                break;
            case 4: // MAKULATURA
                const classA = rnd(120, 300);
                const multiplier = rnd(2, 3);
                const classB = classA * multiplier;
                ans = classA + classB;
                q = `Klasa IVa zebrała ${classA} kg makulatury, a klasa IVb zebrała ${multiplier} razy więcej. Ile kilogramów makulatury zebrały obie klasy łącznie?`;
                u = "kg";
                h = "Najpierw policz ile zebrała klasa IVb (pomnóż wynik klasy IVa). Następnie dodaj wyniki obu klas do siebie.";
                break;
            case 5: // KSIĄŻKA
                const pagesSat = rnd(50, 120);
                const diff = rnd(15, 40);
                const pagesSun = pagesSat - diff;
                ans = pagesSat + pagesSun;
                q = `Ania w sobotę przeczytała ${pagesSat} stron, a w niedzielę o ${diff} stron mniej. Ile stron przeczytała Ania w ciągu tego weekendu?`;
                u = "str";
                h = "Oblicz ile stron Ania przeczytała w niedzielę (odejmowanie). Potem dodaj strony z soboty i niedzieli.";
                break;
            case 6: // SADZONKI
                const rows = rnd(12, 20);
                const perRow = rnd(15, 25);
                const extra = rnd(8, 19);
                ans = (rows * perRow) + extra;
                q = `W szkółce leśnej posadzono sosny w ${rows} rzędach, po ${perRow} drzewek w każdym. Obok posadzono dodatkowo ${extra} sosen. Ile łącznie drzewek posadzono?`;
                u = "szt";
                h = "Pomnóż liczbę rzędów przez liczbę drzewek w jednym rzędzie. Do wyniku dodaj te kilka dodatkowych drzewek.";
                break;
            case 7: // RESZTA
                const budget = [100, 200, 500][rnd(0, 2)];
                const item1 = rnd(25, 60);
                const item2 = rnd(15, 35);
                ans = budget - (item1 + item2);
                q = `Kasia miała banknot ${budget} zł. Kupiła książkę za ${item1} zł i piórnik za ${item2} zł. Ile reszty otrzymała?`;
                u = "zł";
                h = "Najpierw dodaj do siebie ceny zakupów. Potem odejmij tę sumę od banknotu, który miała Kasia.";
                break;
            case 8: // OBWÓD
                const width = rnd(8, 25);
                const length = width + rnd(5, 15);
                ans = 2 * width + 2 * length;
                q = `Ogródek pana Jana ma kształt prostokąta o szerokości ${width} m i długości ${length} m. Ile metrów siatki potrzeba na ogrodzenie tego ogródka?`;
                u = "m";
                h = "Obwód prostokąta to suma wszystkich boków. Dodaj do siebie: dwa razy długość i dwa razy szerokość.";
                break;
            case 9: // DRUKARKA
                const minutesBase = rnd(3, 6);
                const pagesBase = minutesBase * rnd(12, 20);
                const minutesTarget = rnd(8, 15);
                const speed = pagesBase / minutesBase;
                ans = speed * minutesTarget;
                q = `Szybka drukarka wydrukowała ${pagesBase} stron w ciągu ${minutesBase} minut. Ile stron wydrukuje ta drukarka w ciągu ${minutesTarget} minut, pracując tak samo szybko?`;
                u = "str";
                h = "Najpierw oblicz, ile stron drukuje się w ciągu 1 minuty (dzielenie). Potem pomnóż ten wynik przez nową liczbę minut.";
                break;
            case 10: // KSIĄŻKA OD KOŃCA
                const daysReading = rnd(4, 7);
                const pagesPerDay = rnd(15, 30);
                const pagesLeft = rnd(40, 90);
                ans = (daysReading * pagesPerDay) + pagesLeft;
                q = `Bartek czytał lekturę przez ${daysReading} dni, po ${pagesPerDay} stron dziennie. Do końca książki zostało mu jeszcze ${pagesLeft} stron. Ile stron ma cała książka?`;
                u = "str";
                h = "Policz ile stron Bartek już przeczytał (dni razy strony). Do tego wyniku dodaj liczbę stron, które mu zostały.";
                break;
            case 11: // HARCERZE
                const groupSize = rnd(4, 8);
                const tentCount = rnd(12, 25);
                const extraPeople = rnd(1, 3);
                ans = (tentCount * groupSize) + extraPeople;
                q = `Na obozie harcerskim rozbito ${tentCount} namiotów. W każdym śpi ${groupSize} osób. Oprócz tego w bazie jest ${extraPeople} opiekunów. Ile osób jest łącznie na obozie?`;
                u = "os";
                h = "Pomnóż liczbę namiotów przez liczbę osób w jednym namiocie. Na koniec dodaj liczbę opiekunów.";
                break;
            case 12: // WIEK
                const grandChildAge = rnd(4, 9);
                const multiplierAge = rnd(6, 9);
                const grandPaAge = grandChildAge * multiplierAge;
                ans = multiplierAge;
                q = `Dziadek Stanisław ma ${grandPaAge} lat, a jego wnuczek Jaś ma ${grandChildAge} lat. Ile razy starszy jest dziadek od wnuczka?`;
                u = "razy";
                h = "Pytanie 'ile razy' oznacza dzielenie. Podziel wiek dziadka przez wiek wnuczka.";
                break;
            default:
                ans = 100;
                q = "Zadanie domyślne: 50 + 50?";
                u = "";
                h = "Dodaj liczby.";
                break;
        }

        setQuestionText(q);
        setCorrectAnswer(ans);
        setUnit(u);
        setCurrentHint(h);
    };

    const handleCheck = () => {
        const userVal = parseInt(userAnswer, 10);
        if (userAnswer === "" || isNaN(userVal)) {
            setMessage('Wpisz wynik liczbowy!');
            return;
        }

        if (userVal === correctAnswer) {
            // POPRAWNA ODPOWIEDŹ
            Animated.timing(backgroundColor, { toValue: 1, duration: 500, useNativeDriver: false }).start();
            setCorrectCount(c => c + 1);
            setMessage('Doskonale! ✅');
            setReadyForNext(true);
            setIsCorrect(true);
            InteractionManager.runAfterInteractions(() => awardXpAndCoins(10, 2));
            const currentUser = auth().currentUser;
            if (currentUser) {
                firestore()
                    .collection('users')
                    .doc(currentUser.uid)
                    .collection('exerciseStats')
                    .doc(EXERCISE_ID)
                    .set({
                        totalCorrect: firestore.FieldValue.increment(1)
                    }, { merge: true })
                    .catch(error => console.error("Błąd zapisu do bazy:", error));
            }
        } else {
            // BŁĘDNA ODPOWIEDŹ
            const nextAttempt = attempts + 1;
            setAttempts(nextAttempt);

            if (nextAttempt < 2) {
                // PIERWSZA PRÓBA
                setIsCorrect(false);
                setMessage('Błędny wynik. Spróbuj jeszcze raz! ❌');

                // Krótki błysk tła na czerwono i powrót
                Animated.sequence([
                    Animated.timing(backgroundColor, { toValue: -1, duration: 500, useNativeDriver: false }),
                    Animated.timing(backgroundColor, { toValue: 0, duration: 500, useNativeDriver: false })
                ]).start();

                // Pozwalamy użytkownikowi poprawić (nie ustawiamy readyForNext)
                setTimeout(() => {
                    setIsCorrect(null); // Убираем красную рамку
                    setUserAnswer('');  // ОЧИЩАЕМ НЕПРАВИЛЬНЫЙ ОТВЕТ
                }, 1000);
            } else {
                // DRUGA PRÓBA (KONIEC MOŻLIWOŚCI)
                Animated.timing(backgroundColor, { toValue: -1, duration: 500, useNativeDriver: false }).start();
                setMessage(`Niestety źle. Poprawny wynik to: ${correctAnswer} ${unit}`);
                setWrongCount(w => w + 1);
                setReadyForNext(true);
                setIsCorrect(false);
                InteractionManager.runAfterInteractions(() => {
                    const currentUser = auth().currentUser;
                    if (currentUser) {
                        firestore()
                            .collection('users')
                            .doc(currentUser.uid)
                            .collection('exerciseStats')
                            .doc(EXERCISE_ID)
                            .set({
                                totalWrong: firestore.FieldValue.increment(1)
                            }, { merge: true })
                            .catch(e => console.error("Błąd zapisu błędnych:", e));
                    }
                });
            }
        }
    };

    const nextTask = () => {
        if (taskCount >= TASKS_LIMIT) { setMessage('Koniec treningu! 🏆'); return; }
        setTaskCount(t => t + 1);
        generateProblem();
    };

    const bgInterpolation = backgroundColor.interpolate({
        inputRange: [-1, 0, 1],
        outputRange: ['rgba(255,0,0,0.2)', 'rgba(255,255,255,0)', 'rgba(0,255,0,0.2)']
    });

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.container}>
                <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
                <ImageBackground source={require('../../../assets/background.jpg')} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: bgInterpolation }]} pointerEvents="none" />

                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardContainer}>
                    {!isKeyboardVisible && (
                        <View style={styles.topButtons}>
                            <TouchableOpacity onPress={() => setShowScratchpad(true)} style={styles.topBtnItem}>
                                <Image source={require('../../../assets/pencil.png')} style={styles.iconTop} />
                                <Text style={styles.buttonLabel}>Brudnopis</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setShowHint(!showHint)} style={styles.topBtnItem}>
                                <Image source={require('../../../assets/question.png')} style={styles.iconTop} />
                                <Text style={styles.buttonLabel}>Pomoc</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {showHint && !isKeyboardVisible && (
                        <View style={styles.hintBox}>
                            <Text style={styles.hintTitle}>Jak to policzyć?</Text>
                            <Text style={styles.hintText}>{currentHint}</Text>
                        </View>
                    )}

                    <DrawingModal visible={showScratchpad} onClose={() => setShowScratchpad(false)} problemText={questionText} />

                    <ScrollView contentContainerStyle={styles.centerContent} keyboardShouldPersistTaps="handled">
                        <View style={styles.card}>
                            <View style={styles.overlayBackground} />

                            <Text style={styles.headerTitle}>Zadanie z treścią</Text>

                            <View style={styles.questionBox}>
                                <Text style={styles.questionText}>{questionText}</Text>
                            </View>

                            <View style={styles.answerSection}>
                                <Text style={styles.answerLabel}>Odpowiedź:</Text>
                                <View style={styles.inputWrapper}>
                                    <TextInput
                                        style={[
                                            styles.mainInput,
                                            isCorrect === true && styles.inputCorrect,
                                            isCorrect === false && styles.inputError
                                        ]}
                                        keyboardType="numeric"
                                        placeholder="?"
                                        placeholderTextColor="#ccc"
                                        value={userAnswer}
                                        onChangeText={setUserAnswer}
                                        editable={!readyForNext}
                                    />
                                    <Text style={styles.unitText}>{unit}</Text>
                                </View>
                            </View>

                            <View style={styles.buttonContainer}>
                                <Button
                                    title={readyForNext ? 'Następne zadanie' : 'Sprawdź wynik'}
                                    onPress={readyForNext ? nextTask : handleCheck}
                                    color="#007AFF"
                                />
                            </View>

                            <Text style={styles.counterTextSmall}>Zadanie: {taskCount} / {TASKS_LIMIT}</Text>
                            {message ? <Text style={[styles.result, message.includes('Doskonale') ? styles.correctText : styles.errorText]}>{message}</Text> : null}
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

const styles = StyleSheet.create({
    container: { flex: 1 },
    keyboardContainer: { flex: 1, justifyContent: 'center' },
    centerContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 20 },
    topButtons: { position: 'absolute', top: 40, right: 20, flexDirection: 'row', alignItems: 'center', zIndex: 10 },
    topBtnItem: { alignItems: 'center', marginLeft: 15 },
    iconTop: { width: 70, height: 70, resizeMode: 'contain', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3 },
    buttonLabel: { fontSize: 14, fontWeight: 'bold', color: '#007AFF', marginTop: 2, textShadowColor: 'rgba(255,255,255,0.8)', textShadowRadius: 3 },
    hintBox: { position: 'absolute', top: 120, right: 20, padding: 15, backgroundColor: 'rgba(255,255,255,0.98)', borderRadius: 15, width: 280, zIndex: 11, elevation: 5, borderWidth: 1, borderColor: '#007AFF' },
    hintTitle: { fontSize: 16, fontWeight: 'bold', color: '#007AFF', marginBottom: 5 },
    hintText: { fontSize: 14, color: '#333', lineHeight: 20 },
    card: { width: '90%', maxWidth: 500, borderRadius: 25, padding: 25, marginTop: 0, alignItems: 'center', alignSelf: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 4 },
    overlayBackground: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 25 },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 20, textAlign: 'center' },
    questionBox: { width: '100%', backgroundColor: '#f0f8ff', padding: 20, borderRadius: 15, borderWidth: 1, borderColor: '#d0e8ff', marginBottom: 25 },
    questionText: { fontSize: 22, fontWeight: '500', color: '#2c3e50', lineHeight: 32, textAlign: 'center' },
    answerSection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
    answerLabel: { fontSize: 20, fontWeight: '600', color: '#555', marginRight: 15 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center' },
    mainInput: { width: 110, height: 55, borderWidth: 2, borderColor: '#ccc', borderRadius: 10, backgroundColor: '#fff', fontSize: 28, fontWeight: 'bold', textAlign: 'center', color: '#007AFF', marginRight: 10 },
    inputCorrect: { borderColor: '#28a745', backgroundColor: '#e8f5e9', color: '#28a745' },
    inputError: { borderColor: '#dc3545', backgroundColor: '#fbe9eb', color: '#dc3545' },
    unitText: { fontSize: 22, fontWeight: 'bold', color: '#777' },
    buttonContainer: { marginTop: 25, width: '90%', borderRadius: 12, overflow: 'hidden' },
    result: { fontSize: 18, fontWeight: '700', marginTop: 15, textAlign: 'center' },
    correctText: { color: '#28a745' },
    errorText: { color: '#dc3545' },
    counterTextSmall: { fontSize: Math.max(12, screenWidth * 0.035), fontWeight: '400', color: '#555', textAlign: 'center', marginTop: 15 },
    iconsBottom: { position: 'absolute', bottom: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' },
    iconSame: { width: combinedIconSize, height: combinedIconSize, resizeMode: 'contain', marginHorizontal: 10 },
    counterTextIcons: { fontSize: Math.max(14, combinedIconSize * 0.28), marginHorizontal: 8, textAlign: 'center', color: '#333' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
    drawingContainer: { width: '95%', height: '85%', backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden' },
    drawingHeader: { height: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, backgroundColor: '#f0f0f0', borderBottomWidth: 1, borderBottomColor: '#ddd' },
    drawingTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    headerButton: { padding: 10 },
    headerButtonText: { fontSize: 16, color: '#007AFF', fontWeight: '600' },
    problemPreviewContainer: { backgroundColor: '#eef6fc', padding: 10, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#ddd' },
    problemPreviewLabel: { fontSize: 12, color: '#666', marginBottom: 2 },
    problemPreviewTextSmall: { fontSize: 16, fontWeight: '600', color: '#222', textAlign: 'center' },
    canvas: { flex: 1, backgroundColor: '#fff' },
});

export default WordProblemsTrainer;