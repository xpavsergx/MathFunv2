// src/screens/UserDetailsScreen.tsx

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Image,
    Modal,
    FlatList,
    Alert,
    TextInput,
    Platform,
    KeyboardAvoidingView,
    ScrollView,
    SafeAreaView,
    useColorScheme,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { COLORS, FONT_SIZES, PADDING, MARGIN } from '../styles/theme';
import { getAvatarImage } from '../utils/avatarUtils';

interface UserData {
    className: string | null;
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

    // Динамічні стилі
    const themeStyles = {
        background: { backgroundColor: isDarkMode ? COLORS.backgroundDark : '#F0F4F8' },
        card: { backgroundColor: isDarkMode ? COLORS.cardDark : COLORS.white },
        text: { color: isDarkMode ? COLORS.textDark : COLORS.textLight },
        textSecondary: { color: isDarkMode ? COLORS.greyDarkTheme : COLORS.grey },
        input: {
            color: isDarkMode ? COLORS.textDark : COLORS.textLight,
            borderColor: isDarkMode ? COLORS.greyDarkTheme : '#B0B0B0',
        },
        primaryColor: isDarkMode ? COLORS.primaryDarkTheme : COLORS.primary,
    };

    // (useEffect, handleUpdateAvatar, handleSaveDetails, handleCancelEdit - без змін)
    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }
        const unsubscribe = firestore()
            .collection('users')
            .doc(user.uid)
            .onSnapshot(doc => {
                if (doc.exists) {
                    const data = doc.data() as UserData;
                    const fName = data?.firstName || user?.displayName || '';
                    const cName = data?.className || 'Brak';

                    setUserData({
                        className: cName,
                        avatar: data?.avatar,
                        firstName: fName,
                        unlockedAvatars: data?.unlockedAvatars || []
                    });
                    setFirstName(fName);
                    setClassName(cName);

                    setAvailableAvatars([
                        'avatar1', 'avatar2', 'avatar3',
                        ...(data?.unlockedAvatars || [])
                    ]);

                } else {
                    const fName = user?.displayName || '';
                    setUserData({ className: 'Brak', avatar: 'avatar2', firstName: fName, unlockedAvatars: [] });
                    setFirstName(fName);
                    setClassName('Brak');
                    setAvailableAvatars(['avatar1', 'avatar2', 'avatar3']);
                }
                setLoading(false);
            }, error => {
                console.error("Błąd pobierania danych użytkownika:", error);
                setUserData(null);
                setLoading(false);
            });
        return () => unsubscribe();
    }, [user]);

    const handleUpdateAvatar = async (avatarId: string) => {
        if (!user) return;
        try {
            await firestore().collection('users').doc(user.uid).update({
                avatar: avatarId
            });
            setModalVisible(false);
        } catch (error) {
            console.error("Błąd zapisu awatara:", error);
            Alert.alert("Błąd", "Nie udało się zapisać awatara.");
        }
    };

    const handleSaveDetails = async () => {
        if (!user) return;
        setIsSaving(true);
        try {
            const dataToSave = {
                firstName: firstName,
                className: className,
            };
            await firestore().collection('users').doc(user.uid).set(dataToSave, { merge: true });

            if (user.displayName !== firstName) {
                await user.updateProfile({
                    displayName: firstName
                });
            }

            Alert.alert("Sukces!", "Twoje dane zostały pomyślnie zaktualizowane.");
            setIsEditing(false);

        } catch (error) {
            console.error("Błąd zapisu danych:", error);
            Alert.alert("Błąd", "Nie udało się zaktualizować danych.");
        }
        setIsSaving(false);
    };

    const handleCancelEdit = () => {
        setFirstName(userData?.firstName || '');
        setClassName(userData?.className || 'Brak');
        setIsEditing(false);
    };


    if (loading) {
        return (
            <SafeAreaView style={[styles.safeArea, themeStyles.background, { justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color={themeStyles.primaryColor} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.safeArea, themeStyles.background]}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
            >
                <ScrollView contentContainerStyle={styles.scrollContainer}>

                    <View style={styles.avatarWrapper}>
                        <TouchableOpacity
                            style={[styles.avatarContainer, {borderColor: themeStyles.card.backgroundColor}]}
                            onPress={() => setModalVisible(true)}
                            activeOpacity={0.9}
                        >
                            <Image
                                source={getAvatarImage(userData?.avatar)}
                                style={styles.avatar}
                            />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.editButton}
                            onPress={() => setModalVisible(true)}
                        >
                            <Ionicons name="pencil" size={22} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>


                    <View style={[styles.card, themeStyles.card]}>
                        <View style={styles.row}>
                            <Ionicons name="person-outline" size={24} color={themeStyles.primaryColor} />
                            <Text style={[styles.label, themeStyles.textSecondary]}>Nick:</Text>
                            {isEditing ? (
                                <TextInput
                                    style={[styles.input, themeStyles.input]}
                                    value={firstName}
                                    onChangeText={setFirstName}
                                    placeholder="Wpisz nick"
                                    placeholderTextColor={themeStyles.textSecondary.color}
                                />
                            ) : (
                                <Text style={[styles.value, themeStyles.text]}>{firstName || 'Brak'}</Text>
                            )}
                        </View>

                        <View style={styles.row}>
                            <Ionicons name="mail-outline" size={24} color={themeStyles.primaryColor} />
                            <Text style={[styles.label, themeStyles.textSecondary]}>Email:</Text>
                            <Text
                                style={[styles.value, themeStyles.textSecondary]}
                                numberOfLines={1}
                                ellipsizeMode='tail'
                            >
                                {user?.email || 'Brak'}
                            </Text>
                        </View>

                        <View style={styles.row}>
                            <Ionicons name="school-outline" size={24} color={themeStyles.primaryColor} />
                            <Text style={[styles.label, themeStyles.textSecondary]}>Klasa:</Text>
                            {isEditing ? (
                                <TextInput
                                    style={[styles.input, themeStyles.input]}
                                    value={className}
                                    onChangeText={setClassName}
                                    placeholder="Wpisz klasę"
                                    placeholderTextColor={themeStyles.textSecondary.color}
                                />
                            ) : (
                                <Text style={[styles.value, themeStyles.text]}>{className || 'Brak'}</Text>
                            )}
                        </View>

                        <View style={styles.row}>
                            <Ionicons name="shield-checkmark-outline" size={24} color={themeStyles.primaryColor} />
                            <Text style={[styles.label, themeStyles.textSecondary]}>Potwierdzony:</Text>
                            <Text style={[styles.value, themeStyles.textSecondary]}>
                                {user?.emailVerified ? 'Tak' : 'Nie'}
                            </Text>
                        </View>
                    </View>

                    {isEditing ? (
                        <>
                            <TouchableOpacity style={styles.saveButton} onPress={handleSaveDetails} disabled={isSaving}>
                                {isSaving ? (
                                    <ActivityIndicator color="#FFFFFF" />
                                ) : (
                                    <>
                                        <Ionicons name="save-outline" size={20} color="#fff" />
                                        <Text style={styles.buttonText}>Zapisz zmiany</Text>
                                    </>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.cancelButton} onPress={handleCancelEdit} disabled={isSaving}>
                                <Ionicons name="close-outline" size={20} color="#fff" />
                                <Text style={styles.buttonText}>Anuluj</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            <TouchableOpacity style={styles.editDataButton} onPress={() => setIsEditing(true)}>
                                <Ionicons name="pencil-outline" size={20} color="#fff" />
                                <Text style={styles.buttonText}>Edytuj dane</Text>
                            </TouchableOpacity>
                        </>
                    )}


                    <Modal
                        animationType="fade"
                        transparent={true}
                        visible={modalVisible}
                        onRequestClose={() => setModalVisible(false)}
                    >
                        <View style={styles.modalOverlay}>
                            <View style={[styles.modalContent, themeStyles.card]}>
                                <Text style={[styles.modalTitle, themeStyles.text]}>Wybierz awatar</Text>

                                {/* --- ✅ ОСЬ ТУТ ЗМІНИ --- */}
                                <FlatList
                                    data={availableAvatars}
                                    horizontal={true} // <-- 1. Додано
                                    showsHorizontalScrollIndicator={false} // <-- 2. Додано (для чистоти)
                                    // numColumns={3} // <-- 3. Видалено
                                    keyExtractor={(item) => item}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={[
                                                styles.avatarOption,
                                                {borderColor: themeStyles.textSecondary.color},
                                                userData?.avatar === item && {borderColor: themeStyles.primaryColor}
                                            ]}
                                            onPress={() => handleUpdateAvatar(item)}
                                        >
                                            <Image
                                                source={getAvatarImage(item)}
                                                style={styles.avatarOptionImage}
                                            />
                                        </TouchableOpacity>
                                    )}
                                />
                                <TouchableOpacity
                                    style={styles.modalCancelButton}
                                    onPress={() => setModalVisible(false)}
                                >
                                    <Text style={[styles.modalCancelText, themeStyles.textSecondary]}>Anuluj</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Modal>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    scrollContainer: {
        flexGrow: 1,
        alignItems: 'center',
        padding: PADDING.medium,
        paddingTop: PADDING.large,
    },
    avatarWrapper: {
        width: 180,
        height: 180,
        marginBottom: MARGIN.large,
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarContainer: {
        width: '100%',
        height: '100%',
        borderRadius: 90,
        borderWidth: 4,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        backgroundColor: 'transparent',
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatar: {
        width: '100%',
        height: '100%',
        resizeMode: 'contain',
    },
    editButton: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        borderRadius: 20,
        padding: 8,
        elevation: 6,
    },
    card: {
        borderRadius: 16,
        padding: PADDING.large,
        width: '100%',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: MARGIN.large,
    },
    label: {
        fontSize: FONT_SIZES.medium,
        fontWeight: '600',
        marginLeft: MARGIN.small,
        width: 130,
    },
    value: {
        fontSize: FONT_SIZES.medium,
        marginLeft: MARGIN.small,
        flex: 1,
        paddingVertical: 6,
    },
    input: {
        flex: 1,
        fontSize: FONT_SIZES.medium,
        borderBottomWidth: 1,
        paddingVertical: 5,
        marginLeft: MARGIN.small,
    },
    saveButton: {
        flexDirection: 'row',
        backgroundColor: COLORS.primary,
        paddingVertical: PADDING.medium,
        paddingHorizontal: PADDING.large,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: MARGIN.large,
        elevation: 3,
        width: '100%',
    },
    buttonText: {
        color: COLORS.white,
        fontSize: FONT_SIZES.medium,
        fontWeight: 'bold',
        marginLeft: MARGIN.small,
    },
    editDataButton: {
        flexDirection: 'row',
        backgroundColor: '#2563EB',
        paddingVertical: PADDING.medium,
        paddingHorizontal: PADDING.large,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: MARGIN.large,
        elevation: 3,
        width: '100%',
    },
    cancelButton: {
        flexDirection: 'row',
        backgroundColor: COLORS.grey,
        paddingVertical: PADDING.small,
        paddingHorizontal: PADDING.large,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: MARGIN.medium,
        width: '100%',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    modalContent: {
        width: '90%',
        maxWidth: 400,
        borderRadius: 20,
        paddingVertical: PADDING.large,
        paddingHorizontal: PADDING.medium,
        alignItems: 'center',
        elevation: 10,
    },
    modalTitle: {
        fontSize: FONT_SIZES.xlarge,
        fontWeight: 'bold',
        marginBottom: MARGIN.medium,
    },
    avatarOption: {
        margin: MARGIN.small,
        borderWidth: 3,
        borderRadius: 50,
        padding: 3,
    },
    avatarOptionImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
    },
    modalCancelButton: {
        marginTop: MARGIN.medium,
        paddingVertical: PADDING.small,
        paddingHorizontal: PADDING.medium,
    },
    modalCancelText: {
        fontSize: FONT_SIZES.medium,
        fontWeight: '500',
    },
});
