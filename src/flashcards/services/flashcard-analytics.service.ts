import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FlashcardStatus, ReviewResult } from '@prisma/client';

export interface FlashcardStats {
  totalFlashcards: number;
  activeFlashcards: number;
  masteredFlashcards: number;
  pendingFlashcards: number;
  archivedFlashcards: number;
  totalReviews: number;
  averageAccuracy: number;
  currentStreak: number;
  longestStreak: number;
  studyTimeToday: number;
  studyTimeWeek: number;
  studyTimeMonth: number;
}

export interface TopicPerformance {
  topic: string;
  totalFlashcards: number;
  masteredFlashcards: number;
  averageAccuracy: number;
  averageResponseTime: number;
  lastStudied: Date | null;
  difficultyDistribution: Record<string, number>;
}

export interface ReviewStats {
  date: string;
  totalReviews: number;
  correctReviews: number;
  accuracy: number;
  averageResponseTime: number;
}

export interface FlashcardAnalytics {
  stats: FlashcardStats;
  topicPerformance: TopicPerformance[];
  reviewHistory: ReviewStats[];
  upcomingReviews: {
    today: number;
    tomorrow: number;
    thisWeek: number;
    overdue: number;
  };
  recommendations: string[];
}

@Injectable()
export class FlashcardAnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getUserAnalytics(userId: string): Promise<FlashcardAnalytics> {
    const [stats, topicPerformance, reviewHistory, upcomingReviews] = await Promise.all([
      this.getUserStats(userId),
      this.getTopicPerformance(userId),
      this.getReviewHistory(userId, 30), // Últimos 30 dias
      this.getUpcomingReviews(userId),
    ]);

    const recommendations = this.generateRecommendations(stats, topicPerformance);

