// src/navigation/types.ts

export type AuthStackParamList = {
    Login: undefined;
    Register: undefined;
};

export type GamesStackParamList = {
    GamesMain: undefined;
    MatchstickGame: undefined;
    SpeedyCountGame: undefined;
    MathSprintGame: undefined;

    // ✅ Нові ігри
    NumberMemoryGame: undefined;
    GreaterLesserGame: undefined;
    SequenceGame: undefined;
};

// ✅ Тип режиму: Тренування або Тест
export type AppMode = 'training' | 'test';

export type MainAppStackParamList = {
    Main: undefined;

    // Екрани вибору з параметром mode
    GradeSelection: { mode: AppMode };
    TopicList: { grade: number; mode: AppMode };
    SubTopicList: { grade: number; topic: string; mode: AppMode };

    // 🔴 ЕКРАН ТЕСТУ (Тільки оцінювання, таймер)
    Test: {
        grade: number;
        topic: string;
        subTopic?: string;
        testType?: 'subTopic' | 'mainTopic' | 'duel' | 'gradeRandom';
        duelId?: string;
        mode: 'learn' | 'assess'; // 'learn' = з підказками, 'assess' = на час
    };

    // 🟢 НОВИЙ ЕКРАН ПРАКТИКИ (Інтерактивне навчання для JSON-питань)
    Practice: {
        grade: number;
        topic: string;
        subTopic: string;
    };

    // --- Тренажери (ĆWICZENIA - Інтерактивні екрани) ---
    MultiplicationTrainer: { grade: number; topic: string; subTopic: string };
    PlusMinusTrainer: { grade: number; topic: string; subTopic: string };
    DivisionTrainer: { grade: number; topic: string; subTopic: string };
    MoreLessTrainer4: { grade: number; topic: string; subTopic: string };
    HowManyTimesTrainerScreen4: { grade: number; topic: string; subTopic: string };
    DivisionWithRemainderScreen4: { grade: number; topic: string; subTopic: string };
    SquaresCubesTrainerScreen4: { grade: number; topic: string; subTopic: string };
    OrderOperationsTrainerScreen4: { grade: number; topic: string; subTopic: string };
    WordProblemsLevel1Screen4: { grade: number; topic: string; subTopic: string };
    WordProblemsLevel2Screen4: { grade: number; topic: string; subTopic: string };
    NumberLineTrainerScreen4: { grade: number; topic: string; subTopic: string };
    MathSprintScreen: { grade: number; topic: string; subTopic: string };

    // Результати
    Results: {
        score: number;
        total: number;
        originalTestParams: any; // Параметри для кнопки "Повторити"
        mode?: AppMode | 'assess' | 'learn'; // Щоб знати тип нагороди
        isDoubleXp?: boolean;
    };

    DuelResult: { duelId: string };

    // Теорія
    TheoryGradeSelection: undefined;
    TheoryTopicList: { grade: string };
    TheorySubTopicList: { grade: string; topic: string };
    TheoryDetail: { grade: string; topic: string; subTopic: string };
};

export type TheoryStackParamList = {
    TheoryGradeSelection: undefined;
    TheoryTopicList: { grade: string };
    TheorySubTopicList: { grade: string; topic: string };
    TheoryDetail: { grade: string; topic: string; subTopic: string };
};

export type FriendsStackParamList = {
    Friends: undefined;
    DuelSetup: { friendId: string; friendEmail: string };
};

export type ProfileStackParamList = {
    ProfileMain: undefined;
    UserDetails: undefined;
    StatsScreen: undefined;
    Store: undefined;
};

export type ActivityStackParamList = {
    ActivityMain: undefined;
};

export type AppTabParamList = {
    HomeStack: undefined;
    GamesStack: undefined;
    FriendsStack: undefined;
    ActivityStack: undefined;
    Profil: undefined;
};
