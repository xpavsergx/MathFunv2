import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, StyleSheet, useColorScheme, Platform } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { COLORS } from './src/styles/theme';

// --- Типы ---
import {
    AuthStackParamList,
    MainAppStackParamList,
    GamesStackParamList,
    FriendsStackParamList,
    ProfileStackParamList,
    ActivityStackParamList,
    AppTabParamList,
} from './src/navigation/types';

// --- Экраны ---
import MainScreen from './src/screens/MainScreen';
import GradeSelectionScreen from './src/screens/GradeSelectionScreen';
import TopicListScreen from './src/screens/TopicListScreen';
import SubTopicListScreen from './src/screens/SubTopicListScreen';
import TestScreen from './src/screens/TestScreen';
import MultiplicationTrainerScreen from './src/screens/MultiplicationTrainerScreen';
import PlusMinusTrainerScreen from './src/screens/PlusMinusTrainerScreen';
import DivisionTrainerScreen from './src/screens/DivisionTrainerScreen';
import MoreLessTrainerScreen4 from './src/screens/MoreLessTrainerScreen4';
import HowManyTimesTrainerScreen4 from './src/screens/HowManyTimesTrainerScreen4';
import DivisionWithRemainderScreen4 from './src/screens/DivisionWithRemainderScreen4';
import SquaresCubesTrainerScreen4 from './src/screens/SquaresCubesTrainerScreen4';
import OrderOperationsTrainerScreen4 from './src/screens/OrderOperationsTrainerScreen4';

// 🔥 ЗАДАЧИ ТЕКСТОВЫЕ
import WordProblemsLevel1Screen4 from './src/screens/WordProblemsLevel1Screen4';
import WordProblemsLevel2Screen4 from './src/screens/WordProblemsLevel2Screen4';

// 🔥 НОВЫЙ ТРЕНАЖЕР ОСИ ЛИЧБОВОЙ
import NumberLineTrainerScreen4 from './src/screens/NumberLineTrainerScreen4'; // ✅ DODANO

import ResultsScreen from './src/screens/ResultsScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import UserDetailsScreen from './src/screens/UserDetailsScreen';
import TheoryGradeSelectionScreen from './src/screens/TheoryGradeSelectionScreen';
import TheoryScreen from './src/screens/TheoryScreen';
import TheorySubTopicListScreen from './src/screens/TheorySubTopicListScreen';
import TheoryDetailScreen from './src/screens/TheoryDetailScreen';

import GamesScreen from './src/screens/GamesScreen';
import FriendsScreen from './src/screens/FriendsScreen';
import DuelSetupScreen from './src/screens/DuelSetupScreen';
import StatsScreen from './src/screens/StatsScreen';
import ActivityScreen from './src/screens/ActivityScreen';
import MatchstickEquationGame from './src/screens/MatchstickEquationGame';
import SpeedyCountGame from './src/screens/SpeedyCountGame';
import MathSprintScreen from './src/screens/MathSprintScreen';
import StoreScreen from './src/screens/StoreScreen';
import DuelResultScreen from './src/screens/DuelResultScreen';

// --- Навигация ---
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainStack = createNativeStackNavigator<MainAppStackParamList>();
const GamesStackNav = createNativeStackNavigator<GamesStackParamList>();
const FriendsStackNav = createNativeStackNavigator<FriendsStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();
const ActivityStackNav = createNativeStackNavigator<ActivityStackParamList>();
const Tab = createBottomTabNavigator<AppTabParamList>();