    return {
      stats,
      topicPerformance,
      reviewHistory,
      upcomingReviews,
      recommendations,
    };
  }

  private async getUserStats(userId: string): Promise<FlashcardStats> {
    // Estatísticas básicas de flashcards
    const flashcardStats = await this.prisma.flashcard.groupBy({
      by: ['status'],
      where: { userId },
      _count: { id: true },
    });

    const statusCounts = flashcardStats.reduce((acc, stat) => {
      acc[stat.status] = stat._count.id;
      return acc;
    }, {} as Record<FlashcardStatus, number>);

    const totalFlashcards = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);

    // Estatísticas de reviews
    const reviewStats = await this.prisma.flashcardReview.aggregate({
      where: { userId },
      _count: { id: true },
      _avg: { responseTime: true },
    });

    const correctReviews = await this.prisma.flashcardReview.count({
      where: {
        userId,
        result: { in: [ReviewResult.GOOD, ReviewResult.EASY] },
      },
    });

    const averageAccuracy = reviewStats._count.id > 0 
      ? (correctReviews / reviewStats._count.id) * 100 
      : 0;

    // Streak atual e mais longo
    const { currentStreak, longestStreak } = await this.calculateStreaks(userId);

    // Tempo de estudo
    const studyTimes = await this.calculateStudyTimes(userId);

    return {
      totalFlashcards,
      activeFlashcards: statusCounts[FlashcardStatus.ACTIVE] || 0,
      masteredFlashcards: statusCounts[FlashcardStatus.MASTERED] || 0,
      pendingFlashcards: statusCounts[FlashcardStatus.PENDING] || 0,
      archivedFlashcards: statusCounts[FlashcardStatus.ARCHIVED] || 0,
      totalReviews: reviewStats._count.id,
      averageAccuracy,
      currentStreak,
      longestStreak,
      studyTimeToday: studyTimes.today,
      studyTimeWeek: studyTimes.week,
      studyTimeMonth: studyTimes.month,
    };
  }

  private async getTopicPerformance(userId: string): Promise<TopicPerformance[]> {
    const topics = await this.prisma.flashcard.groupBy({
      by: ['topic'],
      where: { userId },
      _count: { id: true },
    });

    const topicPerformance: TopicPerformance[] = [];

    for (const topicGroup of topics) {
      const topic = topicGroup.topic;
      
      // Contagem por status
      const masteredCount = await this.prisma.flashcard.count({
        where: {
          userId,
          topic,
          status: FlashcardStatus.MASTERED,
        },
      });

      // Reviews do tópico
      const topicReviews = await this.prisma.flashcardReview.findMany({
        where: {
          userId,
          flashcard: { topic },
        },
        select: {
          result: true,
          responseTime: true,
          reviewedAt: true,
        },
        orderBy: { reviewedAt: 'desc' },
      });

      const correctReviews = topicReviews.filter(r => 
        r.result === ReviewResult.GOOD || r.result === ReviewResult.EASY
      ).length;

      const averageAccuracy = topicReviews.length > 0 
        ? (correctReviews / topicReviews.length) * 100 
        : 0;

      const averageResponseTime = topicReviews.length > 0
        ? topicReviews.reduce((sum, r) => sum + (r.responseTime || 0), 0) / topicReviews.length
        : 0;

      const lastStudied = topicReviews.length > 0 ? topicReviews[0].reviewedAt : null;

      // Distribuição de dificuldade
      const difficultyStats = await this.prisma.flashcard.groupBy({
        by: ['difficultyLevel'],
        where: { userId, topic },
        _count: { id: true },
      });

      const difficultyDistribution = difficultyStats.reduce((acc, stat) => {
        acc[stat.difficultyLevel] = stat._count.id;
        return acc;
      }, {} as Record<string, number>);

      topicPerformance.push({
        topic,
        totalFlashcards: topicGroup._count.id,
        masteredFlashcards: masteredCount,
        averageAccuracy,
        averageResponseTime,
        lastStudied,
        difficultyDistribution,
      });
    }

    return topicPerformance.sort((a, b) => b.totalFlashcards - a.totalFlashcards);
  }

  private async getReviewHistory(userId: string, days: number): Promise<ReviewStats[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const reviews = await this.prisma.flashcardReview.findMany({
      where: {
        userId,
        reviewedAt: { gte: startDate },
      },
      select: {
        result: true,
        responseTime: true,
        reviewedAt: true,
      },
    });

    // Agrupar por data
    const reviewsByDate = reviews.reduce((acc, review) => {
      const date = review.reviewedAt.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(review);
      return acc;
    }, {} as Record<string, typeof reviews>);

    const reviewHistory: ReviewStats[] = [];
    
    for (const [date, dayReviews] of Object.entries(reviewsByDate)) {
      const correctReviews = dayReviews.filter(r => 
        r.result === ReviewResult.GOOD || r.result === ReviewResult.EASY
      ).length;

      const averageResponseTime = dayReviews.length > 0
        ? dayReviews.reduce((sum, r) => sum + (r.responseTime || 0), 0) / dayReviews.length
        : 0;

      reviewHistory.push({
        date,
        totalReviews: dayReviews.length,
        correctReviews,
        accuracy: dayReviews.length > 0 ? (correctReviews / dayReviews.length) * 100 : 0,
        averageResponseTime,
      });
    }

    return reviewHistory.sort((a, b) => a.date.localeCompare(b.date));
  }

  private async getUpcomingReviews(userId: string) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const [todayCount, tomorrowCount, weekCount, overdueCount] = await Promise.all([
      this.prisma.flashcard.count({
        where: {
          userId,
          status: { in: [FlashcardStatus.ACTIVE, FlashcardStatus.PENDING] },
          nextReviewDate: {
            gte: today,
            lt: tomorrow,
          },
        },
      }),
      this.prisma.flashcard.count({
        where: {
          userId,
          status: { in: [FlashcardStatus.ACTIVE, FlashcardStatus.PENDING] },
          nextReviewDate: {
            gte: tomorrow,
            lt: new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000),
          },
        },
      }),
      this.prisma.flashcard.count({
        where: {
          userId,
          status: { in: [FlashcardStatus.ACTIVE, FlashcardStatus.PENDING] },
          nextReviewDate: {
            gte: today,
            lt: nextWeek,
          },
        },
      }),
      this.prisma.flashcard.count({
        where: {
          userId,
          status: { in: [FlashcardStatus.ACTIVE, FlashcardStatus.PENDING] },
          nextReviewDate: { lt: today },
        },
      }),
    ]);

    return {
      today: todayCount,
      tomorrow: tomorrowCount,
      thisWeek: weekCount,
      overdue: overdueCount,
    };
  }

  private async calculateStreaks(userId: string): Promise<{ currentStreak: number; longestStreak: number }> {
    // Buscar dias únicos com reviews corretas nos últimos 90 dias
    const reviews = await this.prisma.flashcardReview.findMany({
      where: {
        userId,
        result: { in: [ReviewResult.GOOD, ReviewResult.EASY] },
        reviewedAt: {
          gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        },
      },
      select: { reviewedAt: true },
      orderBy: { reviewedAt: 'desc' },
    });

    // Extrair dias únicos
    const uniqueDays = [...new Set(
      reviews.map(r => r.reviewedAt.toISOString().split('T')[0])
    )].sort().reverse();

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    
    const today = new Date().toISOString().split('T')[0];
    let expectedDate = new Date();

    // Calcular streak atual
    for (const day of uniqueDays) {
      const dayDate = expectedDate.toISOString().split('T')[0];
      
      if (day === dayDate) {
        currentStreak++;
        expectedDate.setDate(expectedDate.getDate() - 1);
      } else {
        break;
      }
    }

    // Calcular streak mais longo
    for (let i = 0; i < uniqueDays.length; i++) {
      if (i === 0) {
        tempStreak = 1;
      } else {
        const currentDate = new Date(uniqueDays[i]);
        const previousDate = new Date(uniqueDays[i - 1]);
        const diffDays = Math.abs((previousDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          tempStreak++;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    return { currentStreak, longestStreak };
  }

  private async calculateStudyTimes(userId: string) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [todayTime, weekTime, monthTime] = await Promise.all([
      this.prisma.flashcardReview.aggregate({
        where: {
          userId,
          reviewedAt: { gte: today },
        },
        _sum: { responseTime: true },
      }),
      this.prisma.flashcardReview.aggregate({
        where: {
          userId,
          reviewedAt: { gte: weekAgo },
        },
        _sum: { responseTime: true },
      }),
      this.prisma.flashcardReview.aggregate({
        where: {
          userId,
          reviewedAt: { gte: monthAgo },
        },
        _sum: { responseTime: true },
      }),
    ]);

    return {
      today: Math.round((todayTime._sum.responseTime || 0) / 60), // em minutos
      week: Math.round((weekTime._sum.responseTime || 0) / 60),
      month: Math.round((monthTime._sum.responseTime || 0) / 60),
    };
  }

  private generateRecommendations(stats: FlashcardStats, topicPerformance: TopicPerformance[]): string[] {
    const recommendations: string[] = [];

    // Recomendação para usuários sem flashcards
    if (stats.totalFlashcards === 0) {
      recommendations.push('Comece criando seus primeiros flashcards');
      return recommendations;
    }

    // Recomendações baseadas em reviews pendentes
    if (stats.pendingFlashcards > 10) {
      recommendations.push(`Você tem ${stats.pendingFlashcards} flashcards pendentes. Comece revisando alguns hoje!`);
    }

    // Recomendações baseadas em accuracy
    if (stats.averageAccuracy < 70) {
      recommendations.push('Sua precisão está abaixo de 70%. Considere revisar os conceitos básicos.');
    }

    // Recomendações baseadas em tópicos fracos
    const weakTopics = topicPerformance.filter(t => t.averageAccuracy < 60).slice(0, 3);
    if (weakTopics.length > 0) {
      recommendations.push(`Foque nos tópicos: ${weakTopics.map(t => t.topic).join(', ')} - eles precisam de mais atenção.`);
    }

    // Recomendações baseadas em streak
    if (stats.currentStreak === 0) {
      recommendations.push('Comece uma nova sequência de estudos! Revise alguns flashcards hoje.');
    } else if (stats.currentStreak >= 7) {
      recommendations.push(`Parabéns! Você está em uma sequência de ${stats.currentStreak} dias. Continue assim!`);
    }

    // Recomendações baseadas em tempo de estudo
    if (stats.studyTimeToday < 15) {
      recommendations.push('Que tal dedicar mais 15 minutos aos seus flashcards hoje?');
    }

    return recommendations;
  }
}