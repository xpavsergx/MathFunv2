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

const EXERCISE_ID = "TwoUnitExpressions_Mixed_cl4";
const { width: screenWidth } = Dimensions.get('window');

const TASKS_LIMIT = 30;
const combinedIconSize = screenWidth * 0.25;

// --- BRUDNOPIS ---
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
const TwoUnitExpressionsTrainer = () => {
    const navigation = useNavigation();

    const [task, setTask] = useState({
        type: 'TO_DECIMAL',
        qText: '',
        unitLeft: '',
        unitRight1: '',
        unitRight2: '',
        correctVal1: '',
        correctVal2: '',
        hint: '',
    });

    const [inp1, setInp1] = useState('');
    const [inp2, setInp2] = useState('');

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
    const inp1Ref = useRef<TextInput>(null);
    const inp2Ref = useRef<TextInput>(null);
    const bgAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const k1 = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
        const k2 = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
        nextTask();
        return () => { k1.remove(); k2.remove(); };
    }, []);

    const rnd = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

    // --- GENEROWANIE ZADAŃ ---
    const generateProblem = () => {
        setMsg(''); setStatus('neutral'); setReady(false);
        setInp1(''); setInp2('');
        setAttempts(0); setShowHint(false);
        bgAnim.setValue(0);

        let newTask: any = {};
        let uniqueKey = "";
        let attemptCount = 0;

        const units = [
            { main: 'cm', sub: 'mm', factor: 10, precision: 1 },
            { main: 'dm', sub: 'cm', factor: 10, precision: 1 },
            { main: 'm', sub: 'cm', factor: 100, precision: 2 },
            { main: 'km', sub: 'm', factor: 1000, precision: 3 }
        ];

        do {
            const modeId = rnd(0, 2);
            const u = units[rnd(0, units.length - 1)];

            let valWhole = 0;
            let valSub = 0;
            let decimalVal = 0;
            let decimalStr = "";

            if (modeId === 0) {
                // --- TRYB 1: ZAMIANA NA UŁAMEK (np. 6 cm -> 0,06 m LUB 5 cm 2 mm -> 5,2 cm) ---

                // ZMIANA: 50% szans na zadanie bez całości (samo dzielenie, np. 6 cm w metrach)
                const hasWhole = Math.random() > 0.5;

                valWhole = hasWhole ? rnd(1, 15) : 0;

                // Jeśli nie ma całości i jednostką jest m/km, chcemy czasem wylosować liczbę "małą" (np. 5 m),
                // żeby wymusić zera wiodące (0,005 km).
                if (!hasWhole && u.factor >= 100) {
                    // 40% szans na bardzo małą liczbę (jednocyfrową dla m->cm, dwucyfrową dla m->km)
                    if (Math.random() < 0.4) valSub = rnd(1, 9);
                    else valSub = rnd(1, u.factor - 1);
                } else {
                    valSub = rnd(1, u.factor - 1);
                }

                // Generowanie pytania
                const qText = valWhole > 0
                    ? `${valWhole} ${u.main} ${valSub} ${u.sub}`
                    : `${valSub} ${u.sub}`; // Np. "6 cm"

                decimalVal = valWhole + (valSub / u.factor);
                decimalStr = decimalVal.toFixed(u.precision).replace('.', ',');

                // Wskazówka dostosowana do braku całości
                const extraHint = valWhole === 0
                    ? `\nSkoro mniejsza jednostka to ${valSub}, a przelicznik to ${u.factor}, wynik będzie mniejszy od 1.`
                    : "";

                newTask = {
                    type: 'TO_DECIMAL',
                    qText: qText,
                    unitRight1: u.main,
                    correctVal1: decimalStr,
                    hint: `1 ${u.main} = ${u.factor} ${u.sub}. Zapisz wynik z przecinkiem.${extraHint}`
                };
                uniqueKey = `TD-${qText}-${u.main}`;

            } else if (modeId === 1) {
                // --- TRYB 2: UŁAMEK -> MNIEJSZA JEDNOSTKA (np. 0,6 cm -> 6 mm) ---
                valWhole = 0;
                valSub = rnd(1, u.factor - 1);

                decimalVal = valSub / u.factor;
                decimalStr = decimalVal.toFixed(u.precision).replace('.', ',');

                newTask = {
                    type: 'TO_SUBUNIT',
                    qText: `${decimalStr} ${u.main}`,
                    unitRight1: u.sub,
                    correctVal1: valSub.toString(),
                    hint: `Pomnóż liczbę ${decimalStr} przez ${u.factor} (przesuń przecinek).`
                };
                uniqueKey = `TS-${decimalStr}-${u.main}`;

            } else {
                // --- TRYB 3: ROZBICIE NA DWIE JEDNOSTKI (np. 3,6 cm -> 3 cm 6 mm) ---
                valWhole = rnd(1, 10);
                valSub = rnd(1, u.factor - 1);

                decimalVal = valWhole + (valSub / u.factor);
                decimalStr = decimalVal.toFixed(u.precision).replace('.', ',');

                newTask = {
                    type: 'TO_TWO_UNITS',
                    qText: `${decimalStr} ${u.main}`,
                    unitRight1: u.main,
                    unitRight2: u.sub,
                    correctVal1: valWhole.toString(),
                    correctVal2: valSub.toString(),
                    hint: `Liczba przed przecinkiem to ${u.main}.\nLiczba po przecinku oznacza części (${u.sub}).`
                };
                uniqueKey = `TT-${decimalStr}-${u.main}`;
            }

            attemptCount++;
        } while (historyRef.current.has(uniqueKey) && attemptCount < 20);

        historyRef.current.add(uniqueKey);
        setTask(newTask);

        setTimeout(() => { inp1Ref.current?.focus(); }, 400);
    };

    // --- SPRAWDZANIE (Akceptuje kropkę i przecinek) ---
    const handleCheck = () => {
        let isCorrect = false;

        const parseUserFloat = (text: string) => {
            if (!text) return NaN;
            return parseFloat(text.replace(/,/g, '.').replace(/\s/g, ''));
        };

        const val1 = parseUserFloat(inp1);
        const val2 = parseUserFloat(inp2);

        if (task.type === 'TO_DECIMAL') {
            if (isNaN(val1)) { setMsg('Wpisz wynik! ⚠️'); return; }
            const correctVal = parseFloat(task.correctVal1.replace(',', '.'));
            if (Math.abs(val1 - correctVal) < 0.00001) isCorrect = true;

        } else if (task.type === 'TO_SUBUNIT') {
            if (isNaN(val1)) { setMsg('Wpisz wynik! ⚠️'); return; }
            const correctVal = parseFloat(task.correctVal1);
            if (Math.abs(val1 - correctVal) < 0.00001) isCorrect = true;

        } else if (task.type === 'TO_TWO_UNITS') {
            if (isNaN(val1) || isNaN(val2)) { setMsg('Uzupełnij oba pola! ⚠️'); return; }
            const c1 = parseFloat(task.correctVal1);
            const c2 = parseFloat(task.correctVal2);
            if (Math.abs(val1 - c1) < 0.00001 && Math.abs(val2 - c2) < 0.00001) isCorrect = true;
        }

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
                if (task.type === 'TO_TWO_UNITS') { setInp1(''); setInp2(''); }
                else { setInp1(''); }

                Animated.sequence([
                    Animated.timing(bgAnim, { toValue: -1, duration: 200, useNativeDriver: false }),
                    Animated.timing(bgAnim, { toValue: 0, duration: 200, useNativeDriver: false })
                ]).start();

                setTimeout(() => setStatus('neutral'), 1500);
            } else {
                let ansText = "";
                if (task.type === 'TO_DECIMAL') ansText = `${task.correctVal1} ${task.unitRight1}`;
                else if (task.type === 'TO_SUBUNIT') ansText = `${task.correctVal1} ${task.unitRight1}`;
                else ansText = `${task.correctVal1} ${task.unitRight1} ${task.correctVal2} ${task.unitRight2}`;

                setMsg(`Wynik: ${ansText}`);
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

                    <DrawingModal visible={showScratchpad} onClose={() => setShowScratchpad(false)} problemText={task.qText} />

                    <ScrollView contentContainerStyle={styles.centerContent} keyboardShouldPersistTaps="handled">
                        <View style={styles.card}>
                            <View style={styles.overlayBackground} />
                            <Text style={styles.headerTitle}>Wyrażenia i jednostki</Text>
                            <Text style={styles.subHeader}>Uzupełnij brakujące liczby.</Text>

                            <View style={styles.taskContent}>
                                <View style={styles.equationRow}>

                                    <Text style={styles.staticTextLarge}>{task.qText}</Text>
                                    <Text style={styles.operatorSign}>=</Text>

                                    {(task.type === 'TO_DECIMAL' || task.type === 'TO_SUBUNIT') && (
                                        <View style={styles.inputContainer}>
                                            <TextInput
                                                ref={inp1Ref}
                                                style={[styles.inputLarge, getInputStyle()]}
                                                keyboardType="numeric"
                                                placeholder="?"
                                                placeholderTextColor="#ccc"
                                                value={inp1}
                                                onChangeText={setInp1}
                                                onSubmitEditing={ready ? nextTask : handleCheck}
                                                blurOnSubmit={false}
                                                editable={!ready}
                                            />
                                            <Text style={styles.unitLabel}>{task.unitRight1}</Text>
                                        </View>
                                    )}

                                    {task.type === 'TO_TWO_UNITS' && (
                                        <View style={styles.doubleInputRow}>
                                            <View style={styles.inputContainer}>
                                                <TextInput
                                                    ref={inp1Ref}
                                                    style={[styles.inputMedium, getInputStyle()]}
                                                    keyboardType="numeric"
                                                    placeholder="?"
                                                    placeholderTextColor="#ccc"
                                                    value={inp1}
                                                    onChangeText={setInp1}
                                                    onSubmitEditing={() => inp2Ref.current?.focus()}
                                                    returnKeyType="next"
                                                    blurOnSubmit={false}
                                                    editable={!ready}
                                                />
                                                <Text style={styles.unitLabel}>{task.unitRight1}</Text>
                                            </View>

                                            <View style={[styles.inputContainer, { marginLeft: 10 }]}>
                                                <TextInput
                                                    ref={inp2Ref}
                                                    style={[styles.inputMedium, getInputStyle()]}
                                                    keyboardType="numeric"
                                                    placeholder="?"
                                                    placeholderTextColor="#ccc"
                                                    value={inp2}
                                                    onChangeText={setInp2}
                                                    onSubmitEditing={ready ? nextTask : handleCheck}
                                                    returnKeyType="done"
                                                    blurOnSubmit={false}
                                                    editable={!ready}
                                                />
                                                <Text style={styles.unitLabel}>{task.unitRight2}</Text>
                                            </View>
                                        </View>
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

    card: { width: '96%', maxWidth: 620, borderRadius: 25, padding: 20, alignItems: 'center', alignSelf: 'center', elevation: 4, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10 },
    overlayBackground: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: 25 },

    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 5 },
    subHeader: { fontSize: 16, color: '#666', marginBottom: 20 },

    taskContent: { alignItems: 'center', width: '100%', marginBottom: 15 },
    equationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' },

    staticTextLarge: { fontSize: 26, fontWeight: 'bold', color: '#2c3e50', marginRight: 5 },
    operatorSign: { fontSize: 30, fontWeight: 'bold', color: '#2c3e50', marginHorizontal: 8 },

    inputContainer: { flexDirection: 'row', alignItems: 'center' },
    doubleInputRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' },

    inputLarge: {
        width: 130, height: 60,
        borderWidth: 2, borderColor: '#ccc', borderRadius: 12,
        backgroundColor: '#fff', fontSize: 24, fontWeight: 'bold',
        textAlign: 'center', color: '#007AFF', marginRight: 5
    },
    inputMedium: {
        width: 90, height: 60,
        borderWidth: 2, borderColor: '#ccc', borderRadius: 12,
        backgroundColor: '#fff', fontSize: 24, fontWeight: 'bold',
        textAlign: 'center', color: '#007AFF', marginRight: 5
    },
    unitLabel: { fontSize: 24, fontWeight: 'bold', color: '#2c3e50' },

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

export default TwoUnitExpressionsTrainer;