// src/screens/SubTopicListScreen.tsx

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ImageBackground, ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainAppStackParamList } from '../../App';
import questionsDatabase from '../data/questionsDb.json';

type SubTopicListProps = NativeStackScreenProps<MainAppStackParamList, 'SubTopicList'>;
type QuestionsDatabaseType = { [grade: string]: { [topic: string]: { [subTopic: string]: any; }; }; };
type SubTopicButton = { key: string; subTopicKey: string; displayName?: string; };

const { width } = Dimensions.get('window');
const CIRCLE_DIAMETER = (width - 40 - 20) / 2;

function SubTopicListScreen({ route, navigation }: SubTopicListProps) {
    const { grade, topic, mode } = route.params;
    const db: QuestionsDatabaseType = questionsDatabase as QuestionsDatabaseType;

    const trainerScreenMap: Record<string, keyof MainAppStackParamList> = {
        'Mnożenie': 'MultiplicationTrainer',
        'Dzielenie': 'MultiplicationTrainer',
        'Dodawanie i odejmowanie': 'PlusMinusTrainer',
        'O ile więcej, o ile mniej': 'MoreLessTrainer4',
        'Ile razy więcej, ile razy mniej': 'HowManyTimesTrainerScreen4',
        'Dzielenie z resztą': 'DivisionWithRemainderScreen4',
        'Kwadraty i sześciany liczb': 'SquaresCubesTrainerScreen4',
        'Kolejność wykonywania działań': 'OrderOperationsTrainerScreen4',
        'Zadania tekstowe. POZIOM 1': 'WordProblemsLevel1Screen4',
        ' Zadania tekstowe. POZIOM 1 ': 'WordProblemsLevel1Screen4',
        'Zadania tekstowe. POZIOM 2': 'WordProblemsLevel2Screen4',
        ' Zadania tekstowe. POZIOM 2 ': 'WordProblemsLevel2Screen4',
        'Oś liczbowa': 'NumberLineTrainerScreen4',
        'Sprint': 'MathSprintScreen',
    };

    const getTrainerScreen = (key: string) => trainerScreenMap[key];

    const subTopicsWithQuestions = useMemo<SubTopicButton[]>(() => {
        const topicsForGrade = db[String(grade)];
        if (!topicsForGrade) return [];
        const subTopicsMap = topicsForGrade[topic] || {};
        const result: SubTopicButton[] = [];

        Object.keys(subTopicsMap).forEach(subKey => {
            const subTopic = subTopicsMap[subKey];
            if (!subTopic) return;
            // Ховаємо з практики, якщо заборонено
            if (subTopic.showInPractice === false && mode === 'training') return;

            if (subTopic.isTrainer && subTopic.practiceKeys?.length) {
                subTopic.practiceKeys.forEach((pk: string) => {
                    result.push({ key: pk, subTopicKey: subKey, displayName: pk.trim() });
                });
            } else if (subTopic.questions?.length) {
                result.push({ key: subKey, subTopicKey: subKey, displayName: subKey });
            }
        });
        return result;
    }, [db, grade, topic, mode]);

    const handleSubTopicPress = (item: SubTopicButton) => {
        // --- 🔴 РЕЖИМ: TESTY ---
        if (mode === 'test') {
            navigation.navigate('Test', {
                grade, topic,
                subTopic: item.subTopicKey, // 🔥 ВИПРАВЛЕНО: передаємо ключ бази, а не назву кнопки
                testType: 'subTopic'
            });
            return;
        }

        // --- 🟢 РЕЖИМ: ĆWICZENIA (Training) ---
        if (mode === 'training') {
            const specificTrainer = getTrainerScreen(item.key);
            if (specificTrainer) {
                // Відкриваємо спец. тренажер
                // @ts-ignore
                navigation.navigate(specificTrainer, { grade, topic, subTopic: item.subTopicKey });
            } else {
                // Відкриваємо новий екран PracticeScreen
                navigation.navigate('Practice', {
                    grade,
                    topic,
                    subTopic: item.subTopicKey // 🔥 ВИПРАВЛЕНО: передаємо ключ бази
                });
            }
        }
    };

    const renderCircleButton = (item: SubTopicButton, index: number) => (
        <TouchableOpacity
            key={`circle-${item.key}-${index}`}
            style={[
                styles.topicButton,
                mode === 'test' ? { backgroundColor: '#2196F3' } : { backgroundColor: '#4CAF50' }
            ]}
            onPress={() => handleSubTopicPress(item)}
            activeOpacity={0.85}
        >
            <Text style={styles.topicButtonText}>{item.displayName || item.key}</Text>
        </TouchableOpacity>
    );

    const renderContent = () => {
        const layoutGroups = [];
        let index = 0;
        const n = subTopicsWithQuestions.length;
        while (index < n) {
            const remaining = n - index;
            const isSingle = layoutGroups.length % 2 === 0 || remaining === 1;
            if (isSingle) {
                layoutGroups.push(
                    <View key={`group-${index}`} style={styles.singleCircleRow}>
                        {renderCircleButton(subTopicsWithQuestions[index], index)}
                    </View>
                );
                index += 1;
            } else {
                layoutGroups.push(
                    <View key={`group-${index}`} style={styles.twoCircleRow}>
                        {renderCircleButton(subTopicsWithQuestions[index], index)}
                        {renderCircleButton(subTopicsWithQuestions[index + 1], index + 1)}
                    </View>
                );
                index += 2;
            }
        }
        return layoutGroups;
    };

    return (
        <ImageBackground source={require('../assets/books1.png')} style={styles.backgroundImage} resizeMode="cover">
            <View style={styles.overlay}>
                <Text style={styles.headerText}>
                    {mode === 'test' ? 'Wybierz test:' : 'Wybierz ćwiczenie:'}
                </Text>
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {subTopicsWithQuestions.length === 0 ? (
                        <Text style={styles.emptyText}>Brak dostępnych materiałów.</Text>
                    ) : renderContent()}
                </ScrollView>
            </View>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    backgroundImage: { flex: 1, width: '100%', height: '100%' },
    overlay: { flex: 1, backgroundColor: 'rgba(255, 255, 255, 0.85)', paddingHorizontal: 20, paddingTop: 20 },
    headerText: { fontSize: 22, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 20 },
    emptyText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: '#6B7280' },
    scrollContent: { paddingVertical: 10, alignItems: 'center', paddingBottom: 40 },
    singleCircleRow: { marginBottom: 20 },
    twoCircleRow: { flexDirection: 'row', justifyContent: 'space-between', width: width - 40, marginBottom: 20 },
    topicButton: { width: CIRCLE_DIAMETER, height: CIRCLE_DIAMETER, borderRadius: CIRCLE_DIAMETER / 2, justifyContent: 'center', alignItems: 'center', elevation: 5, padding: 8 },
    topicButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', textAlign: 'center' },
});

export default SubTopicListScreen;
