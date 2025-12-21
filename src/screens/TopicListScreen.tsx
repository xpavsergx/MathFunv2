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
import { COLORS } from '../styles/theme';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { FadeInUp } from 'react-native-reanimated';

type TopicListProps = NativeStackScreenProps<MainAppStackParamList, 'TopicList'>;

type QuestionsDatabase = {
    [grade: string]: { [topic: string]: { [subTopic: string]: any[] } };
};

const { width } = Dimensions.get('window');
// Stała szerokość kafelka (65% szerokości ekranu)
const CARD_WIDTH = width * 0.65;

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

function TopicListScreen({ route, navigation }: TopicListProps) {
    const { grade, mode } = route.params;
    const db: QuestionsDatabase = (questionsDatabase as any).default || questionsDatabase;

    const topics = useMemo(() => {
        const topicsForGrade = db[String(grade)];
        return topicsForGrade ? Object.keys(topicsForGrade) : [];
    }, [db, grade]);

    const handleTopicPress = (topic: string) => {
        navigation.navigate('SubTopicList', {
            grade: grade,
            topic: topic,
            mode: mode
        });
    };

    // Dobór koloru i ikony na podstawie trybu (Ćwiczenia/Testy)
    const isTest = mode === 'test';
    const themeColor = isTest ? '#2196F3' : '#4CAF50';
    const themeIcon = isTest ? 'clipboard-outline' : 'fitness-outline';

    const renderTopicCard = (item: string, index: number) => {
        const isRightAligned = index % 2 !== 0;

        return (
            <AnimatedTouchableOpacity
                key={`topic-${index}`}
                entering={FadeInUp.delay(index * 100).duration(500)}
                style={[
                    styles.topicCard,
                    {
                        alignSelf: isRightAligned ? 'flex-end' : 'flex-start',
                        borderColor: themeColor,
                    }
                ]}
                onPress={() => handleTopicPress(item)}
                activeOpacity={0.8}
            >
                <Ionicons name={themeIcon as any} size={24} color={themeColor} style={styles.cardIcon} />

                <View style={styles.cardTextContainer}>
                    <Text style={styles.topicTitle} numberOfLines={3}>
                        {item.toUpperCase()}
                    </Text>
                </View>

                <Ionicons name="chevron-forward-outline" size={18} color={themeColor} style={styles.cardArrow} />
            </AnimatedTouchableOpacity>
        );
    };

    return (
        <ImageBackground source={backgroundImage} style={styles.backgroundImage} resizeMode="cover">
            <View style={styles.overlay}>
                <Text style={styles.headerText}>
                    {isTest ? 'TESTY: WYBIERZ DZIAŁ' : 'ĆWICZENIA: WYBIERZ DZIAŁ'}
                </Text>

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {topics.length === 0 ? (
                        <Text style={styles.emptyText}>Brak działów dla tej klasy.</Text>
                    ) : (
                        <View style={styles.pathContainer}>
                            {topics.map((topic, index) => renderTopicCard(topic, index))}
                        </View>
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
        backgroundColor: 'rgba(255, 255, 255, 0.88)',
        paddingHorizontal: 20,
        paddingTop: 30,
    },
    headerText: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#111827',
        textAlign: 'center',
        marginBottom: 25,
        textTransform: 'uppercase'
    },
    scrollContent: {
        paddingBottom: 60,
    },
    pathContainer: {
        width: '100%',
    },
    topicCard: {
        width: CARD_WIDTH,
        minHeight: 130, // Zmieniono na minHeight dla elastyczności
        backgroundColor: 'white',
        borderRadius: 22,
        padding: 15,
        // KLUCZOWA ZMIANA: Zmieniono z -5 na 20 (dodatni margines), aby usunąć nachodzenie
        marginBottom: 20,
        elevation: 5,
        borderWidth: 3,
        justifyContent: 'space-between',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
    },
    cardIcon: { alignSelf: 'flex-start' },
    cardTextContainer: {
        flex: 1,
        justifyContent: 'center',
        paddingVertical: 10, // Dodatkowy padding wewnątrz kafelka
    },
    topicTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: '#1F2937',
        textAlign: 'center',
        lineHeight: 20,
    },
    cardArrow: { alignSelf: 'flex-end' },
    emptyText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: '#6B7280' },
});

export default TopicListScreen;