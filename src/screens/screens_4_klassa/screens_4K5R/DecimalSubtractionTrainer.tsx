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

const EXERCISE_ID = "DecimalSubtractionTrainer_IV_FinalFix";
const { width: screenWidth } = Dimensions.get('window');

// LIMIT ZADAŃ
const TASKS_LIMIT = 20;
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
const DecimalSubtractionTrainer = () => {
    const navigation = useNavigation();

    // Stan zadań
    const [mode, setMode] = useState<'mental' | 'vertical'>('mental');
    const [num1, setNum1] = useState(0);
    const [num2, setNum2] = useState(0);

    // Vertical State
    const [vNum1Str, setVNum1Str] = useState('');
    const [vNum2Str, setVNum2Str] = useState('');
    const [userDigits, setUserDigits] = useState<string[]>([]);
    const [borrows, setBorrows] = useState<string[]>([]); // Inputy nad liczbami (pożyczki)

    // Walidacja
    const [lockedIndices, setLockedIndices] = useState<boolean[]>([]);
    const [errorIndices, setErrorIndices] = useState<boolean[]>([]);

    // Mental State
    const [mentalInput, setMentalInput] = useState('');

    // Game Logic
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const [readyForNext, setReadyForNext] = useState(false);
    const [attempts, setAttempts] = useState(0);

    const [stats, setStats] = useState({ correct: 0, wrong: 0, count: 0 });
    const [msg, setMsg] = useState('');
    const [showScratchpad, setShowScratchpad] = useState(false);
    const [showHint, setShowHint] = useState(false);
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);
    const [showMilestone, setShowMilestone] = useState(false);
    const [sessionCorrect, setSessionCorrect] = useState(0);
    const [isFinished, setIsFinished] = useState(false);

    const bgAnim = useRef(new Animated.Value(0)).current;
    const inputRefs = useRef<(TextInput | null)[]>([]);

    useEffect(() => {
        const k1 = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
        const k2 = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
        nextTask();
        return () => { k1.remove(); k2.remove(); };
    }, []);

    const rnd = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

    const generateProblem = () => {
        setMsg(''); setIsCorrect(null); setReadyForNext(false);
        setMentalInput('');
        setAttempts(0);
        setLockedIndices([]);
        setErrorIndices([]);
        bgAnim.setValue(0);
        setShowHint(false);

        const newMode = Math.random() < 0.5 ? 'mental' : 'vertical';
        setMode(newMode);

        if (newMode === 'mental') {
            // Logika mentalna (pozioma)
            // Typy: 1.9 - 0.2 | 7 - 0.4 | 12 - 9.8
            const subType = Math.floor(Math.random() * 3);
            let n1 = 0, n2 = 0;

            if (subType === 0) {
                // Ułamek - Ułamek (prosty)
                n1 = rnd(15, 55) / 10;
                const decimalPart = Math.round((n1 % 1) * 10);
                const subDecimal = rnd(1, decimalPart + 2);
                n2 = subDecimal / 10;
            } else if (subType === 1) {
                // Całkowita - Ułamek
                n1 = rnd(2, 9);
                n2 = rnd(1, 9) / 10;
            } else {
                // Całkowita - Większy ułamek
                n1 = rnd(5, 15);
                const diff = rnd(1, 15) / (Math.random() > 0.5 ? 10 : 100);
                n2 = n1 - diff;
            }

            // Fix math precision
            n1 = Math.round(n1 * 100) / 100;
            n2 = Math.round(n2 * 100) / 100;
            if (n2 >= n1) { n2 = n1 - 0.1; }
            if (n2 < 0) n2 = 0.1;

            setNum1(n1); setNum2(n2);

        } else {
            // Logika słupkowa - zawsze 2 miejsca po przecinku
            let n1 = rnd(1000, 9999) / 100; // 10.00 - 99.99
            let n2 = rnd(500, 8000) / 100;  // 5.00 - 80.00

            n1 = Math.round(n1 * 100) / 100;
            n2 = Math.round(n2 * 100) / 100;

            if (n2 >= n1) {
                n2 = n1 - (rnd(100, 500) / 100);
                if (n2 < 0) n2 = 0.15;
            }
            // Final fix precision
            n1 = Math.round(n1 * 100) / 100;
            n2 = Math.round(n2 * 100) / 100;

            setNum1(n1);
            setNum2(n2);

            const s1 = n1.toFixed(2).replace('.', ',');
            const s2 = n2.toFixed(2).replace('.', ',');
            const resLen = (n1 - n2).toFixed(2).length;
            const maxLen = Math.max(s1.length, s2.length, resLen);

            const frac1Pad = s1.padStart(maxLen, ' ');
            const frac2Pad = s2.padStart(maxLen, ' ');

            setVNum1Str(frac1Pad);
            setVNum2Str(frac2Pad);

            setUserDigits(new Array(maxLen).fill(''));
            setBorrows(new Array(maxLen).fill(''));
            setLockedIndices(new Array(maxLen).fill(false));
            setErrorIndices(new Array(maxLen).fill(false));

            setTimeout(() => {
                const lastIdx = maxLen - 1;
                inputRefs.current[lastIdx]?.focus();
            }, 500);
        }
    };

    const handleVerticalInput = (val: string, index: number) => {
        if (lockedIndices[index]) return;

        if (errorIndices[index]) {
            const newErrors = [...errorIndices];
            newErrors[index] = false;
            setErrorIndices(newErrors);
        }

        const clean = val.replace(/[^0-9]/g, '').slice(-1);
        const newDigits = [...userDigits];
        newDigits[index] = clean;
        setUserDigits(newDigits);

        if (clean !== '' && index > 0) {
            let nextIndex = index - 1;
            if (vNum1Str[nextIndex] === ',') nextIndex--;
            // Pomijamy zablokowane pola przy cofaniu
            while (nextIndex >= 0 && lockedIndices[nextIndex]) {
                nextIndex--;
            }
            if (nextIndex >= 0 && vNum1Str[nextIndex] === ',') nextIndex--;
            if (nextIndex >= 0) inputRefs.current[nextIndex]?.focus();
        }
    };

    const handleCheck = () => {
        // ODEJMOWANIE
        const correctResultStr = (num1 - num2).toFixed(2).replace('.', ',');

        // --- MENTAL MODE ---
        if (mode === 'mental') {
            const cleanInput = mentalInput.replace(',', '.').trim();
            if (!cleanInput) { setMsg('Wpisz wynik!'); return; }
            const userVal = parseFloat(cleanInput);
            const correctVal = parseFloat((num1 - num2).toFixed(4));

            if (Math.abs(userVal - correctVal) < 0.0001) {
                handleSuccess();
            } else {
                if (attempts === 0) {
                    setMsg('Błąd! Spróbuj jeszcze raz ⚠️');
                    setAttempts(1);
                    setMentalInput('');
                    Animated.sequence([
                        Animated.timing(bgAnim, { toValue: -1, duration: 200, useNativeDriver: false }),
                        Animated.timing(bgAnim, { toValue: 0, duration: 200, useNativeDriver: false })
                    ]).start();
                } else {
                    handleFailure(correctResultStr);
                }
            }
        }
        // --- VERTICAL MODE ---
        else {
            const expectedArr = correctResultStr.padStart(userDigits.length, ' ').split('');

            // 1. NAJPIERW SPRAWDŹ CZY SĄ PUSTE POLA (tam gdzie powinny być cyfry)
            let hasEmptyFields = false;
            for (let i = 0; i < userDigits.length; i++) {
                const charAtPos = vNum1Str[i];
                if (charAtPos === ',') continue;

                const expectedVal = expectedArr[i];
                const inputVal = userDigits[i];

                // Jeśli oczekujemy cyfry (nie spacji), a pole jest puste i nie jest zablokowane
                if (expectedVal !== ' ' && !inputVal && !lockedIndices[i]) {
                    hasEmptyFields = true;
                    break;
                }
            }

            if (hasEmptyFields) {
                setMsg('Uzupełnij wszystkie pola! ⚠️');
                return;
            }

            // 2. WALIDACJA POPRAWNOŚCI
            let allGood = true;
            const newLocked = [...lockedIndices];
            const newErrors = [...errorIndices];
            const newUserDigits = [...userDigits];

            for (let i = 0; i < userDigits.length; i++) {
                const charAtPos = vNum1Str[i];
                if (charAtPos === ',') continue;

                const inputVal = userDigits[i];
                const expectedVal = expectedArr[i];

                if (expectedVal === ' ' && !inputVal) continue; // Padding

                if (inputVal === expectedVal) {
                    // OK
                } else {
                    allGood = false;
                }
            }

            if (allGood) {
                handleSuccess();
            } else {
                if (attempts === 0) {
                    // PIERWSZA PRÓBA (błędna, ale pełna)
                    setMsg('Popraw czerwone pola ⚠️');
                    setAttempts(1);

                    for (let i = 0; i < userDigits.length; i++) {
                        const charAtPos = vNum1Str[i];
                        if (charAtPos === ',') continue;

                        const inputVal = userDigits[i];
                        const expectedVal = expectedArr[i];

                        if (expectedVal === ' ' && !inputVal) continue;

                        if (inputVal === expectedVal) {
                            newLocked[i] = true; // Zablokuj poprawne
                            newErrors[i] = false;
                        } else {
                            newErrors[i] = true; // Zaznacz błąd
                            newUserDigits[i] = ''; // Wyczyść błędne
                        }
                    }
                    setLockedIndices(newLocked);
                    setErrorIndices(newErrors);
                    setUserDigits(newUserDigits);

                    Animated.sequence([
                        Animated.timing(bgAnim, { toValue: -1, duration: 200, useNativeDriver: false }),
                        Animated.timing(bgAnim, { toValue: 0, duration: 200, useNativeDriver: false })
                    ]).start();

                } else {
                    // DRUGA PRÓBA (koniec)
                    handleFailure(correctResultStr);
                }
            }
        }
    };

    const handleSuccess = () => {
        setStats(s => ({ ...s, correct: s.correct + 1 }));
        setSessionCorrect(prev => prev + 1);
        setMsg('Doskonale! ✅');
        setIsCorrect(true);
        setReadyForNext(true);
        if (mode === 'vertical') {
            setLockedIndices(new Array(userDigits.length).fill(true));
            setErrorIndices(new Array(userDigits.length).fill(false));
        }

        Animated.timing(bgAnim, { toValue: 1, duration: 500, useNativeDriver: false }).start();
        InteractionManager.runAfterInteractions(() => awardXpAndCoins(8, 2));
        const currentUser = auth().currentUser;
        if (currentUser) {
            firestore().collection('users').doc(currentUser.uid).collection('exerciseStats').doc(EXERCISE_ID)
                .set({ totalCorrect: firestore.FieldValue.increment(1) }, { merge: true }).catch(console.error);
        }
    };

    const handleFailure = (correctRes: string) => {
        setStats(s => ({ ...s, wrong: s.wrong + 1 }));
        setMsg(`Koniec prób. Wynik to: ${correctRes}`);
        setIsCorrect(false);
        setReadyForNext(true);
        Animated.sequence([
            Animated.timing(bgAnim, { toValue: -1, duration: 200, useNativeDriver: false }),
            Animated.timing(bgAnim, { toValue: 0, duration: 200, useNativeDriver: false })
        ]).start();
        const currentUser = auth().currentUser;
        if (currentUser) {
            firestore().collection('users').doc(currentUser.uid).collection('exerciseStats').doc(EXERCISE_ID)
                .set({ totalWrong: firestore.FieldValue.increment(1) }, { merge: true }).catch(console.error);
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
        generateProblem();
    };

    const getInputStyle = (isCorrectState: boolean | null) => {
        if (isCorrectState === true) return styles.inputCorrect;
        if (isCorrectState === false && attempts === 1) return styles.inputError;
        return {};
    };

    // --- RENDER PISEMNY ---
    const renderVerticalProblem = () => {
        const renderRow = (paddedStr: string, isSecond: boolean) => (
            <View style={styles.vRow}>
                {isSecond && <View style={styles.plusSignContainer}><Text style={styles.plusSign}>-</Text></View>}
                {paddedStr.split('').map((char, i) => {
                    if (char === ',') return <View key={i} style={styles.commaCell}><Text style={styles.commaText}>,</Text></View>;
                    if (char === ' ') return <View key={i} style={styles.digitCellEmpty} />;
                    return (
                        <View key={i} style={styles.digitCell}>
                            <Text style={styles.digitText}>{char}</Text>
                        </View>
                    );
                })}
            </View>
        );

        return (
            <View style={styles.verticalContainer}>
                {/* Wiersz pożyczek (Brudnopis) */}
                <View style={[styles.vRow, { marginBottom: 8 }]}>
                    <View style={styles.plusSignContainer} />
                    {borrows.map((c, i) => {
                        const charAtPos = vNum1Str[i];
                        if (charAtPos === ',' || charAtPos === ' ') return <View key={i} style={styles.commaCellEmpty} />;
                        return (
                            <View key={i} style={styles.carryCellWrapper}>
                                <TextInput
                                    style={styles.carryInput}
                                    keyboardType="numeric"
                                    maxLength={2} // Pozwalamy na 2 cyfry (np. 12 po pożyczeniu)
                                    value={c}
                                    onChangeText={v => { const n = [...borrows]; n[i]=v; setBorrows(n); }}
                                    editable={!readyForNext}
                                    selectTextOnFocus={true}
                                />
                            </View>
                        );
                    })}
                </View>

                {/* Sekcja liczb z czarną linią */}
                <View style={styles.numbersBox}>
                    {renderRow(vNum1Str, false)}
                    {renderRow(vNum2Str, true)}
                </View>

                {/* Wiersz wyniku */}
                <View style={styles.vRow}>
                    <View style={styles.plusSignContainer} />
                    {userDigits.map((d, i) => {
                        const charAtPos = vNum1Str[i];
                        if (charAtPos === ',') {
                            return <View key={i} style={styles.commaCell}><Text style={styles.commaText}>,</Text></View>;
                        }

                        const isLocked = lockedIndices[i];
                        const isError = errorIndices[i];

                        return (
                            <View key={`res-${i}`} style={[
                                styles.inputCell,
                                isLocked && styles.inputLockedCorrect,
                                isError && styles.inputErrorRed,
                                (isCorrect === true) && styles.inputCorrect
                            ]}>
                                <TextInput
                                    ref={(el) => inputRefs.current[i] = el}
                                    style={[
                                        styles.mainInput,
                                        isLocked && { color: '#155724' },
                                        isError && { color: '#721c24' }
                                    ]}
                                    keyboardType="numeric"
                                    maxLength={1}
                                    value={d}
                                    onChangeText={v => handleVerticalInput(v, i)}
                                    editable={!readyForNext && !isLocked}
                                    selectTextOnFocus={!isLocked}
                                />
                            </View>
                        );
                    })}
                </View>
            </View>
        );
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
                            <Text style={styles.hintTitle}>Wskazówka:</Text>
                            <Text style={styles.hintText}>
                                {mode === 'mental'
                                    ? "Przy odejmowaniu ułamka od całości, pamiętaj o dopisaniu zer po przecinku (np. 7,0 - 0,4)."
                                    : "Jeśli górna cyfra jest mniejsza, „pożycz” od sąsiada z lewej. Zapisz to w okienkach nad liczbą."}
                            </Text>
                        </View>
                    )}

                    <DrawingModal visible={showScratchpad} onClose={() => setShowScratchpad(false)} problemText={`${num1.toString().replace('.', ',')} - ${num2.toString().replace('.', ',')}`} />

                    <Modal visible={showMilestone} transparent={true} animationType="slide">
                        <View style={styles.modalOverlay}>
                            <View style={styles.milestoneCard}>
                                <Text style={styles.milestoneTitle}>Statystyki 📊</Text>
                                <View style={styles.statsRowMilestone}>
                                    <Text style={styles.statsTextMilestone}>Poprawne: {sessionCorrect} / 10</Text>
                                </View>
                                <View style={styles.milestoneButtons}>
                                    <TouchableOpacity style={[styles.mButton, { backgroundColor: '#28a745' }]} onPress={() => { setShowMilestone(false); setSessionCorrect(0); nextTask(); }}><Text style={styles.mButtonText}>Dalej</Text></TouchableOpacity>
                                    <TouchableOpacity style={[styles.mButton, { backgroundColor: '#007AFF' }]} onPress={() => { setShowMilestone(false); navigation.goBack(); }}><Text style={styles.mButtonText}>Wyjdź</Text></TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>

                    <Modal visible={isFinished} transparent={true} animationType="fade">
                        <View style={styles.modalOverlay}>
                            <View style={styles.milestoneCard}>
                                <Text style={styles.milestoneTitle}>Koniec gry! 🏆</Text>
                                <Text style={styles.statsTextMilestone}>Wynik: {stats.correct} / {TASKS_LIMIT}</Text>
                                <View style={styles.milestoneButtons}>
                                    <TouchableOpacity style={[styles.mButton, { backgroundColor: '#28a745' }]} onPress={handleRestart}><Text style={styles.mButtonText}>Jeszcze raz</Text></TouchableOpacity>
                                    <TouchableOpacity style={[styles.mButton, { backgroundColor: '#dc3545' }]} onPress={() => navigation.goBack()}><Text style={styles.mButtonText}>Menu</Text></TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>

                    <ScrollView contentContainerStyle={styles.centerContent} keyboardShouldPersistTaps="handled">
                        <View style={styles.card}>
                            <View style={styles.overlayBackground} />
                            <Text style={styles.headerTitle}>
                                {mode === 'mental' ? "Oblicz w pamięci" : "Oblicz pisemnie"}
                            </Text>

                            <View style={styles.taskContent}>
                                {mode === 'mental' ? (
                                    <View style={styles.mentalContainer}>
                                        <Text style={styles.equationText}>{num1.toString().replace('.', ',')} - {num2.toString().replace('.', ',')} =</Text>
                                        <TextInput
                                            style={[
                                                styles.mentalInput,
                                                attempts === 1 && status !== 'correct' && {borderColor: '#dc3545', backgroundColor: '#ffeef0'},
                                                getInputStyle(isCorrect)
                                            ]}
                                            keyboardType="numeric"
                                            placeholder="?"
                                            placeholderTextColor="#ccc"
                                            value={mentalInput}
                                            onChangeText={(t) => {
                                                setMentalInput(t);
                                                if(attempts === 1) setIsCorrect(null); // Reset stylu błędu przy pisaniu
                                            }}
                                            editable={!readyForNext}
                                        />
                                    </View>
                                ) : renderVerticalProblem()}
                            </View>

                            <TouchableOpacity style={styles.mainBtn} onPress={readyForNext ? nextTask : handleCheck}>
                                <Text style={styles.mainBtnText}>
                                    {readyForNext ? 'Następne' : (attempts === 0 ? 'Sprawdź' : 'Spróbuj ponownie')}
                                </Text>
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

    card: { width: '96%', maxWidth: 550, borderRadius: 25, padding: 20, alignItems: 'center', alignSelf: 'center', elevation: 4, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10 },
    overlayBackground: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: 25 },
    headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#333', marginBottom: 25 },

    taskContent: { alignItems: 'center', width: '100%', marginBottom: 10, minHeight: 180, justifyContent: 'center' },

    mentalContainer: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' },
    equationText: { fontSize: 40, fontWeight: '800', color: '#2c3e50', marginRight: 15, letterSpacing: 1 },
    mentalInput: { width: 120, height: 75, borderWidth: 3, borderColor: '#ccc', borderRadius: 16, backgroundColor: '#fff', fontSize: 36, fontWeight: 'bold', textAlign: 'center', color: '#007AFF', padding: 0, shadowColor: "#000", shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, elevation: 2 },

    verticalContainer: { alignItems: 'flex-end', marginTop: 5 },
    vRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'flex-end', marginBottom: 4 },

    // LINIA ODDZIELAJĄCA
    numbersBox: {
        borderBottomWidth: 4,
        borderBottomColor: '#000',
        paddingBottom: 8,
        marginBottom: 8,
        paddingHorizontal: 10,
        alignItems: 'flex-end'
    },

    digitCell: { width: 54, height: 64, justifyContent: 'center', alignItems: 'center' },
    digitCellEmpty: { width: 54, height: 64 },
    digitText: { fontSize: 40, fontWeight: '800', color: '#222', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', includeFontPadding: false, textAlignVertical: 'center' },

    commaCell: { width: 18, height: 64, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 8 },
    commaCellEmpty: { width: 18 },
    commaText: { fontSize: 40, fontWeight: 'bold', color: '#222' },

    carryCellWrapper: { width: 54, height: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 5 },
    carryInput: { width: 44, height: 38, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, backgroundColor: '#fcfcfc', fontSize: 22, fontWeight: 'bold', textAlign: 'center', color: '#888', padding: 0 },

    inputCell: { width: 54, height: 64, borderWidth: 3, borderColor: '#ccc', borderRadius: 12, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginHorizontal: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },

    // NOWE STYLE DLA WALIDACJI
    inputLockedCorrect: { borderColor: '#28a745', backgroundColor: '#d4edda' }, // Zielony
    inputErrorRed: { borderColor: '#dc3545', backgroundColor: '#ffeef0' }, // Czerwony

    mainInput: { fontSize: 34, fontWeight: 'bold', textAlign: 'center', color: '#007AFF', width: '100%', height: '100%', padding: 0, includeFontPadding: false, textAlignVertical: 'center' },

    plusSignContainer: { width: 40, height: 64, alignItems: 'center', justifyContent: 'center', marginRight: 5 },
    plusSign: { fontSize: 40, fontWeight: 'bold', color: '#333' },

    inputCorrect: { borderColor: '#28a745', backgroundColor: '#e8f5e9', color: '#28a745' },
    inputError: { borderColor: '#dc3545', backgroundColor: '#fbe9eb', color: '#dc3545' },

    mainBtn: { marginTop: 30, backgroundColor: '#007AFF', paddingHorizontal: 50, paddingVertical: 16, borderRadius: 18, elevation: 3, shadowColor: "#007AFF", shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.3, shadowRadius: 5 },
    mainBtnText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
    counterTextSmall: { fontSize: 14, color: '#555', textAlign: 'center', marginTop: 15 },
    msg: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
    correctText: { color: '#28a745' },
    errorText: { color: '#dc3545' },

    iconsBottom: { position: 'absolute', bottom: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' },
    iconSame: { width: combinedIconSize, height: combinedIconSize, resizeMode: 'contain', marginHorizontal: 10 },
    counterTextIcons: { fontSize: 22, marginHorizontal: 8, color: '#333', fontWeight: 'bold' },

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
    milestoneButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 20 },
    mButton: { paddingVertical: 12, paddingHorizontal: 15, borderRadius: 12, width: '48%', alignItems: 'center' },
    mButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 }
});

export default DecimalSubtractionTrainer;