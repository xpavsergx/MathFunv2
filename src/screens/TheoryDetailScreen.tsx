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
import DecimalSystemBlock from '../Components/Grade4_2/DecimalSystemBlock';
import ComparingNumbersBlock from "../Components/Grade4_2/ComparingNumbersBlock";
import LargeCalculationsBlock from "../Components/Grade4_2/LargeCalculationsBlock";
import MoneyUnitsBlock from "../Components/Grade4_2/MoneyUnitsBlock";
import LengthUnitsBlock from "../Components/Grade4_2/LengthUnitsBlock";
import MassUnitsBlock from "../Components/Grade4_2/MassUnitsBlock";
import RomanSystemBlock from "../Components/Grade4_2/RomanSystemBlock";
import CalendarBlock from "../Components/Grade4_2/CalendarBlock";
import ClockBlock from "../Components/Grade4_2/ClockBlock";
import DynamicAdditionBlock from "../Components/Grade4_3/DynamicAdditionBloc";
import DynamicSubtractionBlock from "../Components/Grade4_3/DynamicSubtractionBlock";
import DynamicMultiplicationBlock from "../Components/Grade4_3/DynamicMultiplicationBlock";
import DynamicMultiplicationByZeroEndBlock from "../Components/Grade4_3/DynamicMultiplicationByZeroEndBlock";
import DynamicDivisionBlock from "../Components/Grade4_3/DynamicDivisionBlock";
import DynamicMultiplicationTwoDigitsBlock from "../Components/Grade4_3/DynamicMultiplicationTwoDigitsBlock";
import FractionTheoryBlock from "../Components/Drade4_4/FractionTheoryBlock";
import MixedNumbersTheory from "../Components/Drade4_4/MixedNumbersTheory";
import FractionsTimelineBlock from "../Components/Drade4_4/FractionsTimelineBlock";
import FractionsComparisonBlock from "../Components/Drade4_4/FractionsComparisonBlock";
import FractionsExpansionBlock from "../Components/Drade4_4/FractionsExpansionBlock";
import ImproperFractionsBlock from "../Components/Drade4_4/ImproperFractionsBlock";
import FractionAsDivisionBlock from "../Components/Drade4_4/FractionAsDivisionBlock";
import FractionsAdditionBlock from "../Components/Drade4_4/FractionsAdditionBlock";
import FractionsSubtractionBlock from "../Components/Drade4_4/FractionsSubtractionBlock";

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
        ) ||
        (
            grade === "4" &&
            topic === "SYSTEM ZAPISYWANIA LICZB" &&
            (
                subTopic === "System dziesiątkowy" ||
                subTopic === "Porównywanie liczb naturalnych" ||
                subTopic === "Rachunki pamięciowe na dużych liczbach" ||
                subTopic === "Jednostki monetarne - złote i grosze" ||
                subTopic === "Jednostki długości" ||
                subTopic === "Jednostki masy" ||
                subTopic === "System rzymski" ||
                subTopic === "Z kalendarzem za pan brat" ||
                subTopic === "Godziny na zegarach"
            )
        ) ||
        (
            grade === "4" &&
            topic === "DZIAŁANIA PISEMNE" &&
            (
                subTopic === "Dodawanie pisemne" ||
                subTopic === "Odejmowanie pisemne" ||
                subTopic === "Mnożenie pisemne przez liczby jednocyfrowe" ||
                subTopic === "Mnożenie przez liczby z zerami na końcu" ||
                subTopic === "Dzielenie pisemne przez liczby jednocyfrowe" ||
                subTopic === "Mnożenie pisemne przez liczby wielocyfrowe"
            )
        ) ||
        (
            grade === "4" &&
            topic === "UŁAMKI ZWYKŁE" &&
            (
                subTopic === "Ułamek jako część całości" ||
                subTopic === "Liczby mieszane" ||
                subTopic === "Ułamki i liczby mieszane na osi liczbowej" ||
                subTopic === "Porównywanie ułamków" ||
                subTopic === "Rozszerzanie i skracanie ułamków" ||
                subTopic === "Ułamki niewłaściwe" ||
                subTopic === "Ułamek jako wynik dzielenia" ||
                subTopic === "Dodawanie ułamków zwykłych" ||
                subTopic === "Odejmowanie ułamków zwykłych"

            )
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
                {subTopic === "System dziesiątkowy" && (
                    <DecimalSystemBlock />
                )}
                {subTopic === "Porównywanie liczb naturalnych" && (
                    <ComparingNumbersBlock />
                )}
                {subTopic === "Rachunki pamięciowe na dużych liczbach" && (
                    <LargeCalculationsBlock />
                )}
                {subTopic === "Jednostki monetarne - złote i grosze" && (
                    <MoneyUnitsBlock />
                )}
                {subTopic === "Jednostki długości" && (
                    <LengthUnitsBlock />
                )}
                {subTopic === "Jednostki masy" && (
                    <MassUnitsBlock />
                )}
                {subTopic === "System rzymski" && (
                    <RomanSystemBlock />
                )}
                {subTopic === "Z kalendarzem za pan brat" && (
                    <CalendarBlock />
                )}
                {subTopic === "Godziny na zegarach" && (
                    <ClockBlock />
                )}
                {subTopic === "Dodawanie pisemne" && (
                    <DynamicAdditionBlock />
                )}
                {subTopic === "Odejmowanie pisemne" && (
                    <DynamicSubtractionBlock />
                )}
                {subTopic === "Mnożenie pisemne przez liczby jednocyfrowe" && (
                    <DynamicMultiplicationBlock />
                )}
                {subTopic === "Mnożenie przez liczby z zerami na końcu" && (
                    <DynamicMultiplicationByZeroEndBlock />
                )}
                {subTopic === "Dzielenie pisemne przez liczby jednocyfrowe" && (
                    <DynamicDivisionBlock />
                )}
                {subTopic === "Mnożenie pisemne przez liczby wielocyfrowe" && (
                    <DynamicMultiplicationTwoDigitsBlock />
                )}
                {subTopic === "Ułamek jako część całości" && (
                    <FractionTheoryBlock />
                )}
                {subTopic === "Liczby mieszane" && (
                    <MixedNumbersTheory />
                )}
                {subTopic === "Ułamki i liczby mieszane na osi liczbowej" && (
                    <FractionsTimelineBlock />
                )}
                {subTopic === "Porównywanie ułamków" && (
                    <FractionsComparisonBlock />
                )}
                {subTopic === "Rozszerzanie i skracanie ułamków" && (
                    <FractionsExpansionBlock />
                )}
                {subTopic === "Ułamki niewłaściwe" && (
                    <ImproperFractionsBlock />
                )}
                {subTopic === "Ułamek jako wynik dzielenia" && (
                    <FractionAsDivisionBlock />
                )}
                {subTopic === "Dodawanie ułamków zwykłych" && (
                    <FractionsAdditionBlock />
                )}
                {subTopic === "Odejmowanie ułamków zwykłych" && (
                    <FractionsSubtractionBlock />
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