// ======================
//     HOME STACK
// ======================
function HomeStackNavigator() {
    return (
        <MainStack.Navigator initialRouteName="Main">
            <MainStack.Screen name="Main" component={MainScreen} options={{ headerShown: false }} />

            {/* Практика */}
            <MainStack.Screen name="GradeSelection" component={GradeSelectionScreen} options={{ title: 'Praktyka - Wybierz klasę' }} />
            <MainStack.Screen name="TopicList" component={TopicListScreen} options={({ route }) => ({ title: `Klasa ${route.params.grade} - Działy` })} />
            <MainStack.Screen name="SubTopicList" component={SubTopicListScreen} options={({ route }) => ({ title: route.params.topic })} />
            <MainStack.Screen name="Test" component={TestScreen} options={({ route }) => ({ title: route.params.subTopic })} />

            {/* Тренажеры */}
            <MainStack.Screen name="MultiplicationTrainer" component={MultiplicationTrainerScreen} options={({ route }) => ({ title: route.params.subTopic })} />
            <MainStack.Screen name="PlusMinusTrainer" component={PlusMinusTrainerScreen} options={({ route }) => ({ title: route.params.subTopic })} />
            <MainStack.Screen name="DivisionTrainer" component={DivisionTrainerScreen} options={({ route }) => ({ title: route.params.subTopic })} />
            <MainStack.Screen name="MoreLessTrainer4" component={MoreLessTrainerScreen4} options={({ route }) => ({ title: route.params.subTopic })} />
            <MainStack.Screen name="HowManyTimesTrainerScreen4" component={HowManyTimesTrainerScreen4} options={({ route }) => ({ title: route.params.subTopic })} />
            <MainStack.Screen name="DivisionWithRemainderScreen4" component={DivisionWithRemainderScreen4} options={({ route }) => ({ title: route.params.subTopic })} />
            <MainStack.Screen name="SquaresCubesTrainerScreen4" component={SquaresCubesTrainerScreen4} options={({ route }) => ({ title: route.params.subTopic })} />
            <MainStack.Screen name="OrderOperationsTrainerScreen4" component={OrderOperationsTrainerScreen4} options={({ route }) => ({ title: route.params?.subTopic || 'Trener' })} />

            {/* EKRANY ZADAŃ TEKSTOWYCH */}
            <MainStack.Screen name="WordProblemsLevel1Screen4" component={WordProblemsLevel1Screen4} options={({ route }) => ({ title: route.params?.subTopic || 'Zadania tekstowe' })} />
            <MainStack.Screen name="WordProblemsLevel2Screen4" component={WordProblemsLevel2Screen4} options={({ route }) => ({ title: route.params?.subTopic || 'Zadania tekstowe (Poz. 2)' })} />

            {/* ✅ NOWY EKRAN OSI LICZBOWEJ 👇 */}
            <MainStack.Screen name="NumberLineTrainerScreen4" component={NumberLineTrainerScreen4} options={({ route }) => ({ title: route.params?.subTopic || 'Oś liczbowa' })} />

            {/* Остальное */}
            <MainStack.Screen name="Results" component={ResultsScreen} options={{ title: 'Wyniki Testu' }} />
            <MainStack.Screen name="DuelResult" component={DuelResultScreen} options={{ title: 'Wynik Pojedynku', headerShown: false }} />

            {/* Теория */}
            <MainStack.Screen name="TheoryGradeSelection" component={TheoryGradeSelectionScreen} options={{ title: 'Teoria - Wybierz Klasę' }} />
            <MainStack.Screen name="TheoryTopicList" component={TheoryScreen} options={({ route }) => ({ title: `Działy (Klasa ${route.params.grade})` })} />
            <MainStack.Screen name="TheorySubTopicList" component={TheorySubTopicListScreen} options={({ route }) => ({ title: route.params.topic })} />
            <MainStack.Screen name="TheoryDetail" component={TheoryDetailScreen} options={({ route }) => ({ title: route.params.subTopic })} />
        </MainStack.Navigator>
    );
}

// ======================
//     GAMES STACK
// ======================
function GamesStackNavigator() {
    return (
        <GamesStackNav.Navigator>
            <GamesStackNav.Screen name="GamesMain" component={GamesScreen} options={{ title: 'Gry' }} />
            <GamesStackNav.Screen name="MatchstickGame" component={MatchstickEquationGame} options={{ title: 'Równania z Zapałkami' }} />
            <GamesStackNav.Screen name="SpeedyCountGame" component={SpeedyCountGame} options={{ title: 'Szybkie Liczenie', headerShown: false }} />
            <GamesStackNav.Screen name="MathSprintGame" component={MathSprintScreen} options={{ title: 'Math Sprint', headerShown: false }} />
        </GamesStackNav.Navigator>
    );
}

// ======================
//     FRIENDS
// ======================
function FriendsStackNavigator() {
    return (
        <FriendsStackNav.Navigator>
            <FriendsStackNav.Screen name="Friends" component={FriendsScreen} options={{ title: 'Znajomi' }} />
            <FriendsStackNav.Screen name="DuelSetup" component={DuelSetupScreen} options={{ title: 'Ustawienia pojedynku' }} />
        </FriendsStackNav.Navigator>
    );
}

