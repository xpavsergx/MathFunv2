// src/screens/MainScreen.tsx
import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, Image, TouchableOpacity,
    Dimensions, ScrollView, useColorScheme, Alert, Platform,
    SafeAreaView,
    ImageBackground
} from 'react-native';
// Імпортуємо LinearGradient
import { LinearGradient } from 'expo-linear-gradient';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp } from '@react-navigation/native';
import { MainAppStackParamList, AppTabParamList, TheoryStackParamList } from '../../App';
import { COLORS, FONT_SIZES, PADDING, MARGIN } from '../styles/theme';
import Ionicons from '@expo/vector-icons/Ionicons';

// --- Типи навігації (Правильний варіант) ---
type MainScreenNavigationProp = CompositeNavigationProp<
    BottomTabNavigationProp<AppTabParamList, 'HomeStack'>,
    NativeStackScreenProps<MainAppStackParamList & TheoryStackParamList>['navigation']
>;
type MainScreenProps = { navigation: MainScreenNavigationProp };

// Константи
const GRADES = [4, 5, 6, 7];

// Компонент FeatureCard
const FeatureCard = ({ icon, title, subtitle, onPress, cardStyle, textStyle, iconColor, disabled }) => (
    <TouchableOpacity style={[styles.card, cardStyle, disabled && styles.cardDisabled]} onPress={onPress} activeOpacity={disabled ? 1 : 0.7} disabled={disabled}>
        <Ionicons name={icon} size={40} color={disabled ? COLORS.greyDarkTheme : (iconColor || COLORS.primary)} style={{ marginBottom: MARGIN.small }} />
        <Text style={[styles.cardTitle, textStyle, disabled && styles.cardTextDisabled]} numberOfLines={1} adjustsFontSizeToFit>{title}</Text>
        <Text style={[styles.cardSubtitle, textStyle, disabled && styles.cardTextDisabled]} numberOfLines={2}>{subtitle}</Text>
    </TouchableOpacity>
);

