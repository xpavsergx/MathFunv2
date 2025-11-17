// src/screens/MainScreen.tsx

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    useColorScheme,
    Platform,
    ActivityIndicator,
    SafeAreaView,
    FlatList,
    Alert
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainAppStackParamList } from '../../src/navigation/types';
import { COLORS, FONT_SIZES, PADDING, MARGIN } from '../styles/theme';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
    FadeInUp
} from 'react-native-reanimated';
import { getUserQuests, QuestType } from '../services/dailyQuestService';
import questionsDatabase from '../data/questionsDb.json';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';


type MainScreenNavigationProp = NativeStackNavigationProp<MainAppStackParamList, 'Main'>;

// (Інтерфейси та Типізація)
interface QuestProgress {
    id: string; type: QuestType; title: string; target: number;
    reward: { xp: number; coins: number; };
    progress: number; isCompleted: boolean;
}
type QuestionsDB = {
    [grade: string]: any;
};
const db: QuestionsDB = questionsDatabase;

// --- (Компоненти UI) ---

// --- ✅ 1. КОМПОНЕНТ КНОПКИ-КЛАСУ (ПОВЕРНЕНО СТАРІ СТИЛІ) ---
const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);
const GradeChip = ({ grade, onPress, themeStyles, isDefault, isSelected }) => (
    <AnimatedTouchableOpacity
        entering={FadeInUp.delay(0).duration(0)}
        style={[
            styles.gradeButton,
            isSelected && styles.gradeButtonSelected,
            isDefault && styles.gradeButtonUserClass,
            !isSelected && { backgroundColor: themeStyles.gradeButtonBackground }
        ]}
        onPress={onPress}
    >
        <View style={styles.gradeChipContent}>
            <Text style={[
                styles.gradeButtonText,
                isSelected ? styles.gradeButtonTextSelected : themeStyles.gradeButtonText
            ]}>
                Klasa {grade}
            </Text>
            {isDefault && (
                <Ionicons
                    name="star"
                    size={14}
                    color={COLORS.accent}
                    style={styles.defaultStar}
                />
            )}
        </View>
    </AnimatedTouchableOpacity>
);

// (Компонент "Велика Картка" - Теорія / Ігри / Практика)
const BigMenuCard = ({ title, subtitle, icon, color, onPress, themeStyles, delay = 0, disabled = false }) => (
    <AnimatedTouchableOpacity
        entering={FadeInUp.delay(0).duration(0).springify()}
        style={[
            styles.bigCard,
            themeStyles.card,
            { borderColor: color },
            disabled && styles.bigCardDisabled
        ]}
        onPress={onPress}
        disabled={disabled}
    >
        <Ionicons name={icon} size={36} color={disabled ? themeStyles.subtitleColor : color} style={styles.bigCardIcon} />
        <View style={styles.bigCardTextContainer}>
            <Text style={[styles.bigCardTitle, themeStyles.text]} numberOfLines={1}>{title}</Text>
            <Text style={[styles.bigCardSubtitle, { color: themeStyles.subtitleColor }]} numberOfLines={2}>{subtitle}</Text>
        </View>
        <Ionicons name="chevron-forward-outline" size={20} color={themeStyles.chevronColor} />
    </AnimatedTouchableOpacity>
);

