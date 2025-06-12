import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../App'; // Переконайся, що шлях правильний

import auth from '@react-native-firebase/auth';


type LoginScreenProps = NativeStackScreenProps<AuthStackParamList, 'Login'>;

function LoginScreen({ navigation }: LoginScreenProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!email.trim() || !password.trim()) {
            Alert.alert('Błąd', 'Proszę wpisać email i hasło.');
            return;
        }
        setLoading(true);
        try {
            await auth().signInWithEmailAndPassword(email, password);
            console.log('Logowanie udane dla:', email);
        } catch (error: any) {
            let errorMessage = 'Logowanie nie powiodło się. Spróbuj ponownie.';
            if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
                errorMessage = 'Nieprawidłowy email lub hasło.';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Niepoprawny format email.';
            }
            console.error('Błąd logowania:', error.code, error.message);
            Alert.alert('Błąd logowania', errorMessage);
        }
        setLoading(false);
    };

    const handleNavigateToRegister = () => {
        navigation.navigate('Register');
    };

    // Оновлена функція handleForgotPassword
    const handleForgotPassword = async () => {
        console.log('--- handleForgotPassword --- Кнопку "Zapomniałeś hasła?" натиснуто!');
        const trimmedEmail = email.trim(); // Беремо email з поля вводу

        if (!trimmedEmail) {
            Alert.alert('Błąd', 'Proszę najpierw wprowadzić swój adres email w polu powyżej.'); // Помилка, будь ласка, введіть email (польськ.)
            return;
        }

        setLoading(true);
        try {
            await auth().sendPasswordResetEmail(trimmedEmail);
            Alert.alert(
                "Sprawdź email", // Перевірте email (польськ.)
                `Wysłano link do resetowania hasła na adres ${trimmedEmail}. Sprawdź swoją skrzynkę pocztową (również folder spam).` // Надіслано ... (польськ.)
            );
        } catch (error: any) {
            let errorMessage = "Nie udało się wysłać emaila do resetowania hasła. Spróbuj ponownie."; // Не вдалося надіслати... (польськ.)
            if (error.code === 'auth/invalid-email') {
                errorMessage = 'Niepoprawny format adresu email.';
            } else if (error.code === 'auth/user-not-found') {
                // Firebase не підтверджує існування email для безпеки.
                // Тому показуємо загальне повідомлення, яке не розкриває, чи існує такий користувач.
                errorMessage = `Jeśli adres ${trimmedEmail} jest zarejestrowany, otrzymasz na niego link do resetowania hasła. Sprawdź również folder spam.`;
            }
            console.error("Błąd resetowania hasła:", error.code, error.message);
            Alert.alert("Błąd wysyłania", errorMessage); // Помилка надсилання (польськ.)
        }
        setLoading(false);
    };

    console.log('LoginScreen - стан loading:', loading);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Logowanie do MathFun</Text>

            <TextInput
                style={styles.input}
                placeholder="Adres email"
                value={email}
                onChangeText={setEmail} // setEmail тепер оновлює email, який буде використано
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
            />

            <TextInput
                style={styles.input}
                placeholder="Hasło"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
            />

            {loading ? (
                <ActivityIndicator size="large" color="#007bff" style={styles.loader} />
            ) : (
                <View style={styles.buttonWrapper}>
                    <Button
                        title="Zaloguj się"
                        onPress={handleLogin}
                    />
                </View>
            )}

            {/* Властивість disabled={loading} повертаємо, оскільки кнопка тепер має логіку */}
            <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotPasswordButton} disabled={loading}>
                <Text style={styles.forgotPasswordText}>
                    Zapomniałeś hasła?
                </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleNavigateToRegister} style={styles.registerButton} disabled={loading}>
                <Text style={styles.registerButtonText}>
                    Nie masz konta? Zarejestruj się
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
    buttonWrapper: {
        width: '100%',
        marginBottom: 10,
    },
    loader: {
        marginVertical: 10,
        height: 50
    },
    forgotPasswordButton: {
        marginTop: 15,
        marginBottom: 5,
    },
    forgotPasswordText: {
        color: '#6c757d',
        fontSize: 15,
    },
    registerButton: {
        marginTop: 10,
    },
    registerButtonText: {
        color: '#007bff',
        fontSize: 16,
    },
});

export default LoginScreen;
