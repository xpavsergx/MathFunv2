// src/screens/MainScreen.tsx

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, useColorScheme, Platform, ActivityIndicator, SafeAreaView, Alert
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainAppStackParamList, AppMode } from '../../src/navigation/types';
import { COLORS, FONT_SIZES, PADDING, MARGIN } from '../styles/theme';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, {
    useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, FadeInUp
} from 'react-native-reanimated';
import { getUserQuests, QuestType } from '../services/dailyQuestService';
import questionsDatabase from '../data/questionsDb.json';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

// Типи
interface QuestProgress {
    id: string; type: QuestType; title: string; target: number;
    reward: { xp: number; coins: number; };
    progress: number; isCompleted: boolean;
}
type QuestionsDB = { [grade: string]: any; };
const db: QuestionsDB = questionsDatabase;

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

// Компонент Картки Меню
const BigMenuCard = ({ title, subtitle, icon, color, onPress, themeStyles, disabled = false }: any) => (
    <AnimatedTouchableOpacity
        entering={FadeInUp.delay(100).duration(500).springify()}
        style={[
            styles.bigCard,
            themeStyles.card,
            { borderColor: color },
            disabled && styles.bigCardDisabled
        ]}
        onPress={onPress}
        disabled={disabled}
    >
        <Ionicons name={icon} size={32} color={disabled ? themeStyles.subtitleColor : color} style={styles.bigCardIcon} />
        <View style={styles.bigCardTextContainer}>
            <Text style={[styles.bigCardTitle, themeStyles.text]} numberOfLines={1}>{title}</Text>
            <Text style={[styles.bigCardSubtitle, { color: themeStyles.subtitleColor }]} numberOfLines={2}>{subtitle}</Text>
        </View>
        <Ionicons name="chevron-forward-outline" size={20} color={themeStyles.chevronColor} />
    </AnimatedTouchableOpacity>
);

// Компонент Квесту
const QuestItem = ({ item, themeStyles }: any) => {
    const progressPercent = item.target > 0 ? (item.progress / item.target) * 100 : 0;
    const isCompleted = item.isCompleted;
    return (
        <View style={[styles.questItem, themeStyles.card, isCompleted ? styles.questItemCompleted : styles.questItemInProgress]}>
            <View style={styles.questDetails}>
                <Text style={[styles.questTitle, themeStyles.text]} numberOfLines={1}>{item.title}</Text>
                <View style={styles.progressBarBackground}>
                    <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
                </View>
                <Text style={[styles.questProgress, { color: isCompleted ? COLORS.correct : COLORS.primary }]}>
                    {isCompleted ? 'Gotowe! +XP' : `${item.progress}/${item.target}`}
                </Text>
            </View>
            <Ionicons name={isCompleted ? "checkmark-circle" : "flame-outline"} size={28} color={isCompleted ? COLORS.correct : COLORS.accent} style={styles.questIcon} />
        </View>
    );
};

function MainScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<MainAppStackParamList, 'Main'>>();
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';
    const currentUser = auth().currentUser;

    const [quests, setQuests] = useState<QuestProgress[]>([]);
    const [isLoadingQuests, setIsLoadingQuests] = useState(true);
    const [selectedGrade, setSelectedGrade] = useState<number | null>(null);
    const [defaultGrade, setDefaultGrade] = useState<number | null>(null);
    const [isLoadingUser, setIsLoadingUser] = useState(true);

    const availableGrades = useMemo(() => Object.keys(db).map(Number).sort((a,b) => a - b), []);

    // Завантаження даних користувача
    useEffect(() => {
        if (!currentUser) { setIsLoadingUser(false); return; }
        const unsubscribe = firestore().collection('users').doc(currentUser.uid).onSnapshot(doc => {
            if (doc.exists) {
                const grade = doc.data()?.userClass || doc.data()?.defaultGrade || availableGrades[0];
                const gradeNum = Number(grade);
                setDefaultGrade(gradeNum);
                if (selectedGrade === null) setSelectedGrade(gradeNum);
            } else {
                setDefaultGrade(availableGrades[0] || null);
                if (selectedGrade === null) setSelectedGrade(availableGrades[0] || null);
            }
            setIsLoadingUser(false);
        }, () => setIsLoadingUser(false));
        return () => unsubscribe();
    }, [currentUser, availableGrades, selectedGrade]);

    // Анімація маскота
    const mascotTranslateY = useSharedValue(0);
    const animatedMascotStyle = useAnimatedStyle(() => ({ transform: [{ translateY: mascotTranslateY.value }] }));
    useEffect(() => {
        mascotTranslateY.value = withRepeat(withSequence(withTiming(-10, { duration: 1500 }), withTiming(0, { duration: 1500 })), -1, true);
    }, []);

    // Квести
    useFocusEffect(useCallback(() => {
        setIsLoadingQuests(true);
        getUserQuests().then(fetchedQuests => {
            setQuests(fetchedQuests as QuestProgress[]);
            setIsLoadingQuests(false);
        });
    }, []));

    const themeStyles = {
        container: { backgroundColor: isDarkMode ? COLORS.backgroundDark : '#F0F4F8' },
        card: { backgroundColor: isDarkMode ? COLORS.cardDark : COLORS.white },
        text: { color: isDarkMode ? COLORS.textDark : COLORS.textLight },
        subtitleColor: isDarkMode ? COLORS.greyDarkTheme : COLORS.grey,
        chevronColor: isDarkMode ? COLORS.greyDarkTheme : COLORS.grey,
        gradeButtonBackground: isDarkMode ? COLORS.primaryDarkTheme : COLORS.primary,
        gradeButtonText: { color: isDarkMode ? COLORS.textDark : COLORS.white },
    };
    // --- POMOCNICZA FUNKCJA BLOKADY ---
    const checkGradeLock = (onSuccess: () => void) => {
        if (selectedGrade === 5 || selectedGrade === 6) {
            Alert.alert(
                "Wkrótce dostępne",
                `Materiały dla klasy ${selectedGrade} pojawią się w kolejnej aktualizacji!`,
                [{ text: "Rozumiem" }]
            );
            return;
        }
        onSuccess();
    };

    // --- ДІЇ НАВІГАЦІЇ ---

    // 1. Вправи (Training Mode)
    const handleTrainingAction = () => {
        if (selectedGrade === null) { Alert.alert("Wybierz klasę", "Proszę wybrać klasę."); return; }
        // Dodajemy blokadę:
        checkGradeLock(() => {
            navigation.navigate('TopicList', { grade: selectedGrade, mode: 'training' });
        });
    };

    // 2. Тести (Test Mode)
    const handleTestsAction = () => {
        if (selectedGrade === null) { Alert.alert("Wybierz klasę", "Proszę wybrać klasę."); return; }
        // Dodajemy blokadę:
        checkGradeLock(() => {
            navigation.navigate('TopicList', { grade: selectedGrade, mode: 'test' });
        });
    };

    const handleTheoryAction = () => {
        if (selectedGrade === null) { Alert.alert("Wybierz klasę", "Proszę wybrać klasę."); return; }
        // Dodajemy blokadę:
        checkGradeLock(() => {
            navigation.navigate('TheoryTopicList', { grade: String(selectedGrade) });
        });
    };

    const handleGamesPress = () => navigation.navigate('GamesStack' as never);

    if (isLoadingUser) {
        return <SafeAreaView style={[styles.container, themeStyles.container, { justifyContent: 'center' }]}><ActivityIndicator size="large" color={COLORS.primary} /></SafeAreaView>;
    }

    return (
        <SafeAreaView style={[styles.container, themeStyles.container]}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <Text style={[styles.headerTitle, themeStyles.text]}>Witaj!</Text>
                    <Text style={[styles.headerSubtitle, { color: themeStyles.subtitleColor }]}>Gotowy do nauki?</Text>
                </View>

                {/* Банер */}
                <View style={[styles.welcomeBanner, themeStyles.card]}>
                    <View style={styles.bannerTextContainer}>
                        <Text style={[styles.bannerTitle, themeStyles.text]}>Trenuj codziennie!</Text>
                        <Text style={[styles.bannerSubtitle, { color: themeStyles.subtitleColor }]}>Zdobywaj XP za regularność.</Text>
                    </View>
                    <Animated.Image source={require('../assets/images/logo1.png')} style={[styles.bannerImage, animatedMascotStyle]} />
                </View>

                {/* Вибір класу */}
                <View style={styles.sectionContainer}>
                    <Text style={[styles.sectionTitle, themeStyles.text]}>Twoja klasa</Text>
                    <View style={styles.chipScrollContainer}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScrollContent}>
                            {availableGrades.map((grade) => {
                                const isSelected = grade === selectedGrade;
                                return (
                                    <TouchableOpacity key={grade}
                                                      style={[styles.gradeButton, isSelected ? styles.gradeButtonSelected : { backgroundColor: themeStyles.gradeButtonBackground }, grade === defaultGrade && styles.gradeButtonUserClass]}
                                                      onPress={() => setSelectedGrade(grade)}>
                                        <Text style={[styles.gradeButtonText, isSelected ? styles.gradeButtonTextSelected : themeStyles.gradeButtonText]}>
                                            Klasa {grade} {grade === defaultGrade ? '⭐' : ''}
                                            {(grade === 5 || grade === 6) ? ' 🔒' : ''}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                </View>

                {/* --- МЕНЮ РЕЖИМІВ --- */}
                <View style={styles.sectionContainer}>
                    <Text style={[styles.sectionTitle, themeStyles.text]}>Wybierz tryb</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carouselContainer}>

                        {/* ĆWICZENIA (Зелений) */}
                        <BigMenuCard
                            title="Ćwiczenia"
                            subtitle="Trening umiejętności"
                            icon="fitness-outline"
                            color="#4CAF50"
                            onPress={handleTrainingAction}
                            themeStyles={themeStyles}
                            disabled={selectedGrade === null}
                        />

                        {/* TESTY (Синій) */}
                        <BigMenuCard
                            title="Testy"
                            subtitle="Sprawdź wiedzę"
                            icon="clipboard-outline"
                            color="#2196F3"
                            onPress={handleTestsAction}
                            themeStyles={themeStyles}
                            disabled={selectedGrade === null}
                        />

                        {/* TEORIA (Фіолетовий) */}
                        <BigMenuCard
                            title="Teoria"
                            subtitle="Materiały do nauki"
                            icon="book-outline"
                            color={COLORS.accent}
                            onPress={handleTheoryAction}
                            themeStyles={themeStyles}
                            disabled={selectedGrade === null}
                        />

                        {/* GRY (Жовтий) */}
                        <BigMenuCard
                            title="Gry"
                            subtitle="Zabawa"
                            icon="game-controller-outline"
                            color="#FFC107"
                            onPress={handleGamesPress}
                            themeStyles={themeStyles}
                        />
                    </ScrollView>
                </View>

                {/* Квести */}
                <View style={[styles.sectionContainer, styles.questSectionVertical]}>
                    <Text style={[styles.sectionTitle, themeStyles.text]}>Codzienne Zadania</Text>
                    {isLoadingQuests ? <ActivityIndicator color={COLORS.primary} /> :
                        quests.length > 0 ? <View style={styles.questListVertical}>{quests.map(item => <QuestItem key={item.id} item={item} themeStyles={themeStyles} />)}</View> :
                            <Text style={[styles.hintText, { color: themeStyles.subtitleColor }]}>Brak zadań na dziś!</Text>
                    }
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { paddingBottom: MARGIN.large * 2 },
    header: { paddingHorizontal: PADDING.large, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: PADDING.medium },
    headerTitle: { fontSize: FONT_SIZES.title, fontWeight: 'bold' },
    headerSubtitle: { fontSize: FONT_SIZES.large },
    welcomeBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: PADDING.medium, marginHorizontal: PADDING.medium, borderRadius: 12, elevation: 3, marginBottom: MARGIN.medium },
    bannerTextContainer: { flex: 1 },
    bannerTitle: { fontSize: FONT_SIZES.large, fontWeight: 'bold' },
    bannerSubtitle: { fontSize: FONT_SIZES.small, marginTop: 5 },
    bannerImage: { width: 80, height: 80, resizeMode: 'contain' },
    sectionContainer: { marginTop: MARGIN.large },
    sectionTitle: { fontSize: FONT_SIZES.large, fontWeight: '600', marginBottom: MARGIN.medium, paddingHorizontal: PADDING.large },
    chipScrollContainer: { paddingLeft: PADDING.medium },
    chipScrollContent: { paddingRight: PADDING.large },
    gradeButton: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, marginRight: 10, elevation: 2, borderWidth: 1, borderColor: 'transparent' },
    gradeButtonSelected: { backgroundColor: COLORS.accent },
    gradeButtonUserClass: { borderColor: COLORS.primary, borderWidth: 2 },
    gradeButtonText: { fontWeight: 'bold', fontSize: 14 },
    gradeButtonTextSelected: { color: COLORS.black },
    carouselContainer: { paddingLeft: PADDING.medium, paddingRight: PADDING.large },
    bigCard: { width: 150, height: 130, padding: PADDING.medium, borderRadius: 16, marginRight: MARGIN.medium, elevation: 4, borderWidth: 1, justifyContent: 'space-between' },
    bigCardDisabled: { opacity: 0.5 },
    bigCardIcon: { alignSelf: 'flex-start' },
    bigCardTextContainer: { marginTop: 5 },
    bigCardTitle: { fontSize: 16, fontWeight: 'bold' },
    bigCardSubtitle: { fontSize: 11 },
    questSectionVertical: { paddingHorizontal: PADDING.medium },
    questListVertical: { gap: 10 },
    questItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 16, // Bardziej zaokrąglone rogi pasują do reszty
        borderWidth: 1.5,
        marginBottom: 4,
    },
    questItemCompleted: {
        // Zmieniamy na ciemną zieleń, która nie razi w oczy
        backgroundColor: 'rgba(76, 175, 80, 0.15)',
        borderColor: COLORS.correct,
    },
    questItemInProgress: {
        // Przezroczyste tło z obramowaniem koloru głównego
        backgroundColor: 'rgba(33, 150, 243, 0.05)',
        borderColor: 'rgba(33, 150, 243, 0.3)',
    },
    questDetails: { flex: 1 },
    questTitle: { fontWeight: 'bold', fontSize: 14 },
    questProgress: { fontSize: 12, fontWeight: 'bold', marginTop: 4 },
    progressBarBackground: { height: 4, backgroundColor: '#eee', borderRadius: 2, marginTop: 4 },
    progressBarFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 2 },
    questIcon: { marginLeft: 10 },
    hintText: { textAlign: 'center', marginTop: 10 }
});

export default MainScreen;
