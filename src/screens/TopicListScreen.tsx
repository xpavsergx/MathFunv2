import React, { useMemo } from 'react';
// Забираємо Button, якщо він більше не потрібен
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App'; // Перевірте шлях
import questionsDatabase from '../data/questionsDb.json';
// Імпортуємо константи теми
import { COLORS, FONT_SIZES, PADDING, MARGIN } from '../styles/theme';

type TopicListProps = NativeStackScreenProps<RootStackParamList, 'TopicList'>;

type QuestionsDatabase = {
    [grade: string]: { [topic: string]: { [subTopic: string]: any[] } };
};

function TopicListScreen({ route, navigation }: TopicListProps) {
    const { grade } = route.params;
    const db: QuestionsDatabase = questionsDatabase;

    const topics = useMemo(() => {
        const topicsForGrade = db[String(grade)]; // Конвертуємо grade в рядок для індексації
        return topicsForGrade ? Object.keys(topicsForGrade) : [];
    }, [db, grade]);

    // Перехід до списку підтем
    const handleTopicPress = (topic: string) => {
        navigation.navigate('SubTopicList', { grade: grade, topic: topic });
    };

    // Рендеринг елемента списку тем
    const renderTopic = ({ item }: { item: string }) => (
        <TouchableOpacity
            style={styles.itemContainer} // Використовуємо оновлений стиль
            onPress={() => handleTopicPress(item)}
        >
            <Text style={styles.itemText}>{item}</Text>
            {/* Можна додати сюди іконку стрілки ">" пізніше */}
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <FlatList
                data={topics}
                renderItem={renderTopic}
                keyExtractor={(item) => `${grade}-${item}`}
                ListEmptyComponent={<Text style={styles.emptyText}>Список тем порожній.</Text>}
                // Додамо відступи для самого списку
                contentContainerStyle={styles.listContentContainer}
            />
            {/* Кнопку "Тест за розділ" прибрали звідси */}
        </View>
    );
}

// --- Оновлені СТИЛІ ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.backgroundLight, // Світлий фон з теми
    },
    listContentContainer: {
        paddingVertical: PADDING.medium, // Вертикальний відступ всередині списку
    },
    itemContainer: {
        backgroundColor: COLORS.white, // Білий фон елемента
        paddingVertical: PADDING.large, // Зробимо елементи вищими
        paddingHorizontal: PADDING.medium,
        marginVertical: MARGIN.small, // Відступ між елементами
        marginHorizontal: MARGIN.medium, // Відступ від країв
        borderRadius: 10,
        elevation: 2,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.18,
        shadowRadius: 1.00,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    itemText: {
        fontSize: FONT_SIZES.large, // Трохи більший шрифт для тем
        color: COLORS.text, // Колір тексту з теми
        flex: 1, // Щоб текст займав доступне місце
    },
    emptyText: { // Стиль для повідомлення про порожній список
        textAlign: 'center',
        marginTop: 50,
        fontSize: FONT_SIZES.medium,
        color: COLORS.grey, // Сірий колір
    },
});

export default TopicListScreen;
