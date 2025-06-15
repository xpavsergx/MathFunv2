import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    Button,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    ScrollView,
    TouchableWithoutFeedback,
    Keyboard,
    Platform
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../App'; // Перевірте, чи правильний шлях до App.tsx

import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore'; // Важливо: імпорт Firestore

// Типізація для props екрану
type RegisterScreenProps = NativeStackScreenProps<AuthStackParamList, 'Register'>;

function RegisterScreen({ navigation }: RegisterScreenProps) {
    const [firstName, setFirstName] = useState('');
    const [className, setClassName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleRegister = async () => {
        // 1. Валідація введених даних
        if (!firstName.trim() || !className.trim() || !email.trim() || !password.trim()) {
            Alert.alert('Błąd', 'Proszę wypełnić wszystkie pola.');
            return;
        }
        if (password !== confirmPassword) {
            Alert.alert('Błąd', 'Hasła nie są identyczne.');
            return;
        }
        if (password.length < 6) {
            Alert.alert('Błąd', 'Hasło musi mieć co najmniej 6 znaków.');
            return;
        }

        setLoading(true);

        try {
            // 2. Створення користувача в Authentication
            const userCredential = await auth().createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            if (user) {
                // 3. Створення документа для користувача в Firestore Database
                // Цей крок вирішує проблему з пошуком друзів
                await firestore().collection('users').doc(user.uid).set({
                    email: user.email?.toLowerCase(), // Зберігаємо email в нижньому регістрі
                    firstName: firstName.trim(),
                    className: className.trim(),
                    createdAt: firestore.FieldValue.serverTimestamp(),
                    friends: [], // Початковий порожній масив друзів
                });

                // 4. Оновлення профілю в самій Authentication (додаємо displayName)
                await user.updateProfile({
                    displayName: firstName.trim()
                });

                // 5. Надсилання листа для верифікації email
                await user.sendEmailVerification();
                Alert.alert(
                    "Rejestracja udana!",
                    "Sprawdź swoją skrzynkę pocztową (również folder spam), aby potwierdzić swój adres email."
                );

                // Після успішної реєстрації Firebase автоматично логінить користувача,
                // а слухач onAuthStateChanged в App.tsx перенаправить на головний екран.
            }
        } catch (error: any) {
            if (error.code === 'auth/email-already-in-use') {
                Alert.alert('Błąd', 'Ten adres email jest już zajęty!');
            } else if (error.code === 'auth/invalid-email') {
                Alert.alert('Błąd', 'Adres email jest nieprawidłowy!');
            } else {
                console.error("Błąd реєстрації: ", error);
                Alert.alert('Błąd', 'Wystąpił błąd podczas rejestracji.');
            }
        }

        setLoading(false);
    };

    const handleNavigateToLogin = () => {
        navigation.goBack();
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <ScrollView
                    contentContainerStyle={styles.scrollContainer}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.container}>
                        <Text style={styles.title}>Stwórz konto</Text>

                        <TextInput
                            style={styles.input}
                            placeholder="Twoje imię"
                            value={firstName}
                            onChangeText={setFirstName}
                            autoCapitalize="words"
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Twoja klasa"
                            value={className}
                            onChangeText={setClassName}
                            autoCapitalize="characters"
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Adres email"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                        <View style={styles.passwordWrapper}>
                            <TextInput
                                style={styles.passwordInput}
                                placeholder="Hasło"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                <Text style={styles.toggleText}>{showPassword ? 'Ukryj' : 'Pokaż'}</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.passwordWrapper}>
                            <TextInput
                                style={styles.passwordInput}
                                placeholder="Potwierdź hasło"
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry={!showConfirmPassword}
                            />
                            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                                <Text style={styles.toggleText}>{showConfirmPassword ? 'Ukryj' : 'Pokaż'}</Text>
                            </TouchableOpacity>
                        </View>

                        {loading ? (
                            <ActivityIndicator size="large" color="#007bff" style={styles.loader} />
                        ) : (
                            <View style={styles.buttonWrapper}>
                                <Button title="Zarejestruj się" onPress={handleRegister} />
                            </View>
                        )}

                        <TouchableOpacity onPress={handleNavigateToLogin} style={styles.loginButton} disabled={loading}>
                            <Text style={styles.loginButtonText}>
                                Masz już konto? Zaloguj się
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    scrollContainer: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    container: {
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
    passwordWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        height: 50,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        marginBottom: 15,
    },
    passwordInput: {
        flex: 1,
        height: '100%',
        paddingHorizontal: 15,
        fontSize: 16,
    },
    toggleText: {
        color: '#007bff',
        fontSize: 14,
        paddingHorizontal: 10,
    },
    buttonWrapper: {
        width: '100%',
    },
    loader: {
        marginVertical: 10,
        height: 40,
    },
    loginButton: {
        marginTop: 20,
    },
    loginButtonText: {
        color: '#007bff',
        fontSize: 16,
    },
});

export default RegisterScreen;
