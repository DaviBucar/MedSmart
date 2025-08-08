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
  
  // Cache em memória para sessões ativas (performance crítica)
  private readonly activeSessionsCache = new Map<string, any>();
  private readonly ACTIVE_SESSION_CACHE_TTL = 5 * 60 * 1000; // 5 minutos

  constructor(
    private prisma: PrismaService,
    private sessionValidator: SessionValidatorProvider,
    private sessionCalculator: SessionCalculatorProvider,
    private metricsUpdater: MetricsUpdaterProvider,
  ) {
    // Limpeza automática do cache de sessões ativas
    setInterval(() => this.cleanupActiveSessionsCache(), 2 * 60 * 1000);
  }

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

      // Adicionar ao cache de sessões ativas
      this.activeSessionsCache.set(session.id, {
        ...session,
        cachedAt: Date.now(),
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
      
      // Cache key para consultas frequentes
      const cacheKey = `user_sessions:${userId}:${JSON.stringify(filters)}`;
      
      // Otimizar query para melhor performance
      const [sessions, total] = await Promise.all([
        this.prisma.studySession.findMany({
          where,
          orderBy: { startTime: 'desc' },
          skip: ((filters.page || 1) - 1) * (filters.limit || 20),
          take: filters.limit || 20,
          select: {
            id: true,
            studyGoal: true,
            status: true,
            startTime: true,
            endTime: true,
            duration: true,
            questionsAnswered: true,
            correctAnswers: true,
            topicsStudied: true,
            performanceScore: true,
            focusScore: true,
            deviceType: true,
            createdAt: true,
            updatedAt: true,
            // Limitar interações para evitar payloads grandes
            interactions: {
              select: {
                id: true,
                isCorrect: true,
                timeToAnswer: true,
                topic: true,
                bloomLevel: true,
              },
              take: 10, // Apenas as mais recentes para overview
              orderBy: { timestamp: 'desc' },
            },
          },
        }),
        this.prisma.studySession.count({ where }),
      ]);

      // Usar enriquecimento básico para listagem (mais rápido)
      const enrichedSessions = sessions.map(session => 
        this.sessionCalculator.enrichSessionWithBasicMetrics(session)
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
    // Verificar cache primeiro para sessões ativas
    const cachedSession = this.activeSessionsCache.get(sessionId);
    if (cachedSession && cachedSession.userId === userId) {
      const cacheAge = Date.now() - cachedSession.cachedAt;
      if (cacheAge < this.ACTIVE_SESSION_CACHE_TTL) {
        this.logger.debug(`Sessão ${sessionId} retornada do cache`);
        return this.sessionCalculator.enrichSessionWithDetailedMetrics(cachedSession);
      }
    }

    // Buscar no banco se não estiver em cache ou cache expirado
    const session = await this.sessionValidator.validateSessionAccess(userId, sessionId);
    
    // Atualizar cache se sessão estiver ativa
    if (session.status === SessionStatus.ACTIVE) {
      this.activeSessionsCache.set(sessionId, {
        ...session,
        cachedAt: Date.now(),
      });
    }

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

      // Atualizar cache se existir
      if (this.activeSessionsCache.has(sessionId)) {
        this.activeSessionsCache.set(sessionId, {
          ...updatedSession,
          cachedAt: Date.now(),
        });
      }

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
          performanceScore: sessionMetrics.performanceScore,
          focusScore: sessionMetrics.focusScore,
          updatedAt: new Date(),
        },
      });

      // Remover do cache de sessões ativas
      this.activeSessionsCache.delete(sessionId);

      // Atualizar métricas em background (não bloquear resposta)
      this.metricsUpdater.updateAllMetrics(userId, session.interactions)
        .catch(error => this.logger.error('Erro ao atualizar métricas:', error));

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

      // Remover do cache se existir
      this.activeSessionsCache.delete(sessionId);

      this.logger.log(`Sessão deletada: ${sessionId}`);
    } catch (error) {
      this.logger.error('Erro ao deletar sessão:', error);
      throw error;
    }
  }

  /**
   * Limpeza automática do cache de sessões ativas
   */
  private cleanupActiveSessionsCache(): void {
    const now = Date.now();
    let removed = 0;

    for (const [sessionId, cachedSession] of this.activeSessionsCache.entries()) {
      const cacheAge = now - cachedSession.cachedAt;
      if (cacheAge > this.ACTIVE_SESSION_CACHE_TTL) {
        this.activeSessionsCache.delete(sessionId);
        removed++;
      }
    }

    if (removed > 0) {
      this.logger.debug(`Cache cleanup: ${removed} sessões ativas removidas do cache`);
    }
  }

  /**
   * Estatísticas do cache para monitoramento
   */
  getCacheStats() {
    return {
      activeSessionsCache: {
        size: this.activeSessionsCache.size,
        entries: Array.from(this.activeSessionsCache.keys()),
      },
      timestamp: new Date(),
    };
  }
}