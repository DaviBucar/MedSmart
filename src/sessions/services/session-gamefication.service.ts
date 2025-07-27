import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GamificationEngineProvider } from './providers/gamification-engine.provider';
import { StreakCalculatorProvider } from './providers/streak-calculator.provider';

@Injectable()
export class SessionGameficationService {
  private readonly logger = new Logger(SessionGameficationService.name);

  constructor(
    private prisma: PrismaService,
    private gamificationEngine: GamificationEngineProvider,
    private streakCalculator: StreakCalculatorProvider,
  ) {}

  async getUserAchievements(userId: string) {
    try {
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
    } catch (error) {
      this.logger.error('Erro ao buscar conquistas:', error);
      throw error;
    }
  }

  async getAvailableAchievements(userId: string) {
    try {
      const userAchievements = await this.prisma.userAchievement.findMany({
        where: { userId },
        select: { achievementId: true },
      });

      const unlockedIds = userAchievements.map(ua => ua.achievementId);

      const availableAchievements = await this.prisma.achievement.findMany({
        where: {
          id: { notIn: unlockedIds },
        },
      });

      return availableAchievements;
    } catch (error) {
      this.logger.error('Erro ao buscar conquistas disponíveis:', error);
      throw error;
    }
  }

  async getLeaderboard(period?: string) {
    try {
      return await this.gamificationEngine.getLeaderboard(period);
    } catch (error) {
      this.logger.error('Erro ao buscar leaderboard:', error);
      throw error;
    }
  }

  async getUserStreak(userId: string) {
    try {
      return await this.streakCalculator.getStreakData(userId);
    } catch (error) {
      this.logger.error('Erro ao calcular streak:', error);
      throw error;
    }
  }

  async checkAchievements(userId: string, sessionData?: any) {
    try {
      return await this.gamificationEngine.checkAndUnlockAchievements(userId, sessionData);
    } catch (error) {
      this.logger.error('Erro ao verificar conquistas:', error);
      throw error;
    }
  }

  async getGameficationDashboard(userId: string) {
    try {
      return await this.gamificationEngine.getUserGameficationData(userId);
    } catch (error) {
      this.logger.error('Erro ao gerar dashboard de gameficação:', error);
      throw error;
    }
  }
}