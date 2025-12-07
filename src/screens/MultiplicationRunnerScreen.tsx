import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Dimensions,
    useColorScheme,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { xpService } from '../services/xpService';

const { width, height } = Dimensions.get('window');

// --- Константы позиционирования ---
const TRACK_OFFSET = 100; // Насколько далеко прыгать вверх/вниз
const CENTER_Y = height / 2; // Центр экрана (базовая позиция)
const TOP_TRACK_Y = CENTER_Y - TRACK_OFFSET;
const BOTTOM_TRACK_Y = CENTER_Y + TRACK_OFFSET;
const PLAYER_X = 50;

// Статусы положения игрока для логики
type PlayerLane = 'center' | 'top' | 'bottom';

type Answer = {
    value: number;
    y: number;
    animX: Animated.Value;
    key: string;
    isCorrect: boolean;
    isPassed: boolean;
};

// --- Настройки геймплея ---
const BLOCK_SPEED_DURATION = 8000; // Скорость блоков (чем больше, тем медленнее)
const JUMP_DURATION = 300; // Время полета в одну сторону
const HANG_TIME = 400; // Сколько времени игрок висит на линии перед возвратом

const MultiplicationRunnerScreen = () => {
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';
    const accentColor = isDarkMode ? '#FFD966' : '#7EC8E3';
    const playerColor = isDarkMode ? '#FF4500' : '#1E90FF';

    const [score, setScore] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [answers, setAnswers] = useState<Answer[]>([]);
    const [gameOver, setGameOver] = useState(false);
    const [currentExample, setCurrentExample] = useState<{ text: string; result: number } | null>(null);
    const [xpEarned, setXpEarned] = useState(0);
    const [coinsEarned, setCoinsEarned] = useState(0);

    // Текущая линия игрока (для проверки столкновений)
    const [playerLane, setPlayerLane] = useState<PlayerLane>('center');
    // Блокировка кнопок во время прыжка
    const [isJumping, setIsJumping] = useState(false);

    // Анимация Y начинается с центра
    const playerY = useRef(new Animated.Value(CENTER_Y)).current;
    const gameInterval = useRef<NodeJS.Timer | null>(null);

    // --- Генерация примера ---
    const generateExample = useCallback(() => {
        const a = Math.floor(Math.random() * 9) + 2;
        const b = Math.floor(Math.random() * 9) + 2;
        return { text: `${a} × ${b}`, result: a * b };
    }, []);

    // --- Создание блоков ответов ---
    const spawnAnswer = useCallback((example: { text: string; result: number }) => {
        const correctAnswer = example.result;

        let wrongAnswer = correctAnswer;
        while (wrongAnswer === correctAnswer) {
            wrongAnswer = correctAnswer + (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * 3) + 1);
        }

        const isCorrectTop = Math.random() > 0.5;
        const correctY = isCorrectTop ? TOP_TRACK_Y : BOTTOM_TRACK_Y;
        const wrongY = isCorrectTop ? BOTTOM_TRACK_Y : TOP_TRACK_Y;

        const blockSpacing = width / 3;

        const newAnswers: Answer[] = [
            {
                value: correctAnswer,
                y: correctY,
                animX: new Animated.Value(width),
                key: Math.random().toString() + 'C',
                isCorrect: true,
                isPassed: false
            },
            {
                value: wrongAnswer,
                y: wrongY,
                animX: new Animated.Value(width + blockSpacing),
                key: Math.random().toString() + 'W',
                isCorrect: false,
                isPassed: false
            },
        ];

        setAnswers(prev => [...prev, ...newAnswers]);

        newAnswers.forEach(ans => {
            Animated.timing(ans.animX, {
                toValue: -100,
                duration: BLOCK_SPEED_DURATION,
                useNativeDriver: false,
            }).start();
        });
    }, []);

    // --- Старт игры ---
    const startGame = () => {
        setScore(0);
        setIsRunning(true);
        setGameOver(false);
        setAnswers([]);
        setPlayerLane('center');
        setIsJumping(false);
        playerY.setValue(CENTER_Y);

        const example = generateExample();
        setCurrentExample(example);
        spawnAnswer(example);

        if (gameInterval.current) clearInterval(gameInterval.current);
        gameInterval.current = setInterval(() => {
            setAnswers(prev => prev.filter(ans => ans.animX._value > -100));
        }, 100);
    };

    // --- Логика Прыжка (Вверх или Вниз с возвратом) ---
    const performAction = (targetLane: 'top' | 'bottom') => {
        if (!isRunning || isJumping) return; // Нельзя прыгать, если уже в прыжке

        setIsJumping(true);
        setPlayerLane(targetLane); // Устанавливаем логическую позицию для проверки столкновений

        const targetY = targetLane === 'top' ? TOP_TRACK_Y : BOTTOM_TRACK_Y;

        Animated.sequence([
            // 1. Быстро летим к цели
            Animated.timing(playerY, {
                toValue: targetY,
                duration: JUMP_DURATION,
                useNativeDriver: false
            }),
            // 2. Висим там немного (чтобы успеть поймать блок)
            Animated.delay(HANG_TIME),
            // 3. Возвращаемся в центр
            Animated.timing(playerY, {
                toValue: CENTER_Y,
                duration: JUMP_DURATION,
                useNativeDriver: false
            })
        ]).start(() => {
            // Когда анимация закончилась
            setPlayerLane('center');
            setIsJumping(false);
        });
    };

    const jumpUp = () => performAction('top');
    const jumpDown = () => performAction('bottom');

    // --- Проверка столкновений ---
    const checkCollisionsAndMisses = useCallback(() => {
        if (!currentExample || !isRunning) return;

        // Определяем Y, где сейчас должен быть игрок для "поимки"
        // Если игрок в центре ('center'), он никого не ловит
        const activeLaneY = playerLane === 'center' ? -999 : (playerLane === 'top' ? TOP_TRACK_Y : BOTTOM_TRACK_Y);

        const playerLeft = PLAYER_X;
        const playerRight = PLAYER_X + 50;

        setAnswers(prev => {
            let foundCorrectCollision = false;
            let missedCorrect = false;

            const nextAnswers = prev.map(ans => {
                if (ans.isPassed) return ans;

                const ansLeft = ans.animX._value;
                const ansRight = ans.animX._value + 60;

                // 1. Проверка пересечения
                const isXOverlap = ansLeft < playerRight && ansRight > playerLeft;
                const isYMatch = Math.abs(ans.y - activeLaneY) < 10; // Небольшая погрешность

                if (isXOverlap) {
                    if (isYMatch) {
                        // Мы на одной линии и пересеклись!
                        if (ans.isCorrect) {
                            foundCorrectCollision = true; // УРА!
                            return { ...ans, isPassed: true };
                        } else {
                            // Ударились об неправильный блок
                            // Можно добавить звук ошибки или замедление, но пока просто игнорируем
                            return { ...ans, isPassed: true };
                        }
                    }
                    // Если X пересекается, но Y не совпадает (мы в центре, а блок сверху) - ничего не делаем
                }

                // 2. Проверка пропуска (Блок ушел за спину)
                if (ansRight < PLAYER_X) {
                    if (ans.isCorrect && !ans.isPassed) {
                        missedCorrect = true; // Ой, пропустили правильный
                    }
                    return { ...ans, isPassed: true };
                }

                return ans;
            });

            if (missedCorrect) {
                endGame();
                return prev;
            }

            if (foundCorrectCollision) {
                setScore(s => s + 1);
                const newExample = generateExample();
                setCurrentExample(newExample);
                spawnAnswer(newExample);
                return []; // Очищаем поле для нового раунда
            }

            return nextAnswers;
        });

    }, [currentExample, isRunning, playerLane, generateExample, spawnAnswer]);


    const endGame = () => {
        setIsRunning(false);
        setGameOver(true);
        if (gameInterval.current) clearInterval(gameInterval.current);
        saveRewards();
    };

    const saveRewards = async () => {
        const currentUser = auth().currentUser;
        if (currentUser && score > 0) {
            const calculatedXp = score * 5;
            const calculatedCoins = score * 2;
            setXpEarned(calculatedXp);
            setCoinsEarned(calculatedCoins);

            xpService.addXP(currentUser.uid, calculatedXp, calculatedXp, 0);

            const userDocRef = firestore().collection('users').doc(currentUser.uid);
            await userDocRef.update({
                coins: firestore.FieldValue.increment(calculatedCoins),
            });
        }
    };

    useEffect(() => {
        let collisionInterval: NodeJS.Timer | null = null;
        if (isRunning) {
            collisionInterval = setInterval(checkCollisionsAndMisses, 50);
        }
        return () => {
            if (gameInterval.current) clearInterval(gameInterval.current);
            if (collisionInterval) clearInterval(collisionInterval);
        };
    }, [isRunning, checkCollisionsAndMisses]);

    // Стиль игрока (центрируем по вертикали относительно animated value)
    // Важно: playerY указывает на центр фигуры, поэтому делаем смещение margin
    const playerStyle = {
        top: playerY,
        left: PLAYER_X,
        marginTop: -25, // Половина высоты игрока (50/2), чтобы Y был центром
        backgroundColor: playerColor,
    };

    return (
        <View style={[styles.container, { backgroundColor: isDarkMode ? '#121212' : '#f0f0f0' }]}>
            {/* Инфо панель */}
            <View style={{ position: 'absolute', top: 60, alignItems: 'center', width: '100%', zIndex: 10 }}>
                {currentExample && (
                    <Text style={[styles.exampleText, { color: accentColor }]}>{currentExample.text}</Text>
                )}
                <Text style={[styles.scoreText, { color: isDarkMode ? '#fff' : '#000' }]}>Счет: {score}</Text>
            </View>

            <View style={styles.gameArea}>
                {/* Линии треков (для наглядности, куда прыгать) */}
                <View style={[styles.trackLine, { top: TOP_TRACK_Y }]} />
                <View style={[styles.centerLine, { top: CENTER_Y }]} />
                <View style={[styles.trackLine, { top: BOTTOM_TRACK_Y }]} />

                {/* Игрок */}
                <Animated.View style={[styles.player, playerStyle]} />

                {/* Блоки ответов */}
                {answers.map(ans => (
                    <Animated.View
                        key={ans.key}
                        style={[
                            styles.answerBlock,
                            {
                                top: ans.y - 20, // Центрируем блок (высота 40 / 2)
                                left: ans.animX,
                                backgroundColor: ans.isCorrect ? '#FFD700' : '#F44336',
                                opacity: ans.isPassed ? 0.3 : 1,
                            }
                        ]}
                    >
                        <Text style={styles.answerText}>{ans.value}</Text>
                    </Animated.View>
                ))}
            </View>

            {/* Кнопки управления */}
            <View style={styles.controlsContainer}>
                {!gameOver && !isRunning && (
                    <TouchableOpacity style={[styles.button, { backgroundColor: accentColor }]} onPress={startGame}>
                        <Text style={styles.buttonText}>Старт</Text>
                    </TouchableOpacity>
                )}

                {!gameOver && isRunning && (
                    <View style={styles.controls}>
                        {/* Кнопка Прыжок ВВЕРХ */}
                        <TouchableOpacity
                            style={[styles.controlBtn, { backgroundColor: accentColor, opacity: isJumping ? 0.5 : 1 }]}
                            onPress={jumpUp}
                            disabled={isJumping}
                        >
                            <Text style={styles.arrowText}>▲</Text>
                        </TouchableOpacity>

                        {/* Кнопка Прыжок ВНИЗ */}
                        <TouchableOpacity
                            style={[styles.controlBtn, { backgroundColor: accentColor, opacity: isJumping ? 0.5 : 1 }]}
                            onPress={jumpDown}
                            disabled={isJumping}
                        >
                            <Text style={styles.arrowText}>▼</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {gameOver && (
                    <View style={styles.gameOverContainer}>
                        <Text style={[styles.gameOverText, { color: accentColor }]}>Конец игры!</Text>
                        <Text style={{ fontSize: 20, color: '#FFD700' }}>+ {xpEarned} XP</Text>
                        <TouchableOpacity style={[styles.button, { backgroundColor: accentColor, marginTop: 12 }]} onPress={startGame}>
                            <Text style={styles.buttonText}>Еще раз</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    exampleText: { fontSize: 36, fontWeight: 'bold', marginBottom: 5 },
    scoreText: { fontSize: 20, fontWeight: 'bold' },

    gameArea: { flex: 1, width: '100%', position: 'relative' },

    // Линии для визуализации
    trackLine: { position: 'absolute', width: '100%', height: 2, backgroundColor: '#888', opacity: 0.2, borderStyle: 'dashed', borderWidth: 1, borderColor: '#888' },
    centerLine: { position: 'absolute', width: '100%', height: 1, backgroundColor: '#000', opacity: 0.1 },

    player: { width: 50, height: 50, borderRadius: 10, position: 'absolute', zIndex: 5 },

    answerBlock: { width: 60, height: 40, position: 'absolute', justifyContent: 'center', alignItems: 'center', borderRadius: 8, zIndex: 4, elevation: 3 },
    answerText: { fontSize: 18, fontWeight: 'bold', color: '#fff' },

    controlsContainer: { position: 'absolute', bottom: 40, width: '100%', alignItems: 'center' },
    controls: { flexDirection: 'row', justifyContent: 'space-between', width: '60%' },

    button: { paddingVertical: 12, paddingHorizontal: 30, borderRadius: 25, elevation: 5 },
    buttonText: { fontSize: 20, fontWeight: 'bold', color: '#fff' },

    controlBtn: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', elevation: 5 },
    arrowText: { fontSize: 40, color: '#fff', fontWeight: 'bold' },

    gameOverContainer: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.8)', padding: 20, borderRadius: 15 },
    gameOverText: { fontSize: 28, fontWeight: 'bold', marginBottom: 10 },
});

export default MultiplicationRunnerScreen;