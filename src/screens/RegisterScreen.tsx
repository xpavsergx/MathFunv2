import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../App'; // Перевір шлях! Можливо, '../App'

import auth from '@react-native-firebase/auth';

// Тип для props цього екрану (поки що припускаємо, що він буде в AuthNavigator)
// Якщо RegisterScreen буде в RootStackParamList, потрібно буде його туди додати
// type RegisterScreenProps = NativeStackScreenProps<RootStackParamList, 'Register'>;
// Для простоти поки що можемо використовувати any для navigation, або створити окремий AuthStackParamList
type RegisterScreenProps = {
    navigation: any; // Тимчасово, для спрощення
};

function RegisterScreen({ navigation }: RegisterScreenProps) {
    const [firstName, setFirstName] = useState('');   // <-- Imię
    const [lastName, setLastName] = useState('');     // <-- Nazwisko
    const [className, setClassName] = useState('');   // <-- Klasa
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState(''); // Додаткове поле для підтвердження пароля
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const handleRegister = async () => {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        setSuccessMessage('');
        if (!firstName.trim() || !lastName.trim() || !className.trim()) {
            Alert.alert('Błąd', 'Proszę wypełnić Imię, Nazwisko i Klasę.');
            return;
        }
        if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
            Alert.alert('Błąd', 'Proszę wypełnić wszystkie pola.'); // Помилка (польськ.)
            return;
        }
        if (!emailRegex.test(email)) {
            Alert.alert('Błąd', 'Wprowadź poprawny adres email.');
            return;
        }
        if (password !== confirmPassword) {
            Alert.alert('Błąd', 'Hasła nie są identyczne.'); // Паролі не співпадають (польськ.)
            return;
        }
        // TODO: Додати перевірку складності пароля, якщо потрібно (мінімум 6 символів для Firebase)
        if (password.length < 6) {
            Alert.alert('Błąd', 'Hasło musi mieć co najmniej 6 znaków.'); // Пароль має містити щонайменше 6 символів (польськ.)
            return;
        }

        setLoading(true);
        try {
            await auth().createUserWithEmailAndPassword(email, password);
            console.log('Użytkownik zarejestrowany pomyślnie!', email);
            setSuccessMessage('Rejestracja zakończona pomyślnie!');
            // Firebase автоматично залогінить користувача після успішної реєстрації.
            // Слухач onAuthStateChanged в App.tsx подбає про навігацію на головний екран.
            // Можна додати повідомлення про успішну реєстрацію, але користувач і так буде перенаправлений.
        } catch (error: any) {
            let errorMessage = 'Nie udało się zarejestrować. Spróbuj ponownie.'; // Не вдалося зареєструватися. Спробуйте ще раз. (польськ.)
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = 'Ten adres email jest już zajęty.'; // Цей емейл вже використовується (польськ.)
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Niepoprawny format adresu email.'; // Неправильний формат емейлу (польськ.)
            } else if (error.code === 'auth/weak-password') {
                errorMessage = 'Hasło jest za słabe. Proszę wybrać mocniejsze hasło.'; // Пароль занадто слабкий (польськ.)
            }
            console.error('Błąd rejestracji:', error.code, error.message);
            Alert.alert('Błąd rejestracji', errorMessage); // Помилка реєстрації (польськ.)
        }
        setLoading(false);
    };

    const handleNavigateToLogin = () => {
        navigation.goBack(); // Повертаємось на попередній екран (має бути LoginScreen)
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Rejestracja</Text>
            {successMessage ? (
                <Text style={styles.successText}>{successMessage}</Text>
            ) : null}
            <TextInput
                style={styles.input}
                placeholder="Imię"
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
            />

            <TextInput
                style={styles.input}
                placeholder="Nazwisko"
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
            />

            <TextInput
                style={styles.input}
                placeholder="Klasa"
                value={className}
                onChangeText={setClassName}
                autoCapitalize="characters"
            />

            <TextInput
                style={styles.input}
                placeholder="Adres email" // Електронна пошта (польськ.)
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
            />

            <TextInput
                style={styles.input}
                placeholder="Hasło" // Пароль (польськ.)
                value={password}
                onChangeText={setPassword}
                secureTextEntry
            />

            <TextInput
                style={styles.input}
                placeholder="Potwierdź hasło" // Підтвердіть пароль (польськ.)
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
            />

            {loading ? (
                <ActivityIndicator size="large" color="#007bff" style={styles.loader} />
            ) : (
                <Button
                    title="Zarejestruj się" // Зареєструватися (польськ.)
                    onPress={handleRegister}
                />
            )}

            <TouchableOpacity onPress={handleNavigateToLogin} style={styles.loginButton} disabled={loading}>
                <Text style={styles.loginButtonText}>
                    Masz już konto? Zaloguj się {/* Маєте акаунт? Увійти (польськ.) */}
                </Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#f0f8ff',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 30,
        color: '#333',
    },
    input: {
        width: '100%',
        height: 50,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: 15,
        marginBottom: 15,
        fontSize: 16,
    },
    loader: {
        marginVertical: 10,
        height: 40
    },
    loginButton: {
        marginTop: 20,
    },
    loginButtonText: {
        color: '#007bff',
        fontSize: 16,
    },
    successText: {
        color: 'green',
        fontSize: 16,
        marginBottom: 20,
        textAlign: 'center',
    },
});

export default RegisterScreen;
