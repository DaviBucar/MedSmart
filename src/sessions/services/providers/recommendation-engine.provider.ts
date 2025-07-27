import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { DeepSeekService } from '../../../ai/services/deepseek.service';
import { StudyRecommendation } from '../../interfaces/session.interface';
import { StudyGoal, DifficultyLevel } from '@prisma/client';

@Injectable()
export class RecommendationEngineProvider {
  constructor(
    private prisma: PrismaService,
    private deepSeekService: DeepSeekService,
  ) {}

  async generateNextSessionRecommendation(userId: string): Promise<StudyRecommendation> {
    const [userStats, weaknesses, recentSessions] = await Promise.all([
      this.getUserStats(userId),
      this.getUserWeaknesses(userId),
      this.getRecentSessions(userId),
    ]);

    const recommendation = await this.analyzeAndRecommend(userStats, weaknesses, recentSessions);
    
    return {
      id: this.generateRecommendationId(),
      type: recommendation.type as 'TOPIC' | 'DURATION' | 'DIFFICULTY' | 'SCHEDULE',
      title: recommendation.title,
      description: recommendation.description,
      priority: recommendation.priority,
      estimatedBenefit: recommendation.estimatedBenefit,
      reasoning: recommendation.reasoning,
      actionItems: recommendation.actionItems,
      createdAt: new Date(),
    };
  }

  async generateTopicRecommendations(userId: string): Promise<StudyRecommendation[]> {
    const topicProgress = await this.prisma.topicProgress.findMany({
      where: { userId },
      orderBy: { masteryScore: 'asc' },
    });

    const recommendations: StudyRecommendation[] = [];

    // Recomendar tópicos fracos
    const weakTopics = topicProgress.filter(tp => tp.masteryScore < 3).slice(0, 3);
    for (const topic of weakTopics) {
      recommendations.push({
        id: this.generateRecommendationId(),
        type: 'TOPIC',
        title: `Revisar ${topic.topic}`,
        description: `Foque em melhorar sua performance em ${topic.topic}`,
        priority: 5 - topic.masteryScore,
        estimatedBenefit: 'Melhoria significativa na precisão',
        reasoning: `Nível de domínio atual: ${topic.masteryScore}/5`,
        actionItems: [
          'Revisar conceitos básicos',
          'Praticar questões de nível fácil',
          'Aumentar gradualmente a dificuldade',
        ],
        createdAt: new Date(),
      });
    }

    // Recomendar tópicos para manutenção
    const strongTopics = topicProgress.filter(tp => tp.masteryScore >= 4).slice(0, 2);
    for (const topic of strongTopics) {
      recommendations.push({
        id: this.generateRecommendationId(),
        type: 'TOPIC',
        title: `Manter ${topic.topic}`,
        description: `Continue praticando para manter o alto nível`,
        priority: 2,
        estimatedBenefit: 'Manutenção do conhecimento',
        reasoning: `Excelente domínio atual: ${topic.masteryScore}/5`,
        actionItems: [
          'Questões de revisão semanal',
          'Foco em questões avançadas',
        ],
        createdAt: new Date(),
      });
    }

    return recommendations;
  }

  async analyzeStudyPattern(userId: string) {
    const sessions = await this.prisma.studySession.findMany({
      where: { userId },
      orderBy: { startTime: 'desc' },
      take: 30,
    });

    const pattern = {
      preferredStudyTime: this.analyzePreferredTime(sessions),
      averageSessionDuration: this.calculateAverageSessionDuration(sessions),
      consistencyScore: this.calculateConsistencyScore(sessions),
      preferredTopics: await this.analyzePreferredTopics(userId),
      optimalDifficulty: await this.analyzeOptimalDifficulty(userId),
    };

    return pattern;
  }

  private async getUserStats(userId: string) {
    const stats = await this.prisma.studySession.aggregate({
      where: { userId },
      _avg: { duration: true, questionsAnswered: true, correctAnswers: true },
      _count: { id: true },
    });

    return {
      averageDuration: stats._avg.duration || 0,
      averageQuestions: stats._avg.questionsAnswered || 0,
      averageAccuracy: stats._avg.correctAnswers || 0,
      totalSessions: stats._count.id,
    };
  }

  private async getUserWeaknesses(userId: string) {
    return await this.prisma.topicProgress.findMany({
      where: { userId, masteryScore: { lt: 3 } },
      orderBy: { masteryScore: 'asc' },
      take: 5,
    });
  }

