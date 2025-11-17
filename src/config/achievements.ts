// src/config/achievements.ts

// --- 1. Ми імпортуємо Ionicons з 'react-native-vector-icons', а не '@expo/'
import Ionicons from 'react-native-vector-icons/Ionicons';

export type CriteriaType =
    | 'testsCompleted'
    | 'correctAnswersTotal'
    | 'flawlessTests'
    | 'duelsWon'
    | 'friendsAdded'
    | 'levelReached'
    | 'trainersCompleted';

// --- 2. Ми використовуємо 'title' та 'iconName', а не 'name' та 'icon'
export interface Achievement {
    id: string;
    title: string; // (було 'name')
    description: string;
    iconName: keyof typeof Ionicons.glyphMap; // (було 'icon')
    criteriaType: CriteriaType;
    criteriaValue: number;
}

// --- 3. Повністю перекладений список ACHIEVEMENTS ---
export const ALL_ACHIEVEMENTS: Achievement[] = [
    // Osiągnięcia za poziom
    {
        id: 'level_5',
        title: 'Nowicjusz',
        description: 'Osiągnij 5 poziom',
        iconName: 'star-outline',
        criteriaType: 'levelReached',
        criteriaValue: 5,
    },
    {
        id: 'level_10',
        title: 'Doświadczony',
        description: 'Osiągnij 10 poziom',
        iconName: 'star',
        criteriaType: 'levelReached',
        criteriaValue: 10,
    },

    // Osiągnięcia za testy
    {
        id: 'test_1',
        title: 'Pierwszy Start',
        description: 'Ukończ 1 test',
        iconName: 'play-outline',
        criteriaType: 'testsCompleted',
        criteriaValue: 1,
    },
    {
        id: 'test_10',
        title: 'Maraton Testowy',
        description: 'Ukończ 10 testów',
        iconName: 'play',
        criteriaType: 'testsCompleted',
        criteriaValue: 10,
    },
    {
        id: 'flawless_1',
        title: 'Bezbłędnie!',
        description: 'Ukończ 1 test bez żadnych błędów',
        iconName: 'shield-checkmark-outline',
        criteriaType: 'flawlessTests',
        criteriaValue: 1,
    },

    // Osiągnięcia za odpowiedzi
    {
        id: 'correct_50',
        title: 'Ekspert Wiedzy',
        description: 'Udziel 50 poprawnych odpowiedzi',
        iconName: 'bulb-outline',
        criteriaType: 'correctAnswersTotal',
        criteriaValue: 50,
    },

    // Osiągnięcia społeczne
    {
        id: 'friend_1',
        title: 'Towarzyski',
        description: 'Dodaj 1 znajomego',
        iconName: 'person-add-outline',
        criteriaType: 'friendsAdded',
        criteriaValue: 1,
    },
    {
        id: 'duel_1',
        title: 'Pojedynkowicz',
        description: 'Wygraj 1 pojedynek',
        iconName: 'flame-outline',
        criteriaType: 'duelsWon',
        criteriaValue: 1,
    },
];
