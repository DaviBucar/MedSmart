import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SessionStatus } from '@prisma/client';
import { CreateQuestionInteractionDto } from '../dto/create-question-interaction.dto';
import { SessionValidatorProvider } from './providers/session-validator.provider';
import { SessionCalculatorProvider } from './providers/session-calculator.provider';
import { FatigueDetectorProvider } from './providers/fatigue-detector.provider';

@Injectable()
export class SessionTrackingService {
  private readonly logger = new Logger(SessionTrackingService.name);

  constructor(
    private prisma: PrismaService,
    private sessionValidator: SessionValidatorProvider,
    private sessionCalculator: SessionCalculatorProvider,
    private fatigueDetector: FatigueDetectorProvider,
  ) {}

  async createQuestionInteraction(
    userId: string,
    sessionId: string,
    interactionDto: CreateQuestionInteractionDto,
  ) {
    try {
      await this.sessionValidator.validateActiveSession(userId, sessionId);

      const interaction = await this.prisma.questionInteraction.create({
        data: {
          sessionId,
          userId,
          questionId: interactionDto.questionId,
          topic: interactionDto.topic,
          difficultyLevel: interactionDto.difficultyLevel,
          bloomLevel: interactionDto.bloomLevel,
          timeToAnswer: interactionDto.timeToAnswer,
          isCorrect: interactionDto.isCorrect,
          confidenceLevel: interactionDto.confidenceLevel,
          hintsUsed: interactionDto.hintsUsed || 0,
        },
      });

      // Atualizar estatísticas da sessão em tempo real
      await this.updateSessionStats(sessionId);

      this.logger.log(`Interação criada: ${interaction.id} na sessão ${sessionId}`);
      return interaction;
    } catch (error) {
      this.logger.error('Erro ao criar interação:', error);
      throw error;
    }
  }

  async getSessionInteractions(userId: string, sessionId: string) {
    try {
      await this.sessionValidator.validateSessionAccess(userId, sessionId);

      const interactions = await this.prisma.questionInteraction.findMany({
        where: { sessionId },
        orderBy: { timestamp: 'asc' },
      });

      return {
        sessionId,
        interactions,
        summary: this.buildInteractionsSummary(interactions),
      };
    } catch (error) {
      this.logger.error('Erro ao buscar interações:', error);
      throw error;
    }
  }

  async updateSessionHeartbeat(userId: string, sessionId: string) {
    try {
      const session = await this.prisma.studySession.findFirst({
        where: { id: sessionId, userId, status: SessionStatus.ACTIVE },
      });

      if (!session) {
        throw new NotFoundException('Sessão ativa não encontrada');
      }

      // Note: lastActivity field doesn't exist in StudySession schema
      // Using updatedAt instead or remove this update if not needed
      await this.prisma.studySession.update({
        where: { id: sessionId },
        data: { updatedAt: new Date() },
      });

      const currentDuration = Math.round(
        (new Date().getTime() - session.startTime.getTime()) / (1000 * 60)
      );

      return {
        sessionId,
        isActive: true,
        currentDurationMinutes: currentDuration,
        lastActivity: new Date(),
      };
    } catch (error) {
      this.logger.error('Erro ao atualizar heartbeat:', error);
      throw error;
    }
  }

  async detectFatigue(userId: string, sessionId: string) {
    try {
      return await this.fatigueDetector.detectFatigue(userId, sessionId);
    } catch (error) {
      this.logger.error('Erro ao detectar fadiga:', error);
      throw error;
    }
  }

  // Métodos auxiliares privados
  private async updateSessionStats(sessionId: string) {
    const interactions = await this.prisma.questionInteraction.findMany({
      where: { sessionId },
    });

    const questionsAnswered = interactions.length;
    const correctAnswers = interactions.filter(i => i.isCorrect).length;
    const averageResponseTime = interactions.length > 0
      ? interactions.reduce((sum, i) => sum + i.timeToAnswer, 0) / interactions.length
      : 0;

    await this.prisma.studySession.update({
      where: { id: sessionId },
      data: {
        questionsAnswered,
        correctAnswers,
        updatedAt: new Date(),
      },
    });
  }

  private buildInteractionsSummary(interactions: any[]) {
    return {
      total: interactions.length,
      correct: interactions.filter(i => i.isCorrect).length,
      accuracy: interactions.length > 0 
        ? (interactions.filter(i => i.isCorrect).length / interactions.length) * 100 
        : 0,
      averageResponseTime: interactions.length > 0
        ? interactions.reduce((sum, i) => sum + i.timeToAnswer, 0) / interactions.length
        : 0,
      topicBreakdown: this.calculateTopicBreakdown(interactions),
    };
  }

  private calculateTopicBreakdown(interactions: any[]) {
    const topicStats: Record<string, any> = {};

    interactions.forEach(interaction => {
      if (!topicStats[interaction.topic]) {
        topicStats[interaction.topic] = {
          topic: interaction.topic,
          questionsAnswered: 0,
          correctAnswers: 0,
          totalResponseTime: 0,
        };
      }

      topicStats[interaction.topic].questionsAnswered++;
      if (interaction.isCorrect) {
        topicStats[interaction.topic].correctAnswers++;
      }
      topicStats[interaction.topic].totalResponseTime += interaction.timeToAnswer;
    });

    return Object.values(topicStats).map((stats: any) => ({
      ...stats,
      accuracy: (stats.correctAnswers / stats.questionsAnswered) * 100,
      averageResponseTime: stats.totalResponseTime / stats.questionsAnswered,
    }));
  }
}