// src/utils/matchstickEngine.ts

// Модель 7 сегментів
// [верх(0), верх-ліво(1), верх-право(2), середина(3), низ-ліво(4), низ-право(5), низ(6)]
export const SEGMENTS_MAP = {
    // --- ЦИФРИ (0-9) ---
    '0': [1, 1, 1, 0, 1, 1, 1],
    '1': [0, 0, 1, 0, 0, 1, 0],
    '2': [1, 0, 1, 1, 1, 0, 1],
    '3': [1, 0, 1, 1, 0, 1, 1],
    '4': [0, 1, 1, 1, 0, 1, 0],
    '5': [1, 1, 0, 1, 0, 1, 1],
    '6': [1, 1, 0, 1, 1, 1, 1],
    '7': [1, 0, 1, 0, 0, 1, 0],
    '8': [1, 1, 1, 1, 1, 1, 1],
    '9': [1, 1, 1, 1, 0, 1, 1],

    // --- ОПЕРАТОРИ ---
    '+': [0, 0, 1, 1, 0, 0, 0],
    '-': [0, 0, 0, 1, 0, 0, 0],
    '=': [0, 0, 0, 1, 0, 0, 1],

    // --- СИСТЕМНІ ---
    ' ': [0, 0, 0, 0, 0, 0, 0],
    // '?' ВИДАЛЕНО
};

/**
 * Перетворює масив сегментів назад у символ
 */
export const segmentsToChar = (segments: number[]): string => {
    const segString = segments.join('');
    for (const char in SEGMENTS_MAP) {
        if (SEGMENTS_MAP[char].join('') === segString) {
            return char;
        }
    }
    return '?'; // Повертає '?', якщо нічого не знайдено
};

// ... (решта файлу: isEquationCorrect, VALID_MOVES) ...
// ... (код залишається без змін) ...
export const VALID_MOVES = {
    '0': ['6', '9'], '1': ['7'], '2': ['3'],
    '3': ['2', '5', '9'], '4': [], '5': ['3', '6', '9'],
    '6': ['0', '5', '8', '9'], '7': ['1'], '8': ['0', '6', '9'],
    '9': ['0', '3', '5', '6', '8'],
    '+': ['-'],
    '-': ['+'],
    '=': []
};

export const isEquationCorrect = (equation: string): boolean => {
    const cleanEq = equation.replace(/\s/g, '');
    let match = cleanEq.match(/^(\d+)([+\-])(\d+)(=)(\d+)$/);
    if (match) {
        const [, numA, op, numB, eq, numC] = match;
        const A = parseInt(numA, 10);
        const B = parseInt(numB, 10);
        const C = parseInt(numC, 10);
        if (isNaN(A) || isNaN(B) || isNaN(C)) return false;
        if (op === '+') return A + B === C;
        if (op === '-') return A - B === C;
    }
    match = cleanEq.match(/^(\d+)(=)(\d+)([+\-])(\d+)$/);
    if(match) {
        const [, numA, eq, numB, op, numC] = match;
        const A = parseInt(numA, 10);
        const B = parseInt(numB, 10);
        const C = parseInt(numC, 10);
        if (isNaN(A) || isNaN(B) || isNaN(C)) return false;
        if (op === '+') return A === B + C;
        if (op === '-') return A === B - C;
    }
    return false;
};
