// src/utils/matchstickEngine.ts

// Модель сегментів (сірників) для цифр (0-9) на 7-сегментному дисплеї.
// 1 = сегмент увімкнений (є сірник), 0 = сегмент вимкнений.
// Сегменти: [верх, верх-право, низ-право, низ, низ-ліво, верх-ліво, середина]
const SEGMENTS = {
    '0': [1, 1, 1, 1, 1, 1, 0], // 6 сірників
    '1': [0, 1, 1, 0, 0, 0, 0], // 2 сірники
    '2': [1, 1, 0, 1, 1, 0, 1], // 5 сірників
    '3': [1, 1, 1, 1, 0, 0, 1], // 5 сірників
    '4': [0, 1, 1, 0, 0, 1, 1], // 4 сірники
    '5': [1, 0, 1, 1, 0, 1, 1], // 5 сірників
    '6': [1, 0, 1, 1, 1, 1, 1], // 6 сірників
    '7': [1, 1, 1, 0, 0, 0, 0], // 3 сірники
    '8': [1, 1, 1, 1, 1, 1, 1], // 7 сірників
    '9': [1, 1, 1, 1, 0, 1, 1], // 6 сірників
};

/**
 * Перевіряє, чи є задане рівняння коректним (зазвичай "A <оператор> B = C").
 * Підтримує тільки цілі числа.
 */
export const isEquationCorrect = (equation: string): boolean => {
    // Видаляємо пробіли та розбиваємо на частини
    const cleanEq = equation.replace(/\s/g, '');
    const match = cleanEq.match(/^(\d+)([+\-=/])(\d+)(=)(\d+)$/);

    if (!match) return false;

    const [, left, operator, right, equals, result] = match;

    const numLeft = parseInt(left, 10);
    const numRight = parseInt(right, 10);
    const numResult = parseInt(result, 10);

    if (isNaN(numLeft) || isNaN(numRight) || isNaN(numResult)) return false;

    // Перевірка оператора
    if (operator === '+') {
        return numLeft + numRight === numResult;
    }
    if (operator === '-') {
        return numLeft - numRight === numResult;
    }

    // Якщо ми дійшли сюди, але оператор є, це помилка, або непідтримуваний оператор.
    return false;
};

/**
 * Перевіряє, чи можна перетворити 'fromDigit' на 'toDigit' переміщенням ОДНОГО сірника.
 * (Різниця в кількості сегментів = 0).
 */
export const isValidSingleMove = (fromDigit: string, toDigit: string): boolean => {
    const fromSeg = SEGMENTS[fromDigit];
    const toSeg = SEGMENTS[toDigit];

    if (!fromSeg || !toSeg) return false;

    let added = 0;
    let removed = 0;

    for (let i = 0; i < 7; i++) {
        if (fromSeg[i] === 0 && toSeg[i] === 1) {
            added++; // Сірник додано
        } else if (fromSeg[i] === 1 && toSeg[i] === 0) {
            removed++; // Сірник прибрано
        }
    }

    // Правильне переміщення 1 сірника:
    // Має бути 1 прибрано і 1 додано.
    return added === 1 && removed === 1;
};

/**
 * Перевіряє, чи можна перетворити 'fromDigit' на 'toDigit' додаванням ОДНОГО сірника.
 * (Різниця в кількості сегментів = 1).
 */
export const isValidSingleAdd = (fromDigit: string, toDigit: string): boolean => {
    const fromSeg = SEGMENTS[fromDigit];
    const toSeg = SEGMENTS[toDigit];

    if (!fromSeg || !toSeg) return false;

    let added = 0;
    let removed = 0;

    for (let i = 0; i < 7; i++) {
        if (fromSeg[i] === 0 && toSeg[i] === 1) {
            added++;
        } else if (fromSeg[i] === 1 && toSeg[i] === 0) {
            removed++;
        }
    }

    // Правильне додавання 1 сірника:
    // Має бути 1 додано і 0 прибрано.
    return added === 1 && removed === 0;
};


/**
 * Перевіряє, чи можна перетворити 'fromDigit' на 'toDigit' видаленням ОДНОГО сірника.
 * (Різниця в кількості сегментів = -1).
 */
export const isValidSingleRemove = (fromDigit: string, toDigit: string): boolean => {
    const fromSeg = SEGMENTS[fromDigit];
    const toSeg = SEGMENTS[toDigit];

    if (!fromSeg || !toSeg) return false;

    let added = 0;
    let removed = 0;

    for (let i = 0; i < 7; i++) {
        if (fromSeg[i] === 0 && toSeg[i] === 1) {
            added++;
        } else if (fromSeg[i] === 1 && toSeg[i] === 0) {
            removed++;
        }
    }

    // Правильне видалення 1 сірника:
    // Має бути 0 додано і 1 прибрано.
    return added === 0 && removed === 1;
};


/**
 * Перевіряє, чи перехід від початкового рівняння до поточного відповідає правилу "один сірник".
 */
export const checkMatchstickRule = (initialEq: string, currentEq: string): boolean => {
    // 1. Припустимо, що рівняння складаються лише з цифр 0-9 та операторів.
    // 2. Розбиваємо обидва рівняння на окремі символи
    const initialChars = initialEq.replace(/\s/g, '').split('');
    const currentChars = currentEq.replace(/\s/g, '').split('');

    if (initialChars.length !== currentChars.length) return false;

    let totalMoves = 0;

    for (let i = 0; i < initialChars.length; i++) {
        const initialChar = initialChars[i];
        const currentChar = currentChars[i];

        // Перевіряємо тільки цифри
        if (/\d/.test(initialChar) && /\d/.test(currentChar)) {
            if (initialChar !== currentChar) {
                // Це змінена цифра. Перевіряємо, скільки сірників було переміщено.

                if (isValidSingleMove(initialChar, currentChar)) {
                    totalMoves += 1;
                } else if (isValidSingleAdd(initialChar, currentChar)) {
                    totalMoves += 0.5; // Симулюємо, що це "половина" руху (тільки додано)
                } else if (isValidSingleRemove(initialChar, currentChar)) {
                    totalMoves += 0.5; // Симулюємо, що це "половина" руху (тільки прибрано)
                } else {
                    return false; // Недійсне перетворення
                }
            }
        }
        // Логіка для операторів (складніша) ігнорується для цього мінімального прикладу
    }

    // Якщо обидві половини рівняння змінилися, і це відповідає 1 повному руху
    // (наприклад, 6 на 8 - 1 додано, + на - - 1 прибрано)

    // Спрощуємо: достатньо, щоб хоча б одна цифра змінилася на 1 сірник
    return totalMoves === 1;
};


// /**
//  * На цьому етапі ми ігноруємо цю функцію, оскільки реальна
//  * симуляція пересування занадто складна для імітації через простий клік.
//  */
// export const simulateMove = (currentEq: string, index: number, movedCount: number): string => {
//     // Тимчасова заглушка
//     return currentEq;
// };
