// App.tsx

import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, StyleSheet, useColorScheme, Platform } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';

// --- ✅ 1. ІМПОРТУЄМО GESTURE HANDLER ---
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// --- Importujemy style ---
import { COLORS } from './src/styles/theme';

// --- Ekrany ---
import MainScreen from './src/screens/MainScreen';
import GradeSelectionScreen from './src/screens/GradeSelectionScreen';
import TopicListScreen from './src/screens/TopicListScreen';
import SubTopicListScreen from './src/screens/SubTopicListScreen';
import TestScreen from './src/screens/TestScreen';
import MultiplicationTrainerScreen from './src/screens/MultiplicationTrainerScreen';
import PlusMinusTrainerScreen from './src/screens/PlusMinusTrainerScreen';
import DivisionTrainerScreen from './src/screens/DivisionTrainerScreen';
import ResultsScreen from './src/screens/ResultsScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import UserDetailsScreen from './src/screens/UserDetailsScreen';
import TheoryGradeSelectionScreen from './src/screens/TheoryGradeSelectionScreen';
import TheoryScreen from './src/screens/TheoryScreen'; // Lista tematów teorii
import TheorySubTopicListScreen from './src/screens/TheorySubTopicListScreen';
import TheoryDetailScreen from './src/screens/TheoryDetailScreen';
import GamesScreen from './src/screens/GamesScreen'; // Ekran Gier
import FriendsScreen from './src/screens/FriendsScreen';
import DuelSetupScreen from './src/screens/DuelSetupScreen';
import StatsScreen from './src/screens/StatsScreen';
import ActivityScreen from './src/screens/ActivityScreen'; // Ekran Aktywności
import MatchstickEquationGame from './src/screens/MatchstickEquationGame';
import MoreLessTrainerScreen4 from './src/screens/MoreLessTrainerScreen4';
import StoreScreen from './src/screens/StoreScreen';

// --- Typy (без змін, як у вашому файлі) ---
export type AuthStackParamList = {
    Login: undefined;
    Register: undefined;
};
export type MainAppStackParamList = {
    Main: undefined;
    GradeSelection: undefined;
    TopicList: { grade: number };
    SubTopicList: { grade: number; topic: string };
    Test: {
        grade: number;
        topic: string;
        subTopic?: string;
        mode?: 'learn' | 'assess' | 'duel';
        testType?: 'subTopic' | 'mainTopic' | 'duel' | 'gradeRandom' | 'gradeAssessment';
        duelId?: string;
    };
    MultiplicationTrainer: { grade: number; topic: string; subTopic: string };
    PlusMinusTrainer: { grade: number; topic: string; subTopic: string };
    DivisionTrainer: { grade: number; topic: string; subTopic: string };
    MoreLessTrainer4: { grade: number; topic: string; subTopic: string };
    Results: {
        score: number;
        total: number;
        originalTestParams: MainAppStackParamList['Test'];
    };
    TheoryGradeSelection: undefined;
    TheoryTopicList: { grade: string };
    TheorySubTopicList: { grade: string; topic: string };
    TheoryDetail: { grade: string; topic: string; subTopic: string };
};
export type TheoryStackParamList = {
    TheoryGradeSelection: undefined;
    TheoryTopicList: { grade: string };
    TheorySubTopicList: { grade: string; topic: string };
    TheoryDetail: { grade: string; topic: string; subTopic: string };
};
export type GamesStackParamList = {
    GamesMain: undefined;
    MatchstickGame: undefined;
};
export type FriendsStackParamList = { Friends: undefined; DuelSetup: { friendId: string; friendEmail: string }; };
export type ProfileStackParamList = {
    ProfileMain: undefined;
    UserDetails: undefined;
    StatsScreen: undefined;
    Store: undefined;
};
export type ActivityStackParamList = { ActivityMain: undefined; };
export type AppTabParamList = {
    HomeStack: undefined;
    GamesStack: undefined;
    FriendsStack: undefined;
    ActivityStack: undefined;
    Profil: undefined;
};

// --- Nawigatory (без змін, як у вашому файлі) ---
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainStack = createNativeStackNavigator<MainAppStackParamList>();
const GamesStackNav = createNativeStackNavigator<GamesStackParamList>();
const FriendsStackNav = createNativeStackNavigator<FriendsStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();
const ActivityStackNav = createNativeStackNavigator<ActivityStackParamList>();
const Tab = createBottomTabNavigator<AppTabParamList>();