function MainScreen({ navigation }: MainScreenProps) {
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';

    const [userClass, setUserClass] = useState<string | null>(null);
    const [selectedGrade, setSelectedGrade] = useState<number | null>(null);

    const currentUser = auth().currentUser;

    useEffect(() => {
        // Логіка завантаження userClass
        if (currentUser) {
            const userRef = firestore().collection('users').doc(currentUser.uid);
            const unsubscribe = userRef.onSnapshot(doc => {
                if (doc.exists) {
                    const fetchedClass = doc.data()?.userClass;
                    setUserClass(fetchedClass ? String(fetchedClass) : null);
                    // Встановлюємо початково вибраний клас = клас реєстрації
                    if (fetchedClass && selectedGrade === null) {
                        setSelectedGrade(Number(fetchedClass));
                    }
                }
            }, err => console.error("Błąd podczas pobierania klasy użytkownika:", err) );
            return () => unsubscribe();
        }
    }, [currentUser]);

    // Функції навігації
    const handleGradeSelect = (grade: number) => {
        console.warn("Wybrano klasę:", grade); // Залишено console.warn для перевірки
        setSelectedGrade(grade);
    };
    const navigateToPractice = () => {
        console.warn("Próba nawigacji do Praktyki. Wybrana klasa:", selectedGrade); // Залишено console.warn для перевірки
        if (selectedGrade) {
            navigation.navigate('TopicList', { grade: selectedGrade });
        } else {
            Alert.alert("Wybierz klasę", "Najpierw wybierz klasę z listy powyżej.");
        }
    };
    const navigateToTheory = () => {
        if (selectedGrade) {
            navigation.navigate('TheoryTopicList', { grade: String(selectedGrade) });
        } else {
            Alert.alert("Wybierz klasę", "Najpierw wybierz klasę z listy powyżej.");
        }
    };

    // Динамічні стилі
    const dynamicStyles = {
        backgroundOverlayLight: { backgroundColor: 'rgba(255, 255, 255, 0.3)' },
        card: { backgroundColor: isDarkMode ? COLORS.cardDark : 'rgba(255, 255, 255, 0.9)' },
        text: { color: isDarkMode ? COLORS.textDark : COLORS.textLight },
        welcomeTitle: { color: isDarkMode ? COLORS.primaryDarkTheme : COLORS.primaryDark },
        userInfoText: { color: isDarkMode ? COLORS.textDark : '#424242' },
        encouragementText: { color: isDarkMode ? COLORS.textDark : '#37474F' },
        gradeButton: { backgroundColor: isDarkMode ? COLORS.cardDark : COLORS.primary },
        gradeButtonSelected: { backgroundColor: COLORS.accent },
        gradeButtonUserClass: { borderColor: isDarkMode ? COLORS.primaryDarkTheme : COLORS.primaryDark, borderWidth: 1.5 },
        gradeButtonText: { color: isDarkMode ? COLORS.textDark : COLORS.white },
        gradeButtonTextSelected: { color: isDarkMode ? COLORS.black : COLORS.white },
        cardIconColor: isDarkMode ? COLORS.primaryDarkTheme : COLORS.primary,
        cardDisabled: { backgroundColor: isDarkMode ? '#282828' : '#E0E0E0', opacity: 0.7 },
        cardTextDisabled: { color: COLORS.greyDarkTheme }
    };

    // Компонент вмісту екрану
    const ScreenContent = () => (
        <View style={styles.contentContainer}>
            {/* Верхня секція */}
            <View style={styles.topSection}>
                <Image source={require('../assets/logo.jpg')} style={styles.logo} resizeMode="contain" />
                <Text style={[styles.welcomeTitle, dynamicStyles.welcomeTitle]}>Witaj w MathFun!</Text>
                {currentUser && (
                    <Text style={[styles.userInfoText, dynamicStyles.userInfoText]}>
                        Gotowy na nową przygodę, {currentUser.displayName || currentUser.email}?
                    </Text>
                )}
                <Text style={[styles.encouragementText, dynamicStyles.encouragementText]}>
                    Wybierz klasę, aby rozpocząć!
                </Text>
            </View>

            {/* Горизонтальний вибір класу */}
            <View style={styles.gradesScrollViewContainer}>
                <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gradesContainer}>
                    {GRADES.map((grade) => {
                        const isUserRegClass = String(grade) === userClass;
                        const isCurrentlySelected = grade === selectedGrade;
                        return (
                            <TouchableOpacity
                                key={grade}
                                style={[ styles.gradeButton, dynamicStyles.gradeButton, isUserRegClass && dynamicStyles.gradeButtonUserClass, isCurrentlySelected && dynamicStyles.gradeButtonSelected ]}
                                onPress={() => handleGradeSelect(grade)}
                            >
                                <Text style={[ styles.gradeButtonText, dynamicStyles.gradeButtonText, isCurrentlySelected && dynamicStyles.gradeButtonTextSelected ]}>
                                    Klasa {grade} {isUserRegClass ? '⭐' : ''}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {/* Сітка з 4 картками функцій */}
            <View style={styles.featuresGrid}>
                <FeatureCard icon="book-outline" title="Teoria" subtitle="Ucz się zasad i wzorów" onPress={navigateToTheory} cardStyle={dynamicStyles.card} textStyle={dynamicStyles.text} iconColor={dynamicStyles.cardIconColor} disabled={!selectedGrade}/>
                <FeatureCard icon="pencil-outline" title="Praktyka" subtitle="Testy i ćwiczenia" onPress={navigateToPractice} cardStyle={dynamicStyles.card} textStyle={dynamicStyles.text} iconColor={dynamicStyles.cardIconColor} disabled={!selectedGrade}/>
                <FeatureCard icon="game-controller-outline" title="Gry" subtitle="Baw się matematyką!" onPress={() => Alert.alert("Wkrótce", "Sekcja gier jest w przygotowaniu!")} cardStyle={dynamicStyles.card} textStyle={dynamicStyles.text} iconColor={dynamicStyles.cardIconColor} disabled={false}/>
                <FeatureCard icon="star-outline" title="Wyzwanie dnia" subtitle="Sprawdź się!" onPress={() => Alert.alert("Wkrótce", "Codzienne wyzwania są w przygotowaniu!")} cardStyle={dynamicStyles.card} textStyle={dynamicStyles.text} iconColor={dynamicStyles.cardIconColor} disabled={false}/>
            </View>
        </View>
    );

    // Умовний рендеринг фону
    return (
        isDarkMode ? (
            <LinearGradient
                colors={['#1A237E', '#121212']} // Темно-синій до чорного
                style={styles.gradientBackground}
            >
                <SafeAreaView style={styles.safeAreaTransparent}>
                    <ScreenContent />
                </SafeAreaView>
            </LinearGradient>
        ) : (
            <ImageBackground
                source={require('../assets/background.jpg')}
                style={styles.backgroundImage}
                resizeMode="cover"
            >
                <View style={[StyleSheet.absoluteFill, dynamicStyles.backgroundOverlayLight]} />
                <SafeAreaView style={styles.safeAreaTransparent}>
                    <ScreenContent />
                </SafeAreaView>
            </ImageBackground>
        )
    );
}

// Стилі
const windowWidth = Dimensions.get('window').width;
const cardWidth = (windowWidth - PADDING.large * 2 - MARGIN.medium) / 2;

const styles = StyleSheet.create({
    backgroundImage: {
        flex: 1,
    },
    gradientBackground: {
        flex: 1,
    },
    safeAreaTransparent: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    contentContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingBottom: Platform.OS === 'ios' ? 90 : 70,
        paddingTop: Platform.OS === 'ios' ? 0 : 10,
    },
    topSection: {
        width: '100%',
        alignItems: 'center',
        paddingHorizontal: PADDING.large,
    },
    logo: {
        width: windowWidth * 0.25,
        height: windowWidth * 0.25,
        marginBottom: MARGIN.small,
        borderRadius: (windowWidth*0.25)/2
    },
    welcomeTitle: {
        fontSize: FONT_SIZES.xlarge,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: MARGIN.small / 2,
        textShadowColor: 'rgba(0, 0, 0, 0.4)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    userInfoText: {
        fontSize: FONT_SIZES.medium - 1,
        marginBottom: MARGIN.small,
        textAlign: 'center',
        opacity: 0.9,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 1,
    },
    encouragementText: {
        fontSize: FONT_SIZES.medium,
        textAlign: 'center',
        paddingHorizontal: PADDING.small,
        lineHeight: 20,
        opacity: 0.95,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 1,
    },
    gradesScrollViewContainer: {
        width: '100%',
        height: 50,
        marginVertical: MARGIN.small,
    },
    gradesContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: PADDING.medium
    },
    gradeButton: {
        paddingVertical: PADDING.small - 2,
        paddingHorizontal: PADDING.medium,
        borderRadius: 18,
        marginHorizontal: MARGIN.small / 2,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 3,
        height: 36,
        borderWidth: 0.5,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    gradeButtonText: {
        fontSize: FONT_SIZES.medium - 2,
        fontWeight: 'bold',
        textShadowColor: 'rgba(0, 0, 0, 0.2)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 1,
    },
    featuresGrid: {
        width: '100%',
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingHorizontal: PADDING.large,
        marginTop: MARGIN.small,
    },
    card: {
        width: cardWidth,
        minHeight: cardWidth * 0.8,
        borderRadius: 15,
        padding: PADDING.medium - 2,
        marginBottom: MARGIN.medium,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 5,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 0,
    },
    cardDisabled: {
        opacity: 0.7,
        elevation: 1,
    },
    cardTextDisabled: {
        opacity: 0.7,
    },
    cardTitle: {
        fontSize: FONT_SIZES.large - 4,
        fontWeight: 'bold',
        textAlign: 'center',
        marginTop: MARGIN.small / 2,
    },
    cardSubtitle: {
        fontSize: FONT_SIZES.small,
        opacity: 0.8,
        textAlign: 'center',
        marginTop: MARGIN.small / 4,
    },
});

export default MainScreen;
