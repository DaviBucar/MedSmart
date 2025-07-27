import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SessionStatus } from '@prisma/client';
import { SessionSummary } from '../../interfaces/session.interface';

@Injectable()
export class AnalyticsCalculatorProvider {
  constructor(private prisma: PrismaService) {}

  async getUserSummary(userId: string): Promise<SessionSummary> {
    const [sessionsData, metricsCache] = await Promise.all([
      this.prisma.studySession.aggregate({
        where: { userId, status: SessionStatus.COMPLETED },
        _count: { id: true },
        _sum: { duration: true, questionsAnswered: true, correctAnswers: true },
        _avg: { duration: true },
      }),
      this.prisma.userMetricsCache.findUnique({
        where: { userId },
      }),
    ]);

    const totalSessions = sessionsData._count.id || 0;
    const totalStudyTime = sessionsData._sum.duration || 0;
    const questionsAnswered = sessionsData._sum.questionsAnswered || 0;
    const correctAnswers = sessionsData._sum.correctAnswers || 0;

    return {
      totalSessions,
      totalStudyTime,
      averageSessionDuration: sessionsData._avg.duration || 0,
      questionsAnswered,
      accuracy: questionsAnswered > 0 ? (correctAnswers / questionsAnswered) * 100 : 0,
      currentStreak: metricsCache?.currentStreak || 0,
      weeklyGoalProgress: await this.calculateWeeklyGoalProgress(userId),
    };
  }

  async getProgressTrend(userId: string, days: number) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const sessions = await this.prisma.studySession.findMany({
      where: {
        userId,
        status: SessionStatus.COMPLETED,
        startTime: { gte: startDate },
      },
      include: {
        interactions: true,
      },
      orderBy: { startTime: 'asc' },
    });

    return this.groupSessionsByDate(sessions);
  }

  async calculateUserProgress(userId: string, days: number) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const sessions = await this.prisma.studySession.findMany({
      where: {
        userId,
        status: SessionStatus.COMPLETED,
        startTime: { gte: startDate },
      },
      include: {
        interactions: true,
      },
      orderBy: { startTime: 'asc' },
    });

    const progressData = this.groupSessionsByDate(sessions);

    return {
      period: `${days} dias`,
      totalSessions: sessions.length,
      totalStudyTime: sessions.reduce((sum, s) => sum + (s.duration || 0), 0),
      averageAccuracy: this.calculateOverallAccuracy(sessions),
      progressTrend: progressData,
      insights: this.generateProgressInsights(progressData),
    };
  }

  private async calculateWeeklyGoalProgress(userId: string): Promise<number> {
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const weeklyStudyTime = await this.prisma.studySession.aggregate({
      where: {
        userId,
        status: SessionStatus.COMPLETED,
        startTime: { gte: startOfWeek },
      },
      _sum: { duration: true },
    });

    const weeklyGoal = 300; // 5 horas por semana
    const progress = (weeklyStudyTime._sum.duration || 0) / weeklyGoal;
    return Math.min(progress * 100, 100);
  }

  private groupSessionsByDate(sessions: any[]) {
    const grouped: Record<string, any> = {};

    sessions.forEach(session => {
      const date = session.startTime.toISOString().split('T')[0];
      
      if (!grouped[date]) {
        grouped[date] = {
          date,
          studyTime: 0,
          questionsAnswered: 0,
          correctAnswers: 0,
          sessions: 0,
        };
      }

      grouped[date].studyTime += session.duration || 0;
      grouped[date].questionsAnswered += session.questionsAnswered || 0;
      grouped[date].correctAnswers += session.correctAnswers || 0;
      grouped[date].sessions += 1;
    });

    return Object.values(grouped).map((day: any) => ({
      ...day,
      accuracy: day.questionsAnswered > 0 ? (day.correctAnswers / day.questionsAnswered) * 100 : 0,
    }));
  }

  private calculateOverallAccuracy(sessions: any[]): number {
    const totalQuestions = sessions.reduce((sum, s) => sum + (s.questionsAnswered || 0), 0);
    const totalCorrect = sessions.reduce((sum, s) => sum + (s.correctAnswers || 0), 0);
    return totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;
  }

  private generateProgressInsights(progressData: any[]): string[] {
    const insights: string[] = [];

    if (progressData.length < 3) return insights;

    const studyDays = progressData.filter(d => d.studyTime > 0).length;
    const totalDays = progressData.length;
    const consistency = studyDays / totalDays;

    if (consistency > 0.8) {
      insights.push('Excelente consistência nos estudos!');
    } else if (consistency < 0.4) {
      insights.push('Tente manter uma rotina mais consistente de estudos.');
    }

    const recentAccuracy = progressData.slice(-7).reduce((sum, d) => sum + d.accuracy, 0) / 7;
    const olderAccuracy = progressData.slice(0, 7).reduce((sum, d) => sum + d.accuracy, 0) / 7;

    if (recentAccuracy > olderAccuracy + 5) {
      insights.push('Sua precisão está melhorando consistentemente!');
    } else if (recentAccuracy < olderAccuracy - 5) {
      insights.push('Considere revisar os tópicos com mais dificuldade.');
    }

    return insights;
  }
}