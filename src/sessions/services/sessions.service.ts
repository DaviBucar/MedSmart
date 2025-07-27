import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SessionStatus } from '@prisma/client';
import { CreateSessionDto } from '../dto/create-session.dto';
import { UpdateSessionDto } from '../dto/update-session.dto';
import { SessionFiltersDto } from '../dto/session-filters.dto';
import { SessionValidatorProvider } from './providers/session-validator.provider';
import { SessionCalculatorProvider } from './providers/session-calculator.provider';
import { MetricsUpdaterProvider } from './providers/metrics-updater.provider';

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(
    private prisma: PrismaService,
    private sessionValidator: SessionValidatorProvider,
    private sessionCalculator: SessionCalculatorProvider,
    private metricsUpdater: MetricsUpdaterProvider,
  ) {}

  async createSession(userId: string, createSessionDto: CreateSessionDto) {
    try {
      await this.sessionValidator.validateUserCanCreateSession(userId);

      const session = await this.prisma.studySession.create({
        data: {
          userId,
          studyGoal: createSessionDto.studyGoal,
          deviceType: createSessionDto.deviceType,
          status: SessionStatus.ACTIVE,
          startTime: new Date(),
        },
      });

      this.logger.log(`Nova sessão criada: ${session.id} para usuário ${userId}`);
      return session;
    } catch (error) {
      this.logger.error('Erro ao criar sessão:', error);
      throw error;
    }
  }

  async getUserSessions(userId: string, filters: SessionFiltersDto) {
    try {
      const where = this.sessionValidator.buildSessionFilters(userId, filters);
      
      const [sessions, total] = await Promise.all([
        this.prisma.studySession.findMany({
          where,
          orderBy: { startTime: 'desc' },
          skip: ((filters.page || 1) - 1) * (filters.limit || 20),
          take: filters.limit || 20,
          include: {
            interactions: {
              select: {
                id: true,
                isCorrect: true,
                timeToAnswer: true,
              },
            },
          },
        }),
        this.prisma.studySession.count({ where }),
      ]);

      const enrichedSessions = sessions.map(session => 
        this.sessionCalculator.enrichSessionWithMetrics(session)
      );

      return {
        sessions: enrichedSessions,
        pagination: this.sessionCalculator.buildPagination(filters, total),
      };
    } catch (error) {
      this.logger.error('Erro ao buscar sessões:', error);
      throw error;
    }
  }

  async getSessionById(userId: string, sessionId: string) {
    const session = await this.sessionValidator.validateSessionAccess(userId, sessionId);
    return this.sessionCalculator.enrichSessionWithDetailedMetrics(session);
  }

  async updateSession(userId: string, sessionId: string, updateSessionDto: UpdateSessionDto) {
    try {
      await this.sessionValidator.validateSessionAccess(userId, sessionId);

      const updatedSession = await this.prisma.studySession.update({
        where: { id: sessionId },
        data: {
          ...updateSessionDto,
          updatedAt: new Date(),
        },
      });

      this.logger.log(`Sessão atualizada: ${sessionId}`);
      return updatedSession;
    } catch (error) {
      this.logger.error('Erro ao atualizar sessão:', error);
      throw error;
    }
  }

  async finishSession(userId: string, sessionId: string) {
    try {
      const session = await this.sessionValidator.validateActiveSession(userId, sessionId);
      
      const sessionMetrics = await this.sessionCalculator.calculateFinalMetrics(session);
      
      const finishedSession = await this.prisma.studySession.update({
        where: { id: sessionId },
        data: {
          status: SessionStatus.COMPLETED,
          endTime: new Date(),
          duration: sessionMetrics.durationMinutes,
          questionsAnswered: sessionMetrics.questionsAnswered,
          correctAnswers: sessionMetrics.correctAnswers,
          topicsStudied: sessionMetrics.topicsStudied,
          updatedAt: new Date(),
        },
      });

      // Atualizar métricas em background
      await this.metricsUpdater.updateAllMetrics(userId, session.interactions);

      this.logger.log(`Sessão finalizada: ${sessionId} - Duração: ${sessionMetrics.durationMinutes}min`);

      return {
        ...finishedSession,
        summary: this.sessionCalculator.buildSessionSummary(finishedSession, sessionMetrics),
      };
    } catch (error) {
      this.logger.error('Erro ao finalizar sessão:', error);
      throw error;
    }
  }

  async deleteSession(userId: string, sessionId: string) {
    try {
      await this.sessionValidator.validateSessionAccess(userId, sessionId);

      await this.prisma.studySession.delete({
        where: { id: sessionId },
      });

      this.logger.log(`Sessão deletada: ${sessionId}`);
    } catch (error) {
      this.logger.error('Erro ao deletar sessão:', error);
      throw error;
    }
  }
}