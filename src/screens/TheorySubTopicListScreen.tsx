// src/screens/TheorySubTopicListScreen.tsx

import React, { useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    ImageBackground,
    ScrollView,
    useColorScheme, // Dodano
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { TheoryStackParamList } from '../../App';
import questionsDatabase from '../data/questionsDb.json';
import { COLORS } from '../styles/theme';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { FadeInUp } from 'react-native-reanimated';

const { width } = Dimensions.get('window');
const PADDING_HORIZONTAL = 20;
const GAP = 15;

const UNIVERSAL_CARD_WIDTH = (width - (PADDING_HORIZONTAL * 2) - GAP) / 2;
const CARD_HEIGHT = 150;

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

type TheorySubTopicListScreenProps = NativeStackScreenProps<TheoryStackParamList, 'TheorySubTopicList'>;

function TheorySubTopicListScreen({ route, navigation }: TheorySubTopicListScreenProps) {
    const { grade, topic } = route.params;
    const db: any = questionsDatabase;

    // ✅ OBSŁUGA TRYBU CIEMNEGO
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';

    // ✅ DYNAMICZNE STYLE
    const themeStyles = {
        overlay: {
            backgroundColor: isDarkMode ? 'rgba(18, 18, 18, 0.92)' : 'rgba(255, 255, 255, 0.88)',
        },
        card: {
            backgroundColor: isDarkMode ? COLORS.cardDark : 'white',
            borderColor: isDarkMode ? COLORS.accent : COLORS.accent, // Możesz zmienić na COLORS.primaryDarkTheme w dark
        },
        headerText: {
            color: isDarkMode ? COLORS.textDark : '#111827',
        },
        topicTitle: {
            color: isDarkMode ? COLORS.textDark : '#1F2937',
        }
    };

    const subTopics = useMemo(() => {
        const gradeData = db[grade];
        if (!gradeData) return [];
        const topicData = gradeData[topic];
        if (!topicData) return [];

        return Object.keys(topicData).filter(subTopicKey => {
            const hiddenTopics = [
                "Zadania tekstowe, cz. 2", "Sprawdzian końcowy", "Działania pisemne. Zadania tekstowe",
                "Zapisywanie wyrażeń dwumianowanych, cz. 2", "Pojedynki - zestaw 1",
                "Pojedynki - zestaw 2", "Pojedynki - zestaw 3", "Pojedynki - zestaw 4", "Pojedynki - zestaw 5"
            ];
            return !hiddenTopics.includes(subTopicKey);
        });
    }, [db, grade, topic]);

    const handleSubTopicPress = (subTopic: string) => {
        navigation.navigate('TheoryDetail', { grade, topic, subTopic });
    };

    const renderTopicCard = (item: string, index: number) => {
        const themeColor = COLORS.accent;

        return (
            <AnimatedTouchableOpacity
                key={`card-${item}-${index}`}
                entering={FadeInUp.delay(index * 50).duration(500)}
                style={[
                    styles.topicCard,
                    themeStyles.card, // Dynamiczne tło karty
                    {
                        width: UNIVERSAL_CARD_WIDTH,
                        borderColor: themeColor,
                    }
                ]}
                onPress={() => handleSubTopicPress(item)}
                activeOpacity={0.8}
            >
                <Ionicons name="document-text-outline" size={22} color={themeColor} style={styles.cardIcon} />

                <View style={styles.cardTextContainer}>
                    <Text style={[styles.topicTitle, themeStyles.topicTitle]} numberOfLines={5}>
                        {item.toUpperCase()}
                    </Text>
                </View>

                <Ionicons name="chevron-forward-outline" size={16} color={themeColor} style={styles.cardArrow} />
            </AnimatedTouchableOpacity>
        );
    };

    const renderContent = () => {
        const layoutGroups = [];
        let currentIndex = 0;
        const totalTopics = subTopics.length;

        while (currentIndex < totalTopics) {
            if (currentIndex < totalTopics) {
                layoutGroups.push(
                    <View key={`row-single-${currentIndex}`} style={styles.singleRow}>
                        {renderTopicCard(subTopics[currentIndex], currentIndex)}
                    </View>
                );
                currentIndex++;
            }
            if (currentIndex < totalTopics) {
                if (currentIndex + 1 < totalTopics) {
                    layoutGroups.push(
                        <View key={`row-double-${currentIndex}`} style={styles.twoRow}>
                            {renderTopicCard(subTopics[currentIndex], currentIndex)}
                            {renderTopicCard(subTopics[currentIndex + 1], currentIndex + 1)}
                        </View>
                    );
                    currentIndex += 2;
                } else {
                    layoutGroups.push(
                        <View key={`row-single-end-${currentIndex}`} style={styles.singleRow}>
                            {renderTopicCard(subTopics[currentIndex], currentIndex)}
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
            <View style={[styles.overlay, themeStyles.overlay]}>
                <Text style={[styles.headerText, themeStyles.headerText]}>{topic}</Text>

                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {subTopics.length === 0 ? (
                        <Text style={styles.emptyText}>Brak dostępnych tematów.</Text>
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
        paddingTop: 30,
    },
    headerText: {
        fontSize: 22,
        fontWeight: 'bold',
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
        fontSize: 18,
        fontWeight: '900',
        textAlign: 'center',
        lineHeight: 20,
    },
    cardArrow: { alignSelf: 'flex-end' },
    emptyText: { textAlign: 'center', marginTop: 50, color: '#6B7280' },
});

export default TheorySubTopicListScreen;