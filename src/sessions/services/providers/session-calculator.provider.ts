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

  enrichSessionWithBasicMetrics(session: any) {
    const accuracy = session.questionsAnswered > 0 
      ? (session.correctAnswers / session.questionsAnswered) * 100 
      : 0;

    return {
      ...session,
      accuracy: Math.round(accuracy * 100) / 100,
      interactionCount: session.interactions?.length || 0,
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

    // Calculate performance score (0-100 based on accuracy and response time)
    const accuracy = questionsAnswered > 0 ? (correctAnswers / questionsAnswered) * 100 : 0;
    const performanceScore = this.calculatePerformanceScore(accuracy, averageResponseTime, questionsAnswered);
    
    // Calculate focus score (0-100 based on consistency and engagement)
    const focusScore = this.calculateFocusScore(session.interactions, durationMinutes);

    return {
      durationMinutes,
      questionsAnswered,
      correctAnswers,
      averageResponseTime,
      topicsStudied,
      performanceScore,
      focusScore,
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
      performanceScore: metrics.performanceScore,
      focusScore: metrics.focusScore,
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

  /**
   * Calcula score de performance baseado em precisão, tempo de resposta e volume
   */
  private calculatePerformanceScore(accuracy: number, averageResponseTime: number, questionsAnswered: number): number {
    // Base score from accuracy (0-70 points)
    let score = accuracy * 0.7;

    // Bonus for optimal response time (0-20 points)
    // Optimal range: 15-45 seconds
    if (averageResponseTime >= 15 && averageResponseTime <= 45) {
      score += 20;
    } else if (averageResponseTime < 15) {
      // Too fast might indicate guessing
      score += Math.max(0, 20 - (15 - averageResponseTime) * 2);
    } else {
      // Too slow indicates difficulty
      score += Math.max(0, 20 - (averageResponseTime - 45) * 0.5);
    }

    // Bonus for engagement (0-10 points)
    if (questionsAnswered >= 10) {
      score += 10;
    } else if (questionsAnswered >= 5) {
      score += 5;
    }

    return Math.min(100, Math.max(0, Math.round(score)));
  }

  /**
   * Calcula score de foco baseado em consistência e padrões de resposta
   */
  private calculateFocusScore(interactions: any[], durationMinutes: number): number {
    if (interactions.length === 0) return 0;

    let score = 50; // Base score

    // Consistency bonus (0-25 points)
    const responseTimes = interactions.map(i => i.timeToAnswer);
    const avgTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    const variance = responseTimes.reduce((sum, time) => sum + Math.pow(time - avgTime, 2), 0) / responseTimes.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Lower deviation = more consistent = higher focus
    const consistencyScore = Math.max(0, 25 - (standardDeviation / avgTime) * 100);
    score += consistencyScore;

    // Engagement pattern bonus (0-15 points)
    const questionsPerMinute = interactions.length / Math.max(1, durationMinutes);
    if (questionsPerMinute >= 0.5 && questionsPerMinute <= 2) {
      score += 15; // Optimal pace
    } else if (questionsPerMinute > 2) {
      score += Math.max(0, 15 - (questionsPerMinute - 2) * 5); // Too fast
    } else {
      score += questionsPerMinute * 30; // Too slow but some engagement
    }

    // Accuracy trend bonus (0-10 points)
    if (interactions.length >= 5) {
      const firstHalf = interactions.slice(0, Math.floor(interactions.length / 2));
      const secondHalf = interactions.slice(Math.floor(interactions.length / 2));
      
      const firstHalfAccuracy = firstHalf.filter(i => i.isCorrect).length / firstHalf.length;
      const secondHalfAccuracy = secondHalf.filter(i => i.isCorrect).length / secondHalf.length;
      
      if (secondHalfAccuracy >= firstHalfAccuracy) {
        score += 10; // Maintained or improved focus
      }
    }

    return Math.min(100, Math.max(0, Math.round(score)));
  }
}