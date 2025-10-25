import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Button } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainAppStackParamList } from '../../App';
import questionsDatabase from '../data/questionsDb.json';

type SubTopicDataForTest = {
    questions?: any[];
    isTrainer?: boolean;
};

type QuestionsDatabaseType = {
    [grade: string]: {
        [topic: string]: {
            [subTopic: string]: SubTopicDataForTest;
        };
    };
};

type SubTopicListProps = NativeStackScreenProps<MainAppStackParamList, 'SubTopicList'>;

function SubTopicListScreen({ route, navigation }: SubTopicListProps) {
    const { grade, topic } = route.params;
    const db: QuestionsDatabaseType = questionsDatabase as QuestionsDatabaseType;

    // Фильтруем подтемы с вопросами или тренером
    const subTopicsWithQuestions = useMemo(() => {
        const topicsForGrade = db[String(grade)];
        const subTopicsMap = topicsForGrade?.[topic] || {};

        return Object.keys(subTopicsMap).filter(subKey => {
            const subTopic = subTopicsMap[subKey];
            return (
                typeof subTopic === 'object' &&
                subTopic !== null &&
                (subTopic.questions?.length > 0 || subTopic.isTrainer)
            );
        });
    }, [db, grade, topic]);

    const handleFullTopicTest = (selectedMode: 'learn' | 'assess' = 'learn') => {
        navigation.navigate('Test', {
            grade,
            topic,
            testType: 'mainTopic',
            mode: selectedMode,
        });
    };

    const handleSubTopicPress = (subTopicKey: string) => {
        const subTopicData = db[String(grade)]?.[topic]?.[subTopicKey];
        if (!subTopicData) return;

        if (subTopicData.isTrainer) {
            switch (subTopicKey) {
                case 'Mnożenie':
                    navigation.navigate('MultiplicationTrainer', { grade, topic, subTopic: subTopicKey });
                    break;
                case 'Dzielenie':
                    navigation.navigate('DivisionTrainer', { grade, topic, subTopic: subTopicKey });
                    break;
                case 'Dodawanie i odejmowanie':
                    navigation.navigate('PlusMinusTrainer', { grade, topic, subTopic: subTopicKey });
                    break;
                default:
                    navigation.navigate('MultiplicationTrainer', { grade, topic, subTopic: subTopicKey });
            }
        } else {
            navigation.navigate('Test', {
                grade,
                topic,
                subTopic: subTopicKey,
                testType: 'subTopic',
                mode: 'learn',
            });
        }
    };

    const renderSubTopic = ({ item }: { item: string }) => (
        <TouchableOpacity
            style={styles.topicButton}
            onPress={() => handleSubTopicPress(item)}
            activeOpacity={0.85}
        >
            <Text style={styles.topicButtonText}>{item}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.headerText}>Wybierz ćwiczenia:</Text>

            <FlatList
                data={subTopicsWithQuestions}
                renderItem={renderSubTopic}
                keyExtractor={(item) => `${grade}-${topic}-${item}`}
                ListEmptyComponent={
                    <Text style={styles.emptyText}>
                        Brak podtematów z pytaniami dla tego działu.
                    </Text>
                }
                contentContainerStyle={{ paddingVertical: 20 }}
            />

            <View style={styles.fullTopicButtonContainer}>
                <View style={styles.fullTopicButtonWrapper}>
                    <Button
                        title={`Test z całego działu "${topic}" (Trening)`}
                        onPress={() => handleFullTopicTest('learn')}
                        color="#2563EB"
                    />
                </View>
                <View style={styles.fullTopicButtonWrapper}>
                    <Button
                        title={`Test z działu "${topic}" (Kontrolny)`}
                        onPress={() => handleFullTopicTest('assess')}
                        color="#FFC107"
                    />
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#EEF2FF', padding: 20 },
    headerText: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
        textAlign: 'center',
        marginBottom: 20,
    },
    emptyText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: '#6B7280' },
    topicButton: {
        backgroundColor: '#2563EB',
        borderRadius: 12,
        paddingVertical: 18,
        paddingHorizontal: 20,
        marginBottom: 14,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 3,
    },
    topicButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    fullTopicButtonContainer: {
        marginTop: 20,
    },
    fullTopicButtonWrapper: {
        marginVertical: 5,
    },
});

export default SubTopicListScreen;
