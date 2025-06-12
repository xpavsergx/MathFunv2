import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';

// Типи можна буде уточнити пізніше, коли будемо налаштовувати передачу даних між реальними екранами
function HomeScreen({ navigation }: { navigation: any }) {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>Головний Екран</Text>
            <Button
                title="Перейти до Деталей"
                onPress={() => navigation.navigate('Details', {
                    itemId: 86,
                    otherParam: 'Привіт з Головного!',
                })}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10
    },
    text: {
        fontSize: 18
    }
});

export default HomeScreen; // Експортуємо компонент
