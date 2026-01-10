import React, { useState, useEffect, useMemo } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, SafeAreaView, StatusBar, TextInput, Modal,
    useColorScheme, Dimensions
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS, PADDING } from '../styles/theme';

const { width } = Dimensions.get('window');

// Skalowanie fontów i wymiarów
const scale = (size: number) => (width / 375) * size;

const EXERCISE_GROUPS = [
    {
        title: "LICZBY I DZIAŁANIA",
        exercises: [
            { id: "addSubtractTrainer", label: "Rachunki pamięciowe - dodawanie i odejmowanie" },
            { id: "combinedDecompositionTrainer", label: "Mnożenie i dzielenie (cd.)" },
            { id: "moreLessTrainer", label: "O ile więcej, o ile mniej" },
            { id: "howManyTimesTrainer", label: "Ile razy więcej, ile razy mniej" },
            { id: "divisionWithRemainder", label: "Dzielenie z resztą" },
            { id: "squaresCubesTrainer", label: "Kwadraty i sześciany liczb" },
            { id: "orderOperationsTrainer", label: "Kolejność wykonywania działań" },
            { id: "wordProblemsLevel1", label: "Zadania tekstowe, cz. 1" },
            { id: "wordProblemsLevel2", label: "Zadania tekstowe, cz. 2" },
            { id: "numberLineTrainer", label: "Oś liczbowa" },
        ]
    },
    {
        title: "SYSTEM ZAPISYWANIA LICZB",
        exercises: [
            { id: "decimalSystemTrainer_cl4", label: "System dziesiątkowy" },
            { id: "comparingNumbersTrainer_cl4", label: "Porównywanie liczb naturalnych" },
            { id: "mentalMathLargeNumbers_cl4", label: "Rachunki pamięciowe na dużych liczbach" },
            { id: "monetaryUnitsTrainer_cl4", label: "Jednostki monetarne - złote i grosze" },
            { id: "lengthUnitsTrainer_Full_v17", label: "Jednostki długości" },
            { id: "massUnitsTrainer_Full_v2", label: "Jednostki masy" },
            { id: "romanNumeralsTrainer_v5", label: "System rzymski" },
            { id: "calendarTrainer_Final_v2", label: "Z kalendarzem za pan brat" },
            { id: "clockTrainer_Final_v6", label: "Godziny na zegarach" },
        ]
    },
    {
        title: "DZIAŁANIA PISEMNE",
        exercises: [
            { id: "WrittenAdditionTrainer", label: "Dodawanie pisemne" },
            { id: "WrittenSubtractionTrainer", label: "Odejmowanie pisemne" },
            { id: "WrittenMultiplicationTrainer", label: "Mnożenie pisemne przez liczby jednocyfrowe" },
            { id: "WrittenMultiplicationWithZerosTrainer", label: "Mnożenie przez liczby z zerami na końcu" },
            { id: "WrittenMultiDigitMultiplicationTrainer", label: "Mnożenie pisemne przez liczby wielocyfrowe" },
            { id: "WrittenDivisionTrainer", label: "Dzielenie pisemne przez liczby jednocyfrowe" },
            { id: "WordProblemsTrainer", label: "Działania pisemne. Zadania tekstowe" },
        ]
    },
    {
        title: "UŁAMKI ZWYKŁE",
        exercises: [
            { id: "FractionsTrainer_cl4", label: "Ułamek jako część całości" },
            { id: "MixedNumbersTrainer_cl4", label: "Liczby mieszane" },
            { id: "fractionsNumberLine_cl4", label: "Ułamki i liczby mieszane na osi liczbowej" },
            { id: "fractionComparisonTrainer_cl4", label: "Porównywanie ułamków" },
            { id: "FractionsExpansionTrainer_cl4", label: "Rozszerzanie i skracanie ułamków" },
            { id: "ImproperFractionsTrainer_cl4", label: "Ułamki niewłaściwe" },
        ]
    }
];

