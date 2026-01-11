import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TextInput, Keyboard, ImageBackground,
    Animated, StatusBar, Image, Dimensions, TouchableOpacity, Modal,
    Platform, KeyboardAvoidingView, TouchableWithoutFeedback, ScrollView, InteractionManager
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { awardXpAndCoins } from '../../../services/xpService'; // Zakładam, że ścieżka jest ta sama
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

// Zmienione ID ćwiczenia
const EXERCISE_ID = "DecimalConversion_cl4";
const { width: screenWidth } = Dimensions.get('window');

// LIMIT ZADAŃ
const TASKS_LIMIT = 20; // Nieco mniej, bo zadania wymagają wpisania 2 liczb
const combinedIconSize = screenWidth * 0.25;

// --- MODAL BRUDNOPISU (Bez zmian - idealnie pasuje) ---
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
                        <Text style={styles.problemPreviewLabel}>Zadanie:</Text>
                        <Text style={styles.problemPreviewTextSmall}>{problemText}</Text>
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
const DecimalConversionTrainer = () => {
    const navigation = useNavigation();

    // Stan zadania
    const [task, setTask] = useState({
        displayValue: '', // np. "2,50 zł"
        mainUnit: '',     // np. "zł"
        subUnit: '',      // np. "gr"
        correctMain: 0,   // np. 2
        correctSub: 0,    // np. 50
        hint: ''
    });

    // Inputy użytkownika
    const [inpMain, setInpMain] = useState('');
    const [inpSub, setInpSub] = useState('');

    const [status, setStatus] = useState<'neutral' | 'correct' | 'wrong'>('neutral');
    const [msg, setMsg] = useState('');
    const [attempts, setAttempts] = useState(0);
    const [ready, setReady] = useState(false);
    const [stats, setStats] = useState({ correct: 0, wrong: 0, count: 0 });
    const [showMilestone, setShowMilestone] = useState(false);
    const [isFinished, setIsFinished] = useState(false);
    const [sessionCorrect, setSessionCorrect] = useState(0);
    const [showScratchpad, setShowScratchpad] = useState(false);
    const [showHint, setShowHint] = useState(false);
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);

    // Refs
    const historyRef = useRef<Set<string>>(new Set());
    const mainInputRef = useRef<TextInput>(null);
    const subInputRef = useRef<TextInput>(null);
    const bgAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const k1 = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
        const k2 = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
        nextTask();
        return () => { k1.remove(); k2.remove(); };
    }, []);

    const rnd = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

    // --- LOGIKA GENEROWANIA ZADAŃ (KLASA 4 - Jednostki) ---
    const generateProblem = () => {
        setMsg(''); setStatus('neutral'); setReady(false);
        setInpMain(''); setInpSub('');
        setAttempts(0); setShowHint(false);
        bgAnim.setValue(0);

        // Typy zadań na podstawie obrazków
        const types = [
            { type: 'currency', unit: 'zł', sub: 'gr', factor: 100 },
            { type: 'length_m', unit: 'm', sub: 'cm', factor: 100 },
            { type: 'length_km', unit: 'km', sub: 'm', factor: 1000 },
            { type: 'mass_kg', unit: 'kg', sub: 'g', factor: 1000 },
            { type: 'mass_t', unit: 't', sub: 'kg', factor: 1000 },
        ];

        let newTask: any = {};
        let uniqueKey = "";
        let attemptCount = 0;

        do {
            const selected = types[rnd(0, types.length - 1)];

            // Generujemy liczbę całkowitą (np. 2 zł)
            const whole = rnd(0, 15);

            // Generujemy cześć ułamkową (zależnie od mnożnika)
            // Dla 100 (zł/m) -> losujemy np. 5, 50, 20
            // Dla 1000 (km/kg) -> losujemy np. 5, 50, 500, 250
            let part = 0;
            if (selected.factor === 100) {
                // Losujemy liczbę z zakresu 1-99
                part = rnd(1, 99);
                // "Ładne" liczby dla 4 klasy: 10, 20, 50, 25, 5, 1
                if (Math.random() > 0.3) {
                    const easyParts = [5, 10, 20, 25, 40, 50, 60, 75, 80];
                    part = easyParts[rnd(0, easyParts.length - 1)];
                }
            } else { // 1000
                part = rnd(1, 999);
                if (Math.random() > 0.3) {
                    const easyParts = [5, 10, 50, 100, 125, 200, 250, 500, 750, 800];
                    part = easyParts[rnd(0, easyParts.length - 1)];
                }
            }

            // Tworzymy zapis dziesiętny do wyświetlenia
            // np. part=5, factor=100 -> 0.05
            // np. part=50, factor=100 -> 0.50 (lub 0.5)

            let decimalValue = whole + (part / selected.factor);

            // Formatowanie wyświetlania (z polskim przecinkiem)
            // Dla 4 klasy często spotyka się np. 2,5 zł zamiast 2,50 zł, ale oba są poprawne.
            // Tutaj sformatujemy "ładnie"
            let displayStr = decimalValue.toFixed(selected.factor === 100 ? 2 : 3);

            // Usuwamy niepotrzebne zera z końca po przecinku dla czystszego zapisu
            // np. 3.200 -> 3.2
            displayStr = parseFloat(displayStr).toString();
            // Zamiana kropki na przecinek
            displayStr = displayStr.replace('.', ',');

            // Czasami wymuszamy "zera" jeśli to waluta (np. 2,50 zł jest bardziej naturalne niż 2,5 zł)
            if (selected.type === 'currency' && part % 10 === 0) {
                // Ręczna korekta dla waluty by wyglądało jak w sklepie
                const temp = whole + ',' + (part < 10 ? '0'+part : part);
                // Ale zadanie ze screena pokazuje 2,5 zł -> więc zostawmy standardowe formatowanie matematyczne
            }
            // ZADANIE ze zdjęcia a): 2,5 zł -> 2 zł 50 gr
            if (selected.type === 'currency' && part === 50) displayStr = `${whole},5`;
            if (selected.type === 'length_m' && part === 20) displayStr = `${whole},2`;

            newTask = {
                displayValue: `${displayStr} ${selected.unit}`,
                mainUnit: selected.unit,
                subUnit: selected.sub,
                correctMain: whole,
                correctSub: part,
                hint: `Pamiętaj: 1 ${selected.unit} = ${selected.factor} ${selected.sub}.`
            };

            uniqueKey = `${selected.type}-${whole}-${part}`;
            attemptCount++;
        } while (historyRef.current.has(uniqueKey) && attemptCount < 20);

        historyRef.current.add(uniqueKey);
        setTask(newTask);

        setTimeout(() => {
            mainInputRef.current?.focus();
        }, 400);
    };

    const handleCheck = () => {
        // --- 1. WALIDACJA PUSTYCH PÓL ---
        if (!inpMain || !inpSub) {
            setMsg('Uzupełnij puste pola! ⚠️');
            return;
        }

        // --- 2. SPRAWDZANIE WYNIKÓW ---
        const uMain = parseInt(inpMain || '0');
        const uSub = parseInt(inpSub || '0');

        const isCorrect = uMain === task.correctMain && uSub === task.correctSub;

        if (isCorrect) {
            setStatus('correct'); setMsg('Doskonale! ✅');
            Animated.timing(bgAnim, { toValue: 1, duration: 500, useNativeDriver: false }).start();
            setStats(s => ({ ...s, correct: s.correct + 1 }));
            setSessionCorrect(prev => prev + 1);
            setReady(true);
            InteractionManager.runAfterInteractions(() => awardXpAndCoins(10, 2));
            const currentUser = auth().currentUser;
            if (currentUser) {
                firestore().collection('users').doc(currentUser.uid).collection('exerciseStats').doc(EXERCISE_ID)
                    .set({ totalCorrect: firestore.FieldValue.increment(1) }, { merge: true }).catch(e => console.error(e));
            }
        } else {
            setStatus('wrong');
            if (attempts === 0) {
                setMsg('Błąd! Spróbuj jeszcze raz. ❌');
                setAttempts(1);

                // Czyścimy błędne pole
                if (uMain !== task.correctMain) setInpMain('');
                if (uSub !== task.correctSub) setInpSub('');

                Animated.sequence([
                    Animated.timing(bgAnim, { toValue: -1, duration: 200, useNativeDriver: false }),
                    Animated.timing(bgAnim, { toValue: 0, duration: 200, useNativeDriver: false })
                ]).start();

                setTimeout(() => setStatus('neutral'), 1500);
            } else {
                setMsg(`Wynik: ${task.correctMain} ${task.mainUnit} ${task.correctSub} ${task.subUnit}`);
                setReady(true);
                setStats(s => ({ ...s, wrong: s.wrong + 1 }));
                Animated.timing(bgAnim, { toValue: -1, duration: 500, useNativeDriver: false }).start();
                const currentUser = auth().currentUser;
                if (currentUser) {
                    firestore().collection('users').doc(currentUser.uid).collection('exerciseStats').doc(EXERCISE_ID)
                        .set({ totalWrong: firestore.FieldValue.increment(1) }, { merge: true }).catch(e => console.error(e));
                }
            }
        }
    };

    const nextTask = () => {
        if (stats.count >= TASKS_LIMIT) { setIsFinished(true); return; }
        if (stats.count > 0 && stats.count % 10 === 0 && !showMilestone) {
            setShowMilestone(true);
            return;
        }
        setStats(s => ({ ...s, count: s.count + 1 }));
        generateProblem();
    };

    const handleRestart = () => {
        setIsFinished(false);
        setStats({ correct: 0, wrong: 0, count: 1 });
        setSessionCorrect(0);
        historyRef.current.clear();
        generateProblem();
    };

    const getInputStyle = (currentVal: string, targetVal: number) => {
        if (status === 'correct') return styles.inputCorrect;
        if (status === 'wrong') {
            if (currentVal && parseInt(currentVal) === targetVal) return styles.inputCorrect;
            return styles.inputError;
        }
        return {};
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.container}>
                <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
                <ImageBackground source={require('../../../assets/background.jpg')} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: bgAnim.interpolate({ inputRange: [-1, 0, 1], outputRange: ['rgba(255,0,0,0.15)', 'transparent', 'rgba(0,255,0,0.15)'] }) }]} pointerEvents="none" />

                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardContainer}>
                    {!isKeyboardVisible && (
                        <View style={styles.topButtons}>
                            <TouchableOpacity onPress={() => setShowScratchpad(true)} style={styles.topBtnItem}><Image source={require('../../../assets/pencil.png')} style={styles.iconTop} /><Text style={styles.buttonLabel}>Brudnopis</Text></TouchableOpacity>
                            <TouchableOpacity onPress={() => setShowHint(!showHint)} style={styles.topBtnItem}><Image source={require('../../../assets/question.png')} style={styles.iconTop} /><Text style={styles.buttonLabel}>Pomoc</Text></TouchableOpacity>
                        </View>
                    )}

                    {/* Modale Milestone i Finished identyczne jak w oryginale */}
                    <Modal visible={showMilestone} transparent={true} animationType="slide">
                        <View style={styles.modalOverlay}>
                            <View style={styles.milestoneCard}>
                                <Text style={styles.milestoneTitle}>Podsumowanie serii 📊</Text>
                                <View style={styles.statsRowMilestone}>
                                    <Text style={styles.statsTextMilestone}>Poprawne: {sessionCorrect} / 10</Text>
                                    <Text style={[styles.statsTextMilestone, { color: '#28a745', marginTop: 5 }]}>Skuteczność: {(sessionCorrect / 10 * 100).toFixed(0)}%</Text>
                                </View>
                                <View style={styles.milestoneButtons}>
                                    <TouchableOpacity style={[styles.mButton, { backgroundColor: '#28a745' }]} onPress={() => { setShowMilestone(false); setSessionCorrect(0); setStats(s => ({ ...s, count: s.count + 1 })); generateProblem(); }}>
                                        <Text style={styles.mButtonText}>Kontynuuj</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.mButton, { backgroundColor: '#007AFF' }]} onPress={() => { setShowMilestone(false); navigation.goBack(); }}>
                                        <Text style={styles.mButtonText}>Inny temat</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>

                    <Modal visible={isFinished} transparent={true} animationType="fade">
                        <View style={styles.modalOverlay}>
                            <View style={styles.milestoneCard}>
                                <Text style={styles.milestoneTitle}>Gratulacje! 🏆</Text>
                                <View style={styles.statsRowMilestone}>
                                    <Text style={styles.statsTextMilestone}>Twój wynik końcowy:</Text>
                                    <Text style={[styles.statsTextMilestone, { fontSize: 24, color: '#28a745', marginTop: 5 }]}>{stats.correct} / {TASKS_LIMIT}</Text>
                                </View>
                                <View style={styles.milestoneButtons}>
                                    <TouchableOpacity style={[styles.mButton, { backgroundColor: '#28a745' }]} onPress={handleRestart}>
                                        <Text style={styles.mButtonText}>Zagraj jeszcze raz</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.mButton, { backgroundColor: '#dc3545' }]} onPress={() => navigation.goBack()}>
                                        <Text style={styles.mButtonText}>Wyjdź do menu</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>

                    {showHint && !isKeyboardVisible && (
                        <View style={styles.hintBox}><Text style={styles.hintTitle}>Wskazówka:</Text><Text style={styles.hintText}>{task.hint}</Text></View>
                    )}

                    <DrawingModal visible={showScratchpad} onClose={() => setShowScratchpad(false)} problemText={task.displayValue} />

                    <ScrollView contentContainerStyle={styles.centerContent} keyboardShouldPersistTaps="handled">
                        <View style={styles.card}>
                            <View style={styles.overlayBackground} />
                            <Text style={styles.headerTitle}>Różne zapisy</Text>

                            <View style={styles.taskContent}>
                                <Text style={styles.instructionText}>Zamień zapis dziesiętny na dwie jednostki:</Text>

                                <View style={styles.equationRow}>
                                    {/* Lewa strona: Liczba dziesiętna */}
                                    <Text style={styles.staticDisplayValue}>{task.displayValue}</Text>

                                    <Text style={styles.operatorSign}>=</Text>

                                    {/* Prawa strona: Inputy */}
                                    <View style={styles.unitInputContainer}>
                                        <TextInput
                                            ref={mainInputRef}
                                            style={[styles.wholeInput, getInputStyle(inpMain, task.correctMain)]}
                                            keyboardType="numeric"
                                            placeholder="?"
                                            placeholderTextColor="#ccc"
                                            value={inpMain}
                                            onChangeText={setInpMain}
                                            onSubmitEditing={() => subInputRef.current?.focus()}
                                            blurOnSubmit={false}
                                            returnKeyType="next"
                                            editable={!ready}
                                        />
                                        <Text style={styles.unitText}>{task.mainUnit}</Text>

                                        <TextInput
                                            ref={subInputRef}
                                            style={[styles.subUnitInput, getInputStyle(inpSub, task.correctSub)]}
                                            keyboardType="numeric"
                                            placeholder="?"
                                            placeholderTextColor="#ccc"
                                            value={inpSub}
                                            onChangeText={setInpSub}
                                            onSubmitEditing={ready ? nextTask : handleCheck}
                                            returnKeyType="done"
                                            editable={!ready}
                                        />
                                        <Text style={styles.unitText}>{task.subUnit}</Text>
                                    </View>
                                </View>
                            </View>

                            <TouchableOpacity style={styles.mainBtn} onPress={ready ? nextTask : handleCheck}>
                                <Text style={styles.mainBtnText}>{ready ? 'Następne' : 'Sprawdź'}</Text>
                            </TouchableOpacity>

                            <Text style={styles.counterTextSmall}>Zadanie: {stats.count}/{TASKS_LIMIT}</Text>
                            <View style={{height: 30, marginTop: 15, justifyContent: 'center'}}>
                                {msg ? <Text style={[styles.msg, msg.includes('Doskonale') ? styles.correctText : styles.errorText]}>{msg}</Text> : null}
                            </View>
                        </View>
                    </ScrollView>

                    {!isKeyboardVisible && (
                        <View style={styles.iconsBottom}>
                            <Image source={require('../../../assets/happy.png')} style={styles.iconSame} /><Text style={styles.counterTextIcons}>{stats.correct}</Text>
                            <Image source={require('../../../assets/sad.png')} style={styles.iconSame} /><Text style={styles.counterTextIcons}>{stats.wrong}</Text>
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
    topButtons: { position: 'absolute', top: 25, right: 20, flexDirection: 'row', zIndex: 10 },
    topBtnItem: { alignItems: 'center', marginLeft: 15 },
    iconTop: { width: 70, height: 70, resizeMode: 'contain', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3 },
    buttonLabel: { fontSize: 14, fontWeight: 'bold', color: '#007AFF', marginTop: 2, textShadowColor: 'rgba(255,255,255,0.8)', textShadowRadius: 3 },
    hintBox: { position: 'absolute', top: 100, right: 20, padding: 15, backgroundColor: '#fff', borderRadius: 15, width: 260, zIndex: 11, elevation: 5, borderWidth: 1, borderColor: '#007AFF' },
    hintTitle: { fontWeight: 'bold', color: '#007AFF', marginBottom: 5 },
    hintText: { fontSize: 14, color: '#333' },

    card: { width: '96%', maxWidth: 600, borderRadius: 25, padding: 20, alignItems: 'center', alignSelf: 'center', elevation: 4, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10 },
    overlayBackground: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: 25 },

    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 15 },
    instructionText: { fontSize: 16, color: '#555', marginBottom: 20, textAlign: 'center' },

    taskContent: { alignItems: 'center', width: '100%', marginBottom: 10 },
    equationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' },

    staticDisplayValue: { fontSize: 32, fontWeight: 'bold', color: '#2c3e50', marginRight: 5 },
    operatorSign: { fontSize: 32, fontWeight: 'bold', color: '#2c3e50', marginHorizontal: 8 },

    unitInputContainer: { flexDirection: 'row', alignItems: 'center' },
    // Styl głównego pola (całości) - taki sam jak w oryginale
    wholeInput: { width: 60, height: 70, borderWidth: 2, borderColor: '#ccc', borderRadius: 10, backgroundColor: '#fff', fontSize: 28, fontWeight: 'bold', textAlign: 'center', color: '#007AFF', marginRight: 5 },
    // Styl drugiego pola - nieco szerszy, bo np. "cm" może mieć 2 cyfry, a "m" (metry) 3 cyfry
    subUnitInput: { width: 80, height: 70, borderWidth: 2, borderColor: '#ccc', borderRadius: 10, backgroundColor: '#fff', fontSize: 28, fontWeight: 'bold', textAlign: 'center', color: '#007AFF', marginLeft: 5, marginRight: 5 },

    unitText: { fontSize: 22, fontWeight: '600', color: '#333', marginRight: 5 },

    inputCorrect: { borderColor: '#28a745', backgroundColor: '#e8f5e9', color: '#28a745' },
    inputError: { borderColor: '#dc3545', backgroundColor: '#fbe9eb', color: '#dc3545' },

    mainBtn: { marginTop: 25, backgroundColor: '#007AFF', paddingHorizontal: 40, paddingVertical: 14, borderRadius: 15 },
    mainBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    counterTextSmall: { fontSize: 13, color: '#555', textAlign: 'center', marginTop: 15 },
    msg: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
    correctText: { color: '#28a745' },
    errorText: { color: '#dc3545' },

    iconsBottom: { position: 'absolute', bottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' },
    iconSame: { width: combinedIconSize, height: combinedIconSize, resizeMode: 'contain', marginHorizontal: 10 },
    counterTextIcons: { fontSize: 20, marginHorizontal: 8, color: '#333' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    drawingContainer: { width: '95%', height: '85%', backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden' },
    drawingHeader: { height: 55, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, backgroundColor: '#f0f0f0' },
    drawingTitle: { fontSize: 18, fontWeight: 'bold' },
    headerButton: { padding: 10 },
    headerButtonText: { fontSize: 16, color: '#007AFF', fontWeight: '600' },
    problemPreviewContainer: { backgroundColor: '#f9f9f9', padding: 12, alignItems: 'center' },
    problemPreviewLabel: { fontSize: 13, color: '#666' },
    problemPreviewTextSmall: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
    canvas: { flex: 1, backgroundColor: '#ffffff' },

    milestoneCard: { width: '90%', backgroundColor: '#fff', borderRadius: 20, padding: 25, alignItems: 'center', elevation: 10 },
    milestoneTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 15 },
    statsRowMilestone: { marginVertical: 10, alignItems: 'center', backgroundColor: '#f8f9fa', padding: 15, borderRadius: 15, width: '100%' },
    statsTextMilestone: { fontSize: 18, color: '#333', fontWeight: 'bold' },
    milestoneButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
    mButton: { paddingVertical: 12, paddingHorizontal: 15, borderRadius: 12, width: '48%', alignItems: 'center' },
    mButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 }
});

export default DecimalConversionTrainer;