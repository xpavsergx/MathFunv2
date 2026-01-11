import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TextInput, Button, Keyboard, ImageBackground,
    Animated, StatusBar, Image, Dimensions, TouchableOpacity, Modal,
    Platform, KeyboardAvoidingView, TouchableWithoutFeedback, ScrollView, InteractionManager,
    useColorScheme
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
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
    const isDarkMode = useColorScheme() === 'dark';

    const theme = {
        bg: isDarkMode ? '#1E293B' : '#fff',
        text: isDarkMode ? '#FFF' : '#333',
        canvas: isDarkMode ? '#0F172A' : '#ffffff',
        stroke: isDarkMode ? '#FFF' : '#000',
        headerBg: isDarkMode ? '#334155' : '#f0f0f0',
        border: isDarkMode ? '#475569' : '#ddd',
        previewBg: isDarkMode ? '#1E293B' : '#eef6fc',
    };

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
                <View style={[styles.drawingContainer, { backgroundColor: theme.bg }]}>
                    <View style={[styles.drawingHeader, { backgroundColor: theme.headerBg, borderBottomColor: theme.border }]}>
                        <TouchableOpacity onPress={handleClear} style={styles.headerButton}><Text style={styles.headerButtonText}>🗑️ Wyczyść</Text></TouchableOpacity>
                        <Text style={[styles.drawingTitle, { color: theme.text }]}>Brudnopis</Text>
                        <TouchableOpacity onPress={onClose} style={styles.headerButton}><Text style={styles.headerButtonText}>❌ Zamknij</Text></TouchableOpacity>
                    </View>
                    <View style={[styles.problemPreviewContainer, { backgroundColor: theme.previewBg, borderBottomColor: theme.border }]}>
                        <Text style={[styles.problemPreviewLabel, { color: isDarkMode ? '#94A3B8' : '#666' }]}>Twoje obliczenia do zadania:</Text>
                        <Text numberOfLines={2} style={[styles.problemPreviewTextSmall, { color: theme.text }]}>{problemText}</Text>
                    </View>
                    <View style={[styles.canvas, { backgroundColor: theme.canvas }]} onStartShouldSetResponder={() => true} onMoveShouldSetResponder={() => true} onResponderGrant={(evt) => { const { locationX, locationY } = evt.nativeEvent; setCurrentPath(`M${locationX},${locationY}`); }} onResponderMove={onTouchMove} onResponderRelease={onTouchEnd}>
                        <Svg height="100%" width="100%">
                            {paths.map((d, index) => (<Path key={index} d={d} stroke={theme.stroke} strokeWidth={3} fill="none" />))}
                            <Path d={currentPath} stroke={theme.stroke} strokeWidth={3} fill="none" />
                        </Svg>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

