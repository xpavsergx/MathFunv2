import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import questionsDatabase from '../data/questionsDb.json';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { TheoryStackParamList } from '../../App'; // Імпортуємо правильні типи

// Видаляємо GRADE_FOR_THEORY, бо тепер отримуємо з route.params

type QuestionsDatabaseType = {
    [grade: string]: {
        [topic: string]: any;
    };
};

// Оновлюємо тип props
type TheoryTopicListScreenProps = NativeStackScreenProps<TheoryStackParamList, 'TheoryTopicList'>;

function TheoryScreen({ route, navigation }: TheoryTopicListScreenProps) { // Отримуємо route
    const { grade } = route.params; // <--- ОТРИМУЄМО КЛАС З ПАРАМЕТРІВ МАРШРУТУ

    const db: QuestionsDatabaseType = questionsDatabase;

    const mainTopics = useMemo(() => {
        const topicsForGrade = db[grade]; // Використовуємо grade з route.params
        return topicsForGrade ? Object.keys(topicsForGrade) : [];
    }, [db, grade]);

    const handleTopicPress = (topic: string) => {
        navigation.navigate('TheorySubTopicList', { // Передаємо поточний grade
            grade: grade,
            topic: topic,
        });
    };

    const renderTopicItem = ({ item }: { item: string }) => (
        <TouchableOpacity
            style={styles.itemContainer}
            onPress={() => handleTopicPress(item)}
        >
            <Text style={styles.itemText}>{item}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* Заголовок тепер встановлюється в навігаторі, але можна додати підзаголовок */}
            {/* <Text style={styles.header}>Działy Teoretyczne (Klasa {grade})</Text> */}
            {mainTopics.length > 0 ? (
                <FlatList
                    data={mainTopics}
                    renderItem={renderTopicItem}
                    keyExtractor={(item) => `${grade}-${item}`}
                    contentContainerStyle={styles.listContentContainer}
                />
            ) : (
                <Text style={styles.emptyText}>Brak dostępnych działów teorii dla klasy {grade}.</Text>
            )}
        </View>
    );
}

// Стилі залишаються ті самі, що були в TheoryScreen.tsx
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    // header: { // Цей стиль для заголовка всередині екрану можна прибрати, якщо заголовок встановлюється навігатором
    //   fontSize: 20,
    //   fontWeight: 'bold',
    //   color: '#333',
    //   padding: 15,
    //   textAlign: 'center',
    //   borderBottomWidth: 1,
    //   borderBottomColor: '#ddd',
    // },
    listContentContainer: {
        paddingVertical: 10,
    },
    itemContainer: {
        backgroundColor: '#ffffff',
        paddingVertical: 18,
        paddingHorizontal: 15,
        marginVertical: 6,
        marginHorizontal: 12,
        borderRadius: 8,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.18,
        shadowRadius: 1.00,
    },
    itemText: {
        fontSize: 17,
        color: '#444',
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 50,
        fontSize: 16,
        color: '#777',
    },
});

export default TheoryScreen; // Назва файлу залишається TheoryScreen.tsx, але логічно це тепер список тем
