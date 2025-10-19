import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    ScrollView,
    TouchableWithoutFeedback,
    Keyboard,
    Platform,
    StatusBar,
    StyleSheet,
} from "react-native";
import Feather from "react-native-vector-icons/Feather";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AuthStackParamList } from "../../App";
import auth from "@react-native-firebase/auth";

type LoginScreenProps = NativeStackScreenProps<AuthStackParamList, "Login">;

function LoginScreen({ navigation }: LoginScreenProps) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async () => {
        if (!email.trim() || !password.trim()) {
            Alert.alert("Błąd", "Proszę wpisać email i hasło.");
            return;
        }

        setLoading(true);
        try {
            await auth().signInWithEmailAndPassword(email, password);
            console.log("Zalogowano jako:", email);
        } catch (error: any) {
            let msg = "Logowanie nie powiodło się. Spróbuj ponownie.";
            if (error.code === "auth/user-not-found" || error.code === "auth/invalid-credential") {
                msg = "Nieprawidłowy email lub hasło.";
            } else if (error.code === "auth/invalid-email") {
                msg = "Niepoprawny format adresu email.";
            }
            console.error("Błąd logowania:", error.code, error.message);
            Alert.alert("Błąd logowania", msg);
        }
        setLoading(false);
    };

    const handleForgotPassword = async () => {
        const trimmedEmail = email.trim();
        if (!trimmedEmail) {
            Alert.alert("Błąd", "Proszę wprowadzić adres email, aby zresetować hasło.");
            return;
        }
        setLoading(true);
        try {
            await auth().sendPasswordResetEmail(trimmedEmail);
            Alert.alert(
                "Sprawdź email",
                `Wysłano link do resetowania hasła na adres ${trimmedEmail}. Sprawdź również folder spam.`
            );
        } catch (error: any) {
            console.error("Błąd resetowania:", error.code);
            Alert.alert(
                "Błąd",
                "Nie udało się wysłać emaila do resetowania hasła. Spróbuj ponownie."
            );
        }
        setLoading(false);
    };

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
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.card}>
                        {/* Logo / skrót MF z efektem 3D */}
                        <Text style={styles.logo3D}>MF</Text>

                        <Text style={styles.title}>Witaj ponownie 👋</Text>
                        <Text style={styles.subtitle}>Zaloguj się do swojego konta MathFun</Text>

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

                        <View style={styles.passwordWrapper}>
                            <TextInput
                                style={styles.passwordInput}
                                placeholder="Hasło"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                                placeholderTextColor="#9CA3AF"
                                returnKeyType="done"
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                <Feather
                                    name={showPassword ? "eye" : "eye-off"}
                                    size={22}
                                    color="#2563EB"
                                />
                            </TouchableOpacity>
                        </View>

                        {loading ? (
                            <ActivityIndicator size="large" color="#2563EB" style={styles.loader} />
                        ) : (
                            <TouchableOpacity
                                style={styles.button}
                                onPress={handleLogin}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.buttonText}>Zaloguj się</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            onPress={handleForgotPassword}
                            disabled={loading}
                            style={styles.forgotPasswordButton}
                        >
                            <Text style={styles.forgotPasswordText}>Zapomniałeś hasła?</Text>
                        </TouchableOpacity>

                        <View style={styles.footer}>
                            <Text style={styles.footerText}>Nie masz konta?</Text>
                            <TouchableOpacity onPress={() => navigation.navigate("Register")} disabled={loading}>
                                <Text style={styles.footerLink}>Zarejestruj się</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    keyboardAvoidingView: { flex: 1, backgroundColor: "#EEF2FF" },
    scrollContainer: {
        flexGrow: 1,
        justifyContent: "center",
        padding: 20,
    },
    card: {
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        padding: 26,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 6,
    },
    logo3D: {
        fontSize: 64,
        fontWeight: "900",
        textAlign: "center",
        letterSpacing: 1,
        marginBottom: 8,
        color: "#2563EB",
        textShadowColor: "#1E40AF", // ciemniejszy odcień niebieskiego
        textShadowOffset: { width: 2, height: 2 }, // przesunięcie cienia
        textShadowRadius: 2, // miękki cień
    },
    title: {
        fontSize: 26,
        fontWeight: "800",
        color: "#111827",
        textAlign: "center",
    },
    subtitle: {
        fontSize: 15,
        color: "#6B7280",
        textAlign: "center",
        marginBottom: 28,
    },
    input: {
        backgroundColor: "#F9FAFB",
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 12,
        paddingHorizontal: 15,
        paddingVertical: 14,
        fontSize: 16,
        marginBottom: 14,
        color: "#111827",
    },
    passwordWrapper: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F9FAFB",
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 12,
        paddingHorizontal: 15,
        height: 52,
        marginBottom: 14,
    },
    passwordInput: {
        flex: 1,
        fontSize: 16,
        color: "#111827",
    },
    button: {
        backgroundColor: "#2563EB",
        borderRadius: 12,
        height: 55,
        justifyContent: "center",
        alignItems: "center",
        marginTop: 5,
    },
    buttonText: {
        color: "#FFFFFF",
        fontSize: 18,
        fontWeight: "700",
    },
    loader: { marginVertical: 10, height: 55 },
    forgotPasswordButton: {
        marginTop: 16,
        alignSelf: "center",
    },
    forgotPasswordText: {
        fontSize: 15,
        color: "#6B7280",
    },
    footer: {
        flexDirection: "row",
        justifyContent: "center",
        marginTop: 22,
    },
    footerText: { fontSize: 15, color: "#6B7280" },
    footerLink: {
        fontSize: 15,
        color: "#2563EB",
        fontWeight: "600",
        marginLeft: 6,
    },
});

export default LoginScreen;
