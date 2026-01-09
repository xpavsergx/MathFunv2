// src/screens/UserDetailsScreen.tsx

import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
    Image, Modal, FlatList, Alert, TextInput, Platform,
    KeyboardAvoidingView, ScrollView, SafeAreaView, useColorScheme, StatusBar
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { COLORS, FONT_SIZES, PADDING, MARGIN } from '../styles/theme';
import { getAvatarImage } from '../utils/avatarUtils';

interface UserData {
    userClass: string | null;
    avatar?: string;
    firstName?: string;
    unlockedAvatars?: string[];
}

export default function UserDetailsScreen() {
    const user = auth().currentUser;
    const navigation = useNavigation();
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';

    const [userData, setUserData] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [firstName, setFirstName] = useState('');
    const [className, setClassName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [availableAvatars, setAvailableAvatars] = useState<string[]>([]);

    const themeStyles = {
        container: { backgroundColor: isDarkMode ? COLORS.backgroundDark : '#F0F4F8' },
        card: { backgroundColor: isDarkMode ? COLORS.cardDark : COLORS.white },
        text: { color: isDarkMode ? COLORS.textDark : COLORS.textLight },
        subtitleColor: isDarkMode ? COLORS.greyDarkTheme : COLORS.grey,
        input: {
            color: isDarkMode ? COLORS.textDark : COLORS.textLight,
            borderColor: isDarkMode ? COLORS.greyDarkTheme : '#E5E7EB',
            backgroundColor: isDarkMode ? '#2C2C2E' : '#F9FAFB',
        },
        primaryColor: isDarkMode ? COLORS.primaryDarkTheme : COLORS.primary,
    };

    useEffect(() => {
        if (!user) { setLoading(false); return; }
        const unsubscribe = firestore().collection('users').doc(user.uid).onSnapshot(doc => {
            if (doc.exists) {
                const data = doc.data() as UserData;
                const fName = data?.firstName || user?.displayName || '';
                const cName = data?.userClass || 'Brak';
                setUserData({
                    userClass: cName,
                    avatar: data?.avatar,
                    firstName: fName,
                    unlockedAvatars: data?.unlockedAvatars || []
                });
                setFirstName(fName);
                setClassName(cName);
                setAvailableAvatars(['avatar1', 'avatar2', 'avatar3', ...(data?.unlockedAvatars || [])]);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [user]);

    const handleSaveDetails = async () => {
        if (!user) return;
        setIsSaving(true);
        try {
            await firestore().collection('users').doc(user.uid).set({
                firstName: firstName,
                userClass: className,
            }, { merge: true });
            Alert.alert("Sukces!", "Twoje dane zostały pomyślnie zaktualizowane.");
            setIsEditing(false);
        } catch (error) {
            Alert.alert("Błąd", "Nie udało się zaktualizować danych.");
        }
        setIsSaving(false);
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.safeArea, themeStyles.container, { justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color={themeStyles.primaryColor} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.safeArea, themeStyles.container]}>
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scrollContainer}>

                    {/* Powiększony Awatar z obramowaniem */}
                    <View style={styles.avatarWrapper}>
                        <View style={[styles.avatarOuterRing, { borderColor: themeStyles.primaryColor }]}>
                            <View style={styles.avatarInnerCircle}>
                                <Image
                                    source={getAvatarImage(userData?.avatar)}
                                    style={styles.avatarImage}
                                />
                            </View>
                        </View>
                        <TouchableOpacity
                            style={[styles.editIconButton, { backgroundColor: themeStyles.primaryColor }]}
                            onPress={() => setModalVisible(true)}
                        >
                            <Ionicons name="camera" size={24} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>

                    {/* Karta Danych */}
                    <View style={[styles.infoCard, themeStyles.card]}>
                        <Text style={[styles.sectionTitle, themeStyles.text]}>Informacje osobiste</Text>

                        {/* Pole Nick */}
                        <View style={styles.inputRow}>
                            <Ionicons name="person-outline" size={24} color={themeStyles.primaryColor} />
                            <View style={styles.inputContainer}>
                                <Text style={[styles.label, { color: themeStyles.subtitleColor }]}>Nick</Text>
                                {isEditing ? (
                                    <TextInput
                                        style={[styles.textInput, themeStyles.input]}
                                        value={firstName}
                                        onChangeText={setFirstName}
                                    />
                                ) : (
                                    <Text style={[styles.valueText, themeStyles.text]}>{firstName || 'Nie ustawiono'}</Text>
                                )}
                            </View>
                        </View>

                        {/* Pole Email */}
                        <View style={styles.inputRow}>
                            <Ionicons name="mail-outline" size={24} color={themeStyles.primaryColor} />
                            <View style={styles.inputContainer}>
                                <Text style={[styles.label, { color: themeStyles.subtitleColor }]}>Email</Text>
                                <Text style={[styles.valueText, themeStyles.text]}>{user?.email}</Text>
                            </View>
                        </View>

                        {/* Pole Klasa */}
                        <View style={styles.inputRow}>
                            <Ionicons name="school-outline" size={24} color={themeStyles.primaryColor} />
                            <View style={styles.inputContainer}>
                                <Text style={[styles.label, { color: themeStyles.subtitleColor }]}>Klasa</Text>
                                {isEditing ? (
                                    <TextInput
                                        style={[styles.textInput, themeStyles.input]}
                                        value={className}
                                        onChangeText={setClassName}
                                        keyboardType="numeric"
                                    />
                                ) : (
                                    <Text style={[styles.valueText, themeStyles.text]}>Klasa {className}</Text>
                                )}
                            </View>
                        </View>

                        {/* ✅ DODANE: Pole Potwierdzony */}
                        <View style={styles.inputRow}>
                            <Ionicons name="shield-checkmark-outline" size={24} color={themeStyles.primaryColor} />
                            <View style={styles.inputContainer}>
                                <Text style={[styles.label, { color: themeStyles.subtitleColor }]}>Potwierdzony</Text>
                                <Text style={[styles.valueText, themeStyles.text]}>
                                    {user?.emailVerified ? 'Tak' : 'Nie'}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Przyciski Akcji */}
                    <View style={styles.buttonContainer}>
                        {isEditing ? (
                            <View style={styles.editActions}>
                                <TouchableOpacity
                                    style={[styles.actionButton, { backgroundColor: COLORS.correct }]}
                                    onPress={handleSaveDetails}
                                >
                                    {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Zapisz</Text>}
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.actionButton, { backgroundColor: COLORS.grey }]}
                                    onPress={() => setIsEditing(false)}
                                >
                                    <Text style={styles.buttonText}>Anuluj</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <TouchableOpacity
                                style={[styles.mainButton, { backgroundColor: themeStyles.primaryColor }]}
                                onPress={() => setIsEditing(true)}
                            >
                                <Ionicons name="create-outline" size={20} color="#fff" />
                                <Text style={[styles.buttonText, { marginLeft: 8 }]}>Edytuj dane</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                </ScrollView>
            </KeyboardAvoidingView>

            {/* Modal wyboru awatara */}
            <Modal visible={modalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, themeStyles.card]}>
                        <Text style={[styles.modalTitle, themeStyles.text]}>Wybierz postać</Text>
                        <FlatList
                            data={availableAvatars}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            keyExtractor={(item) => item}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.avatarOptionWrapper}
                                    onPress={() => {
                                        firestore().collection('users').doc(user?.uid).update({ avatar: item });
                                        setModalVisible(false);
                                    }}
                                >
                                    <Image source={getAvatarImage(item)} style={styles.avatarOption} />
                                </TouchableOpacity>
                            )}
                        />
                        <TouchableOpacity style={styles.closeModal} onPress={() => setModalVisible(false)}>
                            <Text style={{ color: themeStyles.primaryColor, fontWeight: 'bold' }}>Zamknij</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    scrollContainer: { paddingBottom: 40, paddingTop: 20 },

    // Powiększony Avatar
    avatarWrapper: { alignSelf: 'center', marginBottom: 30, position: 'relative' },
    avatarOuterRing: {
        width: 180, // Powiększone
        height: 180, // Powiększone
        borderRadius: 90,
        borderWidth: 5,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    avatarInnerCircle: {
        width: 164,
        height: 164,
        borderRadius: 82,
        backgroundColor: '#FFFFFF',
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarImage: { width: 130, height: 130, resizeMode: 'contain' },
    editIconButton: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: '#fff',
    },

    // Info Card
    infoCard: {
        marginHorizontal: PADDING.medium,
        borderRadius: 20,
        padding: PADDING.large,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 25 },
    inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
    inputContainer: { marginLeft: 15, flex: 1 },
    label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 2, letterSpacing: 0.5 },
    valueText: { fontSize: 17, fontWeight: '500' },
    textInput: {
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 16,
        marginTop: 5,
    },

    // Buttons
    buttonContainer: { paddingHorizontal: PADDING.medium, marginTop: 30 },
    mainButton: {
        flexDirection: 'row',
        height: 55,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 3,
    },
    editActions: { flexDirection: 'row', justifyContent: 'space-between' },
    actionButton: { flex: 0.48, height: 55, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
    buttonText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '90%', borderRadius: 25, padding: 25, alignItems: 'center' },
    modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
    avatarOptionWrapper: { padding: 10 },
    avatarOption: { width: 90, height: 90, resizeMode: 'contain' },
    closeModal: { marginTop: 20, padding: 10 }
});