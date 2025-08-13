import { FlashcardType, DifficultyLevel, FlashcardStatus, ReviewResult } from '@prisma/client';
import { FlashcardData } from '../interfaces/flashcard.interface';

/**
 * Utilitários para manipulação de flashcards
 */
export class FlashcardUtils {
  /**
   * Calcula a próxima data de revisão baseada no algoritmo SM-2
   */
  static calculateNextReviewDate(
    currentInterval: number,
    easeFactor: number,
    result: ReviewResult
  ): { nextReviewDate: Date; newInterval: number; newEaseFactor: number } {
    let newInterval: number;
    let newEaseFactor = easeFactor;

    switch (result) {
      case ReviewResult.AGAIN:
        newInterval = 1;
        newEaseFactor = Math.max(1.3, easeFactor - 0.2);
        break;
      
      case ReviewResult.HARD:
        newInterval = Math.max(1, Math.round(currentInterval * 0.6));
        newEaseFactor = Math.max(1.3, easeFactor - 0.15);
        break;
      
      case ReviewResult.GOOD:
        if (currentInterval === 1) {
          newInterval = 6;
        } else {
          newInterval = Math.round(currentInterval * easeFactor);
        }
        break;
      
      case ReviewResult.EASY:
        if (currentInterval === 1) {
          newInterval = 6;
        } else {
          newInterval = Math.round(currentInterval * easeFactor * 1.3);
        }
        newEaseFactor = Math.min(3.0, easeFactor + 0.1);
        break;
      
      default:
        newInterval = currentInterval;
    }

    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);

