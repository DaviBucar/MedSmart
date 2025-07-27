import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { TopicPerformance } from '../../interfaces/session.interface';
import { DifficultyLevel, BloomLevel } from '@prisma/client';

@Injectable()
export class PerformanceAnalyzerProvider {
  constructor(private prisma: PrismaService) {}

  async getTopicPerformance(userId: string): Promise<TopicPerformance[]> {
    const topicProgress = await this.prisma.topicProgress.findMany({
      where: { userId },
      orderBy: { lastStudied: 'desc' },
    });

    const performancePromises = topicProgress.map(async (tp) => {
      const interactions = await this.prisma.questionInteraction.findMany({
        where: {
          topic: tp.topic,
          session: { userId },
        },
      });

      return {
        topic: tp.topic,
        questionsAnswered: tp.totalQuestions,
        accuracy: tp.totalQuestions > 0 ? (tp.correctAnswers / tp.totalQuestions) * 100 : 0,
        averageResponseTime: this.calculateAverageResponseTime(interactions),
        difficultyDistribution: this.calculateDifficultyDistribution(interactions),
        bloomDistribution: this.calculateBloomDistribution(interactions),
        lastStudied: tp.lastStudied || new Date(0), // Fornece data padrão se for null
        masteryLevel: tp.masteryScore,
      };
    });

    return Promise.all(performancePromises);
  }

  async analyzeUserPerformance(userId: string, topic?: string) {
    const whereClause: any = {
      session: { userId },
    };

    if (topic) {
      whereClause.topic = topic;
    }

    const interactions = await this.prisma.questionInteraction.findMany({
      where: whereClause,
      include: {
        session: {
          select: { startTime: true },
        },
      },
      orderBy: { timestamp: 'desc' },
    });

    const performance = this.analyzePerformanceData(interactions);

    return {
      topic: topic || 'Todos os tópicos',
      totalQuestions: interactions.length,
      ...performance,
      improvementSuggestions: this.generateImprovementSuggestions(performance),
    };
  }

  async getUserWeaknesses(userId: string): Promise<string[]> {
    const topicProgress = await this.prisma.topicProgress.findMany({
      where: { userId },
      orderBy: { masteryScore: 'asc' },
    });

    const weakTopics = topicProgress
      .filter(tp => tp.masteryScore < 60 && tp.totalQuestions >= 5)
      .slice(0, 5)
      .map(tp => tp.topic);

    const errorPatterns = await this.analyzeErrorPatterns(userId);

    return [...weakTopics, ...errorPatterns];
  }

  private calculateAverageResponseTime(interactions: any[]): number {
    if (interactions.length === 0) return 0;
    return interactions.reduce((sum, i) => sum + i.timeToAnswer, 0) / interactions.length;
  }

  private calculateDifficultyDistribution(interactions: any[]): Record<DifficultyLevel, number> {
    const distribution: Record<string, number> = {};
    interactions.forEach(i => {
      distribution[i.difficultyLevel] = (distribution[i.difficultyLevel] || 0) + 1;
    });
    return distribution as Record<DifficultyLevel, number>;
  }

  private calculateBloomDistribution(interactions: any[]): Record<BloomLevel, number> {
    const distribution: Record<string, number> = {};
    interactions.forEach(i => {
      distribution[i.bloomLevel] = (distribution[i.bloomLevel] || 0) + 1;
    });
    return distribution as Record<BloomLevel, number>;
  }

  private analyzePerformanceData(interactions: any[]) {
    const accuracy = interactions.length > 0
      ? (interactions.filter(i => i.isCorrect).length / interactions.length) * 100
      : 0;

    const averageResponseTime = this.calculateAverageResponseTime(interactions);
    const difficultyBreakdown = this.calculateDifficultyDistribution(interactions);
    const bloomBreakdown = this.calculateBloomDistribution(interactions);

    // Analisar tendência temporal
    const recentInteractions = interactions.slice(0, 20);
    const olderInteractions = interactions.slice(-20);

    const recentAccuracy = recentInteractions.length > 0
      ? (recentInteractions.filter(i => i.isCorrect).length / recentInteractions.length) * 100
      : 0;

    const olderAccuracy = olderInteractions.length > 0
      ? (olderInteractions.filter(i => i.isCorrect).length / olderInteractions.length) * 100
      : 0;

    return {
      accuracy,
      averageResponseTime,
      difficultyBreakdown,
      bloomBreakdown,
      trend: {
        improving: recentAccuracy > olderAccuracy,
        change: recentAccuracy - olderAccuracy,
      },
    };
  }

  private async analyzeErrorPatterns(userId: string): Promise<string[]> {
    const incorrectInteractions = await this.prisma.questionInteraction.findMany({
      where: {
        session: { userId },
        isCorrect: false,
      },
      take: 100,
      orderBy: { timestamp: 'desc' },
    });

    const patterns: string[] = [];
    const totalErrors = incorrectInteractions.length;

    if (totalErrors === 0) return patterns;

    // Analisar por nível de Bloom
    const bloomErrors = this.calculateBloomDistribution(incorrectInteractions);
    Object.entries(bloomErrors).forEach(([level, count]) => {
      if (count / totalErrors > 0.3) {
        patterns.push(`Dificuldades em questões de ${level}`);
      }
    });

    // Analisar por dificuldade
    const difficultyErrors = this.calculateDifficultyDistribution(incorrectInteractions);
    Object.entries(difficultyErrors).forEach(([level, count]) => {
      if (count / totalErrors > 0.4) {
        patterns.push(`Muitos erros em questões ${level}`);
      }
    });

    return patterns.slice(0, 3);
  }

  private generateImprovementSuggestions(performance: any): string[] {
    const suggestions: string[] = [];

    if (performance.accuracy < 70) {
      suggestions.push('Foque em questões de nível básico para fortalecer a base');
    }

    if (performance.averageResponseTime > 60) {
      suggestions.push('Pratique mais para melhorar a velocidade de resposta');
    }

    if (performance.trend && !performance.trend.improving) {
      suggestions.push('Considere revisar o material teórico antes de praticar');
    }

    return suggestions;
  }
}