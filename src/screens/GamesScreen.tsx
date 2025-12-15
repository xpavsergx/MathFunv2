// src/screens/GamesScreen.tsx

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme, ScrollView, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GamesStackParamList } from '../navigation/types';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS, FONT_SIZES, PADDING, MARGIN } from '../styles/theme';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - PADDING.medium * 2 - MARGIN.small) / 2;

interface GameCardProps {
    title: string;
    description: string;
    iconName: keyof typeof Ionicons.glyphMap;
    color: string;
    onPress: () => void;
    themeStyles: any;
}

const ActiveGameCard: React.FC<GameCardProps> = ({ title, description, iconName, color, onPress, themeStyles }) => (
    <TouchableOpacity style={[styles.card, styles.activeCard, themeStyles.card, { borderBottomColor: color }]} onPress={onPress}>
        <Ionicons name={iconName} size={35} color={color} style={styles.icon} />
        <Text style={[styles.cardTitle, themeStyles.text]}>{title}</Text>
        <Text style={[styles.cardDescription, themeStyles.description]} numberOfLines={3}>{description}</Text>
        <Ionicons name="play-circle-outline" size={26} color={color} style={styles.cardChevron} />
    </TouchableOpacity>
);

type Nav = NativeStackNavigationProp<GamesStackParamList, 'GamesMain'>;

function GamesScreen() {
    const navigation = useNavigation<Nav>();
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';

    const themeStyles = {
        container: { backgroundColor: isDarkMode ? COLORS.backgroundDark : '#F7F7F7' },
        card: { backgroundColor: isDarkMode ? COLORS.cardDark : COLORS.white },
        text: { color: isDarkMode ? COLORS.textDark : COLORS.textLight },
        description: { color: isDarkMode ? COLORS.greyDarkTheme : COLORS.grey },
        sectionTitle: { color: isDarkMode ? COLORS.textDark : COLORS.textLight },
    };

    return (
        <ScrollView style={[styles.container, themeStyles.container]} contentContainerStyle={styles.scrollContent}>
            <Text style={[styles.sectionTitle, themeStyles.sectionTitle]}>🎮 Wszystkie Gry</Text>

            <View style={styles.gamesGrid}>
                {/* Існуючі ігри */}
                <ActiveGameCard
                    title="Zapałki"
                    description="Logiczne łamigłówki z zapałkami."
                    iconName="flame-outline"
                    color={COLORS.accent}
                    onPress={() => navigation.navigate('MatchstickGame')}
                    themeStyles={themeStyles}
                />
                <ActiveGameCard
                    title="Szybkie Liczenie"
                    description="Tak czy Nie? Masz 60 sekund!"
                    iconName="speedometer-outline"
                    color={COLORS.primary}
                    onPress={() => navigation.navigate('SpeedyCountGame')}
                    themeStyles={themeStyles}
                />
                <ActiveGameCard
                    title="Math Sprint"
                    description="Wyścig z mnożeniem i dodawaniem."
                    iconName="flash-outline"
                    color="#FFC107"
                    onPress={() => navigation.navigate('MathSprintGame')}
                    themeStyles={themeStyles}
                />

                {/* ✅ НОВІ ІГРИ (Вже активні!) */}
                <ActiveGameCard
                    title="Pamięć Liczbowa"
                    description="Zapamiętaj i wpisz liczbę."
                    iconName="brain-outline"
                    color="#9C27B0" // Фіолетовий
                    onPress={() => navigation.navigate('NumberMemoryGame')}
                    themeStyles={themeStyles}
                />
                <ActiveGameCard
                    title="Większe-Mniejsze"
                    description="Co jest większe? Szybkie decyzje."
                    iconName="resize-outline"
                    color="#E91E63" // Рожевий
                    onPress={() => navigation.navigate('GreaterLesserGame')}
                    themeStyles={themeStyles}
                />
                <ActiveGameCard
                    title="Sekwencje"
                    description="Znajdź kolejną liczbę w ciągu."
                    iconName="git-commit-outline"
                    color="#009688" // Бірюзовий
                    onPress={() => navigation.navigate('SequenceGame')}
                    themeStyles={themeStyles}
                />
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { padding: PADDING.medium },
    sectionTitle: { fontSize: FONT_SIZES.large, fontWeight: 'bold', marginBottom: MARGIN.medium, marginTop: MARGIN.small },
    gamesGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingBottom: 20 },
    card: { width: CARD_WIDTH, minHeight: 160, padding: PADDING.medium, borderRadius: 16, marginBottom: MARGIN.medium, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3 },
    activeCard: { borderBottomWidth: 4 },
    icon: { marginBottom: MARGIN.small },
    cardTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
    cardDescription: { fontSize: 12, lineHeight: 16, flex: 1 },
    cardChevron: { alignSelf: 'flex-end', marginTop: MARGIN.small },
});

export default GamesScreen;