    return {
      nextReviewDate,
      newInterval,
      newEaseFactor,
    };
  }

  /**
   * Determina o status do flashcard baseado nas estatísticas
   */
  static determineFlashcardStatus(
    repetitions: number,
    interval: number,
    correctReviews: number,
    totalReviews: number
  ): FlashcardStatus {
    // Se nunca foi revisado, permanece PENDING
    if (totalReviews === 0) {
      return FlashcardStatus.PENDING;
    }

    // Calcular taxa de acerto
    const accuracy = totalReviews > 0 ? correctReviews / totalReviews : 0;

    // Critérios para MASTERED
    if (repetitions >= 5 && interval >= 30 && accuracy >= 0.8) {
      return FlashcardStatus.MASTERED;
    }

    // Critérios para ARCHIVED (muito baixa performance)
    if (totalReviews >= 10 && accuracy < 0.3) {
      return FlashcardStatus.ARCHIVED;
    }

    // Caso contrário, ACTIVE
    return FlashcardStatus.ACTIVE;
  }

  /**
   * Calcula a prioridade de revisão (0-100, maior = mais prioritário)
   */
  static calculateReviewPriority(
    flashcard: FlashcardData,
    now: Date = new Date()
  ): number {
    let priority = 50; // Base

    // Fator tempo: quanto mais atrasado, maior a prioridade
    const daysSinceReview = Math.floor(
      (now.getTime() - flashcard.nextReviewDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceReview > 0) {
      priority += Math.min(30, daysSinceReview * 2); // Máximo +30
    } else {
      priority -= Math.abs(daysSinceReview); // Reduz se ainda não é hora
    }

    // Fator dificuldade
    switch (flashcard.difficultyLevel) {
      case DifficultyLevel.HARD:
        priority += 15;
        break;
      case DifficultyLevel.MEDIUM:
        priority += 5;
        break;
      case DifficultyLevel.EASY:
        priority -= 5;
        break;
    }

    // Fator performance: baixa performance = maior prioridade
    if (flashcard.totalReviews > 0) {
      const accuracy = flashcard.correctReviews / flashcard.totalReviews;
      if (accuracy < 0.5) {
        priority += 20;
      } else if (accuracy < 0.7) {
        priority += 10;
      } else if (accuracy > 0.9) {
        priority -= 10;
      }
    }

    // Fator ease: baixo ease = maior prioridade
    if (flashcard.easeFactor < 2.0) {
      priority += 10;
    } else if (flashcard.easeFactor > 2.8) {
      priority -= 5;
    }

    // Fator status
    switch (flashcard.status) {
      case FlashcardStatus.PENDING:
        priority += 25; // Novos flashcards têm alta prioridade
        break;
      case FlashcardStatus.MASTERED:
        priority -= 20; // Dominados têm baixa prioridade
        break;
      case FlashcardStatus.ARCHIVED:
        priority -= 50; // Arquivados têm prioridade muito baixa
        break;
    }

    return Math.max(0, Math.min(100, priority));
  }

  /**
   * Gera tags automáticas baseadas no conteúdo
   */
  static generateAutoTags(front: string, back: string, topic: string): string[] {
    const tags: Set<string> = new Set();
    
    // Adicionar tópico como tag
    if (topic) {
      tags.add(topic.toLowerCase());
    }

    // Extrair palavras-chave do conteúdo
    const content = `${front} ${back}`.toLowerCase();
    
    // Termos médicos comuns
    const medicalTerms = [
      'anatomia', 'fisiologia', 'patologia', 'farmacologia',
      'diagnóstico', 'tratamento', 'sintoma', 'doença',
      'medicamento', 'exame', 'cirurgia', 'terapia'
    ];
    
    medicalTerms.forEach(term => {
      if (content.includes(term)) {
        tags.add(term);
      }
    });

    // Detectar tipos de conteúdo
    if (content.includes('definição') || content.includes('conceito')) {
      tags.add('definição');
    }
    if (content.includes('causa') || content.includes('etiologia')) {
      tags.add('etiologia');
    }
    if (content.includes('sintoma') || content.includes('sinal')) {
      tags.add('sintomas');
    }
    if (content.includes('tratamento') || content.includes('terapia')) {
      tags.add('tratamento');
    }

    return Array.from(tags).slice(0, 5); // Máximo 5 tags
  }

  /**
   * Valida o conteúdo de um flashcard
   */
  static validateFlashcardContent(front: string, back: string): {
    isValid: boolean;
    errors: string[];
    suggestions: string[];
  } {
    const errors: string[] = [];
    const suggestions: string[] = [];

    // Validações básicas
    if (!front || front.trim().length < 3) {
      errors.push('A frente do flashcard deve ter pelo menos 3 caracteres');
    }
    if (!back || back.trim().length < 3) {
      errors.push('O verso do flashcard deve ter pelo menos 3 caracteres');
    }

    // Validações de qualidade
    if (front.length > 200) {
      suggestions.push('A frente do flashcard está muito longa. Considere simplificar.');
    }
    if (back.length > 500) {
      suggestions.push('O verso do flashcard está muito longo. Considere dividir em múltiplos cards.');
    }

    // Verificar se não são idênticos
    if (front.trim().toLowerCase() === back.trim().toLowerCase()) {
      errors.push('A frente e o verso não podem ser idênticos');
    }

    // Sugestões de melhoria
    if (!front.includes('?') && !front.includes('O que') && !front.includes('Qual')) {
      suggestions.push('Considere formular a frente como uma pergunta para melhor retenção.');
    }

    return {
      isValid: errors.length === 0,
      errors,
      suggestions,
    };
  }

  /**
   * Calcula estatísticas de um conjunto de flashcards
   */
  static calculateFlashcardStats(flashcards: FlashcardData[]) {
    const stats = {
      total: flashcards.length,
      byStatus: {} as Record<FlashcardStatus, number>,
      byDifficulty: {} as Record<DifficultyLevel, number>,
      byType: {} as Record<FlashcardType, number>,
      averageAccuracy: 0,
      averageEaseFactor: 0,
      averageInterval: 0,
      dueToday: 0,
      overdue: 0,
    };

    if (flashcards.length === 0) {
      return stats;
    }

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    let totalAccuracy = 0;
    let totalEaseFactor = 0;
    let totalInterval = 0;
    let cardsWithReviews = 0;

    flashcards.forEach(card => {
      // Contagem por status
      stats.byStatus[card.status] = (stats.byStatus[card.status] || 0) + 1;
      
      // Contagem por dificuldade
      stats.byDifficulty[card.difficultyLevel] = (stats.byDifficulty[card.difficultyLevel] || 0) + 1;
      
      // Contagem por tipo
      stats.byType[card.type] = (stats.byType[card.type] || 0) + 1;
      
      // Estatísticas de performance
      if (card.totalReviews > 0) {
        totalAccuracy += (card.correctReviews / card.totalReviews) * 100;
        cardsWithReviews++;
      }
      
      totalEaseFactor += card.easeFactor;
      totalInterval += card.interval;
      
      // Contagem de cards devidos
      if (card.nextReviewDate <= today) {
        if (card.nextReviewDate < new Date(today.getTime() - 24 * 60 * 60 * 1000)) {
          stats.overdue++;
        } else {
          stats.dueToday++;
        }
      }
    });

    stats.averageAccuracy = cardsWithReviews > 0 ? totalAccuracy / cardsWithReviews : 0;
    stats.averageEaseFactor = totalEaseFactor / flashcards.length;
    stats.averageInterval = totalInterval / flashcards.length;

    return stats;
  }

  /**
   * Ordena flashcards por prioridade de revisão
   */
  static sortByReviewPriority(flashcards: FlashcardData[]): FlashcardData[] {
    return flashcards.sort((a, b) => {
      const priorityA = this.calculateReviewPriority(a);
      const priorityB = this.calculateReviewPriority(b);
      return priorityB - priorityA; // Ordem decrescente (maior prioridade primeiro)
    });
  }

  /**
   * Filtra flashcards devidos para revisão
   */
  static filterDueForReview(
    flashcards: FlashcardData[],
    includeOverdue: boolean = true,
    maxCount?: number
  ): FlashcardData[] {
    const now = new Date();
    
    let dueCards = flashcards.filter(card => {
      if (card.status === FlashcardStatus.ARCHIVED) {
        return false;
      }
      
      if (includeOverdue) {
        return card.nextReviewDate <= now;
      } else {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
        return card.nextReviewDate >= today && card.nextReviewDate < tomorrow;
      }
    });

    // Ordenar por prioridade
    dueCards = this.sortByReviewPriority(dueCards);

    // Limitar quantidade se especificado
    if (maxCount && maxCount > 0) {
      dueCards = dueCards.slice(0, maxCount);
    }

    return dueCards;
  }
}