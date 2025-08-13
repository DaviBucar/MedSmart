import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ReviewFlashcardDto } from '../dto/review-flashcard.dto';
import { FlashcardReviewResult, SpacedRepetitionConfig } from '../interfaces/flashcard.interface';
import { ReviewResult, FlashcardStatus } from '@prisma/client';

@Injectable()
export class FlashcardReviewService {
  private readonly spacedRepetitionConfig: SpacedRepetitionConfig = {
    initialInterval: 1,
    initialEaseFactor: 2.5,
    minEaseFactor: 1.3,
    maxEaseFactor: 3.0,
    maxNewCardsPerDay: 20,
    maxReviewsPerDay: 100,
    againMultiplier: 0.2,
    hardMultiplier: 0.6,
    easyBonus: 1.3,
  };

  constructor(private prisma: PrismaService) {}

  // Revisar um flashcard usando algoritmo SM-2
  async reviewFlashcard(
    flashcardId: string,
    userId: string,
    reviewDto: ReviewFlashcardDto,
  ): Promise<FlashcardReviewResult> {
    const flashcard = await this.prisma.flashcard.findFirst({
      where: { id: flashcardId, userId },
    });

    if (!flashcard) {
      throw new Error('Flashcard não encontrado');
    }

    // Calcular novos valores usando SM-2
    const { newInterval, newEaseFactor } = this.calculateSM2(
      flashcard.interval,
      flashcard.easeFactor,
      flashcard.repetitions,
      reviewDto.result,
    );

    // Calcular próxima data de revisão
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);

    // Determinar novo status
    const newStatus = this.determineNewStatus(reviewDto.result, flashcard.repetitions);

    // Atualizar flashcard
    await this.prisma.flashcard.update({
      where: { id: flashcardId },
      data: {
        interval: newInterval,
        easeFactor: newEaseFactor,
        repetitions: flashcard.repetitions + 1,
        nextReviewDate,
        status: newStatus,
        totalReviews: flashcard.totalReviews + 1,
        correctReviews:
          reviewDto.result === ReviewResult.GOOD || reviewDto.result === ReviewResult.EASY
            ? flashcard.correctReviews + 1
            : flashcard.correctReviews,
        lastReviewResult: reviewDto.result,
        lastReviewedAt: new Date(),
        averageResponseTime: this.calculateAverageResponseTime(
          flashcard.averageResponseTime,
          flashcard.totalReviews,
          reviewDto.responseTime,
        ),
      },
    });

    // Criar registro de revisão
    await this.prisma.flashcardReview.create({
      data: {
        flashcardId,
        userId,
        sessionId: reviewDto.sessionId,
        result: reviewDto.result,
        responseTime: reviewDto.responseTime,
        confidence: reviewDto.confidence,
        deviceType: reviewDto.deviceType,
        studyEnvironment: reviewDto.studyEnvironment,
        timeOfDay: new Date().getHours().toString(),
      },
    });

    return {
      flashcardId,
      result: reviewDto.result,
      responseTime: reviewDto.responseTime || 0,
      confidence: reviewDto.confidence || 3,
      newInterval,
      newEaseFactor,
      nextReviewDate,
    };
  }

  // Buscar flashcards devido para revisão
  async getFlashcardsDueForReview(userId: string, limit = 10) {
    const now = new Date();
    
    return this.prisma.flashcard.findMany({
      where: {
        userId,
        nextReviewDate: {
          lte: now,
        },
        status: {
          in: [FlashcardStatus.ACTIVE, FlashcardStatus.PENDING],
        },
      },
      orderBy: {
        nextReviewDate: 'asc',
      },
      take: limit,
    });
  }

  // Contar flashcards devido para revisão
  async countFlashcardsDue(userId: string): Promise<number> {
    const now = new Date();
    
    return this.prisma.flashcard.count({
      where: {
        userId,
        nextReviewDate: {
          lte: now,
        },
        status: {
          in: [FlashcardStatus.ACTIVE, FlashcardStatus.PENDING],
        },
      },
    });
  }

  // Algoritmo SM-2 para repetição espaçada
  private calculateSM2(
    currentInterval: number,
    currentEaseFactor: number,
    repetitions: number,
    result: ReviewResult,
  ): { newInterval: number; newEaseFactor: number } {
    let newEaseFactor = currentEaseFactor;
    let newInterval = currentInterval;

    // Ajustar ease factor baseado no resultado
    switch (result) {
      case ReviewResult.AGAIN:
        newEaseFactor = Math.max(
          this.spacedRepetitionConfig.minEaseFactor,
          currentEaseFactor - 0.2,
        );
        newInterval = Math.max(1, Math.floor(currentInterval * this.spacedRepetitionConfig.againMultiplier));
        break;

      case ReviewResult.HARD:
        newEaseFactor = Math.max(
          this.spacedRepetitionConfig.minEaseFactor,
          currentEaseFactor - 0.15,
        );
        newInterval = Math.max(1, Math.floor(currentInterval * this.spacedRepetitionConfig.hardMultiplier));
        break;

      case ReviewResult.GOOD:
        if (repetitions === 0) {
          newInterval = 1;
        } else if (repetitions === 1) {
          newInterval = 6;
        } else {
          newInterval = Math.round(currentInterval * currentEaseFactor);
        }
        break;

      case ReviewResult.EASY:
        newEaseFactor = Math.min(
          this.spacedRepetitionConfig.maxEaseFactor,
          currentEaseFactor + 0.15,
        );
        if (repetitions === 0) {
          newInterval = 4;
        } else {
          newInterval = Math.round(currentInterval * currentEaseFactor * this.spacedRepetitionConfig.easyBonus);
        }
        break;
    }

    return { newInterval, newEaseFactor };
  }

  // Determinar novo status do flashcard
  private determineNewStatus(result: ReviewResult, repetitions: number): FlashcardStatus {
    if (result === ReviewResult.AGAIN) {
      return FlashcardStatus.PENDING;
    }

    if (repetitions >= 5 && (result === ReviewResult.GOOD || result === ReviewResult.EASY)) {
      return FlashcardStatus.MASTERED;
    }

    return FlashcardStatus.ACTIVE;
  }

  // Calcular tempo médio de resposta
  private calculateAverageResponseTime(
    currentAverage: number | null,
    totalReviews: number,
    newResponseTime: number | undefined,
  ): number | null {
    if (!newResponseTime) return currentAverage;
    
    if (!currentAverage || totalReviews === 0) {
      return newResponseTime;
    }

    return (currentAverage * totalReviews + newResponseTime) / (totalReviews + 1);
  }
}