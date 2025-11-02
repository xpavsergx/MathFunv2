// src/components/MatchstickSymbol.tsx
import React from 'react';
import { View, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import { SEGMENTS_MAP } from '../utils/matchstickEngine';

// --- ✅ ЗБІЛЬШЕНІ КОНСТАНТИ ---
const STICK_THICKNESS = 6; // Було 4
const STICK_LENGTH = 36;   // Було 28
const STICK_HEIGHT = 40;   // Було 30
const HEAD_SIZE = 8;       // Було 6
const CONTAINER_WIDTH = STICK_LENGTH + STICK_THICKNESS * 2; // ~48
const CONTAINER_HEIGHT = (STICK_HEIGHT * 2) + (STICK_THICKNESS * 3); // ~98

// --- Кольори (залишаємо, як є - жовті на темному тлі) ---
const getColors = (isDarkMode: boolean) => ({
    WOOD_COLOR: isDarkMode ? '#FFEB3B' : '#A1887F',
    HEAD_COLOR: isDarkMode ? '#FBC02D' : '#3E2723',
    INACTIVE_COLOR: isDarkMode ? '#424242' : '#E0E0E0',
    HELD_OPACITY: 0.4,
});

type Props = {
    char: string;
    symbolIndex: number;
    onSegmentPress: (segmentIndex: number) => void;
    heldMatchstick: { symbolIndex: number, segmentIndex: number } | null;
};

// --- Компонент Статичного Сірника (для '=') ---
const StaticStick = ({ style, headStyle, colors, isActive }) => {
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

// --- Компонент Інтерактивного Сірника (для 0-9, +, -) ---
const Matchstick = ({ segmentIndex, style, headStyle, isActive, isHeld, onPress, colors }) => {

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
            // ✅ ЗБІЛЬШУЄМО ОБЛАСТЬ НАТИСКАННЯ
            hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
        >
            <View style={headStyleCalculated} />
        </TouchableOpacity>
    );
};

// --- Рендерер для Цифр (0-9) ---
const DigitRenderer = ({ segments, symbolIndex, onSegmentPress, heldMatchstick, colors }: any) => {
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

// --- ✅ ОНОВЛЕНИЙ Рендерер для Операторів (+, -, =) ---
// Цей рендерер тепер малює ТІЛЬКИ потрібні сірники
const OperatorRenderer = ({ char, segments, symbolIndex, onSegmentPress, heldMatchstick, colors }: any) => {

    // Стилі для '=' (статичні)
    if (char === '=') {
        return (
            <>
                {/* Сегмент 3 (верхня риска) */}
                <StaticStick style={[styles.horizontal, styles.equals_top_bar]} headStyle={styles.head_0} colors={colors} isActive={segments[3] === 1} />
                {/* Сегмент 6 (нижня риска) */}
                <StaticStick style={[styles.horizontal, styles.equals_bottom_bar]} headStyle={styles.head_6} colors={colors} isActive={segments[6] === 1} />
            </>
        );
    }

    // Стилі для '+' або '-' (інтерактивні)
    return (
        <>
            {/* 2: Вертикальний сірник (для +) */}
            <Matchstick
                segmentIndex={2}
                style={[styles.vertical, styles.operator_vertical_middle]}
                headStyle={styles.head_op_v_middle}
                isActive={segments[2] === 1} // '1' для '+', '0' (примара) для '-'
                isHeld={heldMatchstick?.symbolIndex === symbolIndex && heldMatchstick?.segmentIndex === 2}
                onPress={onSegmentPress}
                colors={colors}
            />

            {/* 3: Горизонтальний сірник (для + та -) */}
            <Matchstick
                segmentIndex={3}
                style={[styles.horizontal, styles.middle]}
                headStyle={styles.head_0}
                isActive={segments[3] === 1} // '1' для обох
                isHeld={heldMatchstick?.symbolIndex === symbolIndex && heldMatchstick?.segmentIndex === 3}
                onPress={onSegmentPress}
                colors={colors}
            />
        </>
    );
};


const MatchstickSymbol = ({ char, symbolIndex, onSegmentPress, heldMatchstick }: Props) => {
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';
    const colors = getColors(isDarkMode);

    const segments = SEGMENTS_MAP[char] || SEGMENTS_MAP[' '];
    const isOperator = ['+', '-', '='].includes(char);

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

// --- ✅ ОНОВЛЕНІ СТИЛІ (з новими розмірами) ---
const styles = StyleSheet.create({
    container: {
        width: CONTAINER_WIDTH,
        height: CONTAINER_HEIGHT,
        marginHorizontal: 5,
        position: 'relative',
    },
    stickBase: {
        position: 'absolute',
        borderRadius: 3, // Більший радіус
    },
    headBase: {
        position: 'absolute',
        borderRadius: 4, // Більший радіус
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

    // --- Позиції Сегментів (0-6) для ЦИФР ---
    segment_0: { top: 0, left: STICK_THICKNESS },
    segment_1: { top: STICK_THICKNESS, left: 0 },
    segment_2: { top: STICK_THICKNESS, right: 0 },
    segment_3: { top: STICK_HEIGHT + STICK_THICKNESS, left: STICK_THICKNESS },
    segment_4: { bottom: STICK_THICKNESS, left: 0 },
    segment_5: { bottom: STICK_THICKNESS, right: 0 },
    segment_6: { bottom: 0, left: STICK_THICKNESS },

    // --- Позиції Голівок для ЦИФР ---
    head_0: { top: -2, left: -2 }, // Трохи зміщено
    head_1: { top: -2, left: -2 },
    head_2: { top: -2, right: -2 },
    head_3: { top: -1, left: -2 },
    head_4: { bottom: -2, left: -2 },
    head_5: { bottom: -2, right: -2 },
    head_6: { bottom: -1, left: -2 },

    // --- Спеціальні позиції для ОПЕРАТОРІВ ---
    middle: { // (для + та -)
        top: STICK_HEIGHT + STICK_THICKNESS,
        left: STICK_THICKNESS,
    },
    operator_vertical_middle: { // (для +)
        top: (CONTAINER_HEIGHT - STICK_HEIGHT) / 2, // 29
        left: (CONTAINER_WIDTH - STICK_THICKNESS) / 2, // 21
    },
    head_op_v_middle: {
        top: -2,
        left: -2,
    },
    equals_top_bar: { // (сегмент 3 для =)
        top: 39, // (98 - (6*2 + 8)) / 2 = 39
        left: (CONTAINER_WIDTH - STICK_LENGTH) / 2, // (48 - 36) / 2 = 6
    },
    equals_bottom_bar: { // (сегмент 6 для =)
        top: 53, // 39 + 6 + 8 = 53
        left: (CONTAINER_WIDTH - STICK_LENGTH) / 2,
    },
});

export default MatchstickSymbol;



