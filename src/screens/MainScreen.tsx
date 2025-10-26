import React, { useState } from 'react'; // ✅ Dodano useState
import {
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
    Dimensions,
    ScrollView, // ✅ Dodano ScrollView dla przewijania poziomego
} from 'react-native';
import auth from '@react-native-firebase/auth';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp } from '@react-navigation/native';
// ✅ Upewnij się, że ścieżka do App jest poprawna
import { MainAppStackParamList, AppTabParamList, TheoryStackParamList } from '@/App';

// ✅ Typy nawigacji - rozszerzamy o możliwość nawigacji do TheoryStack
type MainScreenNavigationProp = CompositeNavigationProp<
    BottomTabNavigationProp<AppTabParamList, 'HomeStack'>,
    NativeStackScreenProps<MainAppStackParamList & TheoryStackParamList>['navigation'] // ✅ Łączymy typy
>;

type MainScreenProps = {
    navigation: MainScreenNavigationProp;
};

// Lista klas
const GRADES = [4, 5, 6, 7]; // Możesz dodać więcej, będą się przewijać

function MainScreen({ navigation }: MainScreenProps) {

    // ✅ Stan do śledzenia wybranego trybu: 'practice' (ćwiczenia) lub 'theory' (teoria)
    const [selectedMode, setSelectedMode] = useState<'practice' | 'theory'>('practice');

    // ✅ Funkcja obsługująca kliknięcie klasy
    const handleGradeSelect = (grade: number) => {
        if (selectedMode === 'practice') {
            // Nawiguje do listy tematów ĆWICZEŃ dla wybranej klasy
            navigation.navigate('TopicList', { grade: grade });
        } else {
            // Nawiguje do listy tematów TEORII dla wybranej klasy
            // Używamy `Maps` do innego stacka, podając ekran docelowy
            navigation.navigate('TeoriaStack', { screen: 'TheoryTopicList', params: { grade: String(grade) } });
        }
    };

    const currentUser = auth().currentUser;

    return (
        // ✅ Główny ScrollView zmieniony na View, bo tylko klasy będą przewijane
        <View style={styles.outerContainer}>
            {/* Logo i powitanie nie są przewijane */}
            <View style={styles.topSection}>
                <Image
                    source={require('../assets/images/logo.png')} // ✅ Upewnij się, że ścieżka jest poprawna
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
                    Wybierz tryb i klasę, aby rozpocząć naukę!
                </Text>
            </View>

            {/* ✅ ZMIANA: Dodano przełącznik trybu (Ćwiczenia/Teoria) */}
            <View style={styles.modeSelectorContainer}>
                <TouchableOpacity
                    style={[
                        styles.modeButton,
                        selectedMode === 'practice' && styles.modeButtonActive // Styl aktywnego przycisku
                    ]}
                    onPress={() => setSelectedMode('practice')}
                >
                    <Text style={[
                        styles.modeButtonText,
                        selectedMode === 'practice' && styles.modeButtonTextActive
                    ]}>
                        Ćwiczenia
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.modeButton,
                        selectedMode === 'theory' && styles.modeButtonActive
                    ]}
                    onPress={() => setSelectedMode('theory')}
                >
                    <Text style={[
                        styles.modeButtonText,
                        selectedMode === 'theory' && styles.modeButtonTextActive
                    ]}>
                        Teoria
                    </Text>
                </TouchableOpacity>
            </View>

            {/* ✅ ZMIANA: Dodano ScrollView do przewijania klas w poziomie */}
            <View style={styles.gradesScrollViewContainer}>
                <ScrollView
                    horizontal={true} // Włącza przewijanie w poziomie
                    showsHorizontalScrollIndicator={false} // Ukrywa pasek przewijania
                    contentContainerStyle={styles.gradesContainer} // Styl dla zawartości ScrollView
                >
                    {GRADES.map((grade) => (
                        <TouchableOpacity
                            key={grade}
                            style={styles.gradeButton}
                            onPress={() => handleGradeSelect(grade)}
                        >
                            <Text style={styles.gradeButtonText}>Klasa {grade}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Możesz tu dodać inną zawartość, jeśli chcesz */}
            <View style={styles.bottomSpacer} />

        </View> // Koniec outerContainer
    );
}

const windowWidth = Dimensions.get('window').width;

const styles = StyleSheet.create({
    // ✅ ZMIANA: Główny kontener nie jest już ScrollView
    outerContainer: {
        flex: 1,
        backgroundColor: '#E0F7FA', // Jasnoniebieskie tło
    },
    // ✅ ZMIANA: Sekcja górna (logo, powitanie) - nie przewija się
    topSection: {
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 50, // Więcej miejsca na górze
        paddingBottom: 20,
    },
    logo: {
        width: windowWidth * 0.35, // Trochę mniejsze logo
        height: windowWidth * 0.35,
        marginBottom: 20,
    },
    welcomeTitle: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#00796B', // Ciemny turkus
        textAlign: 'center',
        marginBottom: 8,
    },
    userInfoText: {
        fontSize: 15,
        color: '#004D40', // Bardzo ciemny turkus
        marginBottom: 15,
        textAlign: 'center',
    },
    encouragementText: {
        fontSize: 16,
        color: '#37474F', // Ciemnoszary
        textAlign: 'center',
        paddingHorizontal: 10,
        lineHeight: 22,
    },
    // ✅ ZMIANA: Style dla przełącznika trybu
    modeSelectorContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginVertical: 20, // Odstęp pionowy
        backgroundColor: '#B2DFDB', // Jaśniejszy turkus tła dla segmentu
        borderRadius: 25,
        marginHorizontal: 40, // Marginesy boczne
        overflow: 'hidden', // Aby zaokrąglenie działało
        elevation: 2,
    },
    modeButton: {
        flex: 1, // Każdy przycisk zajmuje połowę szerokości
        paddingVertical: 12,
        alignItems: 'center',
    },
    modeButtonActive: {
        backgroundColor: '#00796B', // Ciemny turkus dla aktywnego
        borderRadius: 25, // Zaokrąglenie aktywnego (efekt pigułki)
    },
    modeButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#004D40', // Domyślny kolor tekstu (ciemny turkus)
    },
    modeButtonTextActive: {
        color: '#FFFFFF', // Biały tekst dla aktywnego
    },
    // ✅ ZMIANA: Kontener dla ScrollView klas
    gradesScrollViewContainer: {
        height: 60, // Stała wysokość dla paska klas
        marginBottom: 20, // Odstęp pod paskiem klas
    },
    // ✅ ZMIANA: Styl dla kontenera *wewnątrz* ScrollView
    gradesContainer: {
        flexDirection: 'row', // Ustawia przyciski obok siebie
        alignItems: 'center', // Wyśrodkowuje przyciski w pionie
        paddingHorizontal: 15, // Padding po bokach wewnątrz ScrollView
    },
    gradeButton: {
        backgroundColor: '#00BCD4', // Turkusowy (ten sam co wcześniej)
        paddingVertical: 10, // Mniejszy padding pionowy
        paddingHorizontal: 25, // Większy padding poziomy dla szerszych przycisków
        borderRadius: 20, // Mniejsze zaokrąglenie
        marginHorizontal: 6, // Odstęp między przyciskami
        alignItems: 'center',
        justifyContent: 'center', // Wyśrodkowanie tekstu
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.18,
        shadowRadius: 1.00,
        height: 45, // Stała wysokość przycisku
    },
    gradeButtonText: {
        color: '#FFFFFF',
        fontSize: 15, // Mniejsza czcionka
        fontWeight: 'bold',
    },
    // ✅ Pusty View na dole, aby odsunąć zawartość od dolnej nawigacji
    bottomSpacer: {
        flex: 1, // Zajmuje resztę dostępnego miejsca
    },
});

export default MainScreen;