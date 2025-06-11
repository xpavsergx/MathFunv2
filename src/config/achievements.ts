import { Ionicons } from '@expo/vector-icons';

export interface IAchievement {
    id: string;
    name: string;
    description: string;
    icon: keyof typeof Ionicons.glyphMap;
}

export const ACHIEVEMENTS: Record<string, IAchievement> = {
    FIRST_TEST_COMPLETED: {
        id: 'FIRST_TEST_COMPLETED',
        name: 'Pierwszy krok!',
        description: 'Ukończyłeś swój pierwszy test. Brawo!',
        icon: 'footsteps'
    },
    PERFECT_SCORE: {
        id: 'PERFECT_SCORE',
        name: 'Perfekcjonista',
        description: 'Ukończyłeś test z wynikiem 100%. Niesamowite!',
        icon: 'ribbon'
    },
    MATH_NOVICE: {
        id: 'MATH_NOVICE',
        name: 'Nowicjusz Matematyki',
        description: 'Ukończyłeś 5 testów.',
        icon: 'school-outline'
    },
    // Тут можна додавати більше досягнень
};
