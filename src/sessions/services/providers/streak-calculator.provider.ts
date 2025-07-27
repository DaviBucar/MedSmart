import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SessionStatus } from '@prisma/client';

@Injectable()
export class StreakCalculatorProvider {
  constructor(private prisma: PrismaService) {}

  async calculateCurrentStreak(userId: string): Promise<number> {
    const sessions = await this.prisma.studySession.findMany({
      where: { userId, status: SessionStatus.COMPLETED },
      orderBy: { startTime: 'desc' },
      select: { startTime: true },
    });

    if (sessions.length === 0) return 0;

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (const session of sessions) {
      const sessionDate = new Date(session.startTime);
      sessionDate.setHours(0, 0, 0, 0);

      const diffDays = Math.floor((currentDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === streak) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else if (diffDays > streak) {
        break;
      }
    }

    return streak;
  }

  async calculateLongestStreak(userId: string): Promise<number> {
    const sessions = await this.prisma.studySession.findMany({
      where: { userId, status: SessionStatus.COMPLETED },
      orderBy: { startTime: 'asc' },
      select: { startTime: true },
    });

    if (sessions.length === 0) return 0;

    let maxStreak = 0;
    let currentStreak = 1;
    let lastDate = new Date(sessions[0].startTime);
    lastDate.setHours(0, 0, 0, 0);

    for (let i = 1; i < sessions.length; i++) {
      const currentDate = new Date(sessions[i].startTime);
      currentDate.setHours(0, 0, 0, 0);

      const diffDays = Math.floor((currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        currentStreak++;
      } else if (diffDays > 1) {
        maxStreak = Math.max(maxStreak, currentStreak);
        currentStreak = 1;
      }

      lastDate = currentDate;
    }

    return Math.max(maxStreak, currentStreak);
  }

  async getStreakData(userId: string) {
    const [currentStreak, longestStreak] = await Promise.all([
      this.calculateCurrentStreak(userId),
      this.calculateLongestStreak(userId),
    ]);

    return {
      currentStreak,
      longestStreak,
      isOnStreak: currentStreak > 0,
      daysUntilNextMilestone: this.calculateDaysUntilMilestone(currentStreak),
    };
  }

  private calculateDaysUntilMilestone(currentStreak: number): number {
    const milestones = [7, 14, 30, 60, 100, 365];
    const nextMilestone = milestones.find(m => m > currentStreak);
    return nextMilestone ? nextMilestone - currentStreak : 0;
  }
}