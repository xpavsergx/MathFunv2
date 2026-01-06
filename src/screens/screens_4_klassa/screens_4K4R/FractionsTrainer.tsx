import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TextInput, Button, Keyboard, ImageBackground,
    Animated, StatusBar, Image, Dimensions, TouchableOpacity, Modal,
    Platform, KeyboardAvoidingView, TouchableWithoutFeedback, ScrollView, InteractionManager
} from 'react-native';
import Svg, { Path, Rect, G } from 'react-native-svg';
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

// --- ВИЗУАЛИЗАЦИЯ ФИГУР ---
const FractionShape = ({ total, shaded, type }: { total: number, shaded: number, type: string }) => {
    const size = 150;
    const center = size / 2;
    const radius = 65;
    if (type === 'circle') {
        return (
            <Svg height={size} width={size} viewBox={`0 0 ${size} ${size}`}>
                {[...Array(total)].map((_, i) => {
                    const startAngle = (i * 360) / total - 90;
                    const endAngle = ((i + 1) * 360) / total - 90;
                    const x1 = center + radius * Math.cos((Math.PI * startAngle) / 180);
                    const y1 = center + radius * Math.sin((Math.PI * startAngle) / 180);
                    const x2 = center + radius * Math.cos((Math.PI * endAngle) / 180);
                    const y2 = center + radius * Math.sin((Math.PI * endAngle) / 180);
                    const d = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`;
                    return <Path key={i} d={d} fill={i < shaded ? "#4A90E2" : "#FFF"} stroke="#2c3e50" strokeWidth="2" />;
                })}
            </Svg>
        );
    }
    const w = 180; const h = 60; const partW = w / total;
    return (
        <Svg height={h + 10} width={w + 10}>
            <G x="5" y="5">
                {[...Array(total)].map((_, i) => (
                    <Rect key={i} x={i * partW} y="0" width={partW} height={h} fill={i < shaded ? "#4A90E2" : "#FFF"} stroke="#2c3e50" strokeWidth="2" />
                ))}
            </G>
        </Svg>
    );
};

// --- ГЛАВНЫЙ КОМПОНЕНТ ---
const FractionsTrainer = () => {
    const [questionText, setQuestionText] = useState('');
    const [currentHint, setCurrentHint] = useState('');
    const [taskData, setTaskData] = useState({ total: 4, shaded: 1, type: '', isTextTask: false });
    const [userNum, setUserNum] = useState('');
    const [userDen, setUserDen] = useState('');
    const [numCorrect, setNumCorrect] = useState<boolean | null>(null);
    const [denCorrect, setDenCorrect] = useState<boolean | null>(null);
    const [readyForNext, setReadyForNext] = useState(false);
    const [attempts, setAttempts] = useState(0);
    const [correctCount, setCorrectCount] = useState(0);
    const [wrongCount, setWrongCount] = useState(0);
    const [taskCount, setTaskCount] = useState(0);
    const [message, setMessage] = useState('');
    const [showScratchpad, setShowScratchpad] = useState(false);
    const [showHint, setShowHint] = useState(false);
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);

    const numInputRef = useRef<TextInput>(null);
    const denInputRef = useRef<TextInput>(null);
    const backgroundColor = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const k1 = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
        const k2 = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
        nextTask();
        return () => { k1.remove(); k2.remove(); };
    }, []);

    const rnd = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

    const generateProblem = () => {
        setMessage(''); setNumCorrect(null); setDenCorrect(null);
        setReadyForNext(false); setUserNum(''); setUserDen('');
        setAttempts(0); backgroundColor.setValue(0); setShowHint(false);

        const isVisual = Math.random() < 0.55; // 55% шанс на фигурки
        let total = 1, shaded = 1, q = "", hint = "", isText = true, type = "";

        if (isVisual) {
            total = [2, 3, 4, 5, 6, 8, 9, 10, 12][rnd(0, 8)];
            shaded = rnd(1, total - 1);
            type = Math.random() > 0.5 ? 'circle' : 'rect';
            isText = false;
            q = "Jaka część figury jest zamalowana?";
            hint = "Licznik (góra) to liczba części zamalowanych. Mianownik (dół) to suma wszystkich części.";
        } else {
            const subCategory = rnd(0, 3);
            const names = ["Ania", "Tomek", "Kasia", "Piotr", "Marek", "Zosia", "Bartek", "Ola"];
            const objects = [
                { n: "jabłek", s: "jabłko" }, { n: "cukierków", s: "cukierek" },
                { n: "kredek", s: "kredkę" }, { n: "piłek", s: "piłkę" },
                { n: "zeszytów", s: "zeszyt" }, { n: "naklejek", s: "naklejkę" }
            ];
            const name = names[rnd(0, names.length - 1)];
            const obj = objects[rnd(0, objects.length - 1)];

            if (subCategory === 0) {
                total = rnd(5, 15); shaded = rnd(1, total - 1);
                q = Math.random() > 0.5 ? `Zapisz ułamek: licznik to ${shaded}, mianownik to ${total}.` : `Mianownik wynosi ${total}, a licznik ${shaded}. Zapisz ten ułamek.`;
                hint = "Góra = licznik, dół = mianownik.";
            } else if (subCategory === 1) {
                total = [4, 6, 8, 10, 12][rnd(0, 4)]; shaded = rnd(1, total - 1);
                const foods = ["Pizzę", "Czekoladę", "Tort", "Arbuza"];
                q = `${foods[rnd(0,3)]} podzielono na ${total} części. ${name} zjadł(a) ${shaded}. Jaka to część?`;
                hint = "Wszystkie kawałki to mianownik.";
            } else if (subCategory === 2) {
                total = rnd(10, 25); shaded = rnd(2, 8);
                q = `W pudełku jest ${total} ${obj.n}. Dokładnie ${shaded} z nich są niebieskie. Jaki to ułamek?`;
                hint = "Cała grupa przedmiotów to mianownik.";
            } else {
                total = rnd(10, 30); shaded = rnd(1, 7);
                q = `${name} ma ${total} ${obj.n}. Oddał(a) koledze ${shaded} sztuk. Jaką część oddał(a)?`;
                hint = "To, co zostało oddane, wpisz w liczniku.";
            }
        }

        setTaskData({ total, shaded, type, isTextTask: isText });
        setQuestionText(q);
        setCurrentHint(hint);
        setTimeout(() => numInputRef.current?.focus(), 400);
    };

    const handleCheck = () => {
        const n = parseInt(userNum); const d = parseInt(userDen);
        if (!userNum || !userDen) { setMessage('Wpisz obie liczby!'); return; }
        const isNCorrect = n === taskData.shaded;
        const isDCorrect = d === taskData.total;
        setNumCorrect(isNCorrect); setDenCorrect(isDCorrect);

        if (isNCorrect && isDCorrect) {
            Animated.timing(backgroundColor, { toValue: 1, duration: 500, useNativeDriver: false }).start();
            setCorrectCount(c => c + 1); setMessage('Doskonale! ✅');
            setReadyForNext(true); InteractionManager.runAfterInteractions(() => awardXpAndCoins(10, 2));
        } else {
            const nextAttempt = attempts + 1;
            setAttempts(nextAttempt);
            if (nextAttempt < 2) {
                setMessage('Popraw błędy! ❌');
                // --- МОДИФИКАЦИЯ: Очищаем только неверное поле ---
                if (!isNCorrect) setUserNum('');
                if (!isDCorrect) setUserDen('');
                // -------------------------------------------------
                Animated.sequence([Animated.timing(backgroundColor, { toValue: -1, duration: 400, useNativeDriver: false }), Animated.timing(backgroundColor, { toValue: 0, duration: 400, useNativeDriver: false })]).start();
            } else {
                setMessage(`Wynik: ${taskData.shaded}/${taskData.total}`);
                setWrongCount(w => w + 1); setReadyForNext(true);
                Animated.timing(backgroundColor, { toValue: -1, duration: 500, useNativeDriver: false }).start();
            }
        }
    };

    const nextTask = () => {
        if (taskCount >= TASKS_LIMIT) { setMessage('Koniec! 🏆'); return; }
        setTaskCount(t => t + 1); generateProblem();
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.container}>
                <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
                <ImageBackground source={require('../../../assets/background.jpg')} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: backgroundColor.interpolate({ inputRange: [-1, 0, 1], outputRange: ['rgba(255,0,0,0.15)', 'rgba(255,255,255,0)', 'rgba(0,255,0,0.15)'] }) }]} pointerEvents="none" />

                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardContainer}>
                    {!isKeyboardVisible && (
                        <View style={styles.topButtons}>
                            <TouchableOpacity onPress={() => setShowScratchpad(true)} style={styles.topBtnItem}><Image source={require('../../../assets/pencil.png')} style={styles.iconTop} /><Text style={styles.buttonLabel}>Brudnopis</Text></TouchableOpacity>
                            <TouchableOpacity onPress={() => setShowHint(!showHint)} style={styles.topBtnItem}><Image source={require('../../../assets/question.png')} style={styles.iconTop} /><Text style={styles.buttonLabel}>Pomoc</Text></TouchableOpacity>
                        </View>
                    )}

                    {showHint && !isKeyboardVisible && (
                        <View style={styles.hintBox}><Text style={styles.hintTitle}>Pomoc:</Text><Text style={styles.hintText}>{currentHint}</Text></View>
                    )}

                    <DrawingModal visible={showScratchpad} onClose={() => setShowScratchpad(false)} problemText={questionText} />

                    <ScrollView contentContainerStyle={styles.centerContent} keyboardShouldPersistTaps="handled">
                        <View style={styles.card}>
                            <View style={styles.overlayBackground} />
                            <Text style={styles.headerTitle}>Ułamek jako część całości</Text>
                            <View style={styles.questionBox}>
                                {!taskData.isTextTask && <FractionShape total={taskData.total} shaded={taskData.shaded} type={taskData.type} />}
                                <Text style={styles.questionText}>{questionText}</Text>
                            </View>
                            <View style={styles.answerSection}>
                                <View style={styles.fractionContainer}>
                                    <TextInput ref={numInputRef} style={[styles.fractionInput, numCorrect === false && styles.inputError, numCorrect === true && styles.inputCorrect]} keyboardType="numeric" value={userNum} onChangeText={(v) => { setUserNum(v); if(v.length >= 1) denInputRef.current?.focus(); }} editable={!readyForNext} maxLength={2} />
                                    <View style={styles.fractionLine} />
                                    <TextInput ref={denInputRef} style={[styles.fractionInput, denCorrect === false && styles.inputError, denCorrect === true && styles.inputCorrect]} keyboardType="numeric" value={userDen} onChangeText={setUserDen} editable={!readyForNext} maxLength={2} />
                                </View>
                            </View>
                            <TouchableOpacity style={styles.mainBtn} onPress={readyForNext ? nextTask : handleCheck}><Text style={styles.mainBtnText}>{readyForNext ? 'Następne' : 'Sprawdź'}</Text></TouchableOpacity>
                            <Text style={styles.counterTextSmall}>Zadanie: {taskCount} / {TASKS_LIMIT}</Text>
                            {message ? <Text style={[styles.result, message.includes('Doskonale') ? styles.correctText : styles.errorText]}>{message}</Text> : null}
                        </View>
                    </ScrollView>

                    {!isKeyboardVisible && (
                        <View style={styles.iconsBottom}>
                            <Image source={require('../../../assets/happy.png')} style={styles.iconSame} /><Text style={styles.counterTextIcons}>{correctCount}</Text>
                            <Image source={require('../../../assets/sad.png')} style={styles.iconSame} /><Text style={styles.counterTextIcons}>{wrongCount}</Text>
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
    answerSection: { marginVertical: 10 },
    fractionContainer: { alignItems: 'center' },
    fractionInput: { width: 70, height: 55, borderWidth: 2, borderColor: '#ccc', borderRadius: 10, backgroundColor: '#fff', fontSize: 26, fontWeight: 'bold', textAlign: 'center', color: '#007AFF' },
    fractionLine: { width: 85, height: 3, backgroundColor: '#333', marginVertical: 6 },
    inputCorrect: { borderColor: '#28a745', backgroundColor: '#e8f5e9', color: '#28a745' },
    inputError: { borderColor: '#dc3545', backgroundColor: '#fbe9eb', color: '#dc3545' },
    mainBtn: { marginTop: 20, backgroundColor: '#007AFF', paddingHorizontal: 40, paddingVertical: 14, borderRadius: 15 },
    mainBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    result: { fontSize: 18, fontWeight: '700', marginTop: 15 },
    correctText: { color: '#28a745' },
    errorText: { color: '#dc3545' },
    counterTextSmall: { fontSize: Math.max(12, screenWidth * 0.035), fontWeight: '400', color: '#555', textAlign: 'center', marginTop: 15 },
    iconsBottom: { position: 'absolute', bottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' },
    iconSame: { width: combinedIconSize, height: combinedIconSize, resizeMode: 'contain', marginHorizontal: 10 },
    counterTextIcons: { fontSize: Math.max(14, combinedIconSize * 0.28), marginHorizontal: 8, textAlign: 'center', color: '#333' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
    drawingContainer: { width: '95%', height: '85%', backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden' },
    drawingHeader: { height: 55, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, backgroundColor: '#f0f0f0' },
    drawingTitle: { fontSize: 18, fontWeight: 'bold' },
    headerButton: { padding: 10 },
    headerButtonText: { color: '#007AFF', fontWeight: '600' },
    problemPreviewContainer: { backgroundColor: '#eef6fc', padding: 12, alignItems: 'center' },
    problemPreviewLabel: { fontSize: 13, color: '#666' },
    problemPreviewTextSmall: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
    canvas: { flex: 1, backgroundColor: '#fff' },
});

export default FractionsTrainer;