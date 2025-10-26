import React, { useMemo, useState } from 'react'; // ✅ Dodano useState
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    ImageBackground,
    ScrollView,
    Modal, // ✅ Dodano Modal
} from 'react-native';
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

const { width } = Dimensions.get('window');
const CIRCLE_DIAMETER = (width - 40 - 20) / 2;

function SubTopicListScreen({ route, navigation }: SubTopicListProps) {
    const { grade, topic } = route.params;
    const db: QuestionsDatabaseType = questionsDatabase as QuestionsDatabaseType;

    // ✅ Dodano stan do zarządzania widocznością Modala
    const [modalVisible, setModalVisible] = useState(false);

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

    // ✅ Nowa funkcja do obsługi wyboru w Modalu
    const handleModalSelection = (mode: 'learn' | 'assess') => {
        setModalVisible(false); // Zamknij modal
        handleFullTopicTest(mode); // Przejdź do testu
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
                    // ✅ Poprawka na podstawie Twojego pliku - nazwa ekranu
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

    const renderContent = () => {
        const layoutGroups = [];
        let currentIndex = 0;

        if (subTopicsWithQuestions[currentIndex]) {
            layoutGroups.push(
                <View key="group-0" style={styles.singleCircleRow}>
                    {renderCircleButton(subTopicsWithQuestions[currentIndex], currentIndex)}
                </View>
            );
            currentIndex++;
        }

        if (subTopicsWithQuestions[currentIndex] && subTopicsWithQuestions[currentIndex + 1]) {
            layoutGroups.push(
                <View key="group-1" style={styles.twoCircleRow}>
                    {renderCircleButton(subTopicsWithQuestions[currentIndex], currentIndex)}
                    {renderCircleButton(subTopicsWithQuestions[currentIndex + 1], currentIndex + 1)}
                </View>
            );
            currentIndex += 2;
        }

        if (subTopicsWithQuestions[currentIndex]) {
            layoutGroups.push(
                <View key="group-2" style={styles.singleCircleRow}>
                    {renderCircleButton(subTopicsWithQuestions[currentIndex], currentIndex)}
                </View>
            );
            currentIndex++;
        }

        if (subTopicsWithQuestions[currentIndex] && subTopicsWithQuestions[currentIndex + 1]) {
            layoutGroups.push(
                <View key="group-3" style={styles.twoCircleRow}>
                    {renderCircleButton(subTopicsWithQuestions[currentIndex], currentIndex)}
                    {renderCircleButton(subTopicsWithQuestions[currentIndex + 1], currentIndex + 1)}
                </View>
            );
            currentIndex += 2;
        }

        if (subTopicsWithQuestions[currentIndex]) {
            layoutGroups.push(
                <View key="group-4" style={styles.singleCircleRow}>
                    {renderCircleButton(subTopicsWithQuestions[currentIndex], currentIndex)}
                </View>
            );
            currentIndex++;
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

                    {/* ✅ Przeniesiono kontener przycisku WEWNĄTRZ ScrollView */}
                    <View style={styles.fullTopicButtonContainer}>
                        {/* ✅ Zastąpiono dwa przyciski JEDNYM, który otwiera Modal */}
                        <TouchableOpacity
                            style={[styles.testButtonBase, styles.testButtonTraining]}
                            onPress={() => setModalVisible(true)} // Otwiera Modal
                            activeOpacity={0.85}
                        >
                            <Text style={styles.testButtonText}>
                                {`Test z całego działu "${topic}"`}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>

                {/* ✅ Dodano JSX dla Modala */}
                <Modal
                    animationType="fade"
                    transparent={true}
                    visible={modalVisible}
                    onRequestClose={() => setModalVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Wybierz tryb testu</Text>

                            <TouchableOpacity
                                style={[styles.modalButton, styles.modalButtonTraining]}
                                onPress={() => handleModalSelection('learn')}
                            >
                                <Text style={styles.modalButtonText}>Trening</Text>
                                <Text style={styles.modalDescription}>
                                    Ćwicz bez presji czasu i z podpowiedziami.
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalButton, styles.modalButtonAssess]}
                                onPress={() => handleModalSelection('assess')}
                            >
                                <Text style={styles.modalButtonText}>Kontrolny</Text>
                                <Text style={styles.modalDescription}>
                                    Sprawdź swoją wiedzę na ocenę, bez powrotu.
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.modalCancelButton}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={styles.modalCancelText}>Anuluj</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
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
        // ✅ Usunięto 'flexGrow: 1'
        paddingVertical: 10,
        alignItems: 'center',
        paddingBottom: 40, // ✅ Dodano padding na dole, aby był odstęp
    },
    singleCircleRow: {
        marginBottom: 20,
    },
    twoCircleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: width - 40,
        marginBottom: 20,
    },
    topicButton: {
        backgroundColor: '#3A7D44', // ✅ ZMIANA KOLORU (Ciemna zieleń)
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
        fontSize: 14,
        fontWeight: '700',
        textAlign: 'center',
    },
    fullTopicButtonContainer: {
        marginTop: 40, // ✅ ZMIANA - stały margines zamiast 'auto'
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#D1D5DB',
        width: '100%', // ✅ Dodano szerokość dla pewności
    },
    testButtonBase: {
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 20,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 3,
        marginBottom: 10,
    },
    testButtonTraining: {
        backgroundColor: '#2563EB', // Zostawiamy niebieski dla głównego przycisku
    },
    // ✅ Usunięto styl 'testButtonAssess' (szary przycisk)
    testButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
        textAlign: 'center',
    },

    // --- ✅ DODANO STYLE DLA MODALA ---
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)', // Półprzezroczyste tło
    },
    modalContent: {
        width: '85%',
        maxWidth: 350,
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 24,
    },
    modalButton: {
        width: '100%',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        marginBottom: 12,
        elevation: 2,
    },
    modalButtonTraining: {
        backgroundColor: '#2563EB',
    },
    modalButtonAssess: {
        backgroundColor: '#8B0000', // Szary dla "Kontrolnego"
    },
    modalButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
        textAlign: 'center',
    },
    modalDescription: {
        color: 'rgba(255, 255, 255, 0.85)',
        fontSize: 13,
        textAlign: 'center',
        marginTop: 4,
    },
    modalCancelButton: {
        marginTop: 16,
        padding: 10,
    },
    modalCancelText: {
        fontSize: 16,
        color: '#6B7280',
        fontWeight: '500',
    },
});

export default SubTopicListScreen;