// (Компонент "Завдання" - без змін)
const QuestItem = ({ item, themeStyles }) => {
    const progressPercent = item.target > 0 ? (item.progress / item.target) * 100 : 0;
    const isCompleted = item.isCompleted;
    return (
        <View
            style={[
                styles.questItem,
                themeStyles.card,
                isCompleted ? styles.questItemCompleted : styles.questItemInProgress
            ]}
        >
            <View style={styles.questDetails}>
                <Text style={[styles.questTitle, themeStyles.text]} numberOfLines={1}>
                    {item.title}
                </Text>
                <View style={styles.progressBarBackground}>
                    <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
                </View>
                <Text style={[styles.questProgress, { color: isCompleted ? COLORS.correct : COLORS.primary }]}>
                    {isCompleted ? 'Gotowe! +XP' : `${item.progress}/${item.target}`}
                </Text>
            </View>
            <Ionicons
                name={isCompleted ? "checkmark-circle" : "flame-outline"}
                size={28}
                color={isCompleted ? COLORS.correct : COLORS.accent}
                style={styles.questIcon}
            />
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

    // (Логіка завантаження даних користувача)
    useEffect(() => {
        if (!currentUser) {
            setIsLoadingUser(false);
            return;
        }

        const unsubscribe = firestore().collection('users').doc(currentUser.uid).onSnapshot(doc => {
            if (doc.exists) {
                const grade = doc.data()?.userClass || doc.data()?.defaultGrade || availableGrades[0];
                const gradeNum = Number(grade);

                setDefaultGrade(gradeNum);

                if (selectedGrade === null) {
                    setSelectedGrade(gradeNum);
                }
            } else {
                setDefaultGrade(availableGrades[0] || null);
                if (selectedGrade === null) {
                    setSelectedGrade(availableGrades[0] || null);
                }
            }
            setIsLoadingUser(false);
        }, () => { setIsLoadingUser(false); });

        return () => unsubscribe();
    }, [currentUser, availableGrades, selectedGrade]);


    // (Анімація лисички)
    const mascotTranslateY = useSharedValue(0);
    const animatedMascotStyle = useAnimatedStyle(() => { return { transform: [{ translateY: mascotTranslateY.value }] }; });
    useEffect(() => {
        mascotTranslateY.value = withRepeat(
            withSequence(withTiming(-10, { duration: 1500 }), withTiming(0, { duration: 1500 })),
            -1, true
        );
    }, []);

    // (Завантаження завдань)
    useFocusEffect(
        useCallback(() => {
            setIsLoadingQuests(true);
            getUserQuests().then(fetchedQuests => {
                setQuests(fetchedQuests as QuestProgress[]);
                setIsLoadingQuests(false);
            });
        }, [])
    );

    // --- ✅ 5. ДИНАМІЧНІ СТИЛІ (themeStyles) ---
    const themeStyles = {
        container: { backgroundColor: isDarkMode ? COLORS.backgroundDark : '#F0F4F8' },
        card: { backgroundColor: isDarkMode ? COLORS.cardDark : COLORS.white },
        text: { color: isDarkMode ? COLORS.textDark : COLORS.textLight },
        subtitleColor: isDarkMode ? COLORS.greyDarkTheme : COLORS.grey,
        chevronColor: isDarkMode ? COLORS.greyDarkTheme : COLORS.grey,

        // Стилі для кнопок класів (ПОВЕРНУТО ДО СТАРОГО СТИЛЮ)
        gradeButtonBackground: isDarkMode ? COLORS.primaryDarkTheme : COLORS.primary,
        gradeButtonText: { color: isDarkMode ? COLORS.textDark : COLORS.white },
    };

    // (Функції дій)
    const handleGamesPress = () => {
        navigation.navigate('GamesStack' as never);
    };
    const handlePracticeAction = () => {
        if (selectedGrade === null) {
            Alert.alert("Wybierz klasę", "Proszę wybrać klasę, klikając na jeden z przycisków klasy.");
            return;
        }
        navigation.navigate('TopicList', { grade: selectedGrade });
    };
    const handleTheoryAction = () => {
        if (selectedGrade === null) {
            Alert.alert("Wybierz klasę", "Proszę wybrać klasę do przeglądania teorii.");
            return;
        }
        navigation.navigate('TheoryTopicList', { grade: String(selectedGrade) });
    };

    const hasQuests = quests.length > 0;

    if (isLoadingUser) {
        return (
            <SafeAreaView style={[styles.container, themeStyles.container, { justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, themeStyles.container]}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <Text style={[styles.headerTitle, themeStyles.text]}>Witaj z powrotem!</Text>
                    <Text style={[styles.headerSubtitle, { color: themeStyles.subtitleColor }]}>Gotowy na nowe wyzwania?</Text>
                </View>

                {/* (Анімований банер) */}
                <View style={[styles.welcomeBanner, themeStyles.card]}>
                    <View style={styles.bannerTextContainer}>
                        <Text style={[styles.bannerTitle, themeStyles.text]}>Trenuj codziennie!</Text>
                        <Text style={[styles.bannerSubtitle, { color: themeStyles.subtitleColor }]}>
                            Zdobywaj XP i monety za codzienne zadania.
                        </Text>
                    </View>
                    <Animated.Image
                        source={require('../assets/images/logo.png')}
                        style={[styles.bannerImage, animatedMascotStyle]}
                    />
                </View>

                {/* --- ВИБІР КЛАСУ --- */}
                <View style={styles.sectionContainer}>
                    <Text style={[styles.sectionTitle, themeStyles.text]}>Wybierz klasę do nauki</Text>
                    <View style={styles.chipScrollContainer}>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.chipScrollContent}
                        >
                            {availableGrades.map((grade) => {
                                const isUserRegClass = grade === defaultGrade;
                                const isCurrentlySelected = grade === selectedGrade;
                                return (
                                    <TouchableOpacity
                                        key={grade}
                                        style={[
                                            styles.gradeButton,
                                            isUserRegClass && styles.gradeButtonUserClass,
                                            isCurrentlySelected && styles.gradeButtonSelected,
                                            !isCurrentlySelected && {backgroundColor: themeStyles.gradeButtonBackground}
                                        ]}
                                        onPress={() => setSelectedGrade(grade)}
                                    >
                                        <Text style={[
                                            styles.gradeButtonText,
                                            isCurrentlySelected && styles.gradeButtonTextSelected,
                                            !isCurrentlySelected && themeStyles.gradeButtonText
                                        ]}>
                                            Klasa {grade} {isUserRegClass ? '⭐' : ''}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                </View>

                {/* --- КАРУСЕЛЬ ДІЙ (ПРАКТИКА | ТЕОРІЯ | ГРИ) --- */}
                <View style={styles.sectionContainer}>
                    <Text style={[styles.sectionTitle, themeStyles.text]}>Twoje działania</Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.carouselContainer}
                    >
                        <BigMenuCard
                            title="Praktyka"
                            subtitle={`Przejdź do zadań klasy ${selectedGrade || '?'}`}
                            icon="school-outline"
                            color={COLORS.primary}
                            onPress={handlePracticeAction}
                            themeStyles={themeStyles}
                            delay={100}
                            disabled={selectedGrade === null}
                        />
                        <BigMenuCard
                            title="Teoria"
                            subtitle={`Materiały dla klasy ${selectedGrade || '?'}`}
                            icon="book-outline"
                            color={COLORS.accent}
                            onPress={handleTheoryAction}
                            themeStyles={themeStyles}
                            delay={200}
                            disabled={selectedGrade === null}
                        />
                        <BigMenuCard
                            title="Gry"
                            subtitle="Szybkie liczenie, zapałki i inne"
                            icon="game-controller-outline"
                            color={COLORS.correct}
                            onPress={handleGamesPress}
                            themeStyles={themeStyles}
                            delay={300}
                        />
                    </ScrollView>
                </View>

                {/* --- ЩОДЕННІ ЗАВДАННЯ --- */}
                <View style={[styles.sectionContainer, styles.questSectionVertical]}>
                    <Text style={[styles.sectionTitle, themeStyles.text]}>Codzienne Zadania</Text>
                    {isLoadingQuests ? (
                        <ActivityIndicator color={COLORS.primary} style={{paddingHorizontal: PADDING.small, marginTop: 10}} />
                    ) : hasQuests ? (
                        <View style={styles.questListVertical}>
                            {quests.map(item => (
                                <QuestItem key={item.id} item={item} themeStyles={themeStyles} />
                            ))}
                        </View>
                    ) : (
                        <Text style={[styles.hintText, { color: themeStyles.subtitleColor }]}>Brak nowych zadań na dziś!</Text>
                    )}
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

// --- СТИЛІ ---
const styles = StyleSheet.create({
    container: { flex: 1, },
    scrollContent: { paddingBottom: MARGIN.large * 2 },
    header: {
        paddingHorizontal: PADDING.large,
        paddingTop: Platform.OS === 'ios' ? PADDING.large * 2 : PADDING.large,
        paddingBottom: PADDING.medium,
    },
    headerTitle: { fontSize: FONT_SIZES.title, fontWeight: 'bold', },
    headerSubtitle: { fontSize: FONT_SIZES.large, },
    welcomeBanner: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: PADDING.small,
        paddingHorizontal: PADDING.medium,
        marginHorizontal: PADDING.medium,
        borderRadius: 12,
        elevation: 3,
        marginBottom: MARGIN.medium,
        overflow: 'hidden',
    },
    bannerTextContainer: { flex: 1, paddingRight: PADDING.small, },
    bannerTitle: { fontSize: FONT_SIZES.large, fontWeight: 'bold', },
    bannerSubtitle: { fontSize: FONT_SIZES.medium - 2, marginTop: MARGIN.small / 2, },
    bannerImage: { width: 100, height: 100, resizeMode: 'contain', marginRight: -PADDING.small, },

    // Вибір класу
    chipScrollContainer: {
        width: '100%',
        marginVertical: MARGIN.small,
    },
    chipScrollContent: {
        paddingHorizontal: PADDING.medium,
    },
    gradeButton: {
        paddingVertical: PADDING.small - 2,
        paddingHorizontal: PADDING.medium,
        borderRadius: 18,
        marginRight: MARGIN.small,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 3,
        height: 36,
        borderWidth: 0.5,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    gradeButtonSelected: {
        backgroundColor: COLORS.accent,
    },
    gradeButtonUserClass: {
        borderColor: COLORS.primary,
        borderWidth: 1.5,
    },
    gradeButtonText: {
        fontSize: FONT_SIZES.medium - 2,
        fontWeight: 'bold',
        color: COLORS.white,
        textShadowColor: 'rgba(0, 0, 0, 0.2)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 1,
    },
    gradeButtonTextSelected: {
        color: COLORS.black,
    },
    gradeChipContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    defaultStar: {
        marginLeft: MARGIN.small / 2,
    },

    // Карусель дій
    sectionContainer: {
        paddingHorizontal: PADDING.medium,
        marginTop: MARGIN.large,
    },
    sectionTitle: {
        fontSize: FONT_SIZES.large,
        fontWeight: '600',
        marginBottom: MARGIN.medium,
        paddingHorizontal: PADDING.small,
    },
    carouselContainer: {
        paddingRight: PADDING.large,
        marginTop: MARGIN.large
        // Використовуємо gap через marginRight у карток
    },
    bigCard: {
        width: 240,             // фіксована ширина картки для каруселі
        minHeight: 100,
        flexDirection: 'row',
        alignItems: 'center',
        padding: PADDING.medium,
        borderRadius: 12,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        borderWidth: 2,
        marginRight: MARGIN.medium, // відступ між картками
    },
    bigCardDisabled: {
        opacity: 0.6,
        borderColor: COLORS.grey,
    },
    bigCardIcon: { marginRight: MARGIN.medium, },
    bigCardTextContainer: { flex: 1, },
    bigCardTitle: { fontSize: FONT_SIZES.large - 4, fontWeight: 'bold' },
    bigCardSubtitle: { fontSize: FONT_SIZES.medium - 4, marginTop: MARGIN.small / 4 },

    // Завдання
    questSectionVertical: {},
    questListVertical: {
        gap: MARGIN.small,
        paddingHorizontal: PADDING.small,
    },
    questItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: PADDING.medium,
        borderRadius: 10,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    questItemCompleted: {
        borderColor: COLORS.correct,
        backgroundColor: '#E8F5E9',
    },
    questItemInProgress: {
        borderColor: COLORS.primary,
        borderWidth: 1,
    },
    questIcon: {
        marginLeft: MARGIN.small,
    },
    questDetails: {
        flex: 1,
        paddingRight: PADDING.small,
    },
    questTitle: {
        fontSize: FONT_SIZES.medium - 1,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    progressBarBackground: {
        height: 4,
        backgroundColor: '#e0e0e0',
        borderRadius: 3,
        marginTop: MARGIN.small,
        overflow: 'hidden',
        width: '100%',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: COLORS.primary,
        borderRadius: 3,
    },
    questProgress: {
        fontSize: FONT_SIZES.small,
        fontWeight: 'bold',
        marginTop: 5,
        textAlign: 'right',
    },
    hintText: {
        fontSize: FONT_SIZES.medium,
        paddingHorizontal: PADDING.small,
        marginTop: MARGIN.small,
        textAlign: 'center',
    },
});

export default MainScreen;