// --- Funkcje Stack Navigator (без змін, як у вашому файлі) ---
function HomeStackNavigator() {
    return (
        <MainStack.Navigator initialRouteName="Main">
            <MainStack.Screen name="Main" component={MainScreen} options={{ headerShown: false }} />
            <MainStack.Screen name="GradeSelection" component={GradeSelectionScreen} options={{ title: 'Praktyka - Wybierz klasę' }} />
            <MainStack.Screen name="TopicList" component={TopicListScreen} options={({ route }) => ({ title: `Klasa ${route.params.grade} - Działy` })} />
            <MainStack.Screen name="SubTopicList" component={SubTopicListScreen} options={({ route }) => ({ title: route.params.topic })} />
            <MainStack.Screen name="Test" component={TestScreen} options={({ route }) => ({ title: (route.params.subTopic || route.params.topic || 'Test') })} />
            <MainStack.Screen name="MultiplicationTrainer" component={MultiplicationTrainerScreen} options={({ route }) => ({ title: route.params.subTopic })} />
            <MainStack.Screen name="PlusMinusTrainer" component={PlusMinusTrainerScreen} options={({ route }) => ({ title: route.params.subTopic })} />
            <MainStack.Screen name="DivisionTrainer" component={DivisionTrainerScreen} options={({ route }) => ({ title: route.params.subTopic })} />
            <MainStack.Screen
                name="MoreLessTrainer4"
                component={MoreLessTrainerScreen4}
                options={({ route }) => ({ title: route.params.subTopic })}
            />
            <MainStack.Screen name="Results" component={ResultsScreen} options={{ title: 'Wyniki Testu' }} />
            <MainStack.Screen name="TheoryGradeSelection" component={TheoryGradeSelectionScreen} options={{ title: 'Teoria - Wybierz Klasę' }} />
            <MainStack.Screen name="TheoryTopicList" component={TheoryScreen} options={({ route }) => ({ title: `Działy (Klasa ${route.params.grade})` })} />
            <MainStack.Screen name="TheorySubTopicList" component={TheorySubTopicListScreen} options={({ route }) => ({ title: route.params.topic })} />
            <MainStack.Screen name="TheoryDetail" component={TheoryDetailScreen} options={({ route }) => ({ title: route.params.subTopic })} />
        </MainStack.Navigator>
    );
}
function GamesStackNavigator() {
    return (
        <GamesStackNav.Navigator>
            <GamesStackNav.Screen name="GamesMain" component={GamesScreen} options={{ title: 'Gry' }} />
            <GamesStackNav.Screen name="MatchstickGame" component={MatchstickEquationGame} options={{ title: 'Równania z Zapałkami' }} />
        </GamesStackNav.Navigator>
    );
}
function FriendsStackNavigator() {
    return (
        <FriendsStackNav.Navigator>
            <FriendsStackNav.Screen name="Friends" component={FriendsScreen} options={{ title: 'Znajomi' }} />
            <FriendsStackNav.Screen name="DuelSetup" component={DuelSetupScreen} options={{ title: 'Ustawienia pojedynku' }} />
        </FriendsStackNav.Navigator>
    );
}
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
function ActivityStackNavigator() {
    return (
        <ActivityStackNav.Navigator>
            <ActivityStackNav.Screen name="ActivityMain" component={ActivityScreen} options={{ title: 'Aktywność' }} />
        </ActivityStackNav.Navigator>
    );
}
function MainAppTabNavigator() {
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';
    const tabBarBackground = isDarkMode ? COLORS.cardDark : COLORS.white;
    const activeColor = isDarkMode ? COLORS.primaryDarkTheme : COLORS.primary;
    const inactiveColor = isDarkMode ? COLORS.greyDarkTheme : COLORS.grey;
    const borderTopColor = isDarkMode ? COLORS.greyDarkTheme : '#E0E0E0';
    const customTabBarStyle = {
        backgroundColor: tabBarBackground,
        borderTopColor: borderTopColor,
        borderTopWidth: StyleSheet.hairlineWidth,
        elevation: 8,
        height: Platform.OS === 'ios' ? 90 : 65,
        paddingBottom: Platform.OS === 'ios' ? 34 : 0,
    };
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
                tabBarStyle: customTabBarStyle,
                tabBarLabelStyle: {
                    fontWeight: '500',
                    fontSize: 11,
                    paddingBottom: Platform.OS === 'ios' ? 0 : 5,
                }
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
function AuthNavigator() {
    return (
        <AuthStack.Navigator>
            <AuthStack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <AuthStack.Screen name="Register" component={RegisterScreen} options={{ title: 'Rejestracja' }} />
        </AuthStack.Navigator>
    );
}

// --- App() (ОНОВЛЕНО) ---
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
        // --- ✅ 2. ОГОРТАЄМО УСЕ В GESTUREHANDLER ---
        // (та додаємо flex: 1)
        <GestureHandlerRootView style={{ flex: 1 }}>
            <NavigationContainer>
                {user ? <MainAppTabNavigator /> : <AuthNavigator />}
            </NavigationContainer>
            <Toast />
        </GestureHandlerRootView>
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
