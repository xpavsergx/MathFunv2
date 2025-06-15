import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Button } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainAppStackParamList } from '../../App'; // Припускаємо, що це MainAppStackParamList або об'єднаний тип
import questionsDatabase from '../data/questionsDb.json';

type SubTopicDataForTest = {
  questions?: any[]; // Питання тепер у цьому полі
  // Можуть бути й інші поля, як theoryTitle, theoryContent, але тут вони не потрібні
};

type QuestionsDatabaseType = {
  [grade: string]: {
    [topic: string]: {
      [subTopic: string]: SubTopicDataForTest; // Підтема - це об'єкт
    };
  };
};

type SubTopicListProps = NativeStackScreenProps<MainAppStackParamList, 'SubTopicList'>; // Перевір тип RootStackParamList

function SubTopicListScreen({ route, navigation }: SubTopicListProps) {
  const { grade, topic } = route.params;
  const db: QuestionsDatabaseType = questionsDatabase as QuestionsDatabaseType;

  const subTopicsWithQuestions = useMemo(() => {
    const topicsForGrade = db[String(grade)];
    if (!topicsForGrade) return [];
    const subTopicsMap = topicsForGrade[topic];
    if (!subTopicsMap) return [];
    // Фільтруємо підтеми, залишаючи тільки ті, що мають питання або є об'єктами (для консистентності)
    return Object.keys(subTopicsMap).filter(key =>
        typeof subTopicsMap[key] === 'object' && subTopicsMap[key] !== null // Перевірка, що це об'єкт (нова структура)
    );
  }, [db, grade, topic]);

  const handleFullTopicTest = (selectedMode: 'learn' | 'assess' = 'learn') => {
    console.log(`Старт тесту за РОЗДІЛ: ${topic} (Клас: ${grade}, Режим: ${selectedMode})`);
    navigation.navigate('Test', {
      grade: grade,
      topic: topic,
      testType: 'mainTopic',
      mode: selectedMode,
    });
  };

  const handleSubTopicPress = (subTopicKey: string, selectedMode: 'learn' | 'assess') => {
    console.log(`Старт тесту за ПІДТЕМУ: ${subTopicKey} (Тема: ${topic}, Клас: ${grade}, Режим: ${selectedMode})`);
    navigation.navigate('Test', {
      grade: grade,
      topic: topic,
      subTopic: subTopicKey,
      testType: 'subTopic',
      mode: selectedMode,
    });
  };

  const renderSubTopic = ({ item: subTopicKey }: { item: string }) => (
      <View style={styles.itemContainer}>
        <Text style={styles.itemText}>{subTopicKey}</Text> {/* Показуємо ключ як назву підтеми */}
        <View style={styles.buttonsRow}>
          <TouchableOpacity
              style={[styles.modeButton, styles.learnButton]}
              onPress={() => handleSubTopicPress(subTopicKey, 'learn')}
          >
            <Text style={styles.modeButtonText}>Trening</Text>
          </TouchableOpacity>
          <TouchableOpacity
              style={[styles.modeButton, styles.assessButton]}
              onPress={() => handleSubTopicPress(subTopicKey, 'assess')}
          >
            <Text style={styles.modeButtonText}>Kontrolny</Text>
          </TouchableOpacity>
        </View>
      </View>
  );

  return (
      <View style={styles.container}>
        <View style={styles.fullTopicButtonContainer}>
          <Button
              title={`Test z całego działu "${topic}" (Trening)`}
              onPress={() => handleFullTopicTest('learn')}
              color="#007bff"
          />
          <Button
              title={`Test z działu "${topic}" (Kontrolny)`}
              onPress={() => handleFullTopicTest('assess')}
              color="#FFC107"
          />
        </View>
        <FlatList
            data={subTopicsWithQuestions}
            renderItem={renderSubTopic}
            keyExtractor={(item) => `${grade}-${topic}-${item}`}
            ListEmptyComponent={<Text style={styles.emptyText}>Brak podtematów z pytaniami dla tego działu.</Text>}
            ListHeaderComponent={<Text style={styles.headerText}>Lub wybierz podtemat i tryb:</Text>}
        />
      </View>
  );
}

// Стилі залишаються ті самі, що були в SubTopicListScreen.tsx
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f8ff', },
  fullTopicButtonContainer: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#ddd', backgroundColor: '#e9ecef', gap: 10, },
  headerText: { fontSize: 16, fontWeight: 'bold', paddingHorizontal: 16, paddingTop: 15, paddingBottom: 5, color: '#555', },
  emptyText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: '#666', },
  itemContainer: { backgroundColor: '#ffffff', padding: 15, marginVertical: 6, marginHorizontal: 16, borderRadius: 8, elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.20, shadowRadius: 1.41, },
  itemText: { fontSize: 17, color: '#333', marginBottom: 15, },
  buttonsRow: { flexDirection: 'row', justifyContent: 'space-around', },
  modeButton: { paddingVertical: 10, paddingHorizontal: 15, borderRadius: 20, flex: 1, marginHorizontal: 5, alignItems: 'center', elevation: 2, },
  learnButton: { backgroundColor: '#4CAF50', },
  assessButton: { backgroundColor: '#FF9800', },
  modeButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold', },
});

export default SubTopicListScreen;
