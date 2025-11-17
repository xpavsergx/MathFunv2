// src/Components/AchievementBadge.tsx

import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS, FONT_SIZES } from '../styles/theme';

// --- ✅ 1. ОНОВЛЮЄМО ІНТЕРФЕЙС ---
// Тепер ми очікуємо 'iconName'
interface AchievementBadgeProps {
    badge: {
        id: string;
        title: string;
        description: string;
        isUnlocked: boolean;
        iconName: keyof typeof Ionicons.glyphMap; // Очікуємо назву іконки
    };
}

const AchievementBadge: React.FC<AchievementBadgeProps> = ({ badge }) => {
    const { title, isUnlocked, iconName } = badge;
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';

    // Динамічні кольори
    const unlockedColor = isDarkMode ? COLORS.primaryDarkTheme : COLORS.primary;
    const lockedColor = isDarkMode ? COLORS.greyDarkTheme : COLORS.grey;
    const iconColor = isUnlocked ? unlockedColor : lockedColor;
    const textColor = isDarkMode ? COLORS.textDark : COLORS.textLight;

    return (
        <View style={styles.container}>
            <View style={[styles.iconContainer, {
                backgroundColor: isUnlocked ? (isDarkMode ? '#333' : '#E0F7FA') : (isDarkMode ? '#222' : '#F0F0F0'),
                borderColor: iconColor,
            }]}>
                <Ionicons
                    // --- ✅ 2. ВИКОРИСТОВУЄМО ДИНАМІЧНУ ІКОНКУ ---
                    name={isUnlocked ? iconName : "lock-closed-outline"}
                    size={30}
                    color={iconColor}
                />
            </View>
            <Text
                style={[styles.title, { color: isUnlocked ? textColor : lockedColor }]}
                numberOfLines={1}
            >
                {title}
            </Text>
        </View>
    );
};

// (Стилі можна трохи покращити для кращого вигляду)
const styles = StyleSheet.create({
    container: {
        width: 90, // Фіксована ширина
        alignItems: 'center',
        marginHorizontal: 8,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32, // Робимо круглим
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        marginBottom: 8,
    },
    title: {
        fontSize: FONT_SIZES.small,
        fontWeight: '500',
        textAlign: 'center',
    },
});

export default AchievementBadge;
