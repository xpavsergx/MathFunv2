// src/screens/TopicListScreen.tsx

import React, { useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ImageBackground,
    ScrollView,
    Dimensions,
} from 'react-native';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainAppStackParamList } from '../../App';
import questionsDatabase from '../data/questionsDb.json';
import backgroundImage from '../assets/books1.png';
import { COLORS } from '../styles/theme'; // Переконайтеся, що імпорт правильний

type TopicListProps = NativeStackScreenProps<MainAppStackParamList, 'TopicList'>;

type QuestionsDatabase = {
    [grade: string]: { [topic: string]: { [subTopic: string]: any[] } };
};

const { width } = Dimensions.get('window');
const CIRCLE_DIAMETER = width / 2.5;

function TopicListScreen({ route, navigation }: TopicListProps) {
    // 🔥 ВАЖЛИВО: Витягуємо також 'mode' з параметрів!
    const { grade, mode } = route.params;

    const db: QuestionsDatabase = (questionsDatabase as any).default || questionsDatabase;

    const topics = useMemo(() => {
        const topicsForGrade = db[String(grade)];
        if (!topicsForGrade) {
            console.error("TopicListScreen: Nie znaleziono danych dla klasy:", String(grade));
            return [];
        }
        return Object.keys(topicsForGrade);
    }, [db, grade]);

    const handleTopicPress = (topic: string) => {
        // 🔥 ВИПРАВЛЕННЯ: Тепер ми передаємо 'mode' далі до SubTopicList
        navigation.navigate('SubTopicList', {
            grade: grade,
            topic: topic,
            mode: mode // <--- Це те, чого не вистачало!
        });
    };

    const renderCircleButton = (item: string, index: number) => (
        <TouchableOpacity
            key={`circle-${item}-${index}`}
            style={styles.topicButton}
            onPress={() => handleTopicPress(item)}
            activeOpacity={0.85}
        >
            <Text style={styles.topicButtonText}>{item}</Text>
        </TouchableOpacity>
    );

    return (
        <ImageBackground
            source={backgroundImage}
            style={styles.backgroundImage}
            resizeMode="cover"
        >
            <View style={styles.overlay}>
                <Text style={styles.headerText}>
                    {mode === 'test' ? 'Testy: Wybierz dział' : 'Ćwiczenia: Wybierz dział'}
                </Text>

                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {topics.length === 0 ? (
                        <Text style={styles.emptyText}>
                            Brak działów dla tej klasy.
                        </Text>
                    ) : (
                        <View style={styles.pathContainer}>
                            {topics.map((topic, index) => (
                                <View
                                    key={topic}
                                    style={[
                                        styles.circleContainer,
                                        index % 2 === 0
                                            ? styles.circleContainerLeft
                                            : styles.circleContainerRight
                                    ]}
                                >
                                    {renderCircleButton(topic, index)}
                                </View>
                            ))}
                        </View>
                    )}
                </ScrollView>
            </View>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    backgroundImage: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 10,
    },
    headerText: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
        textAlign: 'center',
        marginBottom: 20,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 50,
        fontSize: 16,
        color: '#6B7280'
    },
    scrollContent: {
        paddingVertical: 10,
        paddingBottom: 40,
    },
    pathContainer: {
        width: '100%',
        paddingHorizontal: 60,
    },
    circleContainer: {
        marginBottom: 20,
    },
    circleContainerLeft: {
        alignSelf: 'flex-start',
    },
    circleContainerRight: {
        alignSelf: 'flex-end',
    },
    topicButton: {
        backgroundColor: '#00BCD4', // Використовуємо жорстко заданий колір або COLORS.primary
        width: CIRCLE_DIAMETER,
        height: CIRCLE_DIAMETER,
        borderRadius: CIRCLE_DIAMETER / 2,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        padding: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    topicButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
        textAlign: 'center',
    },
});

export default TopicListScreen;
