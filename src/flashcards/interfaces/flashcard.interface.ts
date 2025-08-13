import { FlashcardType, FlashcardStatus, ReviewResult, DifficultyLevel } from '@prisma/client';

// Interface básica para dados do flashcard
export interface FlashcardData {
  id: string;
  userId: string;
  type: FlashcardType;
  front: string;
  back: string;
  topic: string;
  tags: string[];
  difficultyLevel: DifficultyLevel;
  status: FlashcardStatus;
  sessionId?: string;
  documentId?: string;
  sourceContent?: string;
  sourceType?: string;
  sourceReference?: string;
  
  // Spaced Repetition
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewDate: Date;
  
  // Estatísticas
  totalReviews: number;
  correctReviews: number;
  lastReviewResult?: ReviewResult;
  lastReviewedAt?: Date;
  averageResponseTime?: number;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Interface para dados de revisão
export interface FlashcardReviewData {
  id: string;
  flashcardId: string;
  userId: string;
  sessionId?: string;
  result: ReviewResult;
  responseTime?: number;
  confidence?: number;
  deviceType?: string;
  studyEnvironment?: string;
  timeOfDay?: string;
  reviewedAt: Date;
}

// Interface para dados do deck
export interface FlashcardDeckData {
  id: string;
  userId: string;
  name: string;
  description?: string;
  color?: string;
  isPublic: boolean;
  allowSharing: boolean;
  flashcardCount: number;
  flashcards?: FlashcardData[];
  createdAt: Date;
  updatedAt: Date;
}

// Interface para resultado de revisão
export interface FlashcardReviewResult {
  flashcardId: string;
  result: ReviewResult;
  responseTime: number;
  confidence: number;
  newInterval: number;
  newEaseFactor: number;
  nextReviewDate: Date;
}

// Interface para configuração de repetição espaçada
export interface SpacedRepetitionConfig {
  initialInterval: number;
  initialEaseFactor: number;
  minEaseFactor: number;
  maxEaseFactor: number;
  maxNewCardsPerDay: number;
  maxReviewsPerDay: number;
  againMultiplier: number;
  hardMultiplier: number;
  easyBonus: number;
}