import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import auth from '@react-native-firebase/auth';
import Ionicons from '@expo/vector-icons/Ionicons'; // Імпорт для іконок

// Типи для навігації
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainAppStackParamList } from '../../App'; // Припускаємо, що типи для цього стеку в App.tsx
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { AppTabParamList } from '../../App'; // Типи для табів

// Поєднуємо типи навігації
// Navigation prop for MainScreen, which is part of HomeStackNavigator (a NativeStack)
// and can also navigate to other tabs (part of AppTabParamList)
type MainScreenNavigationProp = NativeStackScreenProps<MainAppStackParamList, 'Main'>['navigation'] &
    BottomTabNavigationProp<AppTabParamList>;

type MainScreenProps = {
    navigation: MainScreenNavigationProp;
};

function MainScreen({ navigation }: MainScreenProps) {
    const handleStartAdventure = () => {
        navigation.navigate('GradeSelection');
    };

    const handleExploreTheory = () => {
        // Переходимо на стек Теорії, і на його початковий екран (вибір класу)
        navigation.navigate('TeoriaStack', { screen: 'TheoryGradeSelection' });
    };

    const currentUser = auth().currentUser;

    return (
        <ScrollView contentContainerStyle={styles.scrollViewContainer}>
            <View style={styles.container}>
                <Image
                    source={require('../assets/images/logo.png')} // Переконайся, що шлях правильний
                    style={styles.logo}
                    resizeMode="contain"
                />

                <Text style={styles.welcomeTitle}>Witaj w MathFun!</Text>
                {currentUser && (
                    <Text style={styles.userInfoText}>
                        Gotowy na nową przygodę, {currentUser.email}?
                    </Text>
                )}
                <Text style={styles.encouragementText}>
                    Matematyka może być super zabawą! Rozwiązuj zadania, ucz się nowych rzeczy i zostań mistrzem liczb!
                </Text>

                <View style={styles.actionCardsContainer}>
                    <TouchableOpacity style={[styles.actionCard, styles.adventureCard]} onPress={handleStartAdventure}>
                        <Ionicons name="game-controller-outline" size={48} color="#FFFFFF" style={styles.cardIcon}/>
                        <Text style={styles.cardTitle}>Rozpocznij Przygodę!</Text>
                        <Text style={styles.cardSubtitle}>Testy i zadania</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.actionCard, styles.theoryCard]} onPress={handleExploreTheory}>
                        <Ionicons name="book-outline" size={48} color="#FFFFFF" style={styles.cardIcon}/>
                        <Text style={styles.cardTitle}>Odkrywaj Teorię</Text>
                        <Text style={styles.cardSubtitle}>Zasady i wyjaśnienia</Text>
                    </TouchableOpacity>
                </View>
                {/* Кнопку Wyloguj się прибрали, бо вона є на вкладці Profil */}
            </View>
        </ScrollView>
    );
}

const windowWidth = Dimensions.get('window').width;

const styles = StyleSheet.create({
    scrollViewContainer: {
        flexGrow: 1,
    },
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        paddingTop: 30, // Зменшив трохи верхній відступ, якщо лого велике
        paddingBottom: 30,
        backgroundColor: '#E0F7FA', // Світло-бірюзовий фон
    },
    logo: {
        width: windowWidth * 0.45, // Зробив лого трохи меншим
        height: windowWidth * 0.45,
        marginBottom: 15,
    },
    welcomeTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#00796B',
        textAlign: 'center',
        marginBottom: 8,
    },
    userInfoText: {
        fontSize: 15, // Трохи менший
        color: '#004D40',
        marginBottom: 15,
        textAlign: 'center',
    },
    encouragementText: {
        fontSize: 16, // Трохи менший
        color: '#37474F',
        textAlign: 'center',
        marginBottom: 25,
        paddingHorizontal: 10,
        lineHeight: 22,
    },
    actionCardsContainer: {
        width: '95%', // Трохи ширше
    },
    actionCard: {
        paddingVertical: 25, // Більший вертикальний padding
        paddingHorizontal: 20,
        borderRadius: 18, // Більш округлі кути
        marginBottom: 18,
        alignItems: 'center',
        elevation: 4, // Трохи більша тінь
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.23,
        shadowRadius: 2.62,
    },
    adventureCard: {
        backgroundColor: '#FFC107', // Жовтий/Золотий
    },
    theoryCard: {
        backgroundColor: '#4CAF50', // Зелений
    },
    cardIcon: {
        marginBottom: 10,
    },
    cardTitle: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: 'bold',
    },
    cardSubtitle: {
        color: '#F5F5F5',
        fontSize: 14,
        marginTop: 5,
    }
});

export default MainScreen;
