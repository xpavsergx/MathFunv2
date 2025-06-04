import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';

function DetailsScreen({ route, navigation }: { route: any, navigation: any }) {
    const { itemId, otherParam } = route.params;
    return (
        <View style={styles.container}>
            <Text style={styles.text}>Екран Деталей</Text>
            <Text style={styles.text}>itemId: {JSON.stringify(itemId)}</Text>
            <Text style={styles.text}>otherParam: {JSON.stringify(otherParam)}</Text>
            <Button
                title="Перейти до Деталей... знову"
                onPress={() => navigation.push('Details', {
                    itemId: Math.floor(Math.random() * 100),
                })}
            />
            <Button title="Повернутись на Головний" onPress={() => navigation.navigate('Home')} />
            <Button title="Назад" onPress={() => navigation.goBack()} />
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

export default DetailsScreen; // Експортуємо компонент