// ======================
//     PROFILE
// ======================
function ProfileStackNavigator() {
    return (
        <ProfileStack.Navigator>
            <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} options={{ title: 'Profil', headerShown: false }} />
            <ProfileStack.Screen name="UserDetails" component={UserDetailsScreen} options={{ title: 'Dane użytkownika' }} />
            <ProfileStack.Screen name="StatsScreen" component={StatsScreen} options={{ title: 'Moje Statystyki' }} />
            <ProfileStack.Screen name="Store" component={StoreScreen} options={{ title: 'Sklep' }} />
        </ProfileStack.Navigator>
    );
}

// ======================
//     ACTIVITY
// ======================
function ActivityStackNavigator() {
    return (
        <ActivityStackNav.Navigator>
            <ActivityStackNav.Screen name="ActivityMain" component={ActivityScreen} options={{ title: 'Aktywność' }} />
        </ActivityStackNav.Navigator>
    );
}

// ======================
//     TAB NAVIGATION
// ======================
function MainAppTabNavigator() {
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';

    const tabBarBackground = isDarkMode ? COLORS.cardDark : COLORS.white;
    const activeColor = isDarkMode ? COLORS.primaryDarkTheme : COLORS.primary;
    const inactiveColor = isDarkMode ? COLORS.greyDarkTheme : COLORS.grey;

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName: keyof typeof Ionicons.glyphMap = 'help-circle';

                    if (route.name === 'HomeStack') iconName = focused ? 'home' : 'home-outline';
                    else if (route.name === 'GamesStack') iconName = focused ? 'game-controller' : 'game-controller-outline';
                    else if (route.name === 'FriendsStack') iconName = focused ? 'people' : 'people-outline';
                    else if (route.name === 'ActivityStack') iconName = focused ? 'notifications' : 'notifications-outline';
                    else if (route.name === 'Profil') iconName = focused ? 'person-circle' : 'person-circle-outline';

                    return <Ionicons name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: activeColor,
                tabBarInactiveTintColor: inactiveColor,
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: tabBarBackground,
                    borderTopColor: isDarkMode ? COLORS.greyDarkTheme : '#E0E0E0',
                    borderTopWidth: StyleSheet.hairlineWidth,
                    elevation: 10,
                    height: Platform.OS === 'ios' ? 90 : 65,
                    paddingBottom: Platform.OS === 'ios' ? 30 : 5,
                },
                tabBarLabelStyle: {
                    fontWeight: '500',
                    fontSize: 11,
                },
            })}
        >
            <Tab.Screen name="HomeStack" component={HomeStackNavigator} options={{ title: 'Główna' }} />
            <Tab.Screen name="GamesStack" component={GamesStackNavigator} options={{ title: 'Gry' }} />
            <Tab.Screen name="FriendsStack" component={FriendsStackNavigator} options={{ title: 'Znajomi' }} />
            <Tab.Screen name="ActivityStack" component={ActivityStackNavigator} options={{ title: 'Aktywność' }} />
            <Tab.Screen name="Profil" component={ProfileStackNavigator} options={{ title: 'Profil' }} />
        </Tab.Navigator>
    );
}

// ======================
//       AUTH
// ======================
function AuthNavigator() {
    return (
        <AuthStack.Navigator>
            <AuthStack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <AuthStack.Screen name="Register" component={RegisterScreen} options={{ title: 'Rejestracja' }} />
        </AuthStack.Navigator>
    );
}

// ======================
//        APP ROOT
// ======================
function App(): React.JSX.Element {
    const [initializing, setInitializing] = useState(true);
    const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);

    function onAuthStateChanged(userAuth: FirebaseAuthTypes.User | null) {
        setUser(userAuth);
        if (initializing) setInitializing(false);
    }

    useEffect(() => {
        const subscriber = auth().onAuthStateChanged(onAuthStateChanged);
        return subscriber;
    }, []);

    if (initializing) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <NavigationContainer>
                {user ? <MainAppTabNavigator /> : <AuthNavigator />}
            </NavigationContainer>

            <Toast />
        </GestureHandlerRootView>
    );
}

// ======================
//      STYLES
// ======================
const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
});

export default App;