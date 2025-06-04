import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, StyleSheet, Text } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

// Firebase
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';

// Імпортуємо компоненти екранів
import MainScreen from './src/screens/MainScreen';
import GradeSelectionScreen from './src/screens/GradeSelectionScreen';
import TopicListScreen from './src/screens/TopicListScreen';
import SubTopicListScreen from './src/screens/SubTopicListScreen';
import TestScreen from './src/screens/TestScreen';
import ResultsScreen from './src/screens/ResultsScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ProfileScreen from './src/screens/ProfileScreen';

import TheoryGradeSelectionScreen from './src/screens/TheoryGradeSelectionScreen';
import TheoryScreen from './src/screens/TheoryScreen'; // Це TheoryTopicList
import TheorySubTopicListScreen from './src/screens/TheorySubTopicListScreen';
import TheoryDetailScreen from './src/screens/TheoryDetailScreen'; // <--- РОЗКОМЕНТОВАНО


/**
 * Типи для Stack Navigator (аутентифікація)
 */
export type AuthStackParamList = {
    Login: undefined;
    Register: undefined;
};

/**
 * Типи для Stack Navigator (основний потік в додатку всередині вкладки "Główna")
 */
export type MainAppStackParamList = {
    Main: undefined;
    GradeSelection: undefined;
    TopicList: { grade: number };
    SubTopicList: { grade: number; topic: string };
    Test: {
        grade: number;
        topic: string;
        subTopic?: string;
        mode?: 'learn' | 'assess';
        testType?: 'subTopic' | 'mainTopic' | 'gradeRandom' | 'gradeAssessment';
    };
    Results: {
        score: number;
        total: number;
        originalTestParams: MainAppStackParamList['Test'];
    };
};

/**
 * Типи для Stack Navigator всередині вкладки "Teoria"
 */
export type TheoryStackParamList = {
    TheoryGradeSelection: undefined;
    TheoryTopicList: { grade: string };
    TheorySubTopicList: { grade: string; topic: string };
    TheoryDetail: { grade: string; topic: string; subTopic: string };
};

/**
 * Типи для Bottom Tab Navigator
 */
export type AppTabParamList = {
    HomeStack: MainAppStackParamList;
    TeoriaStack: TheoryStackParamList;
    Profil: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainStack = createNativeStackNavigator<MainAppStackParamList>();
const TheoryStackNav = createNativeStackNavigator<TheoryStackParamList>();
const Tab = createBottomTabNavigator<AppTabParamList>();

// Стек для вкладки "Główna"
function HomeStackNavigator() {
    return (
        <MainStack.Navigator initialRouteName="Main">
            <MainStack.Screen name="Main" component={MainScreen} options={{ headerShown: false }} />
            <MainStack.Screen name="GradeSelection" component={GradeSelectionScreen} options={{ title: 'Wybierz klasę' }} />
            <MainStack.Screen name="TopicList" component={TopicListScreen} options={({ route }) => ({ title: `Klasa ${route.params.grade} - Tematy` })} />
            <MainStack.Screen name="SubTopicList" component={SubTopicListScreen} options={({ route }) => ({ title: route.params.topic })} />
            <MainStack.Screen name="Test" component={TestScreen} options={({ route }) => ({
                title: (route.params.testType === 'mainTopic'
                    ? `Test: ${route.params.topic}`
                    : route.params.subTopic) || 'Test'
            })}
            />
            <MainStack.Screen name="Results" component={ResultsScreen} options={{ title: 'Wyniki Testu' }} />
        </MainStack.Navigator>
    );
}

// TheoryStackNavigator тепер включає всі екрани стеку теорії
function TheoryStackNavigator() {
    console.log("Rendering TheoryStackNavigator with ALL screens");
    return (
        <TheoryStackNav.Navigator initialRouteName="TheoryGradeSelection">
            <TheoryStackNav.Screen
                name="TheoryGradeSelection"
                component={TheoryGradeSelectionScreen}
                options={{ title: 'Teoria - Wybierz Klasę' }}
            />
            <TheoryStackNav.Screen
                name="TheoryTopicList"
                component={TheoryScreen} // Твій файл src/screens/TheoryScreen.tsx (список розділів)
                options={({ route }) => ({ title: `Działy (Klasa ${route.params.grade})` })}
            />
            <TheoryStackNav.Screen
                name="TheorySubTopicList"
                component={TheorySubTopicListScreen} // Твій файл src/screens/TheorySubTopicListScreen.tsx
                options={({ route }) => ({ title: route.params.topic })}
            />
            <TheoryStackNav.Screen // <--- РОЗКОМЕНТОВАНО
                name="TheoryDetail"
                component={TheoryDetailScreen} // Твій файл src/screens/TheoryDetailScreen.tsx
                options={({ route }) => ({ title: route.params.subTopic })}
            />
        </TheoryStackNav.Navigator>
    );
}

// Головний навігатор з вкладками (для залогіненого користувача)
function MainAppTabNavigator() {
    console.log("Rendering MainAppTabNavigator");
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName: keyof typeof Ionicons.glyphMap = 'help-circle';

                    if (route.name === 'HomeStack') {
                        iconName = focused ? 'home' : 'home-outline';
                    } else if (route.name === 'TeoriaStack') {
                        iconName = focused ? 'book' : 'book-outline';
                    } else if (route.name === 'Profil') {
                        iconName = focused ? 'person-circle' : 'person-circle-outline';
                    }
                    return <Ionicons name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: '#00BCD4',
                tabBarInactiveTintColor: 'gray',
                headerShown: false,
            })}
        >
            <Tab.Screen
                name="HomeStack"
                component={HomeStackNavigator}
                options={{ title: 'Główna' }}
            />
            <Tab.Screen
                name="TeoriaStack"
                component={TheoryStackNavigator}
                options={{ title: 'Teoria' }}
            />
            <Tab.Screen
                name="Profil"
                component={ProfileScreen}
                options={{ title: 'Profil', headerShown: true }}
            />
        </Tab.Navigator>
    );
}

// Навігатор для аутентифікації
function AuthNavigator() {
    console.log("Rendering AuthNavigator");
    return (
        <AuthStack.Navigator>
            <AuthStack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <AuthStack.Screen name="Register" component={RegisterScreen} options={{ title: 'Rejestracja' }} />
        </AuthStack.Navigator>
    );
}

function App(): React.JSX.Element {
    const [initializing, setInitializing] = useState(true);
    const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);

    function onAuthStateChanged(userAuth: FirebaseAuthTypes.User | null) {
        console.log('[AUTH STATE CHANGED] User:', userAuth ? userAuth.uid : null);
        setUser(userAuth);
        if (initializing) {
            setInitializing(false);
        }
    }

    useEffect(() => {
        const subscriber = auth().onAuthStateChanged(onAuthStateChanged);
        return subscriber;
    }, []);

    if (initializing) {
        console.log('[APP RENDERING] Status: Initializing');
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007bff" />
            </View>
        );
    }

    console.log('[APP RENDERING] Status: Initialized. User:', user ? user.uid : null);

    return (
        <NavigationContainer>
            {user ? <MainAppTabNavigator /> : <AuthNavigator />}
        </NavigationContainer>
    );
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
});

export default App;
