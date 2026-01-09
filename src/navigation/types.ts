// src/navigation/types.ts

// ==============================
//      АВТОРИЗАЦИЯ
// ==============================
import WrittenSubtractionTrainer from "../screens/screens_4_klassa/screens_4K3R/WrittenSubtractionTrainer";
import WrittenMultiplicationWithZerosTrainer
    from "../screens/screens_4_klassa/screens_4K3R/WrittenMultiplicationWithZerosTrainer";
import WrittenMultiDigitMultiplicationTrainer
    from "../screens/screens_4_klassa/screens_4K3R/WrittenMultiDigitMultiplicationTrainer";
import WrittenDivisionTrainer from "../screens/screens_4_klassa/screens_4K3R/WrittenDivisionTrainer";
import WordProblemsTrainer from "../screens/screens_4_klassa/screens_4K3R/WordProblemsTrainer";

export type AuthStackParamList = {
    Login: undefined;
    Register: undefined;
};

// ==============================
//       ИГРЫ
// ==============================
export type GamesStackParamList = {
    GamesMain: undefined;
    MatchstickGame: undefined;
    SpeedyCountGame: undefined;
    MathSprintGame: undefined;

    // Новые игры
    NumberMemoryGame: undefined;
    GreaterLesserGame: undefined;
    SequenceGame: undefined;
};

// ==============================
//       РЕЖИМ ПРАКТИКИ
// ==============================
export type AppMode = 'training' | 'test';

// ==============================
//     ОСНОВНОЙ СТЭК ПРИЛОЖЕНИЯ
// ==============================
export type MainAppStackParamList = {
    Main: undefined;

    // Экраны выбора с параметром mode
    GradeSelection: { mode: AppMode };
    TopicList: { grade: number; mode: AppMode };
    SubTopicList: { grade: number; topic: string; mode: AppMode };

    // Тест
    Test: {
        grade: number;
        topic: string;
        subTopic?: string;
        testType?: 'subTopic' | 'mainTopic' | 'duel' | 'gradeRandom';
        duelId?: string;
        mode: 'learn' | 'assess';
    };

    // Практика
    Practice: {
        grade: number;
        topic: string;
        subTopic: string;
    };

    // --- Тренажёры ---
    CombinedDecompositionTrainer: { grade: number; topic: string; subTopic: string };
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
    MassUnitsTrainer: { grade: number; topic: string; subTopic: string };
    RomanNumeralsTrainer: { grade: number; topic: string; subTopic: string };
    CalendarTrainer: { grade: number; topic: string; subTopic: string };
    ClockTrainer:{ grade: number; topic: string; subTopic: string };
    WrittenAdditionTrainer:{ grade: number; topic: string; subTopic: string };
    WrittenSubtractionTrainer:{ grade: number; topic: string; subTopic: string };
    WrittenMultiplicationTrainer:{ grade: number; topic: string; subTopic: string };
    WrittenMultiplicationWithZerosTrainer:{ grade: number; topic: string; subTopic: string };
    WrittenMultiDigitMultiplicationTrainer:{ grade: number; topic: string; subTopic: string };
    WrittenDivisionTrainer:{ grade: number; topic: string; subTopic: string };
    WordProblemsTrainer:{ grade: number; topic: string; subTopic: string };
    FractionsTrainer:{ grade: number; topic: string; subTopic: string };
    MixedNumbersTrainer:{ grade: number; topic: string; subTopic: string };
    FractionsNumberLineTrainer:{ grade: number; topic: string; subTopic: string };
    FractionComparisonTrainer:{ grade: number; topic: string; subTopic: string };
    FractionsExpansionTrainer:{ grade: number; topic: string; subTopic: string };
    ImproperFractionsTrainer:{ grade: number; topic: string; subTopic: string };
    // Новые тренажёры
    DecimalSystemTrainer: { grade: number; topic: string; subTopic?: string };
    ComparingNumbersTrainer: { grade: number; topic: string; subTopic?: string };
    MentalMathLargeNumbers: { grade: number; topic: string; subTopic?: string };
    MonetaryUnitsTrainer: { grade: number; topic: string; subTopic?: string };
    LengthUnitsTrainer: { grade: number; topic: string; subTopic?: string };
    // Результаты
    Results: {
        score: number;
        total: number;
        originalTestParams: any;
        mode?: AppMode | 'assess' | 'learn';
        isDoubleXp?: boolean;
    };

    DuelResult: { duelId: string };

    // Теория
    TheoryGradeSelection: undefined;
    TheoryTopicList: { grade: string };
    TheorySubTopicList: { grade: string; topic: string };
    TheoryDetail: { grade: string; topic: string; subTopic: string };
};

// ==============================
//       СТЭК ТЕОРИИ
// ==============================
export type TheoryStackParamList = {
    TheoryGradeSelection: undefined;
    TheoryTopicList: { grade: string };
    TheorySubTopicList: { grade: string; topic: string };
    TheoryDetail: { grade: string; topic: string; subTopic: string };
};

// ==============================
//       ЗНАКОМЫЕ / ДРУЗЬЯ
// ==============================
export type FriendsStackParamList = {
    Friends: undefined;
    DuelSetup: { friendId: string; friendEmail: string };
};

// ==============================
//       ПРОФИЛЬ
// ==============================
export type ProfileStackParamList = {
    ProfileMain: undefined;
    UserDetails: undefined;
    StatsScreen: undefined;
    Store: undefined;
};

// ==============================
//       АКТИВНОСТЬ
// ==============================
export type ActivityStackParamList = {
    ActivityMain: undefined;
};

// ==============================
//       TAB NAVIGATION
// ==============================
export type AppTabParamList = {
    HomeStack: undefined;
    GamesStack: undefined;
    FriendsStack: undefined;
    ActivityStack: undefined;
    Profil: undefined;
};
