import { Injectable } from '@nestjs/common';
import { SessionFiltersDto } from '../../dto/session-filters.dto';

@Injectable()
export class SessionCalculatorProvider {
  enrichSessionWithMetrics(session: any) {
    return {
      ...session,
      accuracy: this.calculateAccuracy(session.interactions),
      averageResponseTime: this.calculateAverageResponseTime(session.interactions),
    };
  }

  enrichSessionWithDetailedMetrics(session: any) {
    return {
      ...session,
      accuracy: this.calculateAccuracy(session.interactions),
      averageResponseTime: this.calculateAverageResponseTime(session.interactions),
      topicBreakdown: this.calculateTopicBreakdown(session.interactions),
    };
  }

  async calculateFinalMetrics(session: any) {
    const endTime = new Date();
    const durationMinutes = Math.round((endTime.getTime() - session.startTime.getTime()) / (1000 * 60));

    const questionsAnswered = session.interactions.length;
    const correctAnswers = session.interactions.filter((q: any) => q.isCorrect).length;
    const averageResponseTime = this.calculateAverageResponseTime(session.interactions);
    const topicsStudied: string[] = Array.from(new Set(
      session.interactions
        .map((q: any) => q.topic as string)
    )) as string[];

    return {
      durationMinutes,
      questionsAnswered,
      correctAnswers,
      averageResponseTime,
      topicsStudied,
    };
  }

  buildSessionSummary(session: any, metrics: any) {
    return {
      durationMinutes: metrics.durationMinutes,
      questionsAnswered: metrics.questionsAnswered,
      correctAnswers: metrics.correctAnswers,
      accuracy: metrics.questionsAnswered > 0 ? (metrics.correctAnswers / metrics.questionsAnswered) * 100 : 0,
      averageResponseTime: metrics.averageResponseTime,
      topicsStudied: metrics.topicsStudied,
    };
  }

  buildPagination(filters: SessionFiltersDto, total: number) {
    return {
      page: filters.page || 1,
      limit: filters.limit || 20,
      total,
      totalPages: Math.ceil(total / (filters.limit || 20)),
    };
  }

  // Métodos auxiliares privados
  private calculateAccuracy(interactions: any[]): number {
    if (interactions.length === 0) return 0;
    const correct = interactions.filter(i => i.isCorrect).length;
    return (correct / interactions.length) * 100;
  }

  private calculateAverageResponseTime(interactions: any[]): number {
    if (interactions.length === 0) return 0;
    const total = interactions.reduce((sum, i) => sum + i.timeToAnswer, 0);
    return total / interactions.length;
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