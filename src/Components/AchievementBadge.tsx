// src/components/AchievementBadge.tsx
import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS, FONT_SIZES, MARGIN } from '../styles/theme';
import { IAchievement } from '../config/achievements'; // Переконайся, що шлях правильний

interface BadgeProps {
    badge: IAchievement & { isUnlocked: boolean };
}

const AchievementBadge = ({ badge }: BadgeProps) => {
    const isDarkMode = useColorScheme() === 'dark';

    const theme = {
        lockedBg: isDarkMode ? '#333' : '#E0E0E0',
        lockedIcon: isDarkMode ? '#555' : '#BDBDBD',
        unlockedBg: isDarkMode ? COLORS.cardDark : '#FFFDE7',
        unlockedIcon: COLORS.accent, // Помаранчевий/золотий
        text: isDarkMode ? COLORS.textDark : COLORS.textLight,
    };

    return (
        <View style={styles.container}>
            <View style={[
                styles.iconContainer,
                { backgroundColor: badge.isUnlocked ? theme.unlockedBg : theme.lockedBg }
            ]}>
                <Ionicons
                    name={badge.isUnlocked ? badge.icon : 'lock-closed'}
                    size={32}
                    color={badge.isUnlocked ? theme.unlockedIcon : theme.lockedIcon}
                />
            </View>
            <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
                {badge.isUnlocked ? badge.name : '???'}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: 80, // Фіксована ширина для елемента галереї
        marginHorizontal: MARGIN.small / 2,
        alignItems: 'center',
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32, // Круг
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: MARGIN.small,
        elevation: 2,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    title: {
        fontSize: FONT_SIZES.small,
        textAlign: 'center',
        fontWeight: '500',
    },
});

export default AchievementBadge;