const StatisticsScreen = () => {
    const isDarkMode = useColorScheme() === 'dark';
    const primaryTurquoise = '#00BDD6';

    const [loading, setLoading] = useState(true);
    const [statsData, setStatsData] = useState<any>({});
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState("Wszystkie");
    const [showPicker, setShowPicker] = useState(false);

    useEffect(() => {
        const user = auth().currentUser;
        if (!user) { setLoading(false); return; }

        const unsubscribe = firestore()
            .collection('users').doc(user.uid).collection('exerciseStats')
            .onSnapshot(snapshot => {
                const data: any = {};
                if (snapshot) snapshot.forEach(doc => { data[doc.id] = doc.data(); });
                setStatsData(data);
                setLoading(false);
            }, () => setLoading(false));

        return () => unsubscribe();
    }, []);

    const filteredGroups = useMemo(() => {
        let result = EXERCISE_GROUPS;
        if (selectedCategory !== "Wszystkie") result = result.filter(g => g.title === selectedCategory);
        if (searchQuery) {
            result = result.map(group => ({
                ...group,
                exercises: group.exercises.filter(ex => ex.label.toLowerCase().includes(searchQuery.toLowerCase()))
            })).filter(group => group.exercises.length > 0);
        }
        return result;
    }, [searchQuery, selectedCategory]);

    const getProgressColor = (efficiency: number, totalAttempts: number) => {
        if (totalAttempts === 0) return isDarkMode ? '#444' : '#E0E0E0';
        if (efficiency < 50) return '#FF5252';
        if (efficiency < 70) return '#FFA726';
        return '#4CAF50';
    };

    const theme = {
        background: isDarkMode ? '#121212' : '#F8F9FA',
        card: isDarkMode ? '#1E1E1E' : '#FFF',
        textMain: isDarkMode ? '#E0E0E0' : '#2C3E50',
        textSecondary: isDarkMode ? '#AAA' : '#7F8C8D',
        headerBg: isDarkMode ? '#1E1E1E' : '#FFF',
        inputBg: isDarkMode ? '#2C2C2C' : '#F1F3F4',
        border: isDarkMode ? '#333' : '#EEE',
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={primaryTurquoise} /></View>;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />

            <View style={[styles.topSection, { backgroundColor: theme.headerBg }]}>
                <View style={[styles.searchBar, { backgroundColor: theme.inputBg }]}>
                    <TextInput
                        placeholder="Szukaj trenerów..."
                        placeholderTextColor={isDarkMode ? "#888" : "#999"}
                        style={[styles.searchInput, { color: theme.textMain }]}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    <Icon name="magnify" size={scale(24)} color="#999" />
                </View>

                <TouchableOpacity
                    style={[styles.filterButton, { backgroundColor: isDarkMode ? 'rgba(0,189,214,0.1)' : '#E0F7FA', borderColor: isDarkMode ? '#204a50' : '#B2EBF2' }]}
                    onPress={() => setShowPicker(true)}
                >
                    <Text style={[styles.filterText, { color: primaryTurquoise }]}>{selectedCategory}</Text>
                    <Icon name="chevron-down" size={scale(20)} color={primaryTurquoise} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {filteredGroups.map(group => (
                    <View key={group.title} style={styles.sectionContainer}>
                        <Text style={[styles.groupTitle, { color: primaryTurquoise }]}>{group.title}</Text>
                        <View style={styles.exerciseList}>
                            {group.exercises.map(ex => {
                                const data = statsData[ex.id] || { totalCorrect: 0, totalWrong: 0 };
                                const correct = data.totalCorrect || 0;
                                const wrong = data.totalWrong || 0;
                                const total = correct + wrong;
                                const efficiency = total === 0 ? 0 : Math.round((correct / total) * 100);
                                const color = getProgressColor(efficiency, total);

                                return (
                                    <View key={ex.id} style={[styles.statCard, { backgroundColor: theme.card }]}>
                                        <View style={styles.cardHeader}>
                                            <View style={[styles.iconCircle, { backgroundColor: isDarkMode ? 'rgba(0,189,214,0.1)' : '#E0F7FA' }]}>
                                                <Icon name="dumbbell" size={scale(20)} color={primaryTurquoise} />
                                            </View>
                                            <Text style={[styles.exerciseLabel, { color: theme.textMain }]}>{ex.label}</Text>
                                        </View>

                                        <View style={styles.statsRow}>
                                            <View style={styles.statLine}>
                                                <Icon name="check-circle" size={scale(18)} color="#4CAF50" />
                                                <View style={styles.statColumn}>
                                                    <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Poprawne</Text>
                                                    <Text style={[styles.statVal, { color: theme.textMain }]}>{correct}</Text>
                                                </View>
                                            </View>
                                            <View style={styles.statLine}>
                                                <Icon name="close-circle" size={scale(18)} color="#FF5252" />
                                                <View style={styles.statColumn}>
                                                    <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Błędne</Text>
                                                    <Text style={[styles.statVal, { color: theme.textMain }]}>{wrong}</Text>
                                                </View>
                                            </View>
                                        </View>

                                        <View style={styles.progressArea}>
                                            <View style={styles.progressTextRow}>
                                                <Text style={styles.effLabel}>Skuteczność</Text>
                                                <Text style={[styles.effPercent, { color }]}>{efficiency}%</Text>
                                            </View>
                                            <View style={[styles.barBg, { backgroundColor: isDarkMode ? '#333' : '#E0E0E0' }]}>
                                                <View style={[styles.barFill, { width: `${efficiency}%`, backgroundColor: color }]} />
                                            </View>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                ))}
            </ScrollView>

            <Modal visible={showPicker} transparent animationType="fade">
                <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowPicker(false)}>
                    <View style={[styles.pickerContainer, { backgroundColor: theme.card }]}>
                        <Text style={[styles.pickerTitle, { color: theme.textMain }]}>Wybierz dział:</Text>
                        {["Wszystkie", ...EXERCISE_GROUPS.map(g => g.title)].map(item => (
                            <TouchableOpacity
                                key={item}
                                style={[styles.pickerItem, { borderBottomColor: theme.border }]}
                                onPress={() => { setSelectedCategory(item); setShowPicker(false); }}
                            >
                                <Text style={[styles.pickerItemText, { color: selectedCategory === item ? primaryTurquoise : theme.textSecondary, fontWeight: selectedCategory === item ? 'bold' : 'normal' }]}>
                                    {item}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    topSection: { padding: scale(15), borderBottomLeftRadius: 25, borderBottomRightRadius: 25, elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
    searchBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 15, height: scale(50), marginBottom: 12 },
    searchInput: { flex: 1, fontSize: scale(15) },
    filterButton: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
    filterText: { fontSize: scale(14), fontWeight: 'bold', marginRight: 5 },
    scrollContent: { padding: scale(15) },
    sectionContainer: { marginBottom: scale(30) },
    groupTitle: { fontSize: scale(18), fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 15, paddingLeft: 5 },
    exerciseList: { marginTop: 5 },
    statCard: { borderRadius: 20, padding: scale(18), marginBottom: 15, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
    iconCircle: { width: scale(40), height: scale(40), borderRadius: scale(20), justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    exerciseLabel: { fontSize: scale(16), fontWeight: '800', flex: 1 },
    statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, paddingHorizontal: 5 },
    statLine: { flexDirection: 'row', alignItems: 'center' },
    statColumn: { marginLeft: 8 },
    statLabel: { fontSize: scale(11), fontWeight: '600' },
    statVal: { fontWeight: '900', fontSize: scale(16), marginTop: 1 },
    progressArea: { marginTop: 5 },
    progressTextRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    effLabel: { fontSize: scale(12), color: '#95A5A6', fontWeight: 'bold', textTransform: 'uppercase' },
    effPercent: { fontSize: scale(18), fontWeight: '900' },
    barBg: { height: scale(10), borderRadius: 5, overflow: 'hidden' },
    barFill: { height: '100%', borderRadius: 5 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    pickerContainer: { width: '85%', borderRadius: 20, padding: 20, elevation: 15 },
    pickerTitle: { fontSize: scale(18), fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
    pickerItem: { paddingVertical: 12, borderBottomWidth: 1 },
    pickerItemText: { fontSize: scale(15), textAlign: 'center' },
});

export default StatisticsScreen;