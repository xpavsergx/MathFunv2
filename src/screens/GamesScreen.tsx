// src/screens/GamesScreen.tsx

import React from 'react';
import { View, Text, StyleSheet, useColorScheme, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
// ✅ Іменований імпорт стилів
import { COLORS, FONT_SIZES, PADDING, MARGIN } from '../styles/theme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GamesStackParamList } from '../../App'; // Імпорт типів з App.tsx

type GamesScreenNavigationProp = NativeStackNavigationProp<GamesStackParamList, 'GamesMain'>;

// Компонент-картка для гри
const GameCard = ({ title, subtitle, icon, onPress, isComingSoon, theme }) => (
    <TouchableOpacity
        style={[styles.gameCard, { backgroundColor: theme.cardBackground, borderColor: theme.cardBorder }]}
        onPress={onPress}
        disabled={isComingSoon}
        activeOpacity={isComingSoon ? 1 : 0.7}
    >
        <Ionicons name={icon} size={40} color={theme.iconColor} style={styles.icon} />
        <View style={styles.textContainer}>
            <Text style={[styles.gameTitle, { color: theme.titleColor }]}>{title}</Text>
            <Text style={[styles.gameSubtitle, { color: theme.subtitleColor }]}>{subtitle}</Text>
        </View>
        {isComingSoon && <Text style={styles.comingSoon}>Wkrótce!</Text>}
    </TouchableOpacity>
);


function GamesScreen() {
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';
    const navigation = useNavigation<GamesScreenNavigationProp>();

    const theme = {
        cardBackground: isDarkMode ? COLORS.cardDark : COLORS.white,
        cardBorder: isDarkMode ? '#333' : '#E0E0E0',
        titleColor: isDarkMode ? COLORS.textDark : COLORS.textLight,
        subtitleColor: isDarkMode ? COLORS.greyDarkTheme : COLORS.grey,
        iconColor: isDarkMode ? COLORS.primaryDarkTheme : COLORS.primary,
        // Використовуємо наш фіолетовий акцент
        accentColor: '#7C4DFF',
        containerBackground: isDarkMode ? '#121212' : '#F0F4F8'
    };

    return (
        <ScrollView contentContainerStyle={styles.scrollContent} style={[styles.container, { backgroundColor: theme.containerBackground }]}>
            <Text style={[styles.header, { color: theme.titleColor }]}>Dostępne Gry i Wyzwania</Text>

            <View style={styles.gridContainer}>

                {/* 1. Рівняння з Сірниками (ЗАБЛОКОВАНО) */}
                <GameCard
                    title="Równania z Zapałkami"
                    subtitle="Popraw równanie, przesuwając jedną zapałkę."
                    icon="flame-outline"
                    onPress={() => navigation.navigate('MatchstickGame')}
                    theme={{...theme, iconColor: theme.accentColor}}
                    isComingSoon={true} // ✅ ЗАБЛОКОВАНО
                />

                {/* 2. Math Sudoku (НОВА) */}
                <GameCard
                    title="Math Sudoku"
                    subtitle="Wypełnij siatkę, używając operacji i liczb."
                    icon="grid-outline"
                    onPress={() => alert('Start Math Sudoku!')}
                    theme={{...theme, iconColor: '#FF4081'}} // Рожевий акцент
                    isComingSoon={true}
                />

                {/* 3. Скарби Пірата (НОВА) */}
                <GameCard
                    title="Skarby Pirata"
                    subtitle="Znajdź drogę, rozwiązując równania ukryte na mapie."
                    icon="map-outline"
                    onPress={() => alert('Start Skarby Pirata!')}
                    theme={{...theme, iconColor: '#FF9800'}} // Помаранчевий акцент
                    isComingSoon={true}
                />

                {/* 4. Тренування Пам'яті (НОВА) */}
                <GameCard
                    title="Trening Pamięci"
                    subtitle="Odnajdź pary, aby wzmocnić swoją pamięć roboczą."
                    icon="bulb-outline"
                    onPress={() => alert('Start Trening Pamięci!')}
                    theme={{...theme, iconColor: '#4CAF50'}} // Зелений акцент
                    isComingSoon={true}
                />

            </View>

        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: PADDING.large, // Відступ знизу
    },
    header: {
        fontSize: FONT_SIZES.xlarge,
        fontWeight: 'bold',
        paddingHorizontal: PADDING.large,
        paddingTop: PADDING.large,
        paddingBottom: PADDING.medium,
    },
    // ✅ Новий контейнер для сітки 2x2
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingHorizontal: PADDING.large,
    },
    // ✅ Стиль картки як блок (50% ширини - відступи)
    gameCard: {
        width: '48%', // Приблизно 50% - для розміщення двох у рядку
        padding: PADDING.medium,
        marginBottom: MARGIN.medium, // Відступ між картками по вертикалі
        borderRadius: 12,
        borderWidth: 1,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        minHeight: 150, // Фіксована мінімальна висота для вигляду блоку
        // Внутрішнє розташування:
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    icon: {
        marginBottom: MARGIN.small, // Відступ під іконкою
    },
    textContainer: {
        width: '100%',
        marginTop: 'auto', // Притискає текст до низу картки
    },
    gameTitle: {
        fontSize: FONT_SIZES.large,
        fontWeight: 'bold',
    },
    gameSubtitle: {
        fontSize: FONT_SIZES.small + 1,
        marginTop: 2,
    },
    comingSoon: {
        position: 'absolute', // Абсолютне розташування
        top: 8,
        right: 8,
        fontSize: FONT_SIZES.small,
        color: '#FF9800',
        fontWeight: 'bold',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        overflow: 'hidden'
    }
});

export default GamesScreen;

