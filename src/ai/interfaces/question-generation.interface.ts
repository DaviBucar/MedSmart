import { DifficultyLevel, BloomLevel } from '@prisma/client';

export interface QuestionGenerationRequest {
  userId: string;
  sessionId: string;
  topic?: string;
  difficultyLevel?: DifficultyLevel;
  bloomLevel?: BloomLevel;
  focusAreas?: string[];
  avoidTopics?: string[];
  questionCount?: number;
}

export interface GeneratedQuestion {
  id: string;
  question: string;
  type: 'multiple_choice' | 'true_false' | 'open_ended';
  topic: string;
  difficultyLevel: DifficultyLevel;
  bloomLevel: BloomLevel;
  options?: string[];
  correctAnswer: string | number;
  explanation: string;
  studyTip: string;
  estimatedTimeSeconds: number;
  tags: string[];
  context?: string;
}

export interface QuestionGenerationResponse {
  question: GeneratedQuestion;
  reasoning: string;
  adaptationNotes: string;
  nextRecommendedDifficulty: DifficultyLevel;
  suggestedTopics: string[];
}

export interface UserPerformanceContext {
  recentAccuracy: number;
  averageResponseTime: number;
  weakTopics: string[];
  strongTopics: string[];
  preferredDifficulty: DifficultyLevel;
  currentStreak: number;
  fatigueLevel: number;
  sessionProgress: {
    questionsAnswered: number;
    correctAnswers: number;
    currentSessionDuration: number;
  };
}

export interface AdaptiveLearningMetrics {
  optimalDifficulty: DifficultyLevel;
  recommendedTopics: string[];
  learningVelocity: number;
  retentionScore: number;
  engagementLevel: number;
  nextReviewTopics: string[];
}