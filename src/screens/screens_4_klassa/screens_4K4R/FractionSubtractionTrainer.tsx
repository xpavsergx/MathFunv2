import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TextInput, Keyboard, ImageBackground,
    Animated, StatusBar, Image, Dimensions, TouchableOpacity, Modal,
    Platform, KeyboardAvoidingView, TouchableWithoutFeedback, ScrollView, InteractionManager
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { awardXpAndCoins } from '../../../services/xpService';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

const EXERCISE_ID = "FractionSubtraction_cl4";
const { width: screenWidth } = Dimensions.get('window');

// LIMIT ZADAŃ
const TASKS_LIMIT = 30;
const combinedIconSize = screenWidth * 0.25;

// --- Helper: GCD ---
const gcd = (a: number, b: number): number => {
    return b === 0 ? a : gcd(b, a % b);
};

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
const FractionSubtractionTrainer = () => {
    const navigation = useNavigation();

    const [task, setTask] = useState({
        q: '',
        h: '',
        t1Whole: 0, t1Num: 0, t1Den: 1,
        t2Whole: 0, t2Num: 0, t2Den: 1,
        midWhole: 0, midNum: 0, midDen: 1,
        finalWhole: 0, finalNum: 0, finalDen: 1,
        isTwoStep: false,
        hasMidWhole: false,
        hasFinalWhole: false
    });

    const [inpMidWhole, setInpMidWhole] = useState('');
    const [inpMidNum, setInpMidNum] = useState('');
    const [inpMidDen, setInpMidDen] = useState('');
    const [inpFinalWhole, setInpFinalWhole] = useState('');
    const [inpFinalNum, setInpFinalNum] = useState('');
    const [inpFinalDen, setInpFinalDen] = useState('');

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

    const historyRef = useRef<Set<string>>(new Set());

    const midWholeRef = useRef<TextInput>(null);
    const midNumRef = useRef<TextInput>(null);
    const midDenRef = useRef<TextInput>(null);
    const finalWholeRef = useRef<TextInput>(null);
    const finalNumRef = useRef<TextInput>(null);
    const finalDenRef = useRef<TextInput>(null);
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
        setInpMidWhole(''); setInpMidNum(''); setInpMidDen('');
        setInpFinalWhole(''); setInpFinalNum(''); setInpFinalDen('');
        setAttempts(0); setShowHint(false);
        bgAnim.setValue(0);

        let newTask: any = {};
        let uniqueKey = "";
        let attemptCount = 0;

        const denominators = [3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20];

        do {
            const den = denominators[rnd(0, denominators.length - 1)];

            let w1 = rnd(1, 5);
            let n1 = rnd(1, den + 5);

            let w2 = rnd(0, w1);
            let n2 = rnd(1, den);

            if (n1 <= n2) {
                n1 = n2 + rnd(1, 4);
            }
            if (w2 > w1) w2 = w1;

            const midWhole = w1 - w2;
            const midNum = n1 - n2;
            const midDen = den;
            const hasMidWhole = midWhole > 0;

            let finalWhole = midWhole;
            let finalNum = midNum;
            let finalDen = midDen;

            if (finalNum >= finalDen) {
                finalWhole += Math.floor(finalNum / finalDen);
                finalNum = finalNum % finalDen;
            }

            if (finalNum > 0) {
                const common = gcd(finalNum, finalDen);
                if (common > 1) {
                    finalNum /= common;
                    finalDen /= common;
                }
            }

            const isTwoStep = (midNum !== finalNum) || (midWhole !== finalWhole) || (midDen !== finalDen);
            const hasFinalWhole = finalWhole > 0;

            newTask = {
                q: 'Oblicz różnicę.',
                h: isTwoStep ? 'Odejmij, a następnie skróć ułamek lub wyłącz całości.' : 'Odejmij całości od całości, a liczniki od liczników.',
                t1Whole: w1, t1Num: n1, t1Den: den,
                t2Whole: w2, t2Num: n2, t2Den: den,
                midWhole, midNum, midDen, hasMidWhole,
                finalWhole, finalNum, finalDen, hasFinalWhole,
                isTwoStep
            };

            uniqueKey = `${w1}-${n1}-${w2}-${n2}-${den}`;
            attemptCount++;
        } while (historyRef.current.has(uniqueKey) && attemptCount < 20);

        historyRef.current.add(uniqueKey);
        setTask(newTask);

        setTimeout(() => {
            if (newTask.hasMidWhole) midWholeRef.current?.focus();
            else midNumRef.current?.focus();
        }, 400);
    };

    const handleCheck = () => {
        // --- 1. PROWADZENIE VALIDACJI PUSTYCH PÓL ---
        let missingField = false;

        // Sprawdzamy krok 1
        if (task.hasMidWhole && !inpMidWhole) missingField = true;
        if (!inpMidNum) missingField = true;
        if (!inpMidDen) missingField = true;

        // Sprawdzamy krok 2 (jeśli istnieje)
        if (task.isTwoStep) {
            // Jeśli wynik końcowy ma całości (lub jest liczbą całkowitą)
            if ((task.hasFinalWhole || task.finalNum === 0) && !inpFinalWhole) missingField = true;

            // Jeśli wynik końcowy ma ułamek
            if (task.finalNum > 0) {
                if (!inpFinalNum) missingField = true;
                if (!inpFinalDen) missingField = true;
            }
        }

        if (missingField) {
            setMsg('Uzupełnij puste pola! ⚠️');
            // Nie dodajemy attempts, nie psujemy statystyk
            return;
        }

        // --- 2. JEŚLI WSZYSTKO WYPEŁNIONE, SPRAWDZAMY WYNIKI ---
        let allCorrect = true;

        const uMidW = parseInt(inpMidWhole || '0');
        const uMidN = parseInt(inpMidNum || '0');
        const uMidD = parseInt(inpMidDen || '0');

        const uFinW = parseInt(inpFinalWhole || '0');
        const uFinN = parseInt(inpFinalNum || '0');
        const uFinD = parseInt(inpFinalDen || '0');

        let midCorrect = true;
        if (task.hasMidWhole && uMidW !== task.midWhole) midCorrect = false;
        if (uMidN !== task.midNum) midCorrect = false;
        if (uMidD !== task.midDen) midCorrect = false;

        let finCorrect = true;
        if (task.isTwoStep) {
            if (task.finalNum === 0) {
                if (uFinW !== task.finalWhole) finCorrect = false;
            } else {
                if (task.hasFinalWhole && uFinW !== task.finalWhole) finCorrect = false;
                if (uFinN !== task.finalNum) finCorrect = false;
                if (uFinD !== task.finalDen) finCorrect = false;
            }
        }

        if (!midCorrect || !finCorrect) allCorrect = false;

        if (allCorrect) {
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

            // Smart feedback for Step 2
            if (task.isTwoStep && midCorrect && !finCorrect) {
                const userVal = uFinW + (uFinD !== 0 ? uFinN / uFinD : 0);
                const targetVal = task.finalWhole + (task.finalDen !== 0 ? task.finalNum / task.finalDen : 0);
                if (Math.abs(userVal - targetVal) < 0.0001) {
                    if (uFinN > task.finalNum && uFinD > task.finalDen) {
                        setMsg('Skróć ułamek! ✂️');
                        return;
                    }
                    if (uFinN >= uFinD) {
                        setMsg('Wyłącz całości! 🍰');
                        return;
                    }
                }
            }

            if (attempts === 0) {
                setMsg('Błąd! Popraw czerwone pola. ❌');
                setAttempts(1);

                if (task.hasMidWhole && uMidW !== task.midWhole) setInpMidWhole('');
                if (uMidN !== task.midNum) setInpMidNum('');
                if (uMidD !== task.midDen) setInpMidDen('');

                if (task.isTwoStep) {
                    if (task.finalNum === 0) {
                        if (uFinW !== task.finalWhole) setInpFinalWhole('');
                    } else {
                        if (task.hasFinalWhole && uFinW !== task.finalWhole) setInpFinalWhole('');
                        if (uFinN !== task.finalNum) setInpFinalNum('');
                        if (uFinD !== task.finalDen) setInpFinalDen('');
                    }
                }

                Animated.sequence([
                    Animated.timing(bgAnim, { toValue: -1, duration: 200, useNativeDriver: false }),
                    Animated.timing(bgAnim, { toValue: 0, duration: 200, useNativeDriver: false })
                ]).start();

                setTimeout(() => setStatus('neutral'), 1500);
            } else {
                let res = "";
                if (task.midWhole > 0) res += `${task.midWhole} `;
                res += `${task.midNum}/${task.midDen}`;
                if (task.isTwoStep) {
                    res += " = ";
                    if (task.finalWhole > 0) res += `${task.finalWhole} `;
                    if (task.finalNum > 0) res += `${task.finalNum}/${task.finalDen}`;
                }
                setMsg(`Wynik: ${res}`);
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

    const renderStaticMixed = (whole: number, num: number, den: number) => (
        <View style={styles.mixedContainer}>
            {whole > 0 && <Text style={styles.staticWhole}>{whole}</Text>}
            <View style={styles.fractionStatic}>
                <Text style={styles.staticNum}>{num}</Text>
                <View style={styles.staticLine} />
                <Text style={styles.staticDen}>{den}</Text>
            </View>
        </View>
    );

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
                        <View style={styles.hintBox}><Text style={styles.hintTitle}>Wskazówka:</Text><Text style={styles.hintText}>{task.h}</Text></View>
                    )}

                    <DrawingModal visible={showScratchpad} onClose={() => setShowScratchpad(false)} problemText={task.q} />

                    <ScrollView contentContainerStyle={styles.centerContent} keyboardShouldPersistTaps="handled">
                        <View style={styles.card}>
                            <View style={styles.overlayBackground} />
                            <Text style={styles.headerTitle}>Odejmowanie ułamków</Text>

                            <View style={styles.taskContent}>
                                <View style={styles.equationRow}>
                                    {renderStaticMixed(task.t1Whole, task.t1Num, task.t1Den)}
                                    <Text style={styles.operatorSign}>-</Text>
                                    {renderStaticMixed(task.t2Whole, task.t2Num, task.t2Den)}
                                    <Text style={styles.operatorSign}>=</Text>

                                    <View style={styles.mixedInputContainer}>
                                        {task.hasMidWhole && (
                                            <TextInput
                                                ref={midWholeRef}
                                                style={[styles.wholeInput, getInputStyle(inpMidWhole, task.midWhole)]}
                                                keyboardType="numeric"
                                                placeholder="?"
                                                placeholderTextColor="#ccc"
                                                value={inpMidWhole}
                                                onChangeText={setInpMidWhole}
                                                onSubmitEditing={() => midNumRef.current?.focus()}
                                                blurOnSubmit={false}
                                                returnKeyType="next"
                                                editable={!ready}
                                            />
                                        )}
                                        <View style={styles.fractionInputColumn}>
                                            <TextInput
                                                ref={midNumRef}
                                                style={[styles.fractionInput, getInputStyle(inpMidNum, task.midNum)]}
                                                keyboardType="numeric"
                                                placeholder="?"
                                                placeholderTextColor="#ccc"
                                                value={inpMidNum}
                                                onChangeText={setInpMidNum}
                                                onSubmitEditing={() => midDenRef.current?.focus()}
                                                blurOnSubmit={false}
                                                returnKeyType="next"
                                                editable={!ready}
                                            />
                                            <View style={styles.fractionLineLarge} />
                                            <TextInput
                                                ref={midDenRef}
                                                style={[styles.fractionInput, getInputStyle(inpMidDen, task.midDen)]}
                                                keyboardType="numeric"
                                                placeholder="?"
                                                placeholderTextColor="#ccc"
                                                value={inpMidDen}
                                                onChangeText={setInpMidDen}
                                                onSubmitEditing={() => {
                                                    if (task.isTwoStep) {
                                                        if (task.hasFinalWhole) finalWholeRef.current?.focus();
                                                        else finalNumRef.current?.focus();
                                                    }
                                                }}
                                                blurOnSubmit={!task.isTwoStep}
                                                returnKeyType={task.isTwoStep ? "next" : "done"}
                                                editable={!ready}
                                            />
                                        </View>
                                    </View>

                                    {task.isTwoStep && (
                                        <>
                                            <Text style={styles.operatorSign}>=</Text>
                                            <View style={styles.mixedInputContainer}>
                                                {(task.hasFinalWhole || task.finalNum === 0) && (
                                                    <TextInput
                                                        ref={finalWholeRef}
                                                        style={[styles.wholeInput, getInputStyle(inpFinalWhole, task.finalWhole)]}
                                                        keyboardType="numeric"
                                                        placeholder="?"
                                                        placeholderTextColor="#ccc"
                                                        value={inpFinalWhole}
                                                        onChangeText={setInpFinalWhole}
                                                        onSubmitEditing={() => finalNumRef.current?.focus()}
                                                        blurOnSubmit={false}
                                                        returnKeyType="next"
                                                        editable={!ready}
                                                    />
                                                )}

                                                {task.finalNum > 0 && (
                                                    <View style={styles.fractionInputColumn}>
                                                        <TextInput
                                                            ref={finalNumRef}
                                                            style={[styles.fractionInput, getInputStyle(inpFinalNum, task.finalNum)]}
                                                            keyboardType="numeric"
                                                            placeholder="?"
                                                            placeholderTextColor="#ccc"
                                                            value={inpFinalNum}
                                                            onChangeText={setInpFinalNum}
                                                            onSubmitEditing={() => finalDenRef.current?.focus()}
                                                            blurOnSubmit={false}
                                                            returnKeyType="next"
                                                            editable={!ready}
                                                        />
                                                        <View style={styles.fractionLineLarge} />
                                                        <TextInput
                                                            ref={finalDenRef}
                                                            style={[styles.fractionInput, getInputStyle(inpFinalDen, task.finalDen)]}
                                                            keyboardType="numeric"
                                                            placeholder="?"
                                                            placeholderTextColor="#ccc"
                                                            value={inpFinalDen}
                                                            onChangeText={setInpFinalDen}
                                                            returnKeyType="done"
                                                            editable={!ready}
                                                        />
                                                    </View>
                                                )}
                                            </View>
                                        </>
                                    )}

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

    taskContent: { alignItems: 'center', width: '100%', marginBottom: 10 },
    equationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' },

    mixedContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 4 },
    staticWhole: { fontSize: 28, fontWeight: 'bold', color: '#2c3e50', marginRight: 4, marginBottom: 2 },
    fractionStatic: { alignItems: 'center', justifyContent: 'center' },
    staticNum: { fontSize: 22, fontWeight: 'bold', color: '#2c3e50', marginBottom: -2 },
    staticLine: { width: 30, height: 3, backgroundColor: '#2c3e50', marginVertical: 3 },
    staticDen: { fontSize: 22, fontWeight: 'bold', color: '#2c3e50', marginTop: -2 },

    operatorSign: { fontSize: 32, fontWeight: 'bold', color: '#2c3e50', marginHorizontal: 6 },

    mixedInputContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 5 },
    wholeInput: { width: 50, height: 70, borderWidth: 2, borderColor: '#ccc', borderRadius: 10, backgroundColor: '#fff', fontSize: 28, fontWeight: 'bold', textAlign: 'center', color: '#007AFF', marginRight: 4 },
    fractionInputColumn: { alignItems: 'center' },
    fractionInput: { width: 60, height: 50, borderWidth: 2, borderColor: '#ccc', borderRadius: 10, backgroundColor: '#fff', fontSize: 22, fontWeight: 'bold', textAlign: 'center', color: '#007AFF' },
    fractionLineLarge: { width: 65, height: 4, backgroundColor: '#333', marginVertical: 6, borderRadius: 2 },

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
    suggestionTextMilestone: { fontSize: 15, color: '#666', textAlign: 'center', marginVertical: 20, lineHeight: 22 },
    milestoneButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
    mButton: { paddingVertical: 12, paddingHorizontal: 15, borderRadius: 12, width: '48%', alignItems: 'center' },
    mButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 }
});

export default FractionSubtractionTrainer;