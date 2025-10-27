// src/screens/MainScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, Image, TouchableOpacity,
    Dimensions, ScrollView, useColorScheme, Alert, Platform,
    SafeAreaView, // Залишаємо SafeAreaView
    ImageBackground,
    Animated
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp } from '@react-navigation/native';
import { MainAppStackParamList, AppTabParamList, TheoryStackParamList } from '../../App';
import { COLORS, FONT_SIZES, PADDING, MARGIN } from '../styles/theme';
import Ionicons from '@expo/vector-icons/Ionicons';

// Типи навігації (без змін)
type MainScreenNavigationProp = CompositeNavigationProp<
    BottomTabNavigationProp<AppTabParamList, 'HomeStack'>,
    NativeStackScreenProps<MainAppStackParamList & TheoryStackParamList>['navigation']
>;
type MainScreenProps = { navigation: MainScreenNavigationProp };

// Константи
const GRADES = [4, 5, 6, 7];
const ACCENT_COLOR_PURPLE = '#7C4DFF';

// Компонент Feature Card (без змін)
const FeatureCard = ({ icon, title, onPress, cardStyle, textStyle, iconColor, disabled }) => (
    <TouchableOpacity style={[styles.card, cardStyle, disabled && styles.cardDisabled]} onPress={onPress} activeOpacity={disabled ? 1 : 0.7} disabled={disabled}>
        <Ionicons name={icon} size={38} color={disabled ? COLORS.greyDarkTheme : (iconColor || COLORS.primary)} style={{ marginBottom: MARGIN.medium }} />
        <Text style={[styles.cardTitle, textStyle, disabled && styles.cardTextDisabled]} numberOfLines={1} adjustsFontSizeToFit>{title}</Text>
    </TouchableOpacity>
);


