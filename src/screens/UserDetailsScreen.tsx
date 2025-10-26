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
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';

// Lista dostępnych ID awatarów
const AVATAR_OPTIONS = [
    'avatar1',
    'avatar2',
    // 'avatar3',
    // ...dodaj resztę ID
];

// Funkcja zwracająca ścieżkę do obrazka na podstawie ID
const getAvatarImage = (avatarName?: string) => {
    switch (avatarName) {
        case 'avatar1':
            return require('../assets/avatar/avatar1.png');
        case 'avatar2':
            return require('../assets/avatar/avatar2.png');
        // case 'avatar3':
        //     return require('../assets/avatar/avatar3.png');
        default:
            return require('../assets/avatar/avatar2.png'); // Domyślny
    }
};

export default function UserDetailsScreen() {
    const user = auth().currentUser;
    const navigation = useNavigation();
    const [userData, setUserData] = useState<{ className: string | null; avatar?: string; firstName?: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);

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
                    setUserData({
                        className: data?.className || 'Brak',
                        avatar: data?.avatar,
                        firstName: data?.firstName
                    });
                } else {
                    setUserData({ className: 'Brak', avatar: 'avatar2', firstName: undefined });
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

    // Ekran ładowania
    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color="#00796B" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.headerTitle}>Szczegóły Użytkownika</Text>

            {/* Awatar jako przycisk otwierający Modal */}
            <TouchableOpacity
                style={styles.avatarContainer}
                onPress={() => setModalVisible(true)}
            >
                <Image
                    source={getAvatarImage(userData?.avatar)}
                    style={styles.avatar} // Styl awatara (został powiększony)
                />
                <View style={styles.editIcon}>
                    {/* Zwiększony rozmiar ikonki ołówka */}
                    <Ionicons name="pencil" size={22} color="#FFFFFF" />
                </View>
            </TouchableOpacity>

            {/* Karta z danymi użytkownika */}
            <View style={styles.card}>
                <View style={styles.row}>
                    <Ionicons name="person-outline" size={24} color="#00796B" />
                    <Text style={styles.label}>Nick:</Text>
                    <Text style={styles.value}>{userData?.firstName || user?.displayName || 'Brak'}</Text>
                </View>

                <View style={styles.row}>
                    <Ionicons name="mail-outline" size={24} color="#00796B" />
                    <Text style={styles.label}>Email:</Text>
                    {/* Tekst emaila, który teraz nie powinien się zawijać */}
                    <Text
                        style={styles.value} // Styl wartości (teraz z flex: 1)
                        numberOfLines={1} // Ogranicza do jednej linii
                        ellipsizeMode='tail' // Dodaje "..." na końcu, jeśli się nie mieści
                    >
                        {user?.email || 'Brak'}
                    </Text>
                </View>

                <View style={styles.row}>
                    <Ionicons name="school-outline" size={24} color="#00796B" />
                    <Text style={styles.label}>Klasa:</Text>
                    <Text style={styles.value}>{userData?.className || 'Brak'}</Text>
                </View>

                <View style={styles.row}>
                    <Ionicons name="shield-checkmark-outline" size={24} color="#00796B" />
                    <Text style={styles.label}>Email potwierdzony:</Text>
                    <Text style={styles.value}>{user?.emailVerified ? 'Tak' : 'Nie'}</Text>
                </View>
            </View>

            {/* Przycisk Powrotu */}
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back-outline" size={20} color="#fff" />
                <Text style={styles.backButtonText}>Powrót</Text>
            </TouchableOpacity>

            {/* Modal do wyboru awatara */}
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
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#F0F4F8', alignItems: 'center' },
    headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#263238', marginVertical: 20, marginBottom: 30 },
    avatarContainer: {
        marginBottom: 30,
        position: 'relative',
    },
    avatar: {
        // --- ✅ POPRAWKA ROZMIARU AWATARA ---
        width: 160,          // Zwiększono szerokość
        height: 160,         // Zwiększono wysokość
        borderRadius: 80,    // Promień = połowa szerokości/wysokości
        borderWidth: 4,
        borderColor: '#FFFFFF',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        backgroundColor: '#E0E0E0',
        resizeMode: 'cover', // Dodano, aby obrazek wypełniał obszar
    },
    editIcon: {
        // --- ✅ POPRAWKA POZYCJI I ROZMIARU IKONKI ---
        position: 'absolute',
        bottom: 8,           // Trochę wyżej
        right: 8,          // Trochę dalej od krawędzi
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        borderRadius: 18,    // Większe kółko
        padding: 7,          // Większy padding
    },
    card: { backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '100%', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 5 },
    row: {
        flexDirection: 'row',
        alignItems: 'center', // Wyśrodkowanie w pionie
        marginBottom: 18,
        // Usunięto flexWrap: 'wrap' - tekst wartości będzie się skracał
    },
    label: { fontSize: 16, fontWeight: '600', color: '#37474F', marginLeft: 15, width: 150 }, // Stała szerokość dla etykiety
    value: {
        // --- ✅ POPRAWKA ZAWIAJANIA TEKSTU ---
        fontSize: 16,
        color: '#455A64',
        marginLeft: 5,
        flex: 1, // Pozwala tekstowi zająć resztę miejsca
        // 'numberOfLines' i 'ellipsizeMode' są dodane w JSX
    },
    backButton: { flexDirection: 'row', backgroundColor: '#00796B', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginTop: 40 },
    backButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },

    // --- Style dla Modala (bez zmian) ---
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