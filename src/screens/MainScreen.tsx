// src/screens/MainScreen.tsx

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, useColorScheme,
    Platform, ActivityIndicator, SafeAreaView, Alert, Dimensions, PixelRatio
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

// --- 📏 DYNAMICZNE SKALOWANIE ---
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size: number) => {
    // Bazujemy na standardowej szerokości ekranu (375px), aby zachować proporcje na różnych telefonach
    const scaleFactor = SCREEN_WIDTH / 375;
    const newSize = size * scaleFactor;
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

// Typy
interface QuestProgress {
    id: string; type: QuestType; title: string; target: number;
    reward: { xp: number; coins: number; };
    progress: number; isCompleted: boolean;
}
type QuestionsDB = { [grade: string]: any; };
const db: QuestionsDB = questionsDatabase;

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

// Komponent Kartki Menu (Ulepszony pod kątem tekstu)
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
        <Ionicons name={icon} size={scale(32)} color={disabled ? themeStyles.subtitleColor : color} style={styles.bigCardIcon} />
        <View style={styles.bigCardTextContainer}>
            <Text
                style={[styles.bigCardTitle, themeStyles.text]}
                numberOfLines={1}
                adjustsFontSizeToFit // ❗ Automatycznie pomniejszy czcionkę, aby pasowała
                minimumFontScale={0.8}
            >
                {title}
            </Text>
            <Text
                style={[styles.bigCardSubtitle, { color: themeStyles.subtitleColor }]}
                numberOfLines={2}
                adjustsFontSizeToFit // ❗ Zapobiega wychodzeniu tekstu na małych ekranach
                minimumFontScale={0.9}
            >
                {subtitle}
            </Text>
        </View>
        <Ionicons name="chevron-forward-outline" size={scale(20)} color={themeStyles.chevronColor} />
    </AnimatedTouchableOpacity>
);

