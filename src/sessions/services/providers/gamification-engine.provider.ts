import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AchievementType } from '@prisma/client';
import { Achievement, GameficationData } from '../../interfaces/session.interface';

@Injectable()
export class GamificationEngineProvider {
  constructor(private prisma: PrismaService) {}

  async checkAndUnlockAchievements(userId: string, sessionData?: any): Promise<Achievement[]> {
    const unlockedAchievements: Achievement[] = [];

    // Verificar conquistas baseadas em sessões
    if (sessionData) {
      const sessionAchievements = await this.checkSessionAchievements(userId, sessionData);
      unlockedAchievements.push(...sessionAchievements);
    }

    // Verificar conquistas baseadas em progresso geral
    const progressAchievements = await this.checkProgressAchievements(userId);
    unlockedAchievements.push(...progressAchievements);

    // Salvar conquistas desbloqueadas
    for (const achievement of unlockedAchievements) {
      await this.unlockAchievement(userId, achievement.id);
    }

    return unlockedAchievements;
  }

  async getUserGameficationData(userId: string): Promise<GameficationData> {
    const [userAchievements, streakData, leaderboardPosition] = await Promise.all([
      this.getUserAchievements(userId),
      this.getStreakData(userId),
      this.getLeaderboardPosition(userId),
    ]);

    const nextMilestone = await this.getNextMilestone(userId);

    return {
      currentStreak: streakData.currentStreak,
      longestStreak: streakData.longestStreak,
      totalAchievements: userAchievements.length,
      recentAchievements: userAchievements.slice(0, 3),
      nextMilestone,
      leaderboardPosition: leaderboardPosition.overall,
      weeklyRank: leaderboardPosition.weekly,
    };
  }

