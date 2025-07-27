import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SessionStatus } from '@prisma/client';
import { StreakCalculatorProvider } from './streak-calculator.provider';

@Injectable()
export class MetricsUpdaterProvider {
  constructor(
    private prisma: PrismaService,
    private streakCalculator: StreakCalculatorProvider,
  ) {}

  async updateAllMetrics(userId: string, interactions: any[]) {
    await Promise.all([
      this.updateTopicProgress(userId, interactions),
      this.updateUserMetricsCache(userId),
    ]);
  }

  private async updateTopicProgress(userId: string, interactions: any[]) {
    const topicStats = this.calculateTopicStats(interactions);

    for (const stats of topicStats) {
      await this.prisma.topicProgress.upsert({
        where: {
          userId_topic: {
            userId,
            topic: stats.topic,
          },
        },
        update: {
          totalQuestions: { increment: stats.questionsAnswered },
          correctAnswers: { increment: stats.correctAnswers },
          lastStudied: new Date(),
          masteryScore: this.calculateMasteryScore(stats.accuracy),
          updatedAt: new Date(),
        },
        create: {
          userId,
          topic: stats.topic,
          totalQuestions: stats.questionsAnswered,
          correctAnswers: stats.correctAnswers,
          masteryScore: this.calculateMasteryScore(stats.accuracy),
          lastStudied: new Date(),
        },
      });
    }
  }

  private async updateUserMetricsCache(userId: string) {
    const [totalSessions, totalStudyTime, totalQuestions, correctAnswers, currentStreak] = await Promise.all([
      this.prisma.studySession.count({
        where: { userId, status: SessionStatus.COMPLETED },
      }),
      this.prisma.studySession.aggregate({
        where: { userId, status: SessionStatus.COMPLETED },
        _sum: { duration: true },
      }),
      this.prisma.questionInteraction.count({
        where: { userId },
      }),
      this.prisma.questionInteraction.count({
        where: { userId, isCorrect: true },
      }),
      this.streakCalculator.calculateCurrentStreak(userId),
    ]);

    await this.prisma.userMetricsCache.upsert({
      where: { userId },
      update: {
        totalSessions,
        totalStudyTime: totalStudyTime._sum.duration || 0,
        totalQuestions,
        correctAnswers,
        currentStreak,
        lastCalculated: new Date(),
        updatedAt: new Date(),
      },
      create: {
        userId,
        totalSessions,
        totalStudyTime: totalStudyTime._sum.duration || 0,
        totalQuestions,
        correctAnswers,
        currentStreak,
        lastCalculated: new Date(),
      },
    });
  }

  private calculateTopicStats(interactions: any[]) {
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
    }));
  }

  private calculateMasteryScore(accuracy: number): number {
    // Retorna um score de 0-100 baseado na precisão
    return Math.max(0, Math.min(100, Math.round(accuracy)));
  }
}