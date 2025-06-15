import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';

export default function UserDetailsScreen() {
    const user = auth().currentUser;
    const navigation = useNavigation();
    const [className, setClassName] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const fetchUserData = async () => {
            try {
                const doc = await firestore().collection('users').doc(user.uid).get();
                if (doc.exists) {
                    const data = doc.data();
                    setClassName(data?.className || 'Brak');
                } else {
                    setClassName('Brak');
                }
            } catch (error) {
                console.error("Błąd pobierania danych użytkownika:", error);
                setClassName('Błąd');
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, [user]);

    return (
        <View style={styles.container}>
            <Text style={styles.headerTitle}>Szczegóły Użytkownika</Text>

            <View style={styles.card}>
                <View style={styles.row}>
                    <Ionicons name="person-outline" size={24} color="#00796B" />
                    <Text style={styles.label}>Nick:</Text>
                    <Text style={styles.value}>{user?.displayName || 'Brak'}</Text>
                </View>

                <View style={styles.row}>
                    <Ionicons name="mail-outline" size={24} color="#00796B" />
                    <Text style={styles.label}>Email:</Text>
                    <Text style={styles.value}>{user?.email || 'Brak'}</Text>
                </View>

                <View style={styles.row}>
                    <Ionicons name="school-outline" size={24} color="#00796B" />
                    <Text style={styles.label}>Klasa:</Text>
                    {loading ? (
                        <ActivityIndicator size="small" color="#00796B" style={{ marginLeft: 10 }} />
                    ) : (
                        <Text style={styles.value}>{className}</Text>
                    )}
                </View>

                <View style={styles.row}>
                    <Ionicons name="shield-checkmark-outline" size={24} color="#00796B" />
                    <Text style={styles.label}>Email potwierdzony:</Text>
                    <Text style={styles.value}>{user?.emailVerified ? 'Tak' : 'Nie'}</Text>
                </View>
            </View>

            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back-outline" size={20} color="#fff" />
                <Text style={styles.backButtonText}>Powrót</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#F0F4F8', alignItems: 'center' },
    headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#263238', marginVertical: 20 },
    card: { backgroundColor: '#fff', borderRadius: 12, padding: 20, width: '100%', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
    row: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, flexWrap: 'wrap' },
    label: { fontSize: 16, fontWeight: '600', color: '#37474F', marginLeft: 10 },
    value: { fontSize: 16, color: '#455A64', marginLeft: 5, flexShrink: 1 },
    backButton: { flexDirection: 'row', backgroundColor: '#00796B', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginTop: 30 },
    backButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
});
