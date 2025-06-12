import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { TheoryStackParamList } from '../../App'; // Імпортуємо типи з App.tsx
import questionsDatabase from '../data/questionsDb.json'; // Шлях до бази питань

// Тип для частини бази даних, що стосується підтем конкретного розділу
type TopicData = {
    [subTopic: string]: any; // Нас цікавлять ключі-назви підтем
    // Або, якщо ми змінимо структуру questionsDb.json:
    // [subTopic: string]: { theoryTitle?: string; theoryContent?: any[]; questions?: any[] };
};

// Тип для questionsDb.json в цілому
type QuestionsDatabaseType = {
    [grade: string]: {
        [topic: string]: TopicData; // Розділ містить об'єкт підтем
    };
};

type TheorySubTopicListScreenProps = NativeStackScreenProps<TheoryStackParamList, 'TheorySubTopicList'>;

function TheorySubTopicListScreen({ route, navigation }: TheorySubTopicListScreenProps) {
    const { grade, topic } = route.params;
    const db: QuestionsDatabaseType = questionsDatabase as QuestionsDatabaseType; // Приведення типу

    const subTopics = useMemo(() => {
        const gradeData = db[grade];
        if (!gradeData) return [];
        const topicData = gradeData[topic];
        if (!topicData) return [];
        // Отримуємо ключі (назви підтем) з об'єкта topicData
        // Це передбачає, що кожна підтема є ключем в об'єкті 'topicData'
        return Object.keys(topicData);
    }, [db, grade, topic]);

    const handleSubTopicPress = (subTopic: string) => {
        // Навігуємо на екран з детальною теорією для обраної підтеми
        navigation.navigate('TheoryDetail', {
            grade: grade,
            topic: topic,
            subTopic: subTopic,
        });
    };

    const renderSubTopicItem = ({ item }: { item: string }) => (
        <TouchableOpacity
            style={styles.itemContainer}
            onPress={() => handleSubTopicPress(item)}
        >
            <Text style={styles.itemText}>{item}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Podtematy dla: {topic}</Text>
            {subTopics.length > 0 ? (
                <FlatList
                    data={subTopics}
                    renderItem={renderSubTopicItem}
                    keyExtractor={(item) => `${grade}-${topic}-${item}`}
                    contentContainerStyle={styles.listContentContainer}
                />
            ) : (
                <Text style={styles.emptyText}>Brak dostępnych podtematów teorii dla tego działu.</Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        fontSize: 18, // Трохи менший, ніж головний заголовок розділів
        fontWeight: 'bold',
        color: '#444',
        padding: 15,
        textAlign: 'center',
        backgroundColor: '#e9ecef', // Трохи інший фон для підзаголовка
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
    },
    listContentContainer: {
        paddingVertical: 10,
    },
    itemContainer: {
        backgroundColor: '#ffffff',
        paddingVertical: 16,
        paddingHorizontal: 15,
        marginVertical: 5,
        marginHorizontal: 12,
        borderRadius: 8,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 1.00,
    },
    itemText: {
        fontSize: 16,
        color: '#555',
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 50,
        fontSize: 16,
        color: '#777',
    },
});

export default TheorySubTopicListScreen;
