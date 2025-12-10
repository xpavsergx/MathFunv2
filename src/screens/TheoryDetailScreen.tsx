import React from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { TheoryStackParamList } from '../../App';
import questionsDatabase from '../data/questionsDb.json';
import RachunkiMemoryBlock from '../Components/RachunkiMemoryBlock';
import MultiplyDivideBlock from '../Components/MultiplyDivideBlock';
import OileExplanationBlock from '../Components/OileExplanationBlock';
import TimesMoreLessBlock from '../Components/TimesMoreLessBlock';
import DivisionRemainderBlock from '../Components/DivisionRemainderBlock';
import SquaresCubesBlock from '../Components/SquaresCubesBlock';
import OrderOfOperationsBlock from '../Components/OrderOfOperationsBlock';
import TextProblems1Block from '../Components/TextProblems1Block';
import NumberLineBlock from "../Components/NumberLineBlock";

type TheoryContentItem = {
    type: "paragraph" | "subHeader" | "listItem" | "example";
    text: string;
};

type SubTopicTheoryData = {
    theoryTitle?: string;
    theoryContent?: TheoryContentItem[];
    questions?: any[];
};

type QuestionsDatabaseType = {
    [grade: string]: {
        [topic: string]: {
            [subTopic: string]: SubTopicTheoryData;
        };
    };
};

type TheoryDetailScreenProps = NativeStackScreenProps<TheoryStackParamList, 'TheoryDetail'>;

function TheoryDetailScreen({ route }: TheoryDetailScreenProps) {
    const { grade, topic, subTopic } = route.params;
    const db: QuestionsDatabaseType = questionsDatabase as QuestionsDatabaseType;

    const theoryData = db[grade]?.[topic]?.[subTopic];

    const isSpecialMemoryTopic =
        grade === "4" &&
        topic === "LICZBY I DZIAŁANIA" &&
        (
            subTopic === "Rachunki pamięciowe - dodawanie i odejmowanie" ||
            subTopic === "Mnożenie i dzielenie (cd.)" ||
            subTopic === "O ile więcej, o ile mniej" ||
            subTopic === "Ile razy więcej, ile razy mniej" ||
            subTopic === "Dzielenie z resztą" ||
            subTopic === "Kwadraty i sześciany liczb" ||
            subTopic === "Kolejność wykonywania działań" ||
            subTopic === "Zadania tekstowe, cz. 1" ||
            subTopic === "Oś liczbowa"
        );

    if (isSpecialMemoryTopic) {
        return (
            <View style={{flex: 1}}>
                {subTopic === "Rachunki pamięciowe - dodawanie i odejmowanie" && (
                    <RachunkiMemoryBlock />
                )}
                {subTopic === "Mnożenie i dzielenie (cd.)" && (
                    <MultiplyDivideBlock />
                )}
                {subTopic === "O ile więcej, o ile mniej" && (
                    <OileExplanationBlock />
                )}
                {subTopic === "Ile razy więcej, ile razy mniej" && (
                    <TimesMoreLessBlock />
                )}
                {subTopic === "Dzielenie z resztą" && ( // 👈 NOWY BLOK
                    <DivisionRemainderBlock />
                )}
                {/* 🔥 DODAJ WYZWALANIE NOWEGO KOMPONENTU */}
                {subTopic === "Kwadraty i sześciany liczb" && (
                    <SquaresCubesBlock />
                )}
                {subTopic === "Kolejność wykonywania działań" && (
                    <OrderOfOperationsBlock />
                )}
                {subTopic === "Zadania tekstowe, cz. 1" && (
                    <TextProblems1Block />
                )}
                {subTopic === "Oś liczbowa" && (
                    <NumberLineBlock />
                )}
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
                return <Text style={styles.listItem}>• {item.text}</Text>;
            case 'example':
                return (
                    <View style={styles.exampleContainer}>
                        <Text style={styles.exampleLabel}>Przykład:</Text>
                        <Text style={styles.exampleText}>{item.text}</Text>
                    </View>
                );
            default:
                return <Text style={styles.paragraph}>{item.text}</Text>;
        }
    };

    return (
        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.contentContainer}>
            {theoryData?.theoryTitle && (
                <Text style={styles.mainTitle}>{theoryData.theoryTitle}</Text>
            )}

            <FlatList
                data={theoryData?.theoryContent}
                renderItem={renderTheoryItem}
                keyExtractor={(item, index) => `${item.type}_${index}`}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    scrollContainer: {
        flex: 1,
        backgroundColor: '#fff',
    },
    contentContainer: {
        paddingVertical: 20,
        paddingHorizontal: 15,
    },
    mainTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#00796B',
        marginBottom: 20,
        textAlign: 'center',
    },
    paragraph: {
        fontSize: 17,
        lineHeight: 26,
        color: '#333',
        marginBottom: 15,
        textAlign: 'justify',
    },
    subHeader: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#00BCD4',
        marginTop: 18,
        marginBottom: 12,
    },
    listItem: {
        fontSize: 17,
        lineHeight: 26,
        color: '#455A64',
        marginLeft: 10,
        marginBottom: 8,
    },
    exampleContainer: {
        backgroundColor: '#E0F7FA',
        padding: 15,
        borderRadius: 8,
        marginBottom: 15,
        borderLeftWidth: 4,
        borderLeftColor: '#00BCD4',
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
        fontStyle: 'italic',
    },
});

export default TheoryDetailScreen;
