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
import { MainAppStackParamList } from '../navigation/types';
import questionsDatabase from '../data/questionsDb.json';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import CalendarTrainer from "./screens_4_klassa/screens_4K2R/CalendarTrainer";
import WrittenSubtractionTrainer from "./screens_4_klassa/screens_4K3R/WrittenSubtractionTrainer";

type SubTopicListProps = NativeStackScreenProps<MainAppStackParamList, 'SubTopicList'>;

type QuestionsDatabaseType = {
    [grade: string]: { [topic: string]: { [subTopic: string]: any } };
};

type SubTopicButton = {
    key: string;
    subTopicKey: string;
    displayName?: string;
};

const { width } = Dimensions.get('window');
const PADDING_HORIZONTAL = 20;
const GAP = 15;

// Wymiary kafelków przeniesione z Teorii
const UNIVERSAL_CARD_WIDTH = (width - (PADDING_HORIZONTAL * 2) - GAP) / 2;
const CARD_HEIGHT = 150;

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

function SubTopicListScreen({ route, navigation }: SubTopicListProps) {
    const { grade, topic, mode } = route.params;
    const db: QuestionsDatabaseType = questionsDatabase as QuestionsDatabaseType;

    const trainerScreenMap = {
        'Dodawanie i odejmowanie': 'PlusMinusTrainer',
        'Mnożenie i dzielenie': 'MultiplicationTrainer',
        'O ile więcej, o ile mniej': 'MoreLessTrainer4',
        'Ile razy więcej, ile razy mniej': 'HowManyTimesTrainerScreen4',
        'Dzielenie z resztą': 'DivisionWithRemainderScreen4',
        'Kwadraty i sześciany liczb': 'SquaresCubesTrainerScreen4',
        'Kolejność wykonywania działań': 'OrderOperationsTrainerScreen4',
        'Zadania tekstowe. POZIOM 1': 'WordProblemsLevel1Screen4',
        'Zadania tekstowe. POZIOM 2': 'WordProblemsLevel2Screen4',
        'Oś liczbowa': 'NumberLineTrainerScreen4',
        'Sprint': 'MathSprintScreen',
        'System dziesiątkowy': 'DecimalSystemTrainer',
        'Porównywanie liczb naturalnych': 'ComparingNumbersTrainer',
        'Rachunki pamięciowe na dużych liczbach': 'MentalMathLargeNumbers',
        'Jednostki monetarne - złote i grosze': 'MonetaryUnitsTrainer',
        'Jednostki długości':'LengthUnitsTrainer',
        'Jednostki masy': 'MassUnitsTrainer',
        'System rzymski': 'RomanNumeralsTrainer',
        'Z kalendarzem za pan brat': 'CalendarTrainer',
        'Godziny na zegarach': 'ClockTrainer',
        'Dodawanie pisemne': 'WrittenAdditionTrainer',
        'Odejmowanie pisemne': 'WrittenSubtractionTrainer',
        'Mnożenie pisemne przez liczby jednocyfrowe' : 'WrittenMultiplicationTrainer',
        'Mnożenie przez liczby z zerami na końcu' : 'WrittenMultiplicationWithZerosTrainer',
        'Mnożenie pisemne przez liczby wielocyfrowe':'WrittenMultiDigitMultiplicationTrainer',
        'Dzielenie pisemne przez liczby jednocyfrowe' : 'WrittenDivisionTrainer',
        'Działania pisemne. Zadania tekstowe' : 'WordProblemsTrainer',
        'Ułamek jako część całości':'FractionsTrainer',
    } as const;

    const getTrainerScreen = (key: string) => trainerScreenMap[key as keyof typeof trainerScreenMap];

    const subTopicsWithQuestions = useMemo<SubTopicButton[]>(() => {
        const topicsForGrade = db[String(grade)];
        if (!topicsForGrade) return [];
        const subTopicsMap = topicsForGrade[topic] || {};
        const result: SubTopicButton[] = [];

        Object.keys(subTopicsMap).forEach(subKey => {
            const subTopic = subTopicsMap[subKey];
            if (!subTopic) return;
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
        const isFinalTest = item.subTopicKey === 'Sprawdzian końcowy';
        if (isFinalTest || mode === 'test') {
            navigation.navigate('Test', {
                grade, topic, subTopic: item.subTopicKey,
                testType: 'subTopic',
                mode: mode === 'training' ? 'learn' : 'assess',
            });
            return;
        }

        const specificTrainer = getTrainerScreen(item.key) || getTrainerScreen(item.subTopicKey);
        if (specificTrainer) {
            // @ts-ignore
            navigation.navigate(specificTrainer, { grade, topic, subTopic: item.subTopicKey });
        } else {
            navigation.navigate('Practice', { grade, topic, subTopic: item.subTopicKey });
        }
    };

    const renderTopicCard = (item: SubTopicButton, index: number) => {
        const isFinalTest = item.subTopicKey === 'Sprawdzian końcowy';

        // Dynamiczny dobór koloru i ikony
        let themeColor = mode === 'test' ? '#2196F3' : '#4CAF50';
        let iconName = mode === 'test' ? "clipboard-outline" : "fitness-outline";

        if (isFinalTest) {
            themeColor = '#FF5722';
            iconName = "trophy-outline";
        }

        return (
            <AnimatedTouchableOpacity
                key={`card-${item.key}-${index}`}
                entering={FadeInUp.delay(index * 50).duration(500)}
                style={[
                    styles.topicCard,
                    { width: UNIVERSAL_CARD_WIDTH, borderColor: themeColor }
                ]}
                onPress={() => handleSubTopicPress(item)}
                activeOpacity={0.8}
            >
                <Ionicons name={iconName as any} size={22} color={themeColor} style={styles.cardIcon} />

                <View style={styles.cardTextContainer}>
                    <Text style={styles.topicTitle} numberOfLines={5}>
                        {(item.displayName || item.key).toUpperCase()}
                    </Text>
                </View>

                <Ionicons name="chevron-forward-outline" size={16} color={themeColor} style={styles.cardArrow} />
            </AnimatedTouchableOpacity>
        );
    };

    const renderContent = () => {
        const layoutGroups = [];
        let currentIndex = 0;
        const total = subTopicsWithQuestions.length;

        while (currentIndex < total) {
            // Rząd 1: Pojedynczy wyśrodkowany
            if (currentIndex < total) {
                layoutGroups.push(
                    <View key={`row-s-${currentIndex}`} style={styles.singleRow}>
                        {renderTopicCard(subTopicsWithQuestions[currentIndex], currentIndex)}
                    </View>
                );
                currentIndex++;
            }

            // Rząd 2: Dwa kafelki obok siebie
            if (currentIndex < total) {
                if (currentIndex + 1 < total) {
                    layoutGroups.push(
                        <View key={`row-d-${currentIndex}`} style={styles.twoRow}>
                            {renderTopicCard(subTopicsWithQuestions[currentIndex], currentIndex)}
                            {renderTopicCard(subTopicsWithQuestions[currentIndex + 1], currentIndex + 1)}
                        </View>
                    );
                    currentIndex += 2;
                } else {
                    layoutGroups.push(
                        <View key={`row-s-end-${currentIndex}`} style={styles.singleRow}>
                            {renderTopicCard(subTopicsWithQuestions[currentIndex], currentIndex)}
                        </View>
                    );
                    currentIndex++;
                }
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
                <Text style={styles.headerText}>
                    {mode === 'test' ? 'Wybierz test' : 'Wybierz ćwiczenie'}
                </Text>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {subTopicsWithQuestions.length === 0 ? (
                        <Text style={styles.emptyText}>Brak dostępnych materiałów.</Text>
                    ) : (
                        renderContent()
                    )}
                </ScrollView>
            </View>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    backgroundImage: { flex: 1 },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.88)',
        paddingTop: 30,
    },
    headerText: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#111827',
        textAlign: 'center',
        marginBottom: 30,
        textTransform: 'uppercase',
    },
    scrollContent: {
        paddingBottom: 60,
        paddingHorizontal: PADDING_HORIZONTAL,
    },
    singleRow: {
        width: '100%',
        alignItems: 'center',
        marginBottom: 30
    },
    twoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 30,
    },
    topicCard: {
        height: CARD_HEIGHT,
        backgroundColor: 'white',
        borderRadius: 18,
        padding: 12,
        elevation: 4,
        borderWidth: 2.5,
        justifyContent: 'space-between',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    cardIcon: { alignSelf: 'flex-start' },
    cardTextContainer: { flex: 1, justifyContent: 'center' },
    topicTitle: {
        fontSize: 16,
        fontWeight: '900',
        color: '#1F2937',
        textAlign: 'center',
        lineHeight: 20,
    },
    cardArrow: { alignSelf: 'flex-end' },
    emptyText: { textAlign: 'center', marginTop: 50, color: '#6B7280' },
});

export default SubTopicListScreen;