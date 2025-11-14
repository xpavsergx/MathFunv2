import React, { useState } from "react";
import {
    View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator,
    KeyboardAvoidingView, ScrollView, TouchableWithoutFeedback, Keyboard,
    Platform, StatusBar, StyleSheet,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AuthStackParamList } from "../../App"; // Перевір шлях
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import { COLORS, FONT_SIZES, PADDING, MARGIN } from "../styles/theme"; // Імпорт теми

type RegisterScreenProps = NativeStackScreenProps<AuthStackParamList, "Register">;

const AVAILABLE_CLASSES = ['4', '5', '6', '7'];

function RegisterScreen({ navigation }: RegisterScreenProps) {
    const [firstName, setFirstName] = useState("");
    const [selectedClass, setSelectedClass] = useState<string | null>(null);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleRegister = async () => {
        if (!firstName.trim() || !selectedClass || !email.trim() || !password.trim()) {
            Alert.alert("Błąd", "Proszę wypełnić wszystkie pola i wybrać klasę.");
            return;
        }
        if (password !== confirmPassword) {
            Alert.alert("Błąd", "Hasła nie są identyczne.");
            return;
        }
        if (password.length < 6) {
            Alert.alert("Błąd", "Hasło musi mieć co najmniej 6 znaków.");
            return;
        }

        setLoading(true);
        try {
            const userCredential = await auth().createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            if (user) {
                // ✅ --- ОНОВЛЕНО ТУТ ---
                // Додаємо поля для системи рівнів та монет
                await firestore().collection("users").doc(user.uid).set({
                    email: user.email?.toLowerCase(),
                    firstName: firstName.trim(),
                    userClass: selectedClass,
                    createdAt: firestore.FieldValue.serverTimestamp(),
                    friends: [],

                    // --- Нові поля ---
                    level: 1,         // Початковий рівень
                    xp: 0,            // Початковий досвід
                    xpToNextLevel: 100, // Досвіду до 2-го рівня
                    coins: 0,           // Початкові монети
                });
                // --- КІНЕЦЬ ОНОВЛЕННЯ ---

                await user.updateProfile({
                    displayName: firstName.trim(),
                });
                await user.sendEmailVerification();
                Alert.alert(
                    "Rejestracja udana!",
                    "Sprawdź skrzynkę pocztową, aby potwierdzić adres email."
                );
            }
        } catch (error: any) {
            if (error.code === "auth/email-already-in-use") {
                Alert.alert("Błąd", "Ten adres email jest już zajęty!");
            } else if (error.code === "auth/invalid-email") {
                Alert.alert("Błąd", "Adres email jest nieprawidłowy!");
            } else {
                console.error("Błąd rejestracji: ", error);
                Alert.alert("Błąd", "Wystąpił błąd podczas rejestracji.");
            }
        }
        setLoading(false);
    };

    const handleNavigateToLogin = () => navigation.goBack();

    return (
        <KeyboardAvoidingView
            style={styles.keyboardAvoidingView}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
        >
            <StatusBar barStyle="dark-content" />
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <ScrollView
                    contentContainerStyle={styles.scrollContainer}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.card}>
                        <Text style={styles.title}>Załóż konto</Text>
                        <Text style={styles.subtitle}>
                            Dołącz do MathFun i rozwijaj swoje umiejętności matematyczne 🎓
                        </Text>

                        <TextInput
                            style={styles.input}
                            placeholder="Twoje imię"
                            value={firstName}
                            onChangeText={setFirstName}
                            placeholderTextColor="#9CA3AF"
                            returnKeyType="next"
                        />

                        {/* --- Вибір класу --- */}
                        <Text style={styles.label}>Wybierz klasę:</Text>
                        <View style={styles.classSelectorContainer}>
                            {AVAILABLE_CLASSES.map((cls) => (
                                <TouchableOpacity
                                    key={cls}
                                    style={[
                                        styles.classButton,
                                        selectedClass === cls && styles.classButtonSelected
                                    ]}
                                    onPress={() => setSelectedClass(cls)}
                                >
                                    <Text style={[
                                        styles.classButtonText,
                                        selectedClass === cls && styles.classButtonTextSelected
                                    ]}>
                                        {cls}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        {/* --- Кінець вибору класу --- */}

                        <TextInput
                            style={styles.input}
                            placeholder="Adres email"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            placeholderTextColor="#9CA3AF"
                            returnKeyType="next"
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Hasło (min. 6 znaków)"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            placeholderTextColor="#9CA3AF"
                            returnKeyType="next"
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Potwierdź hasło"
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry
                            placeholderTextColor="#9CA3AF"
                            returnKeyType="done"
                        />

                        {loading ? (
                            <ActivityIndicator size="large" color="#2563EB" style={styles.loader} />
                        ) : (
                            <TouchableOpacity
                                style={styles.button}
                                onPress={handleRegister}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.buttonText}>Zarejestruj się</Text>
                            </TouchableOpacity>
                        )}

                        <View style={styles.footer}>
                            <Text style={styles.footerText}>Masz już konto?</Text>
                            <TouchableOpacity onPress={handleNavigateToLogin} disabled={loading}>
                                <Text style={styles.footerLink}>Zaloguj się</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    );
}

// ... (Стилі залишаються без змін) ...
const styles = StyleSheet.create({
    keyboardAvoidingView: { flex: 1, backgroundColor: "#EEF2FF" },
    scrollContainer: { flexGrow: 1, justifyContent: "center", padding: 20, paddingBottom: 40 },
    card: { backgroundColor: "#FFFFFF", borderRadius: 20, padding: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 6 },
    title: { fontSize: 30, fontWeight: "800", color: "#111827", marginBottom: 8, textAlign: "center" },
    subtitle: { fontSize: 15, color: "#6B7280", textAlign: "center", marginBottom: 28 },
    input: { backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, paddingHorizontal: 15, paddingVertical: 14, fontSize: 16, marginBottom: 14, color: "#111827" },
    button: { backgroundColor: "#2563EB", borderRadius: 12, height: 55, justifyContent: "center", alignItems: "center", marginTop: 10 },
    buttonText: { color: "#FFFFFF", fontSize: 18, fontWeight: "700" },
    loader: { marginTop: 10, height: 55 },
    footer: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 22 },
    footerText: { fontSize: 15, color: "#6B7280" },
    footerLink: { fontSize: 15, color: "#2563EB", fontWeight: "600", marginLeft: 6 },
    label: {
        fontSize: FONT_SIZES.medium -1,
        color: COLORS.grey,
        marginBottom: MARGIN.small,
        marginLeft: 5,
        fontWeight: '500',
    },
    classSelectorContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: MARGIN.medium + 4,
    },
    classButton: {
        paddingVertical: PADDING.small,
        paddingHorizontal: PADDING.medium + 2,
        borderWidth: 1.5,
        borderColor: '#B0BEC5',
        borderRadius: 20,
        minWidth: 60,
        alignItems: 'center'
    },
    classButtonSelected: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    classButtonText: {
        color: '#546E7A',
        fontSize: FONT_SIZES.medium,
        fontWeight: '600',
    },
    classButtonTextSelected: {
        color: COLORS.white,
    },
});

export default RegisterScreen;