// --- GŁÓWNY KOMPONENT ---
const WordProblemsTrainer = () => {
    const navigation = useNavigation();
    const isDarkMode = useColorScheme() === 'dark';

    const theme = {
        bgImage: require('../../../assets/background.jpg'),
        bgOverlay: isDarkMode ? 'rgba(0, 0, 0, 0.7)' : 'transparent',
        cardOverlay: isDarkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255,255,255,0.92)',
        textMain: isDarkMode ? '#FFFFFF' : '#333',
        textSub: isDarkMode ? '#CBD5E1' : '#555',
        questionBoxBg: isDarkMode ? '#0F172A' : '#f0f8ff',
        questionBoxBorder: isDarkMode ? '#334155' : '#d0e8ff',
        questionText: isDarkMode ? '#E2E8F0' : '#2c3e50',
        inputBg: isDarkMode ? '#334155' : '#fff',
        inputBorder: isDarkMode ? '#475569' : '#ccc',
        inputText: isDarkMode ? '#FFFFFF' : '#007AFF',
        topBtnText: isDarkMode ? '#FFFFFF' : '#007AFF',
        modalContent: isDarkMode ? '#1E293B' : '#fff',
        statsRow: isDarkMode ? '#0F172A' : '#f8f9fa',
    };

    const [questionText, setQuestionText] = useState('');
    const [correctAnswer, setCorrectAnswer] = useState<number>(0);
    const [unit, setUnit] = useState('');
    const [currentHint, setCurrentHint] = useState('');
    const [userAnswer, setUserAnswer] = useState('');
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const [readyForNext, setReadyForNext] = useState<boolean>(false);
    const [attempts, setAttempts] = useState(0);
    const [correctCount, setCorrectCount] = useState(0);
    const [wrongCount, setWrongCount] = useState(0);
    const [taskCount, setTaskCount] = useState(0);
    const [message, setMessage] = useState('');
    const [showMilestone, setShowMilestone] = useState(false);
    const [sessionCorrect, setSessionCorrect] = useState(0);
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
        setMessage(''); setIsCorrect(null); setReadyForNext(false); setUserAnswer(''); setShowHint(false); setAttempts(0); backgroundColor.setValue(0);
        const type = Math.floor(Math.random() * 13);
        let q = ""; let ans = 0; let u = ""; let h = "";
        const rnd = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

        switch (type) {
            case 0:
                const students = rnd(15, 25); const studentPrice = rnd(12, 25);
                const teachers = rnd(2, 4); const teacherPrice = rnd(20, 40);
                ans = (students * studentPrice) + (teachers * teacherPrice);
                q = `Klasa wybrała się do muzeum. Kupiono ${students} biletów ulgowych po ${studentPrice} zł oraz ${teachers} bilety dla opiekunów po ${teacherPrice} zł. Ile zapłacono łącznie za wszystkie bilety?`;
                u = "zł"; h = "Oblicz osobno koszt biletów dla uczniów i koszt biletów dla opiekunów. Potem dodaj do siebie te dwie kwoty.";
                break;
            case 1:
                const weeks = rnd(8, 12); const weeklySave = rnd(15, 30); const piggBankStart = rnd(120, 250);
                ans = piggBankStart + (weeks * weeklySave);
                q = `Tomek zbiera na nowy rower. W skarbonce ma już ${piggBankStart} zł. Postanowił, że przez najbliższe ${weeks} tygodni będzie odkładał po ${weeklySave} zł tygodniowo. Ile pieniędzy uzbiera łącznie?`;
                u = "zł"; h = "Najpierw policz, ile Tomek uzbiera przez te tygodnie. Potem dodaj to do pieniędzy, które już ma w skarbonce.";
                break;
            case 2:
                const ballPrice = rnd(30, 60); const numBalls = rnd(3, 8); const netPrice = rnd(100, 300);
                const totalInvoice = netPrice + (numBalls * ballPrice);
                ans = ballPrice;
                q = `Szkoła zakupiła sprzęt za ${totalInvoice} zł. Kupiono siatkę za ${netPrice} zł oraz ${numBalls} jednakowych piłek. Ile kosztowała jedna piłka?`;
                u = "zł"; h = "Od całej kwoty odejmij cenę siatki. Wynik podziel przez liczbę piłek.";
                break;
            case 3:
                const jars = rnd(6, 12); const honeyWeightDag = rnd(30, 60); const emptyJarWeightDag = rnd(20, 35);
                const totalWeightDag = jars * (honeyWeightDag + emptyJarWeightDag);
                ans = emptyJarWeightDag;
                q = `Babcia przygotowała ${jars} słoików z miodem. Pełne słoiki ważą razem ${totalWeightDag} dag. W każdym słoiku jest ${honeyWeightDag} dag miodu. Ile waży pusty słoik?`;
                u = "dag"; h = "Oblicz wagę samego miodu. Odejmij to od wagi całkowitej, a wynik podziel przez liczbę słoików.";
                break;
            case 4:
                const classA = rnd(120, 300); const multiplier = rnd(2, 3);
                ans = classA + (classA * multiplier);
                q = `Klasa IVa zebrała ${classA} kg makulatury, a klasa IVb zebrała ${multiplier} razy więcej. Ile kilogramów makulatury zebrały obie klasy łącznie?`;
                u = "kg"; h = "Najpierw policz ile zebrała klasa IVb, a następnie dodaj wyniki obu klas.";
                break;
            case 5:
                const pagesSat = rnd(50, 120); const diff = rnd(15, 40); const pagesSun = pagesSat - diff;
                ans = pagesSat + pagesSun;
                q = `Ania w sobotę przeczytała ${pagesSat} stron, a w niedzielę o ${diff} stron mniej. Ile stron przeczytała Ania w ciągu tego weekendu?`;
                u = "str"; h = "Oblicz ile stron Ania przeczytała w niedzielę, potem dodaj strony z obu dni.";
                break;
            case 6:
                const rows = rnd(12, 20); const perRow = rnd(15, 25); const extra = rnd(8, 19);
                ans = (rows * perRow) + extra;
                q = `W szkółce leśnej posadzono sosny w ${rows} rzędach, po ${perRow} drzewek w każdym. Obok posadzono dodatkowo ${extra} sosen. Ile łącznie drzewek posadzono?`;
                u = "szt"; h = "Pomnóż liczbę rzędów przez drzewka w rzędzie, a potem dodaj te dodatkowe.";
                break;
            case 7:
                const budget = [100, 200, 500][rnd(0, 2)]; const item1 = rnd(25, 60); const item2 = rnd(15, 35);
                ans = budget - (item1 + item2);
                q = `Kasia miała banknot ${budget} zł. Kupiła książkę za ${item1} zł i piórnik za ${item2} zł. Ile reszty otrzymała?`;
                u = "zł"; h = "Odejmij sumę cen zakupów od banknotu Kasi.";
                break;
            case 8:
                const width = rnd(8, 25); const length = width + rnd(5, 15);
                ans = 2 * width + 2 * length;
                q = `Ogródek pana Jana ma kształt prostokąta o szerokości ${width} m i długości ${length} m. Ile metrów siatki potrzeba na ogrodzenie tego ogródka?`;
                u = "m"; h = "Obwód prostokąta to suma wszystkich czterech boków.";
                break;
            case 9:
                const minB = rnd(3, 6); const pagB = minB * rnd(12, 20); const minT = rnd(8, 15);
                ans = (pagB / minB) * minT;
                q = `Szybka drukarka wydrukowała ${pagB} stron w ciągu ${minB} minut. Ile stron wydrukuje ta drukarka w ciągu ${minT} minut, pracując tak samo szybko?`;
                u = "str"; h = "Oblicz wydajność na 1 minutę, a potem pomnóż przez czas docelowy.";
                break;
            case 10:
                const dR = rnd(4, 7); const pD = rnd(15, 30); const pL = rnd(40, 90);
                ans = (dR * pD) + pL;
                q = `Bartek czytał lekturę przez ${dR} dni, po ${pD} stron dziennie. Do końca książki zostało mu jeszcze ${pL} stron. Ile stron ma cała książka?`;
                u = "str"; h = "Dodaj przeczytane strony (dni * strony/dzień) do stron pozostałych.";
                break;
            case 11:
                const gS = rnd(4, 8); const tC = rnd(12, 25); const eP = rnd(1, 3);
                ans = (tC * gS) + eP;
                q = `Na obozie harcerskim rozbito ${tC} namiotów. W każdym śpi ${gS} osób. Oprócz tego w bazie jest ${eP} opiekunów. Ile osób jest łącznie na obozie?`;
                u = "os"; h = "Pomnóż liczbę namiotów przez osoby, a potem dodaj opiekunów.";
                break;
            case 12:
                const gCA = rnd(4, 9); const mLA = rnd(6, 9); const gPA = gCA * mLA;
                ans = mLA;
                q = `Dziadek Stanisław ma ${gPA} lat, a jego wnuczek Jaś ma ${gCA} lat. Ile razy starszy jest dziadek od wnuczka?`;
                u = "razy"; h = "Podziel wiek dziadka przez wiek wnuczka.";
                break;
            default:
                ans = 10; q = "Ile to 5 + 5?"; u = ""; h = "Dodaj.";
                break;
        }
        setQuestionText(q); setCorrectAnswer(ans); setUnit(u); setCurrentHint(h);
    };

    const handleCheck = () => {
        const userVal = parseInt(userAnswer, 10);
        if (userAnswer === "" || isNaN(userVal)) {
            setMessage('Wpisz wynik liczbowy!');
            return;
        }

        if (userVal === correctAnswer) {
            Animated.timing(backgroundColor, { toValue: 1, duration: 500, useNativeDriver: false }).start();
            setCorrectCount(c => c + 1); setSessionCorrect(s => s + 1); setMessage('Doskonale! ✅'); setReadyForNext(true); setIsCorrect(true);
            InteractionManager.runAfterInteractions(() => awardXpAndCoins(10, 2));
            const currentUser = auth().currentUser;
            if (currentUser) {
                firestore().collection('users').doc(currentUser.uid).collection('exerciseStats').doc(EXERCISE_ID)
                    .set({ totalCorrect: firestore.FieldValue.increment(1) }, { merge: true }).catch(console.error);
            }
        } else {
            const nextAttempt = attempts + 1;
            setAttempts(nextAttempt);
            if (nextAttempt < 2) {
                setIsCorrect(false); setMessage('Błędny wynik. Spróbuj jeszcze raz! ❌');
                Animated.sequence([
                    Animated.timing(backgroundColor, { toValue: -1, duration: 500, useNativeDriver: false }),
                    Animated.timing(backgroundColor, { toValue: 0, duration: 500, useNativeDriver: false })
                ]).start();
                setTimeout(() => { setIsCorrect(null); setUserAnswer(''); }, 1000);
            } else {
                Animated.timing(backgroundColor, { toValue: -1, duration: 500, useNativeDriver: false }).start();
                setMessage(`Niestety źle. Poprawny wynik to: ${correctAnswer} ${unit}`);
                setWrongCount(w => w + 1); setReadyForNext(true); setIsCorrect(false);
                const currentUser = auth().currentUser;
                if (currentUser) {
                    firestore().collection('users').doc(currentUser.uid).collection('exerciseStats').doc(EXERCISE_ID)
                        .set({ totalWrong: firestore.FieldValue.increment(1) }, { merge: true }).catch(console.error);
                }
            }
        }
    };

    const nextTask = () => {
        if (taskCount > 0 && taskCount % 10 === 0 && !showMilestone) { setShowMilestone(true); return; }
        if (taskCount >= TASKS_LIMIT) { setMessage('Koniec treningu! 🏆'); return; }
        setTaskCount(t => t + 1); generateProblem();
    };

    const bgInterpolation = backgroundColor.interpolate({
        inputRange: [-1, 0, 1],
        outputRange: ['rgba(255,0,0,0.2)', 'rgba(255,255,255,0)', 'rgba(0,255,0,0.2)']
    });

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.container}>
                <StatusBar translucent backgroundColor="transparent" barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
                <ImageBackground source={theme.bgImage} style={StyleSheet.absoluteFillObject} resizeMode="cover">
                    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.bgOverlay }]} pointerEvents="none" />
                </ImageBackground>
                <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: bgInterpolation }]} pointerEvents="none" />

                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardContainer}>
                    {!isKeyboardVisible && (
                        <View style={styles.topButtons}>
                            <TouchableOpacity onPress={() => setShowScratchpad(true)} style={styles.topBtnItem}>
                                <Image source={require('../../../assets/pencil.png')} style={styles.iconTop} />
                                <Text style={[styles.buttonLabel, { color: theme.topBtnText }]}>Brudnopis</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setShowHint(!showHint)} style={styles.topBtnItem}>
                                <Image source={require('../../../assets/question.png')} style={styles.iconTop} />
                                <Text style={[styles.buttonLabel, { color: theme.topBtnText }]}>Pomoc</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {showHint && !isKeyboardVisible && (
                        <View style={[styles.hintBox, { backgroundColor: theme.modalContent }]}>
                            <Text style={styles.hintTitle}>Jak to policzyć?</Text>
                            <Text style={[styles.hintText, { color: theme.textMain }]}>{currentHint}</Text>
                        </View>
                    )}

                    <DrawingModal visible={showScratchpad} onClose={() => setShowScratchpad(false)} problemText={questionText} />

                    <Modal visible={showMilestone} transparent={true} animationType="slide">
                        <View style={styles.modalOverlay}>
                            <View style={[styles.milestoneCard, { backgroundColor: theme.modalContent }]}>
                                <Text style={[styles.milestoneTitle, { color: theme.textMain }]}>Podsumowanie serii 📊</Text>
                                <View style={[styles.statsRow, { backgroundColor: theme.statsRow }]}>
                                    <Text style={[styles.statsText, { color: theme.textMain }]}>Poprawne: {sessionCorrect} / 10</Text>
                                    <Text style={[styles.statsText, { color: '#28a745', marginTop: 5 }]}>
                                        Skuteczność: {(sessionCorrect / 10 * 100).toFixed(0)}%
                                    </Text>
                                </View>
                                <Text style={[styles.suggestionText, { color: theme.textSub }]}>
                                    {sessionCorrect >= 8 ? "Rewelacyjnie! Jesteś mistrzem!" : "Trenuj dalej, aby być jeszcze lepszym."}
                                </Text>
                                <View style={styles.milestoneButtons}>
                                    <TouchableOpacity style={[styles.mButton, { backgroundColor: '#28a745' }]}
                                                      onPress={() => { setShowMilestone(false); setSessionCorrect(0); nextTask(); }}>
                                        <Text style={styles.mButtonText}>Kontynuuj</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.mButton, { backgroundColor: '#007AFF' }]}
                                                      onPress={() => { setShowMilestone(false); navigation.goBack(); }}>
                                        <Text style={styles.mButtonText}>Inny temat</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>

                    <ScrollView contentContainerStyle={styles.centerContent} keyboardShouldPersistTaps="handled">
                        <View style={styles.card}>
                            <View style={[styles.overlayBackground, { backgroundColor: theme.cardOverlay }]} />
                            <Text style={[styles.headerTitle, { color: theme.textMain }]}>Zadanie z treścią</Text>
                            <View style={[styles.questionBox, { backgroundColor: theme.questionBoxBg, borderColor: theme.questionBoxBorder }]}>
                                <Text style={[styles.questionText, { color: theme.questionText }]}>{questionText}</Text>
                            </View>
                            <View style={styles.answerSection}>
                                <Text style={[styles.answerLabel, { color: theme.textSub }]}>Odpowiedź:</Text>
                                <View style={styles.inputWrapper}>
                                    <TextInput
                                        style={[
                                            styles.mainInput,
                                            { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.inputText },
                                            isCorrect === true && styles.inputCorrect,
                                            isCorrect === false && styles.inputError
                                        ]}
                                        keyboardType="numeric" placeholder="?" placeholderTextColor="#ccc"
                                        value={userAnswer} onChangeText={setUserAnswer} editable={!readyForNext}
                                    />
                                    <Text style={[styles.unitText, { color: theme.textSub }]}>{unit}</Text>
                                </View>
                            </View>
                            <View style={styles.buttonContainer}>
                                <Button title={readyForNext ? 'Następne zadanie' : 'Sprawdź wynik'} onPress={readyForNext ? nextTask : handleCheck} color="#007AFF" />
                            </View>
                            <Text style={[styles.counterTextSmall, { color: theme.textSub }]}>Zadanie: {taskCount} / {TASKS_LIMIT}</Text>
                            {message ? <Text style={[styles.result, message.includes('Doskonale') ? styles.correctText : styles.errorText]}>{message}</Text> : null}
                        </View>
                    </ScrollView>

                    {!isKeyboardVisible && (
                        <View style={styles.iconsBottom}>
                            <Image source={require('../../../assets/happy.png')} style={styles.iconSame} />
                            <Text style={[styles.counterTextIcons, { color: theme.textMain }]}>{correctCount}</Text>
                            <Image source={require('../../../assets/sad.png')} style={styles.iconSame} />
                            <Text style={[styles.counterTextIcons, { color: theme.textMain }]}>{wrongCount}</Text>
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
    iconTop: { width: 70, height: 70, resizeMode: 'contain' },
    buttonLabel: { fontSize: 14, fontWeight: 'bold', marginTop: 2 },
    hintBox: { position: 'absolute', top: 120, right: 20, padding: 15, borderRadius: 15, width: 280, zIndex: 11, elevation: 5, borderWidth: 1, borderColor: '#007AFF' },
    hintTitle: { fontSize: 16, fontWeight: 'bold', color: '#007AFF', marginBottom: 5 },
    hintText: { fontSize: 14, lineHeight: 20 },
    card: { width: '90%', maxWidth: 500, borderRadius: 25, padding: 25, alignItems: 'center', alignSelf: 'center', elevation: 4 },
    overlayBackground: { ...StyleSheet.absoluteFillObject, borderRadius: 25 },
    headerTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    questionBox: { width: '100%', padding: 20, borderRadius: 15, borderWidth: 1, marginBottom: 25 },
    questionText: { fontSize: 20, fontWeight: '500', lineHeight: 30, textAlign: 'center' },
    answerSection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
    answerLabel: { fontSize: 20, fontWeight: '600', marginRight: 15 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center' },
    mainInput: { width: 110, height: 55, borderWidth: 2, borderRadius: 10, fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginRight: 10 },
    inputCorrect: { borderColor: '#28a745', backgroundColor: '#e8f5e9', color: '#28a745' },
    inputError: { borderColor: '#dc3545', backgroundColor: '#fbe9eb', color: '#dc3545' },
    unitText: { fontSize: 22, fontWeight: 'bold' },
    buttonContainer: { marginTop: 25, width: '90%', borderRadius: 12, overflow: 'hidden' },
    result: { fontSize: 18, fontWeight: '700', marginTop: 15, textAlign: 'center' },
    correctText: { color: '#28a745' },
    errorText: { color: '#dc3545' },
    counterTextSmall: { fontSize: 14, fontWeight: '400', textAlign: 'center', marginTop: 15 },
    iconsBottom: { position: 'absolute', bottom: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' },
    iconSame: { width: combinedIconSize, height: combinedIconSize, resizeMode: 'contain', marginHorizontal: 10 },
    counterTextIcons: { fontSize: 22, marginHorizontal: 8, fontWeight: 'bold' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
    drawingContainer: { width: '95%', height: '85%', borderRadius: 20, overflow: 'hidden' },
    drawingHeader: { height: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, borderBottomWidth: 1 },
    drawingTitle: { fontSize: 18, fontWeight: 'bold' },
    headerButton: { padding: 10 },
    headerButtonText: { fontSize: 16, color: '#007AFF', fontWeight: '600' },
    problemPreviewContainer: { padding: 10, alignItems: 'center', borderBottomWidth: 1 },
    problemPreviewLabel: { fontSize: 12, marginBottom: 2 },
    problemPreviewTextSmall: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
    canvas: { flex: 1 },
    milestoneCard: { width: '90%', borderRadius: 20, padding: 25, alignItems: 'center', elevation: 10 },
    milestoneTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 15 },
    statsRow: { marginVertical: 10, alignItems: 'center', padding: 15, borderRadius: 15, width: '100%' },
    statsText: { fontSize: 18, fontWeight: 'bold' },
    suggestionText: { fontSize: 15, textAlign: 'center', marginVertical: 20, lineHeight: 22 },
    milestoneButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
    mButton: { paddingVertical: 12, paddingHorizontal: 15, borderRadius: 12, width: '48%', alignItems: 'center' },
    mButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 }
});

export default WordProblemsTrainer;