  private async getRecentSessions(userId: string) {
    return await this.prisma.studySession.findMany({
      where: { userId },
      orderBy: { startTime: 'desc' },
      take: 10,
      include: {
        interactions: true,
      },
    });
  }

  private async analyzeAndRecommend(userStats: any, weaknesses: any[], recentSessions: any[]) {
    // Lógica de recomendação baseada em IA
    const context = {
      userStats,
      weaknesses: weaknesses.map(w => w.topic),
      recentPerformance: recentSessions.map(s => ({
        accuracy: s.questionsAnswered > 0 ? (s.correctAnswers / s.questionsAnswered) * 100 : 0,
        duration: s.duration,
        topics: s.interactions?.map((qi: any) => qi.topic) || [],
      })),
    };

    // Determinar tipo de recomendação
    if (weaknesses.length > 0) {
      return {
        type: 'TOPIC',
        title: `Foque em ${weaknesses[0].topic}`,
        description: `Sessão de revisão focada em ${weaknesses[0].topic}`,
        priority: 5,
        estimatedBenefit: 'Melhoria de 15-20% na precisão',
        reasoning: `Nível de domínio baixo: ${weaknesses[0].masteryScore}/5`,
        actionItems: [
          'Revisar conceitos fundamentais',
          'Praticar 10-15 questões básicas',
          'Focar na compreensão antes da velocidade',
        ],
      };
    }

    return {
      type: 'DURATION',
      title: 'Sessão de manutenção',
      description: 'Continue com sua rotina de estudos',
      priority: 3,
      estimatedBenefit: 'Manutenção do conhecimento',
      reasoning: 'Performance consistente em todos os tópicos',
      actionItems: [
        'Sessão de 30-45 minutos',
        'Mix de tópicos variados',
        'Foco em questões de dificuldade média',
      ],
    };
  }

  private analyzePreferredTime(sessions: any[]) {
    const hourCounts: Record<number, number> = {};
    
    sessions.forEach(session => {
      const hour = new Date(session.startTime).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const preferredHour = Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0];

    return preferredHour ? parseInt(preferredHour) : null;
  }

  private calculateAverageSessionDuration(sessions: any[]) {
    if (sessions.length === 0) return 0;
    return sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / sessions.length;
  }

  private calculateConsistencyScore(sessions: any[]) {
    if (sessions.length < 7) return 0;

    const last7Days = new Array(7).fill(0);
    const today = new Date();

    sessions.forEach(session => {
      const sessionDate = new Date(session.startTime);
      const daysDiff = Math.floor((today.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff < 7) {
        last7Days[daysDiff] = 1;
      }
    });

    return last7Days.reduce((sum, day) => sum + day, 0) / 7;
  }

  private async analyzePreferredTopics(userId: string) {
    const topicProgress = await this.prisma.topicProgress.findMany({
      where: { userId },
      orderBy: { totalQuestions: 'desc' },
      take: 5,
    });

    return topicProgress.map(tp => tp.topic);
  }

  private async analyzeOptimalDifficulty(userId: string): Promise<DifficultyLevel> {
    const interactions = await this.prisma.questionInteraction.findMany({
      where: { session: { userId } },
      take: 100,
      orderBy: { timestamp: 'desc' },
    });

    const difficultyStats: Record<string, { total: number; correct: number }> = {};

    interactions.forEach(interaction => {
      const level = interaction.difficultyLevel;
      if (!difficultyStats[level]) {
        difficultyStats[level] = { total: 0, correct: 0 };
      }
      difficultyStats[level].total++;
      if (interaction.isCorrect) {
        difficultyStats[level].correct++;
      }
    });

    // Encontrar nível com melhor balance entre desafio e sucesso (70-80% accuracy)
    let optimalLevel: DifficultyLevel = DifficultyLevel.MEDIUM;
    let bestScore = 0;

    Object.entries(difficultyStats).forEach(([level, stats]) => {
      const accuracy = stats.correct / stats.total;
      const score = accuracy >= 0.7 && accuracy <= 0.8 ? accuracy : 0;
      
      if (score > bestScore && Object.values(DifficultyLevel).includes(level as DifficultyLevel)) {
        bestScore = score;
        optimalLevel = level as DifficultyLevel;
      }
    });

    return optimalLevel;
  }

  private generateRecommendationId(): string {
    return `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}