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
    ImageBackground, // --- 1. IMPORTUJ ImageBackground ---
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';

// --- 2. ZDEFINIUJ ŚCIEŻKĘ DO TŁA ---
// (Na podstawie twojego zrzutu ekranu)
const backgroundImage = require('../assets/background.jpg');

// Lista dostępnych ID awatarów
const AVATAR_OPTIONS = [
    'avatar1',
    'avatar2',
    'avatar3',
    // ...dodaj resztę ID
];

// Funkcja zwracająca ścieżkę do obrazka na podstawie ID
const getAvatarImage = (avatarName?: string) => {
    switch (avatarName) {
        case 'avatar1':
            return require('../assets/avatar/avatar1.png');
        case 'avatar2':
            return require('../assets/avatar/avatar2.png');
        case 'avatar3':
            return require('../assets/avatar/avatar3.png');
        default:
            return require('../assets/avatar/avatar1.png'); // Domyślny
    }
};

export default function UserDetailsScreen() {
    const user = auth().currentUser;
    const navigation = useNavigation();
    const [userData, setUserData] = useState<{ className: string | null; avatar?: string; firstName?: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);

    // Stany do edycji
    const [firstName, setFirstName] = useState('');
    const [className, setClassName] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const [isEditing, setIsEditing] = useState(false);

    // Pobieranie danych użytkownika z Firestore
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
                    const data = doc.data();
                    const fName = data?.firstName || user?.displayName || '';
                    const cName = data?.className || 'Brak';

                    setUserData({
                        className: cName,
                        avatar: data?.avatar,
                        firstName: fName
                    });
                    setFirstName(fName);
                    setClassName(cName);

                } else {
                    const fName = user?.displayName || '';
                    setUserData({ className: 'Brak', avatar: 'avatar2', firstName: fName });
                    setFirstName(fName);
                    setClassName('Brak');
                }
                setLoading(false);
            }, error => {
                console.error("Błąd pobierania danych użytkownika:", error);
                setUserData(null);
                setLoading(false);
            });
        return () => unsubscribe();
    }, [user]);

    // Funkcja zapisująca wybrany awatar do Firestore
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

    // Funkcja do zapisu danych
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
            setIsEditing(false); // Wyłącz tryb edycji po zapisie

        } catch (error) {
            console.error("Błąd zapisu danych:", error);
            Alert.alert("Błąd", "Nie udało się zaktualizować danych.");
        }
        setIsSaving(false);
    };

    // Funkcja do anulowania edycji
    const handleCancelEdit = () => {
        // Przywróć oryginalne wartości
        setFirstName(userData?.firstName || '');
        setClassName(userData?.className || 'Brak');
        // Wyłącz tryb edycji
        setIsEditing(false);
    };

    // Ekran ładowania
    if (loading) {
        return (
            // --- 3. DODAJ TŁO TAKŻE DO EKRANU ŁADOWANIA ---
            <ImageBackground source={backgroundImage} style={styles.background}>
                <View style={[styles.container, { justifyContent: 'center' }]}>
                    <ActivityIndicator size="large" color="#00796B" />
                </View>
            </ImageBackground>
        );
    }

    return (
        // --- 4. OWIŃ CAŁY EKRAN W TŁO ---
        <ImageBackground source={backgroundImage} style={styles.background}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
            >
                <ScrollView contentContainerStyle={styles.scrollContainer}>
                    {/* Container jest teraz przezroczysty */}
                    <View style={styles.container}>

                        {/* Tytuł zostaje, zgodnie z twoim kodem */}
                        <Text style={styles.headerTitle}>Szczegóły Użytkownika</Text>

                        <View style={styles.avatarWrapper}>
                            <TouchableOpacity
                                style={styles.avatarContainer}
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


                        <View style={styles.card}>

                            <View style={styles.row}>
                                <Ionicons name="person-outline" size={24} color="#00796B" />
                                <Text style={styles.label}>Nick:</Text>
                                {isEditing ? (
                                    <TextInput
                                        style={styles.input}
                                        value={firstName}
                                        onChangeText={setFirstName}
                                        placeholder="Wpisz nick"
                                        placeholderTextColor="#AAA"
                                    />
                                ) : (
                                    <Text style={styles.value}>{firstName || 'Brak'}</Text>
                                )}
                            </View>

                            <View style={styles.row}>
                                <Ionicons name="mail-outline" size={24} color="#00796B" />
                                <Text style={styles.label}>Email:</Text>
                                <Text
                                    style={[styles.value, styles.readOnlyValue]}
                                    numberOfLines={1}
                                    ellipsizeMode='tail'
                                >
                                    {user?.email || 'Brak'}
                                </Text>
                            </View>

                            <View style={styles.row}>
                                <Ionicons name="school-outline" size={24} color="#00796B" />
                                <Text style={styles.label}>Klasa:</Text>
                                {isEditing ? (
                                    <TextInput
                                        style={styles.input}
                                        value={className}
                                        onChangeText={setClassName}
                                        placeholder="Wpisz klasę"
                                        placeholderTextColor="#AAA"
                                    />
                                ) : (
                                    <Text style={styles.value}>{className || 'Brak'}</Text>
                                )}
                            </View>

                            <View style={styles.row}>
                                <Ionicons name="shield-checkmark-outline" size={24} color="#00796B" />
                                <Text style={styles.label}>Potwierdzony:</Text>
                                <Text style={[styles.value, styles.readOnlyValue]}>
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
                                            <Text style={styles.saveButtonText}>Zapisz zmiany</Text>
                                        </>
                                    )}
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.cancelButton} onPress={handleCancelEdit} disabled={isSaving}>
                                    <Ionicons name="close-outline" size={20} color="#fff" />
                                    <Text style={styles.cancelButtonText}>Anuluj</Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                <TouchableOpacity style={styles.editDataButton} onPress={() => setIsEditing(true)}>
                                    <Ionicons name="pencil-outline" size={20} color="#fff" />
                                    <Text style={styles.editDataButtonText}>Edytuj dane</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                                    <Ionicons name="arrow-back-outline" size={20} color="#fff" />
                                    <Text style={styles.backButtonText}>Powrót</Text>
                                </TouchableOpacity>
                            </>
                        )}


                        {/* Modal (bez zmian) ... */}
                        <Modal
                            animationType="fade"
                            transparent={true}
                            visible={modalVisible}
                            onRequestClose={() => setModalVisible(false)}
                        >
                            <View style={styles.modalOverlay}>
                                <View style={styles.modalContent}>
                                    <Text style={styles.modalTitle}>Wybierz awatar</Text>
                                    <FlatList
                                        data={AVATAR_OPTIONS}
                                        numColumns={3}
                                        keyExtractor={(item) => item}
                                        renderItem={({ item }) => (
                                            <TouchableOpacity
                                                style={styles.avatarOption}
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
                                        <Text style={styles.modalCancelText}>Anuluj</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </Modal>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    // --- 5. NOWY STYL DLA TŁA ---
    background: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    scrollContainer: {
        flexGrow: 1,
    },
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: 'transparent', // --- ZMIANA TŁA ---
        alignItems: 'center'
    },
    headerTitle: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#FFFFFF', // ZMIANA: Lepszy kontrast na nowym tle
        marginVertical: 20,
        marginBottom: 30,
        // Dodanie cienia do tekstu dla lepszej czytelności
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },

    avatarWrapper: {
        width: 180,
        height: 180,
        marginBottom: 30,
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarContainer: {
        width: '100%',
        height: '100%',
        borderRadius: 90,
        borderWidth: 4,
        borderColor: '#FFFFFF',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        // --- ✅ JEDYNA ZMIANA TUTAJ ---
        backgroundColor: 'transparent', // Zamiast '#E0E0E0'
        // --- KONIEC ZMIANY ---
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
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
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
        marginBottom: 25,
    },
    label: {
        fontSize: 18,
        fontWeight: '600',
        color: '#37474F',
        marginLeft: 10,
        width: 130, // Stała szerokość dla wyrównania
    },
    // Styl tekstu (gdy nie edytujesz)
    value: {
        fontSize: 18,
        color: '#455A64',
        marginLeft: 5,
        flex: 1,
        paddingVertical: 6,
    },
    // Styl pola edycji (gdy edytujesz)
    input: {
        flex: 1,
        fontSize: 18,
        color: '#333333',
        borderBottomWidth: 1,
        borderColor: '#B0B0B0',
        paddingVertical: 5,
        marginLeft: 5,
    },
    // Styl tekstu tylko do odczytu (email, potwierdzenie)
    readOnlyValue: {
        color: '#757575',
        flex: 1,
        fontSize: 18,
        marginLeft: 5,
        paddingVertical: 6,
    },

    // Przyciski (bez zmian szerokości)
    saveButton: {
        flexDirection: 'row',
        backgroundColor: '#00796B',
        paddingVertical: 14,
        paddingHorizontal: 30,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 30,
        elevation: 3,
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 10,
    },
    editDataButton: {
        flexDirection: 'row',
        backgroundColor: '#2563EB',
        paddingVertical: 14,
        paddingHorizontal: 30,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 30,
        elevation: 3,
    },
    editDataButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 10,
    },
    cancelButton: {
        flexDirection: 'row',
        backgroundColor: '#6C757D',
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 15,
    },
    cancelButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 10,
    },
    backButton: {
        flexDirection: 'row',
        backgroundColor: '#00796B',
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 15,
    },
    backButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },

    // Style modala (bez zmian)
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    modalContent: {
        width: '90%',
        maxWidth: 400,
        backgroundColor: 'white',
        borderRadius: 20,
        paddingVertical: 30,
        paddingHorizontal: 20,
        alignItems: 'center',
        elevation: 10,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 30,
    },
    avatarOption: {
        margin: 12,
        borderWidth: 3,
        borderColor: '#DDD',
        borderRadius: 50,
        padding: 3,
    },
    avatarOptionImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
    },
    modalCancelButton: {
        marginTop: 25,
        paddingVertical: 10,
        paddingHorizontal: 20,
    },
    modalCancelText: {
        fontSize: 18,
        color: '#6B7280',
        fontWeight: '500',
    },
});

