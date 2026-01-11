// src/styles/theme.ts

export const COLORS = {
    primary: '#00BCD4',
    accent: '#FF9800',
    error: '#FF5252',
    // Jasny motyw
    backgroundLight: '#F0F4F8', // Delikatny błękitny/szary zamiast czystej bieli
    textLight: '#1F2937',
    cardLight: '#FFFFFF',
    // Ciemny motyw
    backgroundDark: '#0F172A', // Głęboki granat (lepiej wygląda niż czysty czarny)
    textDark: '#F3F4F6',
    cardDark: '#1E293B',
    // Ogólne
    white: '#FFFFFF',
    black: '#000000',
    correct: '#10B981', // Nowoczesna zieleń
    incorrect: '#EF4444', // Nowoczesna czerwień
    grey: '#9CA3AF',
    primaryDarkTheme: '#22D3EE',
    greyDarkTheme: '#4B5563',
};

// Nowe sekcje dla spójności
export const ROUNDING = {
    small: 8,
    medium: 16,
    large: 24,
    full: 999,
};

export const SHADOWS = {
    light: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    medium: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 6,
    }
};

export const FONT_SIZES = {
    small: 12,
    medium: 16,
    large: 20,
    xlarge: 24,
    title: 32, // Powiększony dla lepszego efektu
};

export const PADDING = {
    small: 8,
    medium: 16,
    large: 24,
};

export const MARGIN = {
    small: 8,
    medium: 16,
    large: 24,
};
