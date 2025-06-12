// src/screens/RegisterScreen.tsx

import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/App'; // Використовуємо абсолютний шлях
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore'; // Імпорт Firestore

type RegisterScreenProps = NativeStackScreenProps<AuthStackParamList, 'Register'>;

function RegisterScreen({ navigation }: RegisterScreenProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRegister = async () => {
        if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
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
            const userCredential = await auth().createUserWithEmailAndPassword(email, password);
            if (userCredential.user) {
                // Створюємо документ для користувача в Firestore
                await firestore().collection('users').doc(userCredential.user.uid).set({
                    email: userCredential.user.email,
                    createdAt: firestore.FieldValue.serverTimestamp(),
                    friends: [] // Початковий порожній масив друзів
                });
            }
            console.log('Użytkownik zarejestrowany pomyślnie!', email);
        } catch (error: any) {
            let errorMessage = 'Nie udało się zarejestrować. Spróbuj ponownie.';
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = 'Ten adres email jest już zajęty.';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Niepoprawny format adresu email.';
            } else if (error.code === 'auth/weak-password') {
                errorMessage = 'Hasło jest za słabe. Proszę wybrać mocniejsze hasło.';
            }
            console.error('Błąd rejestracji:', error.code, error.message);
            Alert.alert('Błąd rejestracji', errorMessage);
        }
        setLoading(false);
    };

    const handleNavigateToLogin = () => {
        navigation.goBack();
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Rejestracja</Text>
            <TextInput
                style={styles.input}
                placeholder="Adres email"
                value={email}
                onChangeText={setEmail}
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
            <TextInput
                style={styles.input}
                placeholder="Potwierdź hasło"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
            />
            {loading ? (
                <ActivityIndicator size="large" color="#007bff" style={styles.loader} />
            ) : (
                <View style={styles.buttonWrapper}>
                    <Button
                        title="Zarejestruj się"
                        onPress={handleRegister}
                    />
                </View>
            )}
            <TouchableOpacity onPress={handleNavigateToLogin} style={styles.loginButton} disabled={loading}>
                <Text style={styles.loginButtonText}>
                    Masz już konto? Zaloguj się
                </Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#f0f8ff' },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 30, color: '#333' },
    input: { width: '100%', height: 50, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 15, marginBottom: 15, fontSize: 16 },
    buttonWrapper: { width: '100%' },
    loader: { marginVertical: 10, height: 44 },
    loginButton: { marginTop: 20 },
    loginButtonText: { color: '#007bff', fontSize: 16 },
});

export default RegisterScreen;
