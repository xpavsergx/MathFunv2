import React, { useState, useEffect } from "react";
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
    useColorScheme,
    Dimensions,
    PixelRatio
} from "react-native";
import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AuthStackParamList } from "../../src/navigation/types";
import auth from "@react-native-firebase/auth";
import { COLORS } from "../../src/styles/theme";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
    Easing
} from 'react-native-reanimated';

type LoginScreenProps = NativeStackScreenProps<AuthStackParamList, "Login">;

// --- 📏 LOGIKA SKALOWANIA (RESPONSYWNOŚĆ) ---
const { width, height } = Dimensions.get('window');

// Sprawdzamy, czy to mały ekran (np. iPhone SE, starsze Androidy)
const isSmallDevice = height < 700;

// Funkcja skalująca czcionki/wymiary względem szerokości ekranu
const scale = (size: number) => {
    const scaleFactor = width / 375; // 375 to szerokość standardowego iPhone'a
    const newSize = size * scaleFactor;
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

function LoginScreen({ navigation }: LoginScreenProps) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    // --- Stan formularza ---
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // --- Animacja ---
    const translateY = useSharedValue(0);
    const scaleAnim = useSharedValue(1);

    useEffect(() => {
        translateY.value = withRepeat(
            withSequence(
                withTiming(-8, { duration: 2500, easing: Easing.inOut(Easing.quad) }),
                withTiming(0, { duration: 2500, easing: Easing.inOut(Easing.quad) })
            ), -1, true
        );
        scaleAnim.value = withRepeat(
            withSequence(
                withTiming(1.02, { duration: 2500 }),
                withTiming(1, { duration: 2500 })
            ), -1, true
        );
    }, []);

    const animatedMascotStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }, { scale: scaleAnim.value }]
    }));

    // --- Motywy ---
    const theme = {
        bg: isDark ? COLORS.backgroundDark : '#F0F4F8',
        card: isDark ? COLORS.cardDark : '#FFFFFF',
        text: isDark ? COLORS.textDark : '#1F2937',
        subText: isDark ? COLORS.greyDarkTheme : '#6B7280',
        inputBg: isDark ? '#374151' : '#F3F4F6',
        inputBorder: isDark ? '#4B5563' : 'transparent',
        inputText: isDark ? '#F3F4F6' : '#111827',
        placeholder: isDark ? '#9CA3AF' : '#9CA3AF',
        primary: COLORS.primary,
        shadow: isDark ? 'transparent' : 'rgba(0, 188, 212, 0.3)',
    };

    const handleLogin = async () => {
        if (!email.trim() || !password.trim()) {
            Alert.alert("Ups!", "Wpisz email i hasło.");
            return;
        }
        setLoading(true);
        try {
            await auth().signInWithEmailAndPassword(email.trim(), password);
        } catch (error: any) {
            Alert.alert("Błąd", "Nie udało się zalogować. Sprawdź dane.");
        }
        setLoading(false);
    };

    const handleForgotPassword = async () => {
        if (!email.trim()) {
            Alert.alert("Email", "Podaj email, aby zresetować hasło.");
            return;
        }
        try {
            await auth().sendPasswordResetEmail(email.trim());
            Alert.alert("Gotowe", "Link wysłany!");
        } catch (error) {
            Alert.alert("Błąd", "Nie udało się wysłać emaila.");
        }
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: theme.bg }]}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            // Dzięki temu klawiatura nie zasłania pól
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.bg} />

            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                >

                    {/* --- MASKOTKA ---
                        Wysokość jest dynamiczna: 18% wysokości ekranu dla małych, 22% dla dużych */}
                    <View style={[styles.mascotContainer, { height: height * (isSmallDevice ? 0.18 : 0.22) }]}>
                        <Animated.Image
                            source={require('../../src/assets/fox_mascot.png')}
                            style={[
                                styles.mascotImage,
                                animatedMascotStyle,
                                // Jeśli ekran mały, maskotka też mniejsza
                                { width: isSmallDevice ? 100 : 140, height: isSmallDevice ? 100 : 140 }
                            ]}
                            resizeMode="contain"
                        />
                    </View>

                    {/* --- KARTA --- */}
                    <View style={[styles.card, { backgroundColor: theme.card }]}>

                        <Text style={[styles.title, { color: theme.text }]}>Cześć! 👋</Text>

                        {/* Ukrywamy podtytuł na bardzo małych ekranach, żeby zaoszczędzić miejsce */}
                        {!isSmallDevice && (
                            <Text style={[styles.subtitle, { color: theme.subText }]}>Witaj w MathFun</Text>
                        )}

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

                        <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotBtn}>
                            <Text style={[styles.forgotText, { color: theme.subText }]}>Zapomniałeś?</Text>
                        </TouchableOpacity>

                        <View style={[styles.buttonShadowWrapper, { shadowColor: theme.shadow }]}>
                            <TouchableOpacity
                                style={[styles.loginButton, { backgroundColor: theme.primary }]}
                                onPress={handleLogin}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#FFF" size="small" />
                                ) : (
                                    <Text style={styles.loginButtonText}>Zaloguj się</Text>
                                )}
                            </TouchableOpacity>
                        </View>

                    </View>

                    {/* --- STOPKA ---
                        Używamy flexa, żeby stopka była na dole, ale nie wymuszała scrolla jeśli nie trzeba */}
                    <View style={styles.footerSpacer} />

                    <View style={styles.footer}>
                        <Text style={[styles.footerText, { color: theme.subText }]}>Nie masz konta?</Text>
                        <TouchableOpacity onPress={() => navigation.navigate("Register")}>
                            <Text style={[styles.registerLink, { color: theme.primary }]}>Zarejestruj się</Text>
                        </TouchableOpacity>
                    </View>

                </ScrollView>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        // Centrowanie w pionie - klucz do braku scrollowania na dużych ekranach
        justifyContent: 'center',
        paddingHorizontal: scale(20),
        paddingVertical: isSmallDevice ? 10 : 20,
    },
    mascotContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: isSmallDevice ? 5 : 10,
    },
    mascotImage: {
        // Wymiary są nadpisywane w kodzie inline (zależnie od isSmallDevice)
    },
    card: {
        borderRadius: 28,
        padding: isSmallDevice ? 16 : 24, // Mniejszy padding wewnątrz karty na małych ekranach
        elevation: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
    },
    title: {
        fontSize: scale(24),
        fontWeight: "900",
        textAlign: "center",
        marginBottom: isSmallDevice ? 10 : 5,
        letterSpacing: 0.5,
    },
    subtitle: {
        fontSize: scale(13),
        textAlign: "center",
        marginBottom: 20,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 18,
        paddingHorizontal: 14,
        height: isSmallDevice ? 45 : 52, // Niższe pola na małych ekranach
        marginBottom: isSmallDevice ? 10 : 16,
        borderWidth: 1,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontSize: scale(14),
        fontWeight: '500',
    },
    forgotBtn: {
        alignSelf: 'flex-end',
        marginBottom: isSmallDevice ? 14 : 20,
        padding: 4,
    },
    forgotText: {
        fontSize: scale(12),
        fontWeight: '600',
    },
    buttonShadowWrapper: {
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
        elevation: 6,
    },
    loginButton: {
        height: isSmallDevice ? 48 : 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loginButtonText: {
        color: '#FFFFFF',
        fontSize: scale(16),
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    // Ten element wypycha stopkę, jeśli jest dużo miejsca,
    // ale kurczy się do zera, jeśli miejsca brakuje
    footerSpacer: {
        flexGrow: 0.1,
        minHeight: 10,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: isSmallDevice ? 10 : 20,
    },
    footerText: {
        fontSize: scale(13),
        marginRight: 6,
    },
    registerLink: {
        fontSize: scale(13),
        fontWeight: 'bold',
    },
});

export default LoginScreen;
