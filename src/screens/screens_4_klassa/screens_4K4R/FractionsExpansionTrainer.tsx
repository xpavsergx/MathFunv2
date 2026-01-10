import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TextInput, Keyboard, ImageBackground,
    Animated, StatusBar, Image, Dimensions, TouchableOpacity, Modal,
    Platform, KeyboardAvoidingView, TouchableWithoutFeedback, ScrollView, InteractionManager
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
// Upewnij się, że ścieżka do serwisu jest poprawna
import { awardXpAndCoins } from '../../../services/xpService';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

const EXERCISE_ID = "FractionsExpansionTrainer_cl4";
const { width: screenWidth } = Dimensions.get('window');
const TASKS_LIMIT = 40;
const combinedIconSize = screenWidth * 0.25;

// --- MODAL BRUDNOPISU (Bez zmian - styl z ImporperFractions) ---
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
const FractionsExpansionTrainer = () => {
    // Stan logiki zadania
    const [task, setTask] = useState({
        type: 0, // 0: simplify, 1: expand, 2: missing value
        q: '',
        h: '',
        // Lewa strona (statyczna)
        leftNum: 1, leftDen: 1,
        // Prawa strona (oczekiwana)
        rightNumTarget: 0, rightDenTarget: 0,
        // Konfiguracja inputów
        isRightNumInput: false, isRightDenInput: false
    });

    const [userNum, setUserNum] = useState('');
    const [userDen, setUserDen] = useState('');

    const [status, setStatus] = useState<'neutral' | 'correct' | 'wrong'>('neutral');
    const [msg, setMsg] = useState('');
    const [attempts, setAttempts] = useState(0);
    const [ready, setReady] = useState(false);
    const [stats, setStats] = useState({ correct: 0, wrong: 0, count: 0 });

    const [showScratchpad, setShowScratchpad] = useState(false);
    const [showHint, setShowHint] = useState(false);
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);

    const historyRef = useRef<Set<string>>(new Set());
    const numInputRef = useRef<TextInput>(null);
    const denInputRef = useRef<TextInput>(null);
    const bgAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const k1 = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
        const k2 = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
        nextTask();
        return () => { k1.remove(); k2.remove(); };
    }, []);

    const rnd = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

    const generateProblem = () => {
        setMsg(''); setStatus('neutral'); setReady(false);
        setUserNum(''); setUserDen(''); setAttempts(0); setShowHint(false);
        bgAnim.setValue(0);

        let newTask: any = {};
        let uniqueKey = "";
        let attemptCount = 0;

        const bases = [[1,2], [1,3], [2,3], [1,4], [3,4], [1,5], [2,5], [3,5], [4,5], [1,6], [5,6]];

        do {
            const type = rnd(0, 2);
            const base = bases[rnd(0, bases.length - 1)];
            const bn = base[0];
            const bd = base[1];

            if (type === 0) {
                // SKRACANIE
                const multiplier = rnd(2, 5);
                const bigN = bn * multiplier;
                const bigD = bd * multiplier;

                newTask = {
                    type: 0,
                    q: `Skróć ułamek do postaci nieskracalnej.`,
                    h: `Podziel licznik i mianownik przez wspólny dzielnik (np. ${multiplier}).`,
                    leftNum: bigN, leftDen: bigD,
                    rightNumTarget: bn, rightDenTarget: bd,
                    isRightNumInput: true, isRightDenInput: true
                };
                uniqueKey = `simp-${bigN}-${bigD}`;
            }
            else if (type === 1) {
                // ROZSZERZANIE
                const multiplier = rnd(2, 4);
                newTask = {
                    type: 1,
                    q: `Rozszerz ułamek przez ${multiplier}.`,
                    h: `Pomnóż licznik i mianownik przez ${multiplier}.`,
                    leftNum: bn, leftDen: bd,
                    rightNumTarget: bn * multiplier, rightDenTarget: bd * multiplier,
                    isRightNumInput: true, isRightDenInput: true
                };
                uniqueKey = `exp-${bn}-${bd}-${multiplier}`;
            }
            else {
                // RÓWNOŚĆ (Jedno pole puste)
                const multiplier = rnd(2, 4);
                const bigN = bn * multiplier;
                const bigD = bd * multiplier;
                const missingTop = Math.random() > 0.5;

                newTask = {
                    type: 2,
                    q: 'Wpisz brakującą liczbę.',
                    h: missingTop
                        ? `Mianownik wzrósł ${multiplier} razy, więc licznik też pomnóż przez ${multiplier}.`
                        : `Licznik wzrósł ${multiplier} razy, więc mianownik też pomnóż przez ${multiplier}.`,
                    leftNum: bn, leftDen: bd,
                    rightNumTarget: bigN, rightDenTarget: bigD,
                    isRightNumInput: missingTop, isRightDenInput: !missingTop
                };
                uniqueKey = `eq-${bn}-${bd}-${multiplier}-${missingTop ? 'top' : 'bot'}`;
            }
            attemptCount++;
        } while (historyRef.current.has(uniqueKey) && attemptCount < 20);

        historyRef.current.add(uniqueKey);
        setTask(newTask);

        setTimeout(() => {
            if (newTask.isRightNumInput) numInputRef.current?.focus();
            else if (newTask.isRightDenInput) denInputRef.current?.focus();
        }, 400);
    };

    const handleCheck = () => {
        let isNCorrect = true;
        let isDCorrect = true;

        if (task.isRightNumInput) {
            if (!userNum) { setMsg('Wpisz licznik!'); return; }
            if (parseInt(userNum) !== task.rightNumTarget) isNCorrect = false;
        }
        if (task.isRightDenInput) {
            if (!userDen) { setMsg('Wpisz mianownik!'); return; }
            if (parseInt(userDen) !== task.rightDenTarget) isDCorrect = false;
        }

        if (isNCorrect && isDCorrect) {
            setStatus('correct'); setMsg('Doskonale! ✅');
            Animated.timing(bgAnim, { toValue: 1, duration: 500, useNativeDriver: false }).start();
            setStats(s => ({ ...s, correct: s.correct + 1 }));
            setReady(true);
            InteractionManager.runAfterInteractions(() => awardXpAndCoins(10, 2));
            const currentUser = auth().currentUser;
            if (currentUser) {
                firestore().collection('users').doc(currentUser.uid)
                    .collection('exerciseStats').doc(EXERCISE_ID)
                    .set({ totalCorrect: firestore.FieldValue.increment(1) }, { merge: true })
                    .catch(e => console.error(e));
            }
        } else {
            setStatus('wrong');
            if (attempts === 0) {
                setMsg('Źle... Spróbuj jeszcze raz! ❌');
                setAttempts(1);
                if (task.isRightNumInput && !isNCorrect) setUserNum('');
                if (task.isRightDenInput && !isDCorrect) setUserDen('');

                Animated.sequence([
                    Animated.timing(bgAnim, { toValue: -1, duration: 200, useNativeDriver: false }),
                    Animated.timing(bgAnim, { toValue: 0, duration: 200, useNativeDriver: false })
                ]).start();
                setTimeout(() => setStatus('neutral'), 1000);
            } else {
                setMsg(`Wynik: ${task.rightNumTarget}/${task.rightDenTarget}`);
                setReady(true);
                setStats(s => ({ ...s, wrong: s.wrong + 1 }));
                Animated.timing(bgAnim, { toValue: -1, duration: 500, useNativeDriver: false }).start();
                InteractionManager.runAfterInteractions(() => {
                    const currentUser = auth().currentUser;
                    if (currentUser) {
                        firestore().collection('users').doc(currentUser.uid)
                            .collection('exerciseStats').doc(EXERCISE_ID)
                            .set({ totalWrong: firestore.FieldValue.increment(1) }, { merge: true })
                            .catch(e => console.error(e));
                    }
                });
            }
        }
    };

    const nextTask = () => {
        if (stats.count >= TASKS_LIMIT) { setMsg('Koniec treningu! 🏆'); return; }
        setStats(s => ({ ...s, count: s.count + 1 }));
        generateProblem();
    };

    // Style helper (zapożyczony z ImproperFractions)
    const getInputStyle = () => {
        if (status === 'correct') return styles.inputCorrect;
        if (status === 'wrong') return styles.inputError;
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

                    {showHint && !isKeyboardVisible && (
                        <View style={styles.hintBox}><Text style={styles.hintTitle}>Wskazówka:</Text><Text style={styles.hintText}>{task.h}</Text></View>
                    )}

                    <DrawingModal visible={showScratchpad} onClose={() => setShowScratchpad(false)} problemText={task.q} />

                    <ScrollView contentContainerStyle={styles.centerContent} keyboardShouldPersistTaps="handled">
                        {/* Główna Karta - Styl z ImproperFractions */}
                        <View style={styles.card}>
                            <View style={styles.overlayBackground} />
                            <Text style={styles.headerTitle}>Rozszerzanie i skracanie</Text>
                            <Text style={styles.questionText}>{task.q}</Text>

                            <View style={styles.taskContent}>
                                {/* Sekcja Równania */}
                                <View style={styles.equationRow}>
                                    {/* Lewa Strona (Statyczna) */}
                                    <View style={styles.fractionStatic}>
                                        <Text style={styles.staticNum}>{task.leftNum}</Text>
                                        <View style={styles.staticLine} />
                                        <Text style={styles.staticDen}>{task.leftDen}</Text>
                                    </View>

                                    {/* Znak = */}
                                    <Text style={styles.equalSign}>=</Text>

                                    {/* Prawa Strona (Inputy lub Statyczne) */}
                                    <View style={styles.fractionInputContainer}>
                                        {task.isRightNumInput ? (
                                            <TextInput
                                                ref={numInputRef}
                                                style={[styles.fractionInput, getInputStyle()]}
                                                keyboardType="numeric"
                                                placeholder="?"
                                                placeholderTextColor="#ccc"
                                                value={userNum}
                                                onChangeText={(v) => { setUserNum(v); if(v.length >= 1 && task.isRightDenInput) denInputRef.current?.focus(); }}
                                                editable={!ready}
                                            />
                                        ) : (
                                            <Text style={styles.staticNum}>{task.rightNumTarget}</Text>
                                        )}

                                        <View style={styles.fractionLineLarge} />

                                        {task.isRightDenInput ? (
                                            <TextInput
                                                ref={denInputRef}
                                                style={[styles.fractionInput, getInputStyle()]}
                                                keyboardType="numeric"
                                                placeholder="?"
                                                placeholderTextColor="#ccc"
                                                value={userDen}
                                                onChangeText={setUserDen}
                                                editable={!ready}
                                            />
                                        ) : (
                                            <Text style={styles.staticDen}>{task.rightDenTarget}</Text>
                                        )}
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

// --- STYLES (Skopiowane i dostosowane z ImproperFractionsTrainer) ---
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

    // KARTA - Styl identyczny jak w ImproperFractions
    card: { width: '92%', maxWidth: 450, borderRadius: 25, padding: 25, alignItems: 'center', alignSelf: 'center', elevation: 4, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10 },
    overlayBackground: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: 25 },

    // TYPOGRAFIA
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 15 },
    questionText: { fontSize: 19, color: '#2c3e50', textAlign: 'center', fontWeight: '500', lineHeight: 28, marginBottom: 20 },

    // UKŁAD ZADANIA
    taskContent: { alignItems: 'center', width: '100%', marginBottom: 10 },
    equationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },

    // Elementy Statyczne (Liczby po lewej)
    fractionStatic: { alignItems: 'center', justifyContent: 'center' },
    staticNum: { fontSize: 28, fontWeight: 'bold', color: '#2c3e50', marginBottom: -2 }, // Dopasowane do stylu mixedNum
    staticLine: { width: 40, height: 3, backgroundColor: '#2c3e50', marginVertical: 4 }, // Dopasowane do stylu mixedLine
    staticDen: { fontSize: 28, fontWeight: 'bold', color: '#2c3e50', marginTop: -2 },

    // Znak Równości
    equalSign: { fontSize: 40, fontWeight: 'bold', color: '#2c3e50', marginHorizontal: 15 },

    // INPUTY - Styl identyczny jak w ImproperFractions
    fractionInputContainer: { alignItems: 'center' },
    fractionInput: { width: 75, height: 60, borderWidth: 2, borderColor: '#ccc', borderRadius: 12, backgroundColor: '#fff', fontSize: 28, fontWeight: 'bold', textAlign: 'center', color: '#007AFF' },
    fractionLineLarge: { width: 90, height: 4, backgroundColor: '#333', marginVertical: 8, borderRadius: 2 },

    // STANY KOLORYSTYCZNE
    inputCorrect: { borderColor: '#28a745', backgroundColor: '#e8f5e9', color: '#28a745' },
    inputError: { borderColor: '#dc3545', backgroundColor: '#fbe9eb', color: '#dc3545' },

    // PRZYCISKI I LICZNIKI
    mainBtn: { marginTop: 25, backgroundColor: '#007AFF', paddingHorizontal: 40, paddingVertical: 14, borderRadius: 15 },
    mainBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    counterTextSmall: { fontSize: Math.max(12, screenWidth * 0.035), fontWeight: '400', color: '#555', textAlign: 'center', marginTop: 15 },

    // KOMUNIKATY WYNIKU
    msg: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
    correctText: { color: '#28a745' },
    errorText: { color: '#dc3545' },

    // DOLNE IKONY
    iconsBottom: { position: 'absolute', bottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' },
    iconSame: { width: combinedIconSize, height: combinedIconSize, resizeMode: 'contain', marginHorizontal: 10 },
    counterTextIcons: { fontSize: Math.max(14, combinedIconSize * 0.28), marginHorizontal: 8, textAlign: 'center', color: '#333' },

    // MODAL
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
    drawingContainer: { width: '95%', height: '85%', backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden' },
    drawingHeader: { height: 55, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, backgroundColor: '#f0f0f0' },
    drawingTitle: { fontSize: 18, fontWeight: 'bold' },
    headerButton: { padding: 10 },
    headerButtonText: { fontSize: 16, color: '#007AFF', fontWeight: '600' },
    problemPreviewContainer: { backgroundColor: '#eef6fc', padding: 12, alignItems: 'center' },
    problemPreviewLabel: { fontSize: 13, color: '#666' },
    problemPreviewTextSmall: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
    canvas: { flex: 1, backgroundColor: '#fff' },
});

export default FractionsExpansionTrainer;