  async getLeaderboard(period?: string) {
    const days = this.parsePeriod(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const userMetrics = await this.prisma.userMetricsCache.findMany({
      include: {
        user: {
          select: { id: true, email: true },
        },
      },
      orderBy: { totalStudyTime: 'desc' },
      take: 50,
    });

    return userMetrics.map((metric, index) => ({
      position: index + 1,
      userId: metric.userId,
      userEmail: metric.user.email,
      totalStudyTime: metric.totalStudyTime,
      totalSessions: metric.totalSessions,
      currentStreak: metric.currentStreak,
    }));
  }

  private async checkSessionAchievements(userId: string, sessionData: any): Promise<Achievement[]> {
    const achievements: Achievement[] = [];

    // Primeira sessão
    const sessionCount = await this.prisma.studySession.count({
      where: { userId },
    });

    if (sessionCount === 1) {
      achievements.push(this.createAchievement('first_session', 'Primeira Sessão', 'Completou sua primeira sessão de estudos!'));
    }

    // Sessão perfeita (100% accuracy)
    if (sessionData.accuracy === 100 && sessionData.questionsAnswered >= 5) {
      achievements.push(this.createAchievement('perfect_session', 'Sessão Perfeita', '100% de acertos em uma sessão!'));
    }

    // Maratona (sessão longa)
    if (sessionData.duration >= 120) {
      achievements.push(this.createAchievement('marathon', 'Maratonista', 'Estudou por mais de 2 horas seguidas!'));
    }

    // Velocidade (resposta rápida)
    if (sessionData.averageResponseTime <= 10 && sessionData.questionsAnswered >= 10) {
      achievements.push(this.createAchievement('speed_demon', 'Demônio da Velocidade', 'Média de resposta abaixo de 10 segundos!'));
    }

    return achievements;
  }

  private async checkProgressAchievements(userId: string): Promise<Achievement[]> {
    const achievements: Achievement[] = [];

    const userMetrics = await this.prisma.userMetricsCache.findUnique({
      where: { userId },
    });

    if (!userMetrics) return achievements;

    // Conquistas de streak
    if (userMetrics.currentStreak === 7) {
      achievements.push(this.createAchievement('week_streak', 'Semana Consistente', '7 dias seguidos de estudo!'));
    }

    if (userMetrics.currentStreak === 30) {
      achievements.push(this.createAchievement('month_streak', 'Mês Dedicado', '30 dias seguidos de estudo!'));
    }

    // Conquistas de tempo total
    if (userMetrics.totalStudyTime >= 1000) {
      achievements.push(this.createAchievement('time_master', 'Mestre do Tempo', 'Mais de 1000 minutos de estudo!'));
    }

    // Conquistas de sessões
    if (userMetrics.totalSessions >= 50) {
      achievements.push(this.createAchievement('session_veteran', 'Veterano das Sessões', '50 sessões completadas!'));
    }

    return achievements;
  }

  private async getUserAchievements(userId: string): Promise<Achievement[]> {
    const userAchievements = await this.prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true },
      orderBy: { unlockedAt: 'desc' },
    });

    return userAchievements.map(ua => ({
      id: ua.achievement.id,
      name: ua.achievement.name,
      description: ua.achievement.description,
      icon: ua.achievement.icon || '🏆', 
      category: ua.achievement.type,
      unlockedAt: ua.unlockedAt,
    }));
  }

  private async getStreakData(userId: string) {
    const userMetrics = await this.prisma.userMetricsCache.findUnique({
      where: { userId },
    });

    // Calcular longest streak se não estiver no cache
    let longestStreak = 0;
    if (userMetrics) {
      // Implementar cálculo de longest streak
      longestStreak = await this.calculateLongestStreak(userId);
    }

    return {
      currentStreak: userMetrics?.currentStreak || 0,
      longestStreak,
    };
  }

  private async getLeaderboardPosition(userId: string) {
    const allUsers = await this.prisma.userMetricsCache.findMany({
      orderBy: { totalStudyTime: 'desc' },
    });

    const userIndex = allUsers.findIndex(u => u.userId === userId);
    
    return {
      overall: userIndex + 1,
      weekly: userIndex + 1, // Simplificado - implementar cálculo semanal
    };
  }

  private async getNextMilestone(userId: string) {
    const userMetrics = await this.prisma.userMetricsCache.findUnique({
      where: { userId },
    });

    if (!userMetrics) {
      return {
        name: 'Primeira Sessão',
        progress: 0,
        target: 1,
        description: 'Complete sua primeira sessão de estudos',
      };
    }

    // Definir próximo milestone baseado no progresso atual
    const milestones = [
      { sessions: 10, name: 'Iniciante Dedicado' },
      { sessions: 25, name: 'Estudante Consistente' },
      { sessions: 50, name: 'Veterano dos Estudos' },
      { sessions: 100, name: 'Mestre do Conhecimento' },
    ];

    const nextMilestone = milestones.find(m => m.sessions > userMetrics.totalSessions);

    if (nextMilestone) {
      return {
        name: nextMilestone.name,
        progress: userMetrics.totalSessions,
        target: nextMilestone.sessions,
        description: `Complete ${nextMilestone.sessions} sessões para desbloquear`,
      };
    }

    return {
      name: 'Lenda dos Estudos',
      progress: userMetrics.totalSessions,
      target: userMetrics.totalSessions,
      description: 'Você já alcançou todos os milestones!',
    };
  }

  private async unlockAchievement(userId: string, achievementId: string) {
    try {
      await this.prisma.userAchievement.create({
        data: {
          userId,
          achievementId,
          unlockedAt: new Date(),
        },
      });
    } catch (error) {
      // Achievement já desbloqueada - ignorar erro
    }
  }

  private createAchievement(id: string, name: string, description: string): Achievement {
    return {
      id,
      name,
      description,
      icon: this.getAchievementIcon(id),
      category: this.getAchievementCategory(id),
    };
  }

  private getAchievementIcon(id: string): string {
    const icons: Record<string, string> = {
      first_session: '🎯',
      perfect_session: '💯',
      marathon: '🏃‍♂️',
      speed_demon: '⚡',
      week_streak: '📅',
      month_streak: '🗓️',
      time_master: '⏰',
      session_veteran: '🎖️',
    };

    return icons[id] || '🏆';
  }

  private getAchievementCategory(id: string): string {
    if (id.includes('streak')) return 'Consistência';
    if (id.includes('session')) return 'Sessões';
    if (id.includes('time')) return 'Tempo';
    return 'Geral';
  }

  private async calculateLongestStreak(userId: string): Promise<number> {
    // Implementação simplificada - pode ser otimizada
    return 0;
  }

  private parsePeriod(period?: string): number {
    switch (period) {
      case 'week': return 7;
      case 'month': return 30;
      default: return 7;
    }
  }
}