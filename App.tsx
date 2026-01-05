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

// --- Typy ---
import {
    AuthStackParamList,
    MainAppStackParamList,
    GamesStackParamList,
    FriendsStackParamList,
    ProfileStackParamList,
    ActivityStackParamList,
    AppTabParamList,
} from './src/navigation/types';

// --- Ekrany: Główne ---
import MainScreen from './src/screens/MainScreen';
import GradeSelectionScreen from './src/screens/GradeSelectionScreen';
import TopicListScreen from './src/screens/TopicListScreen';
import SubTopicListScreen from './src/screens/SubTopicListScreen';
import TestScreen from './src/screens/TestScreen';
import PracticeScreen from './src/screens/PracticeScreen';

// --- Ekrany: Trenerzy ---

// ❗ Upewnij się, że pliki istnieją w podanych ścieżkach

import CombinedDecompositionTrainer from './src/screens/screens_4_klassa/screens_4K1R/MultiplicationDivisionTrainerScreen';
import MultiplicationTrainerScreen from './src/screens/screens_4_klassa/screens_4K1R/MultiplicationDivisionTrainerScreen';
import PlusMinusTrainerScreen from './src/screens/screens_4_klassa/screens_4K1R/PlusMinusTrainerScreen';

import MoreLessTrainerScreen4 from './src/screens/screens_4_klassa/screens_4K1R/MoreLessTrainerScreen4';
import HowManyTimesTrainerScreen4 from './src/screens/screens_4_klassa/screens_4K1R/HowManyTimesTrainerScreen4';
import DivisionWithRemainderScreen4 from './src/screens/screens_4_klassa/screens_4K1R/DivisionWithRemainderScreen4';
import SquaresCubesTrainerScreen4 from './src/screens/screens_4_klassa/screens_4K1R/SquaresCubesTrainerScreen4';
import OrderOperationsTrainerScreen4 from './src/screens/screens_4_klassa/screens_4K1R/OrderOperationsTrainerScreen4';

// 🔥 SYSTEM DZIESIĄTKOWY
import DecimalSystemTrainer from './src/screens/screens_4_klassa/screens_4K2R/DecimalSystemTrainer';

// 🔥 PORÓWNYWANIE LICZB (NOWY - ścieżka 4K2R zgodnie z twoim info)
import ComparingNumbersTrainer from './src/screens/screens_4_klassa/screens_4K2R/ComparingNumbersTrainer';

// 🔥 ZADANIA TEKSTOWE
import WordProblemsLevel1Screen4 from './src/screens/screens_4_klassa/screens_4K1R/WordProblemsLevel1Screen4';
import WordProblemsLevel2Screen4 from './src/screens/screens_4_klassa/screens_4K1R/WordProblemsLevel2Screen4';

// 🔥 OŚ LICZBOWA
import NumberLineTrainerScreen4 from './src/screens/screens_4_klassa/screens_4K1R/NumberLineTrainerScreen4';
import MentalMathLargeNumbers from './src/screens/screens_4_klassa/screens_4K2R/MentalMathLargeNumbers';
import LengthUnitsTrainer from './src/screens/screens_4_klassa/screens_4K2R/LengthUnitsTrainer';
import MonetaryUnitsTrainer from './src/screens/screens_4_klassa/screens_4K2R/MonetaryUnitsTrainer';
import MassUnitsTrainer from './src/screens/screens_4_klassa/screens_4K2R/MassUnitsTrainer';
import RomanNumeralsTrainer from './src/screens/screens_4_klassa/screens_4K2R/RomanNumeralsTrainer';
import CalendarTrainer from './src/screens/screens_4_klassa/screens_4K2R/CalendarTrainer';
import ClockTrainer from './src/screens/screens_4_klassa/screens_4K2R/ClockTrainer';
import WrittenAdditionTrainer from "./src/screens/screens_4_klassa/screens_4K3R/WrittenAdditionTrainer";
import WrittenSubtractionTrainer from "./src/screens/screens_4_klassa/screens_4K3R/WrittenSubtractionTrainer";
// --- Ekrany: Pozostałe ---
import ResultsScreen from './src/screens/ResultsScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import UserDetailsScreen from './src/screens/UserDetailsScreen';
import TheoryGradeSelectionScreen from './src/screens/TheoryGradeSelectionScreen';
import TheoryScreen from './src/screens/TheoryScreen';
import TheorySubTopicListScreen from './src/screens/TheorySubTopicListScreen';
import TheoryDetailScreen from './src/screens/TheoryDetailScreen';

// --- Ekrany: Gry ---
import GamesScreen from './src/screens/GamesScreen';
import MatchstickEquationGame from './src/screens/MatchstickEquationGame';
import SpeedyCountGame from './src/screens/SpeedyCountGame';
import MathSprintScreen from './src/screens/MathSprintScreen';
import SequenceGame from './src/screens/SequenceGame';
import NumberMemoryGame from './src/screens/NumberMemoryGame';
import GreaterLesserGame from './src/screens/GreaterLesserGame';

// --- Ekrany: Znajomi i Aktywność ---
import FriendsScreen from './src/screens/FriendsScreen';
import DuelSetupScreen from './src/screens/DuelSetupScreen';
import DuelResultScreen from './src/screens/DuelResultScreen';
import StatsScreen from './src/screens/StatsScreen';
import ActivityScreen from './src/screens/ActivityScreen';
import StoreScreen from './src/screens/StoreScreen';
import WrittenMultiplicationTrainer from "./src/screens/screens_4_klassa/screens_4K3R/WrittenMultiplicationTrainer";
import WrittenMultiplicationWithZerosTrainer from "./src/screens/screens_4_klassa/screens_4K3R/WrittenMultiplicationWithZerosTrainer";
import WrittenMultiDigitMultiplicationTrainer
    from "./src/screens/screens_4_klassa/screens_4K3R/WrittenMultiDigitMultiplicationTrainer";
import WrittenDivisionTrainer from "./src/screens/screens_4_klassa/screens_4K3R/WrittenDivisionTrainer";
import WordProblemsTrainer from "./src/screens/screens_4_klassa/screens_4K3R/WordProblemsTrainer";





// --- Nawigacja ---
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

            {/* Praktyka */}
            <MainStack.Screen name="GradeSelection" component={GradeSelectionScreen} options={{ title: 'Praktyka - Wybierz klasę' }} />
            <MainStack.Screen name="TopicList" component={TopicListScreen} options={({ route }) => ({ title: `Klasa ${route.params.grade} - Działy` })} />
            <MainStack.Screen name="SubTopicList" component={SubTopicListScreen} options={({ route }) => ({ title: route.params.topic })} />
            <MainStack.Screen name="Test" component={TestScreen} options={({ route }) => ({ title: route.params.subTopic })} />

            {/* Nowy ekran praktyki */}
            <MainStack.Screen name="Practice" component={PracticeScreen} options={{ title: 'Trening' }} />

            {/* --- TRENERZY --- */}

            <MainStack.Screen
                name="CombinedDecompositionTrainer"
                component={CombinedDecompositionTrainer}
                options={({ route }) => ({ title: route.params?.subTopic || 'Trener' })}
            />

            <MainStack.Screen
                name="MultiplicationTrainer"
                component={MultiplicationTrainerScreen}
                options={({ route }) => ({ title: route.params?.subTopic || 'Mnożenie i Dzielenie' })}
            />


            <MainStack.Screen name="PlusMinusTrainer" component={PlusMinusTrainerScreen} options={({ route }) => ({ title: route.params?.subTopic })} />
            <MainStack.Screen name="MoreLessTrainer4" component={MoreLessTrainerScreen4} options={({ route }) => ({ title: route.params?.subTopic })} />
            <MainStack.Screen name="HowManyTimesTrainerScreen4" component={HowManyTimesTrainerScreen4} options={({ route }) => ({ title: route.params?.subTopic })} />
            <MainStack.Screen name="DivisionWithRemainderScreen4" component={DivisionWithRemainderScreen4} options={({ route }) => ({ title: route.params?.subTopic })} />
            <MainStack.Screen name="SquaresCubesTrainerScreen4" component={SquaresCubesTrainerScreen4} options={({ route }) => ({ title: route.params?.subTopic })} />
            <MainStack.Screen name="OrderOperationsTrainerScreen4" component={OrderOperationsTrainerScreen4} options={({ route }) => ({ title: route.params?.subTopic || 'Kolejność działań' })} />

            {/* 🔥 SYSTEM DZIESIĄTKOWY */}
            <MainStack.Screen
                name="DecimalSystemTrainer"
                component={DecimalSystemTrainer}
                options={({ route }) => ({ title: route.params?.subTopic || 'System dziesiątkowy' })}
            />

            {/* 🔥 PORÓWNYWANIE LICZB (DODANE TUTAJ) */}
            <MainStack.Screen
                name="ComparingNumbersTrainer"
                component={ComparingNumbersTrainer}
                options={({ route }) => ({ title: route.params?.subTopic || 'Porównywanie liczb' })}
            />
            <MainStack.Screen
                name="MentalMathLargeNumbers"
                component={MentalMathLargeNumbers}
                options={({ route }) => ({ title: route.params?.subTopic || 'Rachunki pamięciowe na dużych liczbach' })}
            />
            <MainStack.Screen
                name="MonetaryUnitsTrainer"
                component={MonetaryUnitsTrainer}
                options={({ route }) => ({ title: route.params?.subTopic || 'Jednostki monetarne - złote i grosze' })}
            />
            <MainStack.Screen
                name="LengthUnitsTrainer"
                component={LengthUnitsTrainer}
                options={({ route }) => ({ title: route.params?.subTopic || 'Jednostki długości' })}
            />
            <MainStack.Screen
                name="MassUnitsTrainer"
                component={MassUnitsTrainer}
                options={({ route }) => ({ title: route.params?.subTopic || 'Jednostki masy' })}
            />
            <MainStack.Screen
                name="RomanNumeralsTrainer"
                component={RomanNumeralsTrainer}
                options={({ route }) => ({ title: route.params?.subTopic || 'System rzymski' })}
            />
            <MainStack.Screen
                name="CalendarTrainer"
                component={CalendarTrainer}
                options={({ route }) => ({ title: route.params?.subTopic || 'Z kalendarzem za pan brat' })}
            />
            <MainStack.Screen
                name="ClockTrainer"
                component={ ClockTrainer}
                options={({ route }) => ({ title: route.params?.subTopic || 'Godziny na zegarach' })}
            />
            <MainStack.Screen
                name="WrittenAdditionTrainer"
                component={WrittenAdditionTrainer}
                options={({ route }) => ({ title: route.params?.subTopic || 'Dodawanie pisemne' })}
            />
            <MainStack.Screen
                name="WrittenSubtractionTrainer"
                component={ WrittenSubtractionTrainer}
                options={({ route }) => ({ title: route.params?.subTopic || 'Odejmowanie pisemne' })}
            />
            <MainStack.Screen
                name="WrittenMultiplicationTrainer"
                component={WrittenMultiplicationTrainer}
                options={({ route }) => ({ title: route.params?.subTopic || 'Mnożenie pisemne przez liczby jednocyfrowe' })}
            />
            <MainStack.Screen
                name="WrittenMultiplicationWithZerosTrainer"
                component={WrittenMultiplicationWithZerosTrainer}
                options={({ route }) => ({ title: route.params?.subTopic || 'Mnożenie pisemne przez liczby jednocyfrowe' })}
            />
            <MainStack.Screen
                name="WrittenMultiDigitMultiplicationTrainer"
                component={WrittenMultiDigitMultiplicationTrainer}
                options={({ route }) => ({ title: route.params?.subTopic || 'Mnożenie pisemne przez liczby wielocyfrowe' })}
            />
            <MainStack.Screen
                name="WrittenDivisionTrainer"
                component={WrittenDivisionTrainer}
                options={({ route }) => ({ title: route.params?.subTopic || 'Dzielenie pisemne przez liczby jednocyfrowe' })}
            />
            <MainStack.Screen
                name="WordProblemsTrainer"
                component={WordProblemsTrainer}
                options={({ route }) => ({ title: route.params?.subTopic || 'Działania pisemne. Zadania tekstowe' })}
            />

            {/* EKRANY ZADAŃ TEKSTOWYCH */}
            <MainStack.Screen name="WordProblemsLevel1Screen4" component={WordProblemsLevel1Screen4} options={({ route }) => ({ title: route.params?.subTopic || 'Zadania tekstowe' })} />
            <MainStack.Screen name="WordProblemsLevel2Screen4" component={WordProblemsLevel2Screen4} options={({ route }) => ({ title: route.params?.subTopic || 'Zadania tekstowe (Poz. 2)' })} />

            {/* EKRAN OSI LICZBOWEJ */}
            <MainStack.Screen name="NumberLineTrainerScreen4" component={NumberLineTrainerScreen4} options={({ route }) => ({ title: route.params?.subTopic || 'Oś liczbowa' })} />

            {/* Wyniki */}
            <MainStack.Screen name="Results" component={ResultsScreen} options={{ title: 'Wyniki Testu' }} />
            <MainStack.Screen name="DuelResult" component={DuelResultScreen} options={{ title: 'Wynik Pojedynku', headerShown: false }} />

            {/* Teoria */}
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

            <GamesStackNav.Screen name="SequenceGame" component={SequenceGame} options={{ title: 'Sekwencje', headerShown: false }} />
            <GamesStackNav.Screen name="NumberMemoryGame" component={NumberMemoryGame} options={{ title: 'Pamięć Liczbowa', headerShown: false }} />
            <GamesStackNav.Screen name="GreaterLesserGame" component={GreaterLesserGame} options={{ title: 'Większe czy Mniejsze', headerShown: false }} />
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