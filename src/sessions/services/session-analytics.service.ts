import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SessionStatus } from '@prisma/client';
import { SessionSummary, TopicPerformance, SessionAnalytics } from '../interfaces/session.interface';
import { AnalyticsCalculatorProvider } from './providers/analytics-calculator.provider';
import { PerformanceAnalyzerProvider } from './providers/performance-analyzer.provider';

@Injectable()
export class SessionAnalyticsService {
  private readonly logger = new Logger(SessionAnalyticsService.name);

  constructor(
    private prisma: PrismaService,
    private analyticsCalculator: AnalyticsCalculatorProvider,
    private performanceAnalyzer: PerformanceAnalyzerProvider,
  ) {}

  async getUserDashboard(userId: string): Promise<SessionAnalytics> {
    try {
      const [summary, topicPerformance, weaknesses, progressTrend] = await Promise.all([
        this.analyticsCalculator.getUserSummary(userId),
        this.performanceAnalyzer.getTopicPerformance(userId),
        this.performanceAnalyzer.getUserWeaknesses(userId),
        this.analyticsCalculator.getProgressTrend(userId, 30),
      ]);

      return {
        summary,
        topicPerformance,
        weaknesses,
        recommendations: [],
        progressTrend,
      };
    } catch (error) {
      this.logger.error('Erro ao gerar dashboard:', error);
      throw error;
    }
  }

  async getUserProgress(userId: string, period?: string) {
    try {
      const days = this.parsePeriod(period);
      return await this.analyticsCalculator.calculateUserProgress(userId, days);
    } catch (error) {
      this.logger.error('Erro ao calcular progresso:', error);
      throw error;
    }
  }

  async getUserPerformance(userId: string, topic?: string) {
    try {
      return await this.performanceAnalyzer.analyzeUserPerformance(userId, topic);
    } catch (error) {
      this.logger.error('Erro ao analisar performance:', error);
      throw error;
    }
  }

  async getUserWeaknesses(userId: string): Promise<string[]> {
    try {
      return await this.performanceAnalyzer.getUserWeaknesses(userId);
    } catch (error) {
      this.logger.error('Erro ao identificar fraquezas:', error);
      throw error;
    }
  }

  private parsePeriod(period?: string): number {
    switch (period) {
      case 'week': return 7;
      case 'month': return 30;
      case 'quarter': return 90;
      default: return 30;
    }
  }
}