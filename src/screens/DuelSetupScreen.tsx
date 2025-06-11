// src/screens/DuelSetupScreen.tsx

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FriendsStackParamList } from '../App';
import { sendDuelRequest } from '../services/friendService';
import questionsDatabase from '../data/questionsDb.json';

type DuelSetupProps = NativeStackScreenProps<FriendsStackParamList, 'DuelSetup'>;

function DuelSetupScreen({ route, navigation }: DuelSetupProps) {
    const { friendId, friendEmail } = route.params;
    const [selectedGrade, setSelectedGrade] = useState<number | null>(null);
    const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const availableTopics = useMemo(() => {
        if (!selectedGrade) return [];
        const gradeData = (questionsDatabase as any)[String(selectedGrade)];
        return gradeData ? Object.keys(gradeData) : [];
    }, [selectedGrade]);

    const handleStartDuel = async () => {
        if (!selectedGrade || !selectedTopic) {
            Alert.alert("Błąd", "Proszę wybrać klasę i temat do pojedynku.");
            return;
        }
        setLoading(true);
        await sendDuelRequest(friendId, selectedGrade, selectedTopic);
        setLoading(false);

        Alert.alert("Wysłano wyzwanie!", `Zaproszenie do pojedynku na temat "${selectedTopic}" zostało wysłane do ${friendEmail}.`);
        navigation.goBack();
    };

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>Wyzwanie dla {friendEmail}</Text>

            <Text style={styles.subtitle}>1. Wybierz klasę:</Text>
            <View style={styles.buttonContainer}>
                {[4, 5, 6, 7].map(grade => (
                    <TouchableOpacity
                        key={grade}
                        style={[styles.choiceButton, selectedGrade === grade && styles.selectedButton]}
                        onPress={() => { setSelectedGrade(grade); setSelectedTopic(null); }}
                    >
                        <Text style={styles.choiceText}>Klasa {grade}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {selectedGrade && (
                <>
                    <Text style={styles.subtitle}>2. Wybierz temat:</Text>
                    <View style={styles.buttonContainer}>
                        {availableTopics.map(topic => (
                            <TouchableOpacity
                                key={topic}
                                style={[styles.choiceButton, selectedTopic === topic && styles.selectedButton]}
                                onPress={() => setSelectedTopic(topic)}
                            >
                                <Text style={styles.choiceText}>{topic}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </>
            )}

            {loading ? (
                <ActivityIndicator size="large" color="#4CAF50" style={{ marginTop: 20 }} />
            ) : (
                <TouchableOpacity style={[styles.duelButton, (!selectedGrade || !selectedTopic) && styles.disabledButton]} onPress={handleStartDuel} disabled={!selectedGrade || !selectedTopic}>
                    <Text style={styles.duelButtonText}>Wyślij wyzwanie!</Text>
                </TouchableOpacity>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#f0f4f8' },
    title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    subtitle: { fontSize: 18, color: '#555', marginBottom: 10, alignSelf: 'flex-start', marginLeft: 5 },
    buttonContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', marginBottom: 20 },
    choiceButton: { padding: 12, backgroundColor: '#fff', margin: 5, borderRadius: 8, elevation: 2, borderWidth: 2, borderColor: 'transparent' },
    selectedButton: { borderColor: '#00BCD4', backgroundColor: '#e0f7fa' },
    choiceText: { fontSize: 16 },
    duelButton: { backgroundColor: '#4CAF50', padding: 15, borderRadius: 25, width: '90%', alignItems: 'center', alignSelf: 'center', marginTop: 20, marginBottom: 40 },
    duelButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    disabledButton: { backgroundColor: '#a5d6a7' },
});

export default DuelSetupScreen;
