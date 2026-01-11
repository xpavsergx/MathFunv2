import React, { useState, useEffect } from "react";
import {
    View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator,
    KeyboardAvoidingView, ScrollView, TouchableWithoutFeedback, Keyboard,
    Platform, StatusBar, StyleSheet, useColorScheme, Dimensions, PixelRatio
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AuthStackParamList } from "../../src/navigation/types";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import { COLORS } from "../../src/styles/theme";

import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
    Easing
} from 'react-native-reanimated';

type RegisterScreenProps = NativeStackScreenProps<AuthStackParamList, "Register">;

const { width, height } = Dimensions.get('window');
const isSmallDevice = height < 700;

const scale = (size: number) => {
    const scaleFactor = width / 375;
    const newSize = size * scaleFactor;
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

const AVAILABLE_CLASSES = ['4', '5', '6', '7'];

function RegisterScreen({ navigation }: RegisterScreenProps) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const [firstName, setFirstName] = useState("");
    const [selectedClass, setSelectedClass] = useState<string | null>(null);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Animacja Maskotki
    const translateY = useSharedValue(0);
    useEffect(() => {
        translateY.value = withRepeat(
            withSequence(
                withTiming(-8, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
                withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.sin) })
            ), -1, true
        );
    }, []);

    const animatedMascotStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }]
    }));

    const theme = {
        bg: isDark ? "#121212" : "#F0F4F8",
        card: isDark ? "#1E1E1E" : "#FFFFFF",
        text: isDark ? "#FFFFFF" : "#1F2937",
        subText: isDark ? "#A0A0A0" : "#6B7280",
        inputBg: isDark ? "#2C2C2C" : "#F3F4F6",
        inputBorder: isDark ? "#3D3D3D" : "transparent",
        inputText: isDark ? "#FFFFFF" : "#111827",
        placeholder: isDark ? "#707070" : "#9CA3AF",
        primary: COLORS.primary,
    };

    // --- LOGIKA REJESTRACJI (PRZYWRÓCONA I ZINTEGROWANA) ---
    const handleRegister = async () => {
        // Walidacja pól
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
            // 1. Utworzenie użytkownika w Firebase Auth
            const userCredential = await auth().createUserWithEmailAndPassword(email.trim(), password);
            const user = userCredential.user;

            if (user) {
                // 2. Utworzenie dokumentu użytkownika w Firestore z początkowymi statystykami
                await firestore().collection("users").doc(user.uid).set({
                    email: user.email?.toLowerCase(),
                    firstName: firstName.trim(),
                    userClass: selectedClass,
                    createdAt: firestore.FieldValue.serverTimestamp(),
                    friends: [],
                    level: 1,
                    xp: 0,
                    xpToNextLevel: 100,
                    coins: 0,
                });

                // 3. Aktualizacja profilu (Imię wyświetlane)
                await user.updateProfile({
                    displayName: firstName.trim(),
                });

                // Opcjonalne: Wysłanie weryfikacji email
                // await user.sendEmailVerification();

                Alert.alert("Sukces!", "Konto zostało utworzone poprawnie.");
            }
        } catch (error: any) {
            if (error.code === "auth/email-already-in-use") {
                Alert.alert("Błąd", "Ten adres email jest już zajęty.");
            } else if (error.code === "auth/invalid-email") {
                Alert.alert("Błąd", "Adres email jest nieprawidłowy.");
            } else {
                console.error("Błąd rejestracji: ", error);
                Alert.alert("Błąd", "Wystąpił problem podczas tworzenia konta.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
            <StatusBar
                barStyle={isDark ? "light-content" : "dark-content"}
                backgroundColor={theme.bg}
            />

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >

                        <Animated.View style={[styles.mascotContainer, animatedMascotStyle]}>
                            <Animated.Image
                                source={require('../../src/assets/happy.png')}
                                style={styles.mascotImage}
                                resizeMode="contain"
                            />
                        </Animated.View>

                        <View style={[styles.card, { backgroundColor: theme.card }]}>
                            <Text style={[styles.title, { color: theme.text }]}>Dołącz do nas! 🚀</Text>

                            <View style={[styles.inputContainer, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
                                <Ionicons name="person-outline" size={20} color={theme.placeholder} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: theme.inputText }]}
                                    placeholder="Twoje imię"
                                    placeholderTextColor={theme.placeholder}
                                    value={firstName}
                                    onChangeText={setFirstName}
                                />
                            </View>

                            <Text style={[styles.label, { color: theme.subText }]}>Wybierz klasę:</Text>
                            <View style={styles.classSelectorContainer}>
                                {AVAILABLE_CLASSES.map((cls) => (
                                    <TouchableOpacity
                                        key={cls}
                                        style={[
                                            styles.classButton,
                                            {
                                                backgroundColor: selectedClass === cls ? theme.primary : theme.inputBg,
                                                borderColor: selectedClass === cls ? theme.primary : theme.inputBorder
                                            }
                                        ]}
                                        onPress={() => setSelectedClass(cls)}
                                    >
                                        <Text style={[styles.classButtonText, { color: selectedClass === cls ? '#FFF' : theme.text }]}>
                                            {cls}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <View style={[styles.inputContainer, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
                                <Ionicons name="mail-outline" size={20} color={theme.placeholder} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: theme.inputText }]}
                                    placeholder="Email"
                                    placeholderTextColor={theme.placeholder}
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                            </View>

                            <View style={[styles.inputContainer, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
                                <Ionicons name="lock-closed-outline" size={20} color={theme.placeholder} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: theme.inputText }]}
                                    placeholder="Hasło"
                                    placeholderTextColor={theme.placeholder}
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                    <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color={theme.placeholder} />
                                </TouchableOpacity>
                            </View>
                            <Text style={[styles.helperText, { color: theme.subText }]}>Minimum 6 znaków</Text>

                            <View style={[styles.inputContainer, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
                                <Ionicons name="shield-checkmark-outline" size={20} color={theme.placeholder} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: theme.inputText }]}
                                    placeholder="Potwierdź hasło"
                                    placeholderTextColor={theme.placeholder}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    secureTextEntry={!showPassword}
                                />
                            </View>

                            <TouchableOpacity
                                style={[styles.registerButton, { backgroundColor: theme.primary }]}
                                onPress={handleRegister}
                                disabled={loading}
                            >
                                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.registerButtonText}>Zarejestruj się</Text>}
                            </TouchableOpacity>
                        </View>

                        <View style={styles.footer}>
                            <Text style={[styles.footerText, { color: theme.subText }]}>Masz już konto?</Text>
                            <TouchableOpacity onPress={() => navigation.goBack()}>
                                <Text style={[styles.loginLink, { color: theme.primary }]}>Zaloguj się</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: scale(20),
        paddingVertical: scale(20),
    },
    mascotContainer: {
        alignItems: 'center',
        marginBottom: scale(10),
    },
    mascotImage: {
        width: scale(90),
        height: scale(90),
    },
    card: {
        borderRadius: 24,
        padding: scale(20),
        elevation: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    title: {
        fontSize: scale(22),
        fontWeight: "800",
        textAlign: "center",
        marginBottom: scale(15),
    },
    label: {
        fontSize: scale(13),
        fontWeight: '600',
        marginBottom: 8,
    },
    classSelectorContainer: {
        flexDirection: 'row',
        marginBottom: scale(15),
    },
    classButton: {
        flex: 1,
        marginHorizontal: 4,
        height: scale(40),
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    classButtonText: {
        fontSize: scale(14),
        fontWeight: 'bold',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 15,
        paddingHorizontal: 12,
        height: scale(48),
        marginBottom: scale(8),
        borderWidth: 1,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontSize: scale(14),
    },
    helperText: {
        fontSize: scale(11),
        marginLeft: 12,
        marginBottom: scale(15),
    },
    registerButton: {
        height: scale(50),
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: scale(5),
    },
    registerButtonText: {
        color: '#FFFFFF',
        fontSize: scale(16),
        fontWeight: 'bold',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: scale(20),
    },
    footerText: {
        fontSize: scale(13),
    },
    loginLink: {
        fontSize: scale(13),
        fontWeight: 'bold',
        marginLeft: 5,
    },
});

export default RegisterScreen;