// Komponent Квесту
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
            <Ionicons name={isCompleted ? "checkmark-circle" : "flame-outline"} size={scale(28)} color={isCompleted ? COLORS.correct : COLORS.accent} style={styles.questIcon} />
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

    const mascotTranslateY = useSharedValue(0);
    const animatedMascotStyle = useAnimatedStyle(() => ({ transform: [{ translateY: mascotTranslateY.value }] }));
    useEffect(() => {
        mascotTranslateY.value = withRepeat(withSequence(withTiming(-10, { duration: 1500 }), withTiming(0, { duration: 1500 })), -1, true);
    }, []);

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

    const handleTrainingAction = () => {
        if (selectedGrade === null) { Alert.alert("Wybierz klasę", "Proszę wybrać klasę."); return; }
        checkGradeLock(() => { navigation.navigate('TopicList', { grade: selectedGrade, mode: 'training' }); });
    };

    const handleTestsAction = () => {
        if (selectedGrade === null) { Alert.alert("Wybierz klasę", "Proszę wybrać klasę."); return; }
        checkGradeLock(() => { navigation.navigate('TopicList', { grade: selectedGrade, mode: 'test' }); });
    };

    const handleTheoryAction = () => {
        if (selectedGrade === null) { Alert.alert("Wybierz klasę", "Proszę wybrać klasę."); return; }
        checkGradeLock(() => { navigation.navigate('TheoryTopicList', { grade: String(selectedGrade) }); });
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

                <View style={[styles.welcomeBanner, themeStyles.card]}>
                    <View style={styles.bannerTextContainer}>
                        <Text style={[styles.bannerTitle, themeStyles.text]} adjustsFontSizeToFit numberOfLines={1}>Trenuj codziennie!</Text>
                        <Text style={[styles.bannerSubtitle, { color: themeStyles.subtitleColor }]}>Zdobywaj XP za regularność.</Text>
                    </View>
                    <Animated.Image source={require('../assets/logo.png')} style={[styles.bannerImage, animatedMascotStyle]} />
                </View>

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

                <View style={styles.sectionContainer}>
                    <Text style={[styles.sectionTitle, themeStyles.text]}>Wybierz tryb</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carouselContainer}>
                        <BigMenuCard
                            title="Ćwiczenia"
                            subtitle="Trening umiejętności"
                            icon="fitness-outline"
                            color="#4CAF50"
                            onPress={handleTrainingAction}
                            themeStyles={themeStyles}
                            disabled={selectedGrade === null}
                        />
                        <BigMenuCard
                            title="Testy"
                            subtitle="Sprawdź wiedzę"
                            icon="clipboard-outline"
                            color="#2196F3"
                            onPress={handleTestsAction}
                            themeStyles={themeStyles}
                            disabled={selectedGrade === null}
                        />
                        <BigMenuCard
                            title="Teoria"
                            subtitle="Materiały do nauki"
                            icon="book-outline"
                            color={COLORS.accent}
                            onPress={handleTheoryAction}
                            themeStyles={themeStyles}
                            disabled={selectedGrade === null}
                        />
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
    scrollContent: { paddingBottom: scale(MARGIN.large * 2) },
    header: { paddingHorizontal: scale(PADDING.large), paddingTop: Platform.OS === 'ios' ? scale(60) : scale(40), paddingBottom: scale(PADDING.medium) },
    headerTitle: { fontSize: scale(28), fontWeight: 'bold' },
    headerSubtitle: { fontSize: scale(20) },
    welcomeBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: scale(PADDING.medium), marginHorizontal: scale(PADDING.medium), borderRadius: scale(12), elevation: 3, marginBottom: scale(MARGIN.medium) },
    bannerTextContainer: { flex: 1 },
    bannerTitle: { fontSize: scale(20), fontWeight: 'bold' },
    bannerSubtitle: { fontSize: scale(12), marginTop: 5 },
    bannerImage: { width: scale(80), height: scale(80), resizeMode: 'contain' },
    sectionContainer: { marginTop: scale(MARGIN.large) },
    sectionTitle: { fontSize: scale(20), fontWeight: '600', marginBottom: scale(MARGIN.medium), paddingHorizontal: scale(PADDING.large) },
    chipScrollContainer: { paddingLeft: scale(PADDING.medium) },
    chipScrollContent: { paddingRight: scale(PADDING.large) },
    gradeButton: { paddingVertical: scale(8), paddingHorizontal: scale(16), borderRadius: scale(20), marginRight: scale(10), elevation: 2, borderWidth: 1, borderColor: 'transparent' },
    gradeButtonSelected: { backgroundColor: COLORS.accent },
    gradeButtonUserClass: { borderColor: COLORS.primary, borderWidth: 2 },
    gradeButtonText: { fontWeight: 'bold', fontSize: scale(14) },
    gradeButtonTextSelected: { color: COLORS.black },
    carouselContainer: { paddingLeft: scale(PADDING.medium), paddingRight: scale(PADDING.large) },
    bigCard: { width: scale(150), height: scale(130), padding: scale(16), borderRadius: scale(16), marginRight: scale(16), elevation: 4, borderWidth: 1, justifyContent: 'space-between' },
    bigCardDisabled: { opacity: 0.5 },
    bigCardIcon: { alignSelf: 'flex-start' },
    bigCardTextContainer: { marginTop: scale(5) },
    bigCardTitle: { fontSize: scale(16), fontWeight: 'bold' },
    bigCardSubtitle: { fontSize: scale(11) },
    questSectionVertical: { paddingHorizontal: scale(PADDING.medium) },
    questListVertical: { gap: scale(10) },
    questItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: scale(12),
        borderRadius: scale(16),
        borderWidth: 1.5,
        marginBottom: scale(4),
    },
    questItemCompleted: {
        backgroundColor: 'rgba(76, 175, 80, 0.15)',
        borderColor: COLORS.correct,
    },
    questItemInProgress: {
        backgroundColor: 'rgba(33, 150, 243, 0.05)',
        borderColor: 'rgba(33, 150, 243, 0.3)',
    },
    questDetails: { flex: 1 },
    questTitle: { fontWeight: 'bold', fontSize: scale(14) },
    questProgress: { fontSize: scale(12), fontWeight: 'bold', marginTop: scale(4) },
    progressBarBackground: { height: scale(4), backgroundColor: '#eee', borderRadius: scale(2), marginTop: scale(4) },
    progressBarFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: scale(2) },
    questIcon: { marginLeft: scale(10) },
    hintText: { textAlign: 'center', marginTop: scale(10) }
});

export default MainScreen;
