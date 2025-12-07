// src/screens/GamesScreen.tsx

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    useColorScheme,
    ScrollView,
    Dimensions,
} from 'react-native';

import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { GamesStackParamList } from '../navigation/types';

import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS, FONT_SIZES, PADDING, MARGIN } from '../styles/theme';

// --- Размеры карточек ---
const { width } = Dimensions.get('window');
const CARD_MARGIN = MARGIN.small;
const CARD_WIDTH = (width - PADDING.medium * 2 - CARD_MARGIN) / 2;

// ---------- Карточки ----------
interface GameCardProps {
    title: string;
    description: string;
    iconName: keyof typeof Ionicons.glyphMap;
    color: string;
    onPress: () => void;
    themeStyles: any;
}

const ActiveGameCard: React.FC<GameCardProps> = ({
                                                     title,
                                                     description,
                                                     iconName,
                                                     color,
                                                     onPress,
                                                     themeStyles,
                                                 }) => (
    <TouchableOpacity
        style={[styles.card, styles.activeCard, themeStyles.card]}
        onPress={onPress}
    >
        <Ionicons name={iconName} size={35} color={color} style={styles.icon} />
        <Text style={[styles.cardTitle, themeStyles.text]}>{title}</Text>
        <Text style={[styles.cardDescription, themeStyles.description]}>
            {description}
        </Text>
        <Ionicons
            name="arrow-forward-circle-outline"
            size={26}
            color={color}
            style={styles.cardChevron}
        />
    </TouchableOpacity>
);

interface DevCardProps {
    title: string;
    iconName: keyof typeof Ionicons.glyphMap;
    themeStyles: any;
}

const InDevelopmentCard: React.FC<DevCardProps> = ({
                                                       title,
                                                       iconName,
                                                       themeStyles,
                                                   }) => (
    <View style={[styles.card, styles.devCard, themeStyles.devCard]}>
        <Ionicons name={iconName} size={35} color={COLORS.grey} style={styles.icon} />
        <Text style={[styles.cardTitle, themeStyles.devTitle]}>{title}</Text>
        <Text style={[styles.devText, themeStyles.devText]}>W Trakcie Opracowania</Text>
        <Ionicons
            name="lock-closed-outline"
            size={26}
            color={COLORS.grey}
            style={styles.cardChevron}
        />
    </View>
);

// ---------- Основной экран ----------
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
        devCard: { backgroundColor: isDarkMode ? COLORS.darkerGrey : COLORS.lightGrey },
        devTitle: { color: isDarkMode ? COLORS.grey : COLORS.mediumGrey },
        devText: { color: isDarkMode ? COLORS.greyDarkTheme : COLORS.mediumGrey },
        sectionTitle: { color: isDarkMode ? COLORS.textDark : COLORS.textLight },
    };

    return (
        <ScrollView style={[styles.container, themeStyles.container]} contentContainerStyle={styles.scrollContent}>

            {/* ---- Активные игры ---- */}
            <Text style={[styles.sectionTitle, themeStyles.sectionTitle]}>💪 Gry Aktywne</Text>

            <View style={styles.gamesGrid}>
                <ActiveGameCard
                    title="Równania z Zapałkami"
                    description="Przesuń jedną zapałkę, aby naprawić równanie."
                    iconName="flame-outline"
                    color={COLORS.accent}
                    onPress={() => navigation.navigate('MatchstickGame')}
                    themeStyles={themeStyles}
                />

                <ActiveGameCard
                    title="Szybkie Liczenie"
                    description="Odpowiedz 'Tak' lub 'Nie' na jak najwięcej równań w 60 sekund."
                    iconName="speedometer-outline"
                    color={COLORS.primary}
                    onPress={() => navigation.navigate('SpeedyCountGame')}
                    themeStyles={themeStyles}
                />

                <ActiveGameCard
                    title="Math Sprint"
                    description="Sprint matematyczny: 30, 45, 60 sekund."
                    iconName="flash-outline"
                    color={COLORS.primary}
                    onPress={() => navigation.navigate('MathSprintGame')}
                    themeStyles={themeStyles}
                />
                {/* <ActiveGameCard
                    title="Multiplication Runner"
                    description="Biegaj i zbieraj poprawne odpowiedzi na działania matematyczne."
                    iconName="flash-outline"
                    color={COLORS.primary}
                    onPress={() => navigation.navigate('MultiplicationRunner')}
                    themeStyles={themeStyles}
                /> */}
            </View>

            {/* ---- Разделитель ---- */}
            <View style={styles.separator} />

            {/* ---- Игры в разработке ---- */}
            <Text style={[styles.sectionTitle, themeStyles.sectionTitle]}>
                🚧 Gry w Trakcie Opracowania
            </Text>

            <View style={styles.gamesGrid}>
                <InDevelopmentCard
                    title="Pamięć Liczbowa"
                    iconName="grid-outline"
                    themeStyles={themeStyles}
                />

                <InDevelopmentCard
                    title="Większe-Mniejsze"
                    iconName="swap-horizontal-outline"
                    themeStyles={themeStyles}
                />

                <InDevelopmentCard
                    title="Wypełnianie Sekwencji"
                    iconName="analytics-outline"
                    themeStyles={themeStyles}
                />
            </View>
        </ScrollView>
    );
}

// ---------- Стили ----------
const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { padding: PADDING.medium },
    sectionTitle: {
        fontSize: FONT_SIZES.large,
        fontWeight: 'bold',
        marginBottom: MARGIN.medium,
        marginTop: MARGIN.small,
    },
    gamesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: MARGIN.large,
    },
    card: {
        width: CARD_WIDTH,
        minHeight: 180,
        padding: PADDING.medium,
        borderRadius: 12,
        marginBottom: MARGIN.medium,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
    },
    activeCard: {
        borderBottomWidth: 4,
        borderBottomColor: COLORS.accent,
    },
    devCard: {
        opacity: 0.7,
        borderBottomWidth: 4,
        borderBottomColor: COLORS.grey,
    },
    icon: {
        marginBottom: MARGIN.small,
        alignSelf: 'flex-start',
    },
    cardTitle: {
        fontSize: FONT_SIZES.medium + 2,
        fontWeight: 'bold',
    },
    cardDescription: {
        fontSize: FONT_SIZES.medium - 1,
        lineHeight: 18,
        marginTop: MARGIN.small,
        flex: 1,
    },
    cardChevron: {
        alignSelf: 'flex-end',
        marginTop: MARGIN.small,
    },
    devText: {
        fontSize: FONT_SIZES.small,
        fontWeight: 'bold',
        marginTop: MARGIN.small,
    },
    separator: {
        height: 1,
        backgroundColor: COLORS.lightGrey,
        marginVertical: MARGIN.medium,
        opacity: 0.5,
    },
});

export default GamesScreen;
