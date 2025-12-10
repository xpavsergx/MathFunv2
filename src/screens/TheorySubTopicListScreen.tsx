import React, { useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Dimensions, // Dodano Dimensions do obliczenia rozmiaru koła
    ImageBackground, // Dodano ImageBackground, aby uzyskać tło
    ScrollView, // Zmieniono z FlatList na ScrollView + renderContent
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { TheoryStackParamList } from '../../App';
import questionsDatabase from '../data/questionsDb.json';

// --- Obliczenia rozmiaru koła ---
const { width } = Dimensions.get('window');
// Rozmiar koła dla 2 kolumn, z marginesami 20px po bokach i 20px pomiędzy.
const PADDING_HORIZONTAL = 20;
const GAP_BETWEEN_CIRCLES = 20;
const CIRCLE_DIAMETER = (width - PADDING_HORIZONTAL * 2 - GAP_BETWEEN_CIRCLES) / 2;
// ---------------------------------

// Typy bez zmian...
type TopicData = {
    [subTopic: string]: any;
};

type QuestionsDatabaseType = {
    [grade: string]: {
        [topic: string]: TopicData;
    };
};

type TheorySubTopicListScreenProps = NativeStackScreenProps<TheoryStackParamList, 'TheorySubTopicList'>;

function TheorySubTopicListScreen({ route, navigation }: TheorySubTopicListScreenProps) {
    const { grade, topic } = route.params;
    const db: QuestionsDatabaseType = questionsDatabase as QuestionsDatabaseType;

    const subTopics = useMemo(() => {
        const gradeData = db[grade];
        if (!gradeData) return [];
        const topicData = gradeData[topic];
        if (!topicData) return [];
        return Object.keys(topicData).filter(subTopicKey => {
            const subTopicData = topicData[subTopicKey];

            // 1. Definiujemy, które tematy mają być ukryte w teorii.
            // Używamy nazwy podtematu, ponieważ JSON jest statyczny.
            const hiddenTopics = [
                "Zadania tekstowe, cz. 2",
                "Sprawdzian końcowy",
                // Tutaj dodaj inne tematy, które mają być tylko w praktyce
            ];

            // 2. Jeśli nazwa podtematu znajduje się na liście ukrytych, zwróć false.
            if (hiddenTopics.includes(subTopicKey)) {
                return false;
            }

            // 3. W przeciwnym razie, zwróć true (temat jest widoczny w teorii).
            return true;
        });
    }, [db, grade, topic]);

    const handleSubTopicPress = (subTopic: string) => {
        navigation.navigate('TheoryDetail', {
            grade: grade,
            topic: topic,
            subTopic: subTopic,
        });
    };

    // Zmieniona funkcja renderująca na styl kółek
    const renderCircleButton = (item: string, index: number) => (
        <TouchableOpacity
            key={`circle-${item}-${index}`}
            style={styles.topicButton}
            onPress={() => handleSubTopicPress(item)}
            activeOpacity={0.85}
        >
            <Text style={styles.topicButtonText}>{item}</Text>
        </TouchableOpacity>
    );

    // Nowa funkcja renderująca treść w układzie 1-2-1-2 (z SubTopicListScreen.tsx)
    const renderContent = () => {
        const layoutGroups = [];
        let currentIndex = 0;
        const totalTopics = subTopics.length;

        // Używamy oryginalnej logiki grupowania 1-2-1-2...
        while (currentIndex < totalTopics) {
            if (currentIndex < totalTopics) {
                // Rząd z jednym kołem
                layoutGroups.push(
                    <View key={`group-${currentIndex}`} style={styles.singleCircleRow}>
                        {renderCircleButton(subTopics[currentIndex], currentIndex)}
                    </View>
                );
                currentIndex++;
            }

            if (currentIndex < totalTopics && currentIndex + 1 < totalTopics) {
                // Rząd z dwoma kołami
                layoutGroups.push(
                    <View key={`group-${currentIndex}-two`} style={styles.twoCircleRow}>
                        {renderCircleButton(subTopics[currentIndex], currentIndex)}
                        {renderCircleButton(subTopics[currentIndex + 1], currentIndex + 1)}
                    </View>
                );
                currentIndex += 2;
            } else if (currentIndex < totalTopics) {
                // Rząd z jednym kołem (jeśli jest nieparzysta reszta)
                layoutGroups.push(
                    <View key={`group-${currentIndex}`} style={styles.singleCircleRow}>
                        {renderCircleButton(subTopics[currentIndex], currentIndex)}
                    </View>
                );
                currentIndex++;
            }
        }

        return layoutGroups;
    };


    return (
        <ImageBackground
            source={require('../assets/books1.png')} // Zmienić na ścieżkę do tła
            style={styles.backgroundImage}
            resizeMode="cover"
        >
            <View style={styles.overlay}>
                <Text style={styles.headerText}>Podtematy dla: {topic}</Text>

                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {subTopics.length === 0 ? (
                        <Text style={styles.emptyText}>
                            Brak dostępnych podtematów teorii dla tego działu.
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
    // --- STYLES Z SUBTOPICLISTSCREEN.TSX ---
    backgroundImage: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        paddingHorizontal: PADDING_HORIZONTAL,
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
        alignItems: 'center',
        paddingBottom: 40,
    },
    singleCircleRow: {
        marginBottom: 20,
        // Centrowanie w rzędzie z jednym kołem
        alignItems: 'center',
    },
    twoCircleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: width - PADDING_HORIZONTAL * 2,
        marginBottom: 20,
    },
    topicButton: {
        backgroundColor: '#00BCD4', // Zmieniono na turkusowy/cyjan (bardziej "teoretyczny" kolor)
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
        // Używamy mniejszej czcionki, aby zmieściły się długie nazwy tematów
        fontSize: 18,
    },
    // --- USUNIĘTO NIEUŻYWANE STYLE Z POPRZEDNIEJ TEORII (itemContainer, itemText itp.) ---
});

export default TheorySubTopicListScreen;