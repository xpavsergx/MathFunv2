import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import auth from '@react-native-firebase/auth';
import Ionicons from '@expo/vector-icons/Ionicons'; // Для іконок

// Типізацію для навігації можна буде додати точніше, якщо вона знадобиться
// import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
// import { AppTabParamList } from '../../App';

// type ProfileScreenProps = BottomTabScreenProps<AppTabParamList, 'Profil'>;

function ProfileScreen(/* { navigation }: ProfileScreenProps */) {
    const handleLogout = async () => {
        try {
            await auth().signOut();
            console.log('Użytkownik wylogowany z ekranu Profil!');
        } catch (error: any) {
            console.error('Błąd podczas wylogowywania z Profilu: ', error);
            Alert.alert('Błąd', 'Wystąpił problem podczas wylogowywania.');
        }
    };

    const currentUser = auth().currentUser;

    return (
        <ScrollView contentContainerStyle={styles.scrollViewContainer}>
            <View style={styles.container}>
                <Text style={styles.headerTitle}>Mój Profil</Text>

                {/* Секція інформації про користувача */}
                <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="person-circle-outline" size={28} color="#00796B" style={styles.sectionIcon} />
                        <Text style={styles.sectionTitle}>Dane użytkownika</Text>
                    </View>
                    {currentUser && (
                        <Text style={styles.userInfoText}>
                            Email: {currentUser.email}
                        </Text>
                    )}
                    {/* Тут можна буде додати інші дані, наприклад, ім'я */}
                </View>

                {/* Секція досягнень (заглушка) */}
                <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="trophy-outline" size={26} color="#FFC107" style={styles.sectionIcon} />
                        <Text style={styles.sectionTitle}>Moje osiągnięcia</Text>
                    </View>
                    <Text style={styles.placeholderText}>Już wkrótce zobaczysz tutaj swoje postępy i odznaki!</Text>
                </View>

                {/* Секція налаштувань (заглушка) */}
                <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="settings-outline" size={26} color="#607D8B" style={styles.sectionIcon} />
                        <Text style={styles.sectionTitle}>Ustawienia konta</Text>
                    </View>
                    <Text style={styles.placeholderText}>Zmiana hasła, edycja profilu (wkrótce).</Text>
                </View>

                {/* Кнопка виходу */}
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={22} color="#FFFFFF" />
                    <Text style={styles.logoutButtonText}>Wyloguj się</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    scrollViewContainer: {
        flexGrow: 1,
        backgroundColor: '#F0F4F8', // Світло-сіро-блакитний фон
    },
    container: {
        flex: 1,
        alignItems: 'center',
        padding: 20,
    },
    headerTitle: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#263238', // Темно-сірий
        marginTop: 20,
        marginBottom: 30,
    },
    sectionContainer: {
        backgroundColor: '#FFFFFF', // Білий фон для секцій
        borderRadius: 12,
        padding: 20,
        width: '100%',
        marginBottom: 25,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    sectionIcon: {
        marginRight: 10,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600', // Напівжирний
        color: '#37474F', // Сіро-синій
    },
    userInfoText: {
        fontSize: 16,
        color: '#455A64', // Темніший сіро-синій
        paddingLeft: 5, // Невеликий відступ, щоб вирівняти з текстом заголовка секції (якщо іконка має відступ)
    },
    placeholderText: {
        fontSize: 15,
        color: '#546E7A', // Ще трохи світліший сіро-синій
        textAlign: 'left', // Або 'center'
        paddingLeft: 5,
        lineHeight: 22,
    },
    logoutButton: {
        flexDirection: 'row',
        backgroundColor: '#d9534f', // Червоний
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 25, // Більш круглі
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        marginTop: 20, // Відступ зверху для кнопки
    },
    logoutButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 10,
    }
});

export default ProfileScreen;
