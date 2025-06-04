import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App'; // Імпортуємо наш спільний тип

// Тип для props цього екрану
type ResultsScreenProps = NativeStackScreenProps<RootStackParamList, 'Results'>;

function ResultsScreen({ route, navigation }: ResultsScreenProps) {
    // Отримуємо параметри score та total, передані з TestScreen
    const { score, total } = route.params;
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0;

    // Функція для повернення на головний екран (або вибору класу)
    const handleGoHome = () => {
        // Скидаємо історію навігації і переходимо на Main
        navigation.popToTop(); // Повертає на найперший екран у стеку (Main)
        // Або можна повернутись на вибір класу:
        // navigation.navigate('GradeSelection');
    };

    const handleRestartTest = () => {
        // Повертаємось на попередній екран (TestScreen),
        // але TestScreen має сам скинути свій стан через useEffect
        // АБО краще передати параметри знову для перезапуску
        // navigation.goBack(); // Простий варіант, але може не скинути тест
        // Краще так (якщо TestScreen обробляє ці параметри для рестарту):
        navigation.replace('Test', route.params); // Замінюємо поточний екран на новий екземпляр TestScreen з тими ж параметрами

    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Тест Завершено!</Text>
            <Text style={styles.scoreText}>
                Ваш результат: {score} з {total} ({percentage}%)
            </Text>
            {/* Тут пізніше можна додати детальний розбір помилок */}

            <View style={styles.buttonContainer}>
                {/* <Button title="Спробувати ще раз" onPress={handleRestartTest} /> */}
                <Button title="Повернутися на Головний" onPress={handleGoHome} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#e3f2fd', // Дуже світло-блакитний
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    scoreText: {
        fontSize: 22,
        marginBottom: 40,
        textAlign: 'center',
    },
    buttonContainer: {
        marginTop: 30,
        width: '80%'
    }
});

export default ResultsScreen;
