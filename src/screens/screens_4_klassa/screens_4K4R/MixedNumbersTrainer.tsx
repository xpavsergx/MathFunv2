import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TextInput, Keyboard, ImageBackground,
    Animated, StatusBar, Image, Dimensions, TouchableOpacity, Modal,
    Platform, KeyboardAvoidingView, TouchableWithoutFeedback, ScrollView, InteractionManager
} from 'react-native';
import Svg, { Path, Rect, G, Line } from 'react-native-svg';
import { awardXpAndCoins } from '../../../services/xpService';

const { width: screenWidth } = Dimensions.get('window');
const TASKS_LIMIT = 40;
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

// --- ВИЗУАЛИЗАЦИЯ (ФИГУРЫ) ---
const MixedShape = ({ whole, num, den }: { whole: number, num: number, den: number }) => {
    if (!den || den === 0 || isNaN(den)) return null;
    const size = 90;
    const radius = 40; const center = 45;

    const renderCircle = (isFull: boolean) => (
        <Svg height={size} width={size} viewBox={`0 0 ${size} ${size}`}>
            {[...Array(den)].map((_, i) => {
                const startAngle = (i * 360) / den - 90;
                const endAngle = ((i + 1) * 360) / den - 90;
                if (isNaN(startAngle)) return null;
                const x1 = center + radius * Math.cos((Math.PI * startAngle) / 180);
                const y1 = center + radius * Math.sin((Math.PI * startAngle) / 180);
                const x2 = center + radius * Math.cos((Math.PI * endAngle) / 180);
                const y2 = center + radius * Math.sin((Math.PI * endAngle) / 180);
                const d = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`;
                const fill = isFull || i < num ? "#4A90E2" : "#FFF";
                return <Path key={i} d={d} fill={fill} stroke="#333" strokeWidth="1" />;
            })}
        </Svg>
    );
    return (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
            {[...Array(whole)].map((_, i) => <View key={`w-${i}`} style={{margin: 2}}>{renderCircle(true)}</View>)}
            {num > 0 && <View key="part" style={{margin: 2}}>{renderCircle(false)}</View>}
        </View>
    );
};

// --- ВИЗУАЛИЗАЦИЯ (СТАКАНЫ) ---
const LiquidCup = ({ full, level, den }: { full: number, level: number, den: number }) => {
    if (!den || den === 0) return null;
    const renderCup = (isFull: boolean, fillLevel: number) => {
        const height = 80; const width = 50;
        const fillH = isFull ? height : (fillLevel / den) * height;
        return (
            <View style={{ marginHorizontal: 5, alignItems: 'center' }}>
                <Svg height={90} width={60}>
                    <Rect x="5" y="5" width={width} height={height} stroke="#333" strokeWidth="2" fill="none" />
                    <Rect x="5" y={5 + (height - fillH)} width={width} height={fillH} fill="rgba(74, 144, 226, 0.6)" />
                    {[...Array(den)].map((_, i) => (
                        <Line key={i} x1="5" y1={5 + i * (height / den)} x2="15" y2={5 + i * (height / den)} stroke="#333" strokeWidth="1" />
                    ))}
                </Svg>
            </View>
        );
    };
    return (
        <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
            {[...Array(full)].map((_, i) => <View key={i}>{renderCup(true, den)}</View>)}
            {renderCup(false, level)}
        </View>
    );
};

// --- ГЛАВНЫЙ КОМПОНЕНТ ---
const MixedNumbersTrainer = () => {
    const [task, setTask] = useState<any>({
        type: 'visual', q: '', h: '',
        ans: { w: 0, n: 0, d: 1 },
        whole: 0, num: 0, den: 1,
        full: 0, level: 0
    });

    const [inputs, setInputs] = useState({ w: '', n: '', d: '' });
    const [correctness, setCorrectness] = useState({ w: null, n: null, d: null });
    const [ready, setReady] = useState(false);
    const [attempts, setAttempts] = useState(0);
    const [stats, setStats] = useState({ correct: 0, wrong: 0, count: 0 });
    const [msg, setMsg] = useState('');

    const [showScratchpad, setShowScratchpad] = useState(false);
    const [showHint, setShowHint] = useState(false);
    const [keyboardVisible, setKeyboardVisible] = useState(false);

    const bgAnim = useRef(new Animated.Value(0)).current;

    const wRef = useRef<TextInput>(null);
    const nRef = useRef<TextInput>(null);
    const dRef = useRef<TextInput>(null);

    useEffect(() => {
        const k1 = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
        const k2 = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
        nextTask();
        return () => { k1.remove(); k2.remove(); };
    }, []);

    const rnd = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

    const generateProblem = () => {
        setMsg(''); setCorrectness({ w: null, n: null, d: null });
        setReady(false); setInputs({ w: '', n: '', d: '' });
        setAttempts(0); bgAnim.setValue(0); setShowHint(false);

        const type = rnd(0, 4);
        let q = '', h = '', ans = { w: 0, n: 0, d: 0 }, data = {};

        // 1. VISUAL
        if (type === 0) {
            const den = [3, 4, 5, 6, 8][rnd(0, 4)];
            const whole = rnd(1, 3);
            const num = rnd(1, den - 1);
            q = "Zapisz liczbę mieszaną przedstawioną na rysunku:";
            h = "Policz całe koła (duża liczba) i kawałki ostatniego koła (ułamek).";
            ans = { w: whole, n: num, d: den };
            data = { type: 'visual', whole, num, den };
        }
        // 2. UNITS
        else if (type === 1) {
            const subType = rnd(0, 3);
            let u1 = '', u2 = '', r = 10;
            if (subType === 0) { u1 = 'cm'; u2 = 'mm'; r = 10; }
            else if (subType === 1) { u1 = 'm'; u2 = 'cm'; r = 100; }
            else if (subType === 2) { u1 = 'kg'; u2 = 'dag'; r = 100; }
            else { u1 = 't'; u2 = 'kg'; r = 1000; }

            const isMixed = Math.random() > 0.5;
            const wVal = isMixed ? rnd(1, 9) : 0;
            const nVal = rnd(1, r - 1);

            if (isMixed) {
                q = `Wyraź liczbą mieszaną:\n${wVal} ${u1} ${nVal} ${u2} – ile to ${u1}?`;
                ans = { w: wVal, n: nVal, d: r };
            } else {
                q = `Wyraź ułamkiem:\n${nVal} ${u2} – jaka to część ${u1}?`;
                ans = { w: 0, n: nVal, d: r };
            }
            h = `Pamiętaj: 1 ${u1} = ${r} ${u2}. Mianownik to ${r}.`;
            data = { type: 'text' };
        }
        // 3. TIME
        else if (type === 2) {
            const subType = rnd(0, 3);
            if (subType === 0) {
                const wVal = Math.random() > 0.5 ? rnd(1, 4) : 0;
                const nVal = rnd(1, 6);
                if (wVal > 0) q = `${wVal} tyg. i ${nVal} dni – ile to tygodni?`;
                else q = `${nVal} dni – jaka to część tygodnia?`;
                ans = { w: wVal, n: nVal, d: 7 };
                h = "Tydzień ma 7 dni.";
            } else if (subType === 1) {
                const wVal = Math.random() > 0.5 ? rnd(1, 5) : 0;
                const nVal = rnd(1, 59);
                if (wVal > 0) q = `${wVal} godz. i ${nVal} min – ile to godzin?`;
                else q = `${nVal} min – jaka to część godziny?`;
                ans = { w: wVal, n: nVal, d: 60 };
                h = "Godzina ma 60 minut.";
            } else {
                const nVal = rnd(1, 3);
                q = `${nVal} kwadranse – jaka to część godziny? (w minutach to ${nVal*15})`;
                ans = { w: 0, n: nVal, d: 4 };
                h = "Jeden kwadrans to 1/4 godziny.";
            }
            data = { type: 'text' };
        }
        // 4. LIQUID
        else if (type === 3) {
            const den = [2, 3, 4, 5][rnd(0, 3)];
            const full = rnd(1, 2);
            const level = rnd(1, den - 1);
            q = "Ile łącznie litrów soku jest w naczyniach?";
            h = "Dodaj do siebie pełne szklanki i ułamek z ostatniej.";
            ans = { w: full, n: level, d: den };
            data = { type: 'liquid', full, level, den };
        }
        // 5. WORDS
        else {
            const nums = ["jedna", "dwie", "trzy", "cztery", "pięć", "sześć"];
            const dens = ["druga", "trzecia", "czwarta", "piąta", "szósta", "siódma"];
            const wVal = rnd(1, 6);
            const nVal = rnd(1, 2);
            const dIdx = rnd(0, 5);
            const dText = dens[dIdx] + (nVal > 1 ? "e" : "a");
            q = `Zapisz cyframi:\n${nums[wVal-1]} całe i ${nums[nVal-1]} ${dText}.`;
            h = "Najpierw wpisz dużą cyfrę, potem ułamek.";
            ans = { w: wVal, n: nVal, d: dIdx + 2 };
            data = { type: 'text' };
        }

        setTask({ q, h, ans, ...data });
        // --- УДАЛЕНО АВТОМАТИЧЕСКОЕ ПЕРЕКЛЮЧЕНИЕ ФОКУСА ---
        // Теперь пользователь сам должен нажать на поле, чтобы начать ввод
    };

    const handleCheck = () => {
        const uw = inputs.w === '' ? 0 : parseInt(inputs.w);
        const un = parseInt(inputs.n);
        const ud = parseInt(inputs.d);

        if (!inputs.n || !inputs.d) {
            setMsg('Uzupełnij ułamek!'); return;
        }

        const isW = uw === task.ans.w;
        const isN = un === task.ans.n;
        const isD = ud === task.ans.d;

        setCorrectness({ w: isW, n: isN, d: isD });

        if (isW && isN && isD) {
            Animated.timing(bgAnim, { toValue: 1, duration: 500, useNativeDriver: false }).start();
            setStats(s => ({ ...s, correct: s.correct + 1 }));
            setMsg('Doskonale! ✅');
            setReady(true);
            InteractionManager.runAfterInteractions(() => awardXpAndCoins(10, 2));
        } else {
            const nextAtt = attempts + 1;
            setAttempts(nextAtt);
            if (nextAtt < 2) {
                setMsg('Spróbuj poprawić błędy! ❌');
                setInputs(prev => ({
                    w: isW ? prev.w : '',
                    n: isN ? prev.n : '',
                    d: isD ? prev.d : ''
                }));
                Animated.sequence([
                    Animated.timing(bgAnim, { toValue: -1, duration: 400, useNativeDriver: false }),
                    Animated.timing(bgAnim, { toValue: 0, duration: 400, useNativeDriver: false })
                ]).start();
            } else {
                const wText = task.ans.w > 0 ? `${task.ans.w}` : '';
                setMsg(`Poprawnie: ${wText} ${task.ans.n}/${task.ans.d}`);
                setStats(s => ({ ...s, wrong: s.wrong + 1 }));
                setReady(true);
                Animated.timing(bgAnim, { toValue: -1, duration: 500, useNativeDriver: false }).start();
            }
        }
    };

    const nextTask = () => {
        if (stats.count >= TASKS_LIMIT) { setMsg('Koniec treningu! 🏆'); return; }
        setStats(s => ({ ...s, count: s.count + 1 }));
        generateProblem();
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.container}>
                <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
                <ImageBackground source={require('../../../assets/background.jpg')} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: bgAnim.interpolate({ inputRange: [-1, 0, 1], outputRange: ['rgba(255,0,0,0.15)', 'transparent', 'rgba(0,255,0,0.15)'] }) }]} pointerEvents="none" />

                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardContainer}>
                    {!keyboardVisible && (
                        <View style={styles.topButtons}>
                            <TouchableOpacity onPress={() => setShowScratchpad(true)} style={styles.topBtnItem}><Image source={require('../../../assets/pencil.png')} style={styles.iconTop} /><Text style={styles.buttonLabel}>Brudnopis</Text></TouchableOpacity>
                            <TouchableOpacity onPress={() => setShowHint(!showHint)} style={styles.topBtnItem}><Image source={require('../../../assets/question.png')} style={styles.iconTop} /><Text style={styles.buttonLabel}>Pomoc</Text></TouchableOpacity>
                        </View>
                    )}

                    {showHint && !keyboardVisible && (
                        <View style={styles.hintBox}><Text style={styles.hintTitle}>Wskazówka:</Text><Text style={styles.hintText}>{task.h}</Text></View>
                    )}

                    <DrawingModal visible={showScratchpad} onClose={() => setShowScratchpad(false)} problemText={task.q} />

                    <ScrollView contentContainerStyle={styles.centerContent} keyboardShouldPersistTaps="handled">
                        <View style={styles.card}>
                            <View style={styles.overlayBackground} />
                            <Text style={styles.headerTitle}>Liczby mieszane</Text>

                            <View style={styles.questionBox}>
                                {task.type === 'visual' && <MixedShape whole={task.whole} num={task.num} den={task.den} />}
                                {task.type === 'liquid' && <LiquidCup full={task.full} level={task.level} den={task.den} />}
                                <Text style={styles.questionText}>{task.q}</Text>
                            </View>

                            <View style={styles.answerSection}>
                                <TextInput
                                    ref={wRef}
                                    style={[styles.wholeInput, correctness.w === false && styles.inputError, correctness.w === true && styles.inputCorrect]}
                                    keyboardType="numeric"
                                    placeholder="?"
                                    value={inputs.w}
                                    onChangeText={(v) => setInputs({ ...inputs, w: v })}
                                    returnKeyType="next"
                                    onSubmitEditing={() => nRef.current?.focus()}
                                    blurOnSubmit={false}
                                    editable={!ready}
                                />
                                <View style={styles.fractionGroup}>
                                    <TextInput
                                        ref={nRef}
                                        style={[styles.smallInput, correctness.n === false && styles.inputError, correctness.n === true && styles.inputCorrect]}
                                        keyboardType="numeric"
                                        placeholder="?"
                                        value={inputs.n}
                                        onChangeText={(v) => setInputs({ ...inputs, n: v })}
                                        returnKeyType="next"
                                        onSubmitEditing={() => dRef.current?.focus()}
                                        blurOnSubmit={false}
                                        editable={!ready}
                                    />
                                    <View style={styles.line} />
                                    <TextInput
                                        ref={dRef}
                                        style={[styles.smallInput, correctness.d === false && styles.inputError, correctness.d === true && styles.inputCorrect]}
                                        keyboardType="numeric"
                                        placeholder="?"
                                        value={inputs.d}
                                        onChangeText={(v) => setInputs({ ...inputs, d: v })}
                                        returnKeyType="done"
                                        onSubmitEditing={Keyboard.dismiss}
                                        editable={!ready}
                                    />
                                </View>
                            </View>

                            <TouchableOpacity style={styles.mainBtn} onPress={ready ? nextTask : handleCheck}>
                                <Text style={styles.btnText}>{ready ? 'Następne' : 'Sprawdź'}</Text>
                            </TouchableOpacity>
                            <Text style={styles.taskCounter}>Zadanie {stats.count}/{TASKS_LIMIT}</Text>
                            {msg ? <Text style={[styles.msg, msg.includes('Doskonale') ? styles.correctText : styles.errorText]}>{msg}</Text> : null}
                        </View>
                    </ScrollView>

                    {!keyboardVisible && (
                        <View style={styles.iconsBottom}>
                            <Image source={require('../../../assets/happy.png')} style={styles.owl} /><Text style={styles.score}>{stats.correct}</Text>
                            <Image source={require('../../../assets/sad.png')} style={styles.owl} /><Text style={styles.score}>{stats.wrong}</Text>
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
    card: { width: '92%', maxWidth: 400, borderRadius: 25, padding: 25, alignItems: 'center', alignSelf: 'center', elevation: 4, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10 },
    overlayBackground: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: 25 },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 15 },
    questionBox: { width: '100%', backgroundColor: '#f0f8ff', padding: 20, borderRadius: 15, marginBottom: 20, alignItems: 'center' },
    questionText: { fontSize: 19, color: '#2c3e50', textAlign: 'center', fontWeight: '500', lineHeight: 28 },
    answerSection: { flexDirection: 'row', alignItems: 'center', marginVertical: 10 },
    wholeInput: { width: 70, height: 80, borderWidth: 2, borderColor: '#ccc', borderRadius: 10, fontSize: 32, textAlign: 'center', marginRight: 15, backgroundColor: '#fff', color: '#007AFF', fontWeight: 'bold' },
    fractionGroup: { alignItems: 'center' },
    smallInput: { width: 70, height: 55, borderWidth: 2, borderColor: '#ccc', borderRadius: 10, fontSize: 26, textAlign: 'center', backgroundColor: '#fff', color: '#007AFF', fontWeight: 'bold' },
    line: { width: 85, height: 3, backgroundColor: '#333', marginVertical: 6 },
    inputCorrect: { borderColor: '#28a745', backgroundColor: '#e8f5e9', color: '#28a745' },
    inputError: { borderColor: '#dc3545', backgroundColor: '#fbe9eb', color: '#dc3545' },
    mainBtn: { marginTop: 20, backgroundColor: '#007AFF', paddingHorizontal: 40, paddingVertical: 14, borderRadius: 15 },
    btnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    taskCounter: { marginTop: 15, color: '#555', fontSize: Math.max(12, screenWidth * 0.035), fontWeight: '400', textAlign: 'center' },
    msg: { marginTop: 15, fontSize: 18, fontWeight: '700', textAlign: 'center' },
    correctText: { color: '#28a745' },
    errorText: { color: '#dc3545' },
    iconsBottom: { position: 'absolute', bottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' },
    owl: { width: combinedIconSize, height: combinedIconSize, resizeMode: 'contain', marginHorizontal: 10 },
    score: { fontSize: Math.max(14, combinedIconSize * 0.28), fontWeight: '500', color: '#333', marginHorizontal: 8 },
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

export default MixedNumbersTrainer;