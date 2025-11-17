// src/navigation/types.ts

// --- ✅ 1. МИ ВИНОСИМО ВСІ ТИПИ СЮДИ ---

export type AuthStackParamList = {
    Login: undefined;
    Register: undefined;
};

export type GamesStackParamList = {
    GamesMain: undefined;
    MatchstickGame: undefined;
    SpeedyCountGame: undefined; // <-- Додано новий екран
};

export type MainAppStackParamList = {
    Main: undefined;
    GradeSelection: undefined;
    TopicList: { grade: number };
    SubTopicList: { grade: number; topic: string };
    Test: {
        grade: number;
        topic: string;
        subTopic?: string;
        mode?: 'learn' | 'assess' | 'duel';
        testType?: 'subTopic' | 'mainTopic' | 'duel' | 'gradeRandom' | 'gradeAssessment';
        duelId?: string;
    };
    MultiplicationTrainer: { grade: number; topic: string; subTopic: string };
    PlusMinusTrainer: { grade: number; topic: string; subTopic: string };
    DivisionTrainer: { grade: number; topic: string; subTopic: string };
    MoreLessTrainer4: { grade: number; topic: string; subTopic: string };
    Results: {
        score: number;
        total: number;
        originalTestParams: MainAppStackParamList['Test'];
        isDoubleXp?: boolean;
    };
    DuelResult: { duelId: string };
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

export type GamesStackParamList = {
    GamesMain: undefined;
    MatchstickGame: undefined;
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
