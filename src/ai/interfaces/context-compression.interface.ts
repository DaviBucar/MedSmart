import { DifficultyLevel } from '@prisma/client';

export interface UserLearningProfile {
  id: string;
  userId: string;
  profileType: LearningProfileType;
  preferredDifficulty: DifficultyLevel;
  optimalSessionDuration: number; // minutos
  preferredTimeSlots: number[]; // horas do dia
  learningVelocity: number; // 0-1
  retentionRate: number; // 0-1
  lastUpdated: Date;
}

export interface CompressedUserContext {
  // Contexto Imediato (50 tokens)
  immediate: {
    recentAccuracy: number;
    currentFatigue: number;
    sessionProgress: {
      questionsAnswered: number;
      timeElapsed: number; // minutos
    };
  };
  
  // Contexto de Performance (100 tokens)
  performance: {
    overallAccuracy: number;
    currentStreak: number;
    learningVelocity: number;
    strongTopics: string[]; // máximo 3
    weakTopics: string[]; // máximo 3
  };
  
  // Contexto de Perfil (50 tokens)
  profile: {
    type: LearningProfileType;
    preferredDifficulty: DifficultyLevel;
    adaptationNeeds: AdaptationTag[];
  };
}

export interface ContextCompressionMetrics {
  originalTokenCount: number;
  compressedTokenCount: number;
  compressionRatio: number;
  relevanceScore: number;
  processingTime: number;
}

export enum LearningProfileType {
  BEGINNER_CAUTIOUS = 'BEGINNER_CAUTIOUS',
  INTERMEDIATE_AMBITIOUS = 'INTERMEDIATE_AMBITIOUS', 
  ADVANCED_PERFECTIONIST = 'ADVANCED_PERFECTIONIST',
  STRATEGIC_REVIEWER = 'STRATEGIC_REVIEWER'
}

export enum AdaptationTag {
  STRUGGLING_CARDIO = 'struggling-cardio',
  MORNING_LEARNER = 'morning-learner',
  VISUAL_PREFERRED = 'visual-preferred',
  FATIGUE_HIGH = 'fatigue-high',
  CONFIDENCE_LOW = 'confidence-low',
  SPEED_FOCUSED = 'speed-focused',
  SLOW_LEARNER = 'slow-learner',
  HIGH_PERFORMER = 'high-performer'
}