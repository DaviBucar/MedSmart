import { ReviewResult } from '@prisma/client';

export interface SpacedRepetitionConfig {
  // Configurações do algoritmo SM-2
  initialEaseFactor: number;
  minEaseFactor: number;
  maxEaseFactor: number;
  easeFactorModifier: number;
  
  // Intervalos iniciais (em dias)
  initialInterval: number;
  secondInterval: number;
  
  // Multiplicadores por resultado
  resultMultipliers: Record<ReviewResult, number>;
  
  // Configurações de status
  masteryThreshold: number; // Número de repetições corretas para considerar "dominado"
  masteryInterval: number; // Intervalo mínimo (em dias) para considerar "dominado"
  
  // Configurações de dificuldade
  difficultyAdjustment: {
    EASY: number;
    MEDIUM: number;
    HARD: number;
  };
}

export const DEFAULT_SPACED_REPETITION_CONFIG: SpacedRepetitionConfig = {
  // Algoritmo SM-2 padrão
  initialEaseFactor: 2.5,
  minEaseFactor: 1.3,
  maxEaseFactor: 3.0,
  easeFactorModifier: 0.1,
  
  // Intervalos iniciais
  initialInterval: 1,
  secondInterval: 6,
  
  // Multiplicadores baseados na resposta
  resultMultipliers: {
    [ReviewResult.AGAIN]: 0.2, // Repetir em breve
    [ReviewResult.HARD]: 0.6,  // Intervalo reduzido
    [ReviewResult.GOOD]: 1.0,  // Intervalo normal
    [ReviewResult.EASY]: 1.3,  // Intervalo aumentado
  },
  
  // Configurações de domínio
  masteryThreshold: 5, // 5 repetições corretas consecutivas
  masteryInterval: 30, // 30 dias de intervalo
  
  // Ajustes por dificuldade do flashcard
  difficultyAdjustment: {
    EASY: 1.2,   // Intervalos 20% maiores
    MEDIUM: 1.0, // Intervalos normais
    HARD: 0.8,   // Intervalos 20% menores
  },
};

// Configuração otimizada para estudantes de medicina
export const MEDICAL_SPACED_REPETITION_CONFIG: SpacedRepetitionConfig = {
  initialEaseFactor: 2.3, // Ligeiramente mais conservador
  minEaseFactor: 1.2,
  maxEaseFactor: 2.8,
  easeFactorModifier: 0.08,
  
  initialInterval: 1,
  secondInterval: 4, // Intervalo menor para reforço
  
  resultMultipliers: {
    [ReviewResult.AGAIN]: 0.15, // Mais agressivo na repetição
    [ReviewResult.HARD]: 0.5,
    [ReviewResult.GOOD]: 1.0,
    [ReviewResult.EASY]: 1.25,
  },
  
  masteryThreshold: 6, // Mais rigoroso para medicina
  masteryInterval: 45, // Intervalo maior para retenção a longo prazo
  
  difficultyAdjustment: {
    EASY: 1.15,
    MEDIUM: 1.0,
    HARD: 0.75, // Mais conservador para conteúdo difícil
  },
};

// Configuração para revisão rápida (cramming)
export const QUICK_REVIEW_CONFIG: SpacedRepetitionConfig = {
  initialEaseFactor: 2.0,
  minEaseFactor: 1.5,
  maxEaseFactor: 2.5,
  easeFactorModifier: 0.05,
  
  initialInterval: 0.5, // 12 horas
  secondInterval: 1,
  
  resultMultipliers: {
    [ReviewResult.AGAIN]: 0.3,
    [ReviewResult.HARD]: 0.7,
    [ReviewResult.GOOD]: 1.0,
    [ReviewResult.EASY]: 1.2,
  },
  
  masteryThreshold: 3,
  masteryInterval: 7,
  
  difficultyAdjustment: {
    EASY: 1.1,
    MEDIUM: 1.0,
    HARD: 0.9,
  },
};

export function getConfigByProfile(profileType: string): SpacedRepetitionConfig {
  switch (profileType) {
    case 'MEDICAL':
      return MEDICAL_SPACED_REPETITION_CONFIG;
    case 'QUICK_REVIEW':
      return QUICK_REVIEW_CONFIG;
    default:
      return DEFAULT_SPACED_REPETITION_CONFIG;
  }
}