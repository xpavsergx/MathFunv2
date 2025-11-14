// src/utils/avatarUtils.ts

// Ця функція тепер буде імпортуватися
// в ProfileScreen, UserDetailsScreen та StoreScreen.

export const getAvatarImage = (avatarName?: string) => {
    switch (avatarName) {
        case 'avatar1':
            return require('../assets/avatar/avatar1.png');
        case 'avatar2':
            return require('../assets/avatar/avatar2.png');
        case 'avatar3':
            return require('../assets/avatar/avatar3.png');
        case 'avatar4_robot':
            return require('../assets/avatar/avatar4_robot.png');
        case 'avatar5_dragon':
            return require('../assets/avatar/avatar5_dragon.png');
        default:
            // Повертаємо avatar1 як стандартний, а не avatar2
            return require('../assets/avatar/avatar1.png');
    }
};

// Ми також можемо додати сюди зображення для підсилень
export const getPowerUpImage = (powerUpId: string) => {
    switch (powerUpId) {
        case 'hint5050':
            // ⚠️ Переконайтеся, що ви додали цей файл!
            return require('../assets/avatar/hint5050.png');
        case 'doubleXp':
            // ⚠️ Переконайтеся, що ви додали цей файл!
            return require('../assets/avatar/doubleXp.png');
        default:
            // Іконка за замовчуванням
            return require('../assets/question.png');
    }
};
