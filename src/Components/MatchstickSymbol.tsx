// src/components/MatchstickSymbol.tsx
import React from 'react';
import { View, StyleSheet, TouchableOpacity, useColorScheme, Text } from 'react-native'; // ✅ Додано Text
import { SEGMENTS_MAP } from '../utils/matchstickEngine';
import { COLORS } from '../styles/theme'; // ✅ Імпортуємо COLORS

// --- Константи ---
const STICK_THICKNESS = 6;
const STICK_LENGTH = 36;
const STICK_HEIGHT = 40;
const HEAD_SIZE = 8;
const CONTAINER_WIDTH = STICK_LENGTH + STICK_THICKNESS * 2;
const CONTAINER_HEIGHT = (STICK_HEIGHT * 2) + (STICK_THICKNESS * 3);

// --- Кольори ---
const getColors = (isDarkMode: boolean) => ({
    WOOD_COLOR: isDarkMode ? '#FFEB3B' : '#A1887F',
    HEAD_COLOR: isDarkMode ? '#FBC02D' : '#3E2723',
    INACTIVE_COLOR: isDarkMode ? '#424242' : '#E0E0E0',
    HELD_OPACITY: 0.4,
    // ✅ Колір для тексту помилки
    ERROR_TEXT: isDarkMode ? COLORS.incorrect : '#B00020',
});

type Props = {
    char: string;
    symbolIndex: number;
    onSegmentPress: (segmentIndex: number) => void;
    heldMatchstick: { symbolIndex: number, segmentIndex: number } | null;
};

// --- Компонент Статичного Сірника (без змін) ---
const StaticStick = ({ style, headStyle, colors, isActive }) => {
    // ... (код без змін) ...
    const stickStyle = [
        styles.stickBase,
        style,
        { backgroundColor: isActive ? colors.WOOD_COLOR : colors.INACTIVE_COLOR },
        !isActive && styles.stickInactive
    ];
    const headStyleCalculated = [
        styles.headBase,
        headStyle,
        { backgroundColor: isActive ? colors.HEAD_COLOR : 'transparent' },
    ];
    return (
        <View style={stickStyle}>
            <View style={headStyleCalculated} />
        </View>
    );
};

// --- Компонент Інтерактивного Сірника (без змін) ---
const Matchstick = ({ segmentIndex, style, headStyle, isActive, isHeld, onPress, colors }) => {
    // ... (код без змін) ...
    const isThisSegmentHeld = isHeld;
    const showAsActive = isActive && !isThisSegmentHeld;
    const showAsInactive = !isActive || isThisSegmentHeld;

    const stickStyle = [
        styles.stickBase,
        style,
        { backgroundColor: showAsActive ? colors.WOOD_COLOR : colors.INACTIVE_COLOR },
        showAsInactive && styles.stickInactive,
    ];

    const headStyleCalculated = [
        styles.headBase,
        headStyle,
        { backgroundColor: showAsActive ? colors.HEAD_COLOR : 'transparent' },
    ];

    return (
        <TouchableOpacity
            style={stickStyle}
            onPress={() => onPress(segmentIndex)}
            activeOpacity={0.8}
            hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
        >
            <View style={headStyleCalculated} />
        </TouchableOpacity>
    );
};

// --- Рендерер для Цифр (без змін) ---
const DigitRenderer = ({ segments, symbolIndex, onSegmentPress, heldMatchstick, colors }: any) => {
    // ... (код без змін) ...
    return (
        <>
            {[0, 1, 2, 3, 4, 5, 6].map(i => (
                <Matchstick
                    key={i}
                    segmentIndex={i}
                    style={[
                        (i === 0 || i === 3 || i === 6) ? styles.horizontal : styles.vertical,
                        styles[`segment_${i}`]
                    ]}
                    headStyle={styles[`head_${i}`]}
                    isActive={segments[i] === 1}
                    isHeld={heldMatchstick?.symbolIndex === symbolIndex && heldMatchstick?.segmentIndex === i}
                    onPress={onSegmentPress}
                    colors={colors}
                />
            ))}
        </>
    );
};

// --- Рендерер для Операторів (без змін) ---
const OperatorRenderer = ({ char, segments, symbolIndex, onSegmentPress, heldMatchstick, colors }: any) => {
    // ... (код без змін) ...
    const isEquals = char === '=';
    const equalsTopStyle = [styles.horizontal, styles.equals_top_bar];
    const equalsBottomStyle = [styles.horizontal, styles.equals_bottom_bar];
    const opHorizontalStyle = [styles.horizontal, styles.middle];
    const opVerticalStyle = [styles.vertical, styles.operator_vertical_middle];

    return (
        <>
            {/* 2: Вертикальний сірник (для +) */}
            <Matchstick
                segmentIndex={2}
                style={opVerticalStyle}
                headStyle={styles.head_op_v_middle}
                isActive={segments[2] === 1}
                isHeld={heldMatchstick?.symbolIndex === symbolIndex && heldMatchstick?.segmentIndex === 2}
                onPress={onSegmentPress}
                colors={colors}
            />
            {/* 3: Горизонтальний сірник (для +, -, =) */}
            {isEquals ? (
                <StaticStick style={equalsTopStyle} headStyle={styles.head_0} colors={colors} isActive={segments[3] === 1} />
            ) : (
                <Matchstick
                    segmentIndex={3}
                    style={opHorizontalStyle}
                    headStyle={styles.head_0}
                    isActive={segments[3] === 1}
                    isHeld={heldMatchstick?.symbolIndex === symbolIndex && heldMatchstick?.segmentIndex === 3}
                    onPress={onSegmentPress}
                    colors={colors}
                />
            )}
            {/* 6: Нижній горизонтальний сірник (для '=') */}
            {isEquals ? (
                <StaticStick style={equalsBottomStyle} headStyle={styles.head_6} colors={colors} isActive={segments[6] === 1} />
            ) : (
                <Matchstick
                    segmentIndex={6}
                    style={equalsBottomStyle}
                    headStyle={styles.head_6}
                    isActive={segments[6] === 1}
                    isHeld={heldMatchstick?.symbolIndex === symbolIndex && heldMatchstick?.segmentIndex === 6}
                    onPress={onSegmentPress}
                    colors={colors}
                />
            )}
        </>
    );
};


// --- ✅ ОНОВЛЕНИЙ ГОЛОВНИЙ КОМПОНЕНТ ---
const MatchstickSymbol = ({ char, symbolIndex, onSegmentPress, heldMatchstick }: Props) => {
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';
    const colors = getColors(isDarkMode);

    // Перевіряємо, чи символ існує в MAP, перш ніж отримати сегменти
    const segments = SEGMENTS_MAP[char];
    const isOperator = ['+', '-', '='].includes(char);

    // ✅ Якщо символ не знайдено (напр. '?')
    if (!segments) {
        return (
            <View style={[styles.container, styles.errorContainer]}>
                <Text style={[styles.errorText, { color: colors.ERROR_TEXT }]}>Nieznany symbol</Text>
            </View>
        );
    }

    // Якщо символ знайдено, рендеримо його
    return (
        <View style={styles.container}>
            {isOperator ? (
                <OperatorRenderer
                    char={char}
                    segments={segments}
                    symbolIndex={symbolIndex}
                    onSegmentPress={onSegmentPress}
                    heldMatchstick={heldMatchstick}
                    colors={colors}
                />
            ) : (
                <DigitRenderer
                    segments={segments}
                    symbolIndex={symbolIndex}
                    onSegmentPress={onSegmentPress}
                    heldMatchstick={heldMatchstick}
                    colors={colors}
                />
            )}
        </View>
    );
};

// --- ✅ ОНОВЛЕНІ СТИЛІ ---
const styles = StyleSheet.create({
    container: {
        width: CONTAINER_WIDTH,
        height: CONTAINER_HEIGHT,
        marginHorizontal: 5,
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
    },
    // ✅ Нові стилі для помилки
    errorContainer: {
        backgroundColor: 'rgba(255, 0, 0, 0.1)',
        borderColor: 'red',
        borderWidth: 1,
        borderRadius: 4,
        padding: 2,
    },
    errorText: {
        fontSize: 10,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    // ... (решта стилів без змін) ...
    stickBase: {
        position: 'absolute',
        borderRadius: 3,
    },
    headBase: {
        position: 'absolute',
        borderRadius: 4,
        width: HEAD_SIZE,
        height: HEAD_SIZE,
    },
    stickActive: {
        elevation: 2,
    },
    headActive: {},
    stickInactive: {
        opacity: 0.3,
    },
    headInactive: {
        backgroundColor: 'transparent',
    },
    horizontal: {
        width: STICK_LENGTH,
        height: STICK_THICKNESS,
    },
    vertical: {
        width: STICK_THICKNESS,
        height: STICK_HEIGHT,
    },
    segment_0: { top: 0, left: STICK_THICKNESS },
    segment_1: { top: STICK_THICKNESS, left: 0 },
    segment_2: { top: STICK_THICKNESS, right: 0 },
    segment_3: { top: STICK_HEIGHT + STICK_THICKNESS, left: STICK_THICKNESS },
    segment_4: { bottom: STICK_THICKNESS, left: 0 },
    segment_5: { bottom: STICK_THICKNESS, right: 0 },
    segment_6: { bottom: 0, left: STICK_THICKNESS },
    head_0: { top: -2, left: -2 },
    head_1: { top: -2, left: -2 },
    head_2: { top: -2, right: -2 },
    head_3: { top: -1, left: -2 },
    head_4: { bottom: -2, left: -2 },
    head_5: { bottom: -2, right: -2 },
    head_6: { bottom: -1, left: -2 },
    middle: {
        top: STICK_HEIGHT + STICK_THICKNESS,
        left: STICK_THICKNESS,
    },
    operator_vertical_middle: {
        top: (CONTAINER_HEIGHT - STICK_HEIGHT) / 2,
        left: (CONTAINER_WIDTH - STICK_THICKNESS) / 2,
    },
    head_op_v_middle: {
        top: -2,
        left: -2,
    },
    equals_top_bar: {
        top: 39,
        left: (CONTAINER_WIDTH - STICK_LENGTH) / 2,
    },
    equals_bottom_bar: {
        top: 53,
        left: (CONTAINER_WIDTH - STICK_LENGTH) / 2,
    },
});

export default MatchstickSymbol;
