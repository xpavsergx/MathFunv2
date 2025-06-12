// src/screens/MainScreen.tsx

import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import auth from '@react-native-firebase/auth';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp } from '@react-navigation/native';
import { MainAppStackParamList, AppTabParamList } from '@/App';

type MainScreenNavigationProp = CompositeNavigationProp<
    BottomTabNavigationProp<AppTabParamList, 'HomeStack'>,
    NativeStackScreenProps<MainAppStackParamList>['navigation']
>;

type MainScreenProps = {
    navigation: MainScreenNavigationProp;
};

function MainScreen({ navigation }: MainScreenProps) {
    const handleStartAdventure = () => {
        navigation.navigate('GradeSelection');
    };

    const handleExploreTheory = () => {
        navigation.navigate('TeoriaStack', { screen: 'TheoryGradeSelection' });
    };

    const currentUser = auth().currentUser;

    return (
        <ScrollView contentContainerStyle={styles.scrollViewContainer}>
            <View style={styles.container}>
                <Image
                    source={require('../assets/images/logo.png')}
                    style={styles.logo}
                    resizeMode="contain"
                />

                <Text style={styles.welcomeTitle}>Witaj w MathFun!</Text>
                {currentUser && (
                    <Text style={styles.userInfoText}>
                        Gotowy na nową przygodę, {currentUser.displayName || currentUser.email}?
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
        paddingTop: 30,
        paddingBottom: 30,
        backgroundColor: '#E0F7FA',
    },
    logo: {
        width: windowWidth * 0.45,
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
        fontSize: 15,
        color: '#004D40',
        marginBottom: 15,
        textAlign: 'center',
    },
    encouragementText: {
        fontSize: 16,
        color: '#37474F',
        textAlign: 'center',
        marginBottom: 25,
        paddingHorizontal: 10,
        lineHeight: 22,
    },
    actionCardsContainer: {
        width: '95%',
    },
    actionCard: {
        paddingVertical: 25,
        paddingHorizontal: 20,
        borderRadius: 18,
        marginBottom: 18,
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.23,
        shadowRadius: 2.62,
    },
    adventureCard: {
        backgroundColor: '#FFC107',
    },
    theoryCard: {
        backgroundColor: '#4CAF50',
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
        textAlign: 'center',
        paddingHorizontal: 10,
    }
});

export default MainScreen;