function MainScreen({ navigation }: MainScreenProps) {
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';

    const [userClass, setUserClass] = useState<string | null>(null);
    const [selectedGrade, setSelectedGrade] = useState<number | null>(null);
    const currentUser = auth().currentUser;

    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Логіка завантаження userClass (без змін)
        if (currentUser) {
            const userRef = firestore().collection('users').doc(currentUser.uid);
            const unsubscribe = userRef.onSnapshot(doc => {
                if (doc.exists) {
                    const fetchedClass = doc.data()?.userClass;
                    setUserClass(fetchedClass ? String(fetchedClass) : null);
                    if (fetchedClass && selectedGrade === null) {
                        setSelectedGrade(Number(fetchedClass));
                    }
                }
            }, err => console.error("Błąd podczas pobierania klasy użytkownika:", err) );
            return () => unsubscribe();
        }
    }, [currentUser]);

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
        }).start();
    }, [fadeAnim]);

    // Функції навігації (без змін)
    const handleGradeSelect = (grade: number) => { setSelectedGrade(grade); };
    const navigateToPractice = () => { /* ... */ };
    const navigateToTheory = () => { /* ... */ };

    // Динамічні стилі (без змін)
    const dynamicStyles = {
        backgroundGradient: isDarkMode ? ['#212121', '#121212'] : ['#F5F5F5', '#E0E0E0'],
        headerText: { color: isDarkMode ? COLORS.textDark : COLORS.textLight },
        subText: { color: isDarkMode ? COLORS.grey : '#757575' },
        card: { backgroundColor: isDarkMode ? COLORS.cardDark : COLORS.white },
        cardText: { color: isDarkMode ? COLORS.textDark : COLORS.textLight },
        gradeButton: { backgroundColor: isDarkMode ? '#333333' : '#F5F5F5', borderColor: isDarkMode ? '#555' : '#E0E0E0' },
        gradeButtonSelected: { backgroundColor: ACCENT_COLOR_PURPLE, borderColor: ACCENT_COLOR_PURPLE },
        gradeButtonUserClass: { borderColor: isDarkMode ? COLORS.accent : COLORS.accent, borderWidth: 1.5 },
        gradeButtonText: { color: isDarkMode ? COLORS.textDark : COLORS.textLight },
        gradeButtonTextSelected: { color: COLORS.white },
        cardIconColor: isDarkMode ? ACCENT_COLOR_PURPLE : ACCENT_COLOR_PURPLE,
        cardDisabled: { opacity: 0.5 },
        cardTextDisabled: { opacity: 0.5 },
    };

    // Компонент вмісту екрану
    const ScreenContent = () => (
        // ✅ Встановлюємо flexGrow, щоб вміст займав місце, якщо ScrollView активний
        <Animated.View style={[styles.scrollContentContainer, { opacity: fadeAnim }]}>
            {/* --- HEADER --- */}
            <View style={styles.headerContainer}>
                {/* Текст зліва */}
                <View style={styles.headerTextContainer}>
                    <Text style={[styles.welcomeTitle, dynamicStyles.headerText]}>
                        Cześć {currentUser?.displayName || 'Viola'}!
                    </Text>
                    <Text style={[styles.subText, dynamicStyles.subText]}>
                        Co chcesz dziś ogarnąć?
                    </Text>
                </View>
                {/* Лисиця справа */}
                <Image
                    source={require('../assets/images/fox_mascot.png')}
                    style={styles.mascot}
                    resizeMode="contain"
                />
            </View>

            {/* --- GRADE SELECTOR --- */}
            <View style={styles.gradesScrollViewContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gradesContainer}>
                    {GRADES.map((grade) => {
                        const isUserRegClass = String(grade) === userClass;
                        const isCurrentlySelected = grade === selectedGrade;
                        return (
                            <TouchableOpacity
                                key={grade}
                                style={[ styles.gradeButton, dynamicStyles.gradeButton, isUserRegClass && dynamicStyles.gradeButtonUserClass, isCurrentlySelected && dynamicStyles.gradeButtonSelected ]}
                                onPress={() => handleGradeSelect(grade)}
                            >
                                {isCurrentlySelected && <Ionicons name="checkmark-sharp" size={16} color={dynamicStyles.gradeButtonTextSelected.color} style={styles.checkmarkIcon}/>}
                                <Text style={[ styles.gradeButtonText, dynamicStyles.gradeButtonText, isCurrentlySelected && dynamicStyles.gradeButtonTextSelected ]}>
                                    Klasa {grade}
                                </Text>
                                {/* {isUserRegClass && !isCurrentlySelected && <Text style={{ fontSize: 10, marginLeft: 2 }}>⭐</Text>} */}
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {/* --- FEATURE CARDS GRID --- */}
            <View style={styles.featuresGrid}>
                <FeatureCard icon="book-outline" title="Teoria" onPress={navigateToTheory} cardStyle={dynamicStyles.card} textStyle={dynamicStyles.cardText} iconColor={dynamicStyles.cardIconColor} disabled={!selectedGrade}/>
                <FeatureCard icon="pencil-outline" title="Praktyka" onPress={navigateToPractice} cardStyle={dynamicStyles.card} textStyle={dynamicStyles.cardText} iconColor={dynamicStyles.cardIconColor} disabled={!selectedGrade}/>
                <FeatureCard icon="game-controller-outline" title="Gry" onPress={() => Alert.alert("Wkrótce", "Sekcja gier jest w przygotowaniu!")} cardStyle={dynamicStyles.card} textStyle={dynamicStyles.cardText} iconColor={dynamicStyles.cardIconColor} disabled={false}/>
                <FeatureCard icon="star-outline" title="Wyzwanie" onPress={() => Alert.alert("Wkrótce", "Codzienne wyzwania są w przygotowaniu!")} cardStyle={dynamicStyles.card} textStyle={dynamicStyles.cardText} iconColor={dynamicStyles.cardIconColor} disabled={false}/>
            </View>

            {/* Додатковий відступ знизу, щоб вміст не зливався з TabBar */}
            <View style={styles.bottomSpacer} />
        </Animated.View>
    );

    // Умовний рендеринг фону
    const BackgroundWrapper = isDarkMode ? LinearGradient : ImageBackground;
    const backgroundProps = isDarkMode ? {
        colors: dynamicStyles.backgroundGradient,
        style: styles.backgroundContainer,
    } : {
        source: require('../assets/background.jpg'),
        style: styles.backgroundContainer,
        resizeMode: 'cover',
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <BackgroundWrapper {...backgroundProps}>
                {/* Overlay тільки для ImageBackground */}
                {!isDarkMode && <View style={[StyleSheet.absoluteFill, dynamicStyles.backgroundOverlayLight]} />}

                {/* ✅ ЗАМІНЯЄМО contentContainer НА ScrollView */}
                <ScrollView
                    style={styles.scrollWrapper}
                    contentContainerStyle={styles.scrollViewContentStyle}
                    showsVerticalScrollIndicator={false}
                >
                    <ScreenContent />
                </ScrollView>
            </BackgroundWrapper>
        </SafeAreaView>
    );
}

// Стилі, адаптовані для скролінгу
const windowWidth = Dimensions.get('window').width;
const cardSize = (windowWidth - PADDING.large * 2 - MARGIN.medium) / 2;

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#121212' }, // Колір Safe Area за замовчуванням
    backgroundContainer: { flex: 1 }, // Контейнер для фону/градієнта

    scrollWrapper: {
        flex: 1,
    },
    // ✅ Новий стиль для ScrollView contentContainer: забезпечує гнучкість, але дозволяє скрол
    scrollViewContentStyle: {
        flexGrow: 1, // Дозволяє вмісту займати весь простір, коли це можливо
    },

    // ✅ Оновлений контейнер вмісту (вже не має flex: 1)
    scrollContentContainer: {
        flexGrow: 1,
        paddingTop: Platform.OS === 'ios' ? PADDING.medium : PADDING.large + PADDING.medium,
        minHeight: Dimensions.get('window').height * 1.1, // Щоб забезпечити скролінг, якщо вміст не займає 100%
    },

    // --- HEADER ---
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: PADDING.large,
        marginBottom: MARGIN.large + MARGIN.small,
    },
    headerTextContainer: {
        flex: 1,
    },
    welcomeTitle: {
        fontSize: FONT_SIZES.xlarge,
        fontWeight: 'bold',
    },
    subText: {
        fontSize: FONT_SIZES.medium,
        opacity: 0.8,
        marginTop: 4,
    },
    mascot: {
        width: 80,
        height: 80,
        marginLeft: MARGIN.small,
    },
    // --- GRADE SELECTOR ---
    gradesScrollViewContainer: {
        marginBottom: MARGIN.large + MARGIN.small,
        paddingLeft: PADDING.large,
    },
    gradesContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingRight: PADDING.large,
    },
    gradeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: PADDING.small,
        paddingHorizontal: PADDING.medium + 2,
        borderRadius: 20,
        marginRight: MARGIN.small,
        borderWidth: 1,
        minHeight: 40,
    },
    checkmarkIcon: {
        marginRight: 5,
    },
    gradeButtonText: {
        fontSize: FONT_SIZES.medium -1,
        fontWeight: '600',
    },
    // --- FEATURE GRID ---
    featuresGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingHorizontal: PADDING.large,
    },
    card: {
        width: cardSize,
        height: cardSize * 0.9,
        borderRadius: 12,
        padding: PADDING.medium,
        marginBottom: MARGIN.medium,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 0,
    },
    cardDisabled: { opacity: 0.5 },
    cardTextDisabled: { opacity: 0.5 },
    cardTitle: {
        fontSize: FONT_SIZES.medium,
        fontWeight: '600',
        textAlign: 'center',
        marginTop: MARGIN.small,
    },
    // ✅ Новий стиль: Додатковий простір внизу
    bottomSpacer: {
        height: Platform.OS === 'ios' ? 90 : 70, // Висота TabBar
    }
});

export default MainScreen;
