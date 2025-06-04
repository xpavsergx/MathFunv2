import React from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { TheoryStackParamList } from '../../App'; // Імпортуємо типи
import questionsDatabase from '../data/questionsDb.json'; // Шлях до бази питань

// Тип для одного елемента теоретичного контенту
type TheoryContentItem = {
    type: "paragraph" | "subHeader" | "listItem" | "example";
    text: string;
};

// Тип для даних підтеми, що містить теорію
type SubTopicTheoryData = {
    theoryTitle?: string;
    theoryContent?: TheoryContentItem[];
    questions?: any[]; // Питання тут не потрібні для відображення теорії
};

// Тип для questionsDb.json
type QuestionsDatabaseType = {
    [grade: string]: { // Клас
        [topic: string]: { // Розділ
            [subTopic: string]: SubTopicTheoryData; // Підтема - це об'єкт
        };
    };
};

type TheoryDetailScreenProps = NativeStackScreenProps<TheoryStackParamList, 'TheoryDetail'>;

function TheoryDetailScreen({ route }: TheoryDetailScreenProps) {
    const { grade, topic, subTopic } = route.params;
    const db: QuestionsDatabaseType = questionsDatabase as QuestionsDatabaseType;

    const theoryData = db[grade]?.[topic]?.[subTopic];

    if (!theoryData || !theoryData.theoryContent || theoryData.theoryContent.length === 0) {
        return (
            <View style={styles.container}>
                <Text style={styles.title}>{theoryData?.theoryTitle || subTopic}</Text>
                <Text style={styles.emptyText}>Materiały teoretyczne dla tej podtemy są w przygotowaniu!</Text>
            </View>
        );
    }

    const renderTheoryItem = ({ item }: { item: TheoryContentItem }) => {
        switch (item.type) {
            case 'paragraph':
                return <Text style={styles.paragraph}>{item.text}</Text>;
            case 'subHeader':
                return <Text style={styles.subHeader}>{item.text}</Text>;
            case 'listItem':
                // Додаємо маркер списку (наприклад, крапку або тире)
                return <Text style={styles.listItem}>• {item.text}</Text>;
            case 'example':
                return (
                    <View style={styles.exampleContainer}>
                        <Text style={styles.exampleLabel}>Przykład:</Text>
                        <Text style={styles.exampleText}>{item.text}</Text>
                    </View>
                );
            default:
                // Якщо тип невідомий, можемо просто вивести текст
                return <Text style={styles.paragraph}>{item.text}</Text>;
        }
    };

    return (
        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.contentContainer}>
            {theoryData.theoryTitle && (
                <Text style={styles.mainTitle}>{theoryData.theoryTitle}</Text>
            )}
            <FlatList
                data={theoryData.theoryContent}
                renderItem={renderTheoryItem}
                keyExtractor={(item, index) => `${item.type}_${index}`} // Більш надійний ключ
                scrollEnabled={false} // Зовнішній ScrollView вже є
                ItemSeparatorComponent={() => <View style={{ height: 10 }} />} // Невеликий відступ між елементами
            />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    scrollContainer: {
        flex: 1,
        backgroundColor: '#fff', // Білий фон для контенту
    },
    contentContainer: {
        paddingVertical: 20,
        paddingHorizontal: 15,
    },
    container: { // Для випадку, коли немає контенту
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    mainTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#00796B', // Темний бірюзовий
        marginBottom: 20,
        textAlign: 'center',
    },
    paragraph: {
        fontSize: 17, // Збільшив шрифт для кращої читабельності
        lineHeight: 26, // Збільшив міжрядковий інтервал
        color: '#333',
        marginBottom: 15,
        textAlign: 'justify', // Вирівнювання по ширині для абзаців
    },
    subHeader: {
        fontSize: 20, // Збільшив шрифт
        fontWeight: 'bold',
        color: '#00BCD4', // Основний бірюзовий
        marginTop: 18,
        marginBottom: 12,
    },
    listItem: {
        fontSize: 17,
        lineHeight: 26,
        color: '#455A64', // Темно-сіро-синій
        marginLeft: 10, // Відступ для маркерів списку
        marginBottom: 8,
    },
    exampleContainer: { // Контейнер для прикладів
        backgroundColor: '#E0F7FA', // Дуже світлий бірюзовий
        padding: 15,
        borderRadius: 8,
        marginBottom: 15,
        borderLeftWidth: 4,
        borderLeftColor: '#00BCD4', // Акцентна лінія
    },
    exampleLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#00796B',
        marginBottom: 5,
    },
    exampleText: {
        fontSize: 16,
        lineHeight: 24,
        color: '#37474F',
        fontStyle: 'italic', // Курсив для прикладів
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 20, // Менший відступ, якщо є заголовок
        fontSize: 16,
        color: '#777',
    },
    title: { // Стиль для заголовка, якщо немає контенту
        fontSize: 22,
        fontWeight: 'bold',
        color: '#444',
        marginBottom: 10,
        textAlign: 'center',
    },
});

export default TheoryDetailScreen;
