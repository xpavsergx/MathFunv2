import React, { useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    ImageBackground,
    ScrollView,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainAppStackParamList } from '../../App';
import questionsDatabase from '../data/questionsDb.json';

type SubTopicDataForTest = {
    questions?: any[];
    isTrainer?: boolean;
    practiceKeys?: string[];
    showInPractice?: boolean;
};

type QuestionsDatabaseType = {
    [grade: string]: {
        [topic: string]: {
            [subTopic: string]: SubTopicDataForTest;
        };
    };
};

type SubTopicButton = {
    key: string;
    subTopicKey: string;
    displayName?: string;
};

type SubTopicListProps = NativeStackScreenProps<MainAppStackParamList, 'SubTopicList'>;

const { width } = Dimensions.get('window');
const CIRCLE_DIAMETER = (width - 40 - 20) / 2;

function SubTopicListScreen({ route, navigation }: SubTopicListProps) {
    const { grade, topic } = route.params;
    const db: QuestionsDatabaseType = questionsDatabase as QuestionsDatabaseType;

    // 🔥 Карта экранов-тренажёров
    const trainerScreenMap: Record<string, keyof MainAppStackParamList> = {
        'Mnożenie': 'MultiplicationTrainer',
        'Dzielenie': 'DivisionTrainer',
        'Dodawanie i odejmowanie': 'PlusMinusTrainer',
        'O ile więcej, o ile mniej': 'MoreLessTrainer4',
        'Ile razy więcej, ile razy mniej': 'HowManyTimesTrainerScreen4',
        'Dzielenie z resztą': 'DivisionWithRemainderScreen4',
        'Kwadraty i sześciany liczb': 'SquaresCubesTrainerScreen4',
    };

    const getTrainerScreen = (key: string) =>
        trainerScreenMap[key] ?? 'MultiplicationTrainer';

    const subTopicsWithQuestions = useMemo<SubTopicButton[]>(() => {
        const topicsForGrade = db[String(grade)];
        if (!topicsForGrade) return [];

        const subTopicsMap = topicsForGrade[topic] || {};
        const result: SubTopicButton[] = [];

        Object.keys(subTopicsMap).forEach(subKey => {
            const subTopic = subTopicsMap[subKey];
            if (!subTopic) return;

            if (subTopic.showInPractice === false) return;

            if (subTopic.isTrainer && subTopic.practiceKeys?.length) {
                subTopic.practiceKeys.forEach(pk => {
                    result.push({
                        key: pk,
                        subTopicKey: subKey,
                        displayName: pk,
                    });
                });
            } else if (subTopic.questions?.length) {
                result.push({
                    key: subKey,
                    subTopicKey: subKey,
                    displayName: subKey,
                });
            }
        });

        return result;
    }, [db, grade, topic]);

    const handleSubTopicPress = (item: SubTopicButton) => {
        const subTopicData = db[String(grade)]?.[topic]?.[item.subTopicKey];
        if (!subTopicData) return;

        const targetScreen = subTopicData.isTrainer
            ? getTrainerScreen(item.key)
            : 'Test';

        navigation.navigate(targetScreen, {
            grade,
            topic,
            subTopic: item.key,
        });
    };

    const renderCircleButton = (item: SubTopicButton, index: number) => (
        <TouchableOpacity
            key={`circle-${item.key}-${index}`}
            style={styles.topicButton}
            onPress={() => handleSubTopicPress(item)}
            activeOpacity={0.85}
        >
            <Text style={styles.topicButtonText}>
                {item.displayName || item.key}
            </Text>
        </TouchableOpacity>
    );

    const renderContent = () => {
        const layoutGroups = [];
        let index = 0;
        const n = subTopicsWithQuestions.length;

        while (index < n) {
            const remaining = n - index;
            const isSingle = (layoutGroups.length % 2 === 0) || remaining === 1;

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
        <ImageBackground
            source={require('../assets/books1.png')}
            style={styles.backgroundImage}
            resizeMode="cover"
        >
            <View style={styles.overlay}>
                <Text style={styles.headerText}>Wybierz ćwiczenia:</Text>

                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {subTopicsWithQuestions.length === 0 ? (
                        <Text style={styles.emptyText}>
                            Brak podtematów z pytaniami dla tego działu.
                        </Text>
                    ) : (
                        renderContent()
                    )}
                </ScrollView>
            </View>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    backgroundImage: { flex: 1, width: '100%', height: '100%' },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 10
    },
    headerText: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
        textAlign: 'center',
        marginBottom: 20
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 50,
        fontSize: 16,
        color: '#6B7280'
    },
    scrollContent: {
        paddingVertical: 10,
        alignItems: 'center',
        paddingBottom: 40
    },
    singleCircleRow: { marginBottom: 20 },
    twoCircleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: width - 40,
        marginBottom: 20
    },
    topicButton: {
        backgroundColor: '#3A7D44',
        width: CIRCLE_DIAMETER,
        height: CIRCLE_DIAMETER,
        borderRadius: CIRCLE_DIAMETER / 2,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        padding: 8
    },
    topicButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
        textAlign: 'center'
    }
});

export default SubTopicListScreen;
