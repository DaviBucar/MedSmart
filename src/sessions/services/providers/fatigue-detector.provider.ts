import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class FatigueDetectorProvider {
  constructor(private prisma: PrismaService) {}

  async detectFatigue(userId: string, sessionId: string) {
    const recentInteractions = await this.prisma.questionInteraction.findMany({
      where: { sessionId },
      orderBy: { timestamp: 'desc' },
      take: 10,
    });

    if (recentInteractions.length < 5) {
      return { fatigueDetected: false, confidence: 0 };
    }

    const historicalStats = await this.getUserHistoricalStats(userId);
    const fatigueScore = this.calculateFatigueScore(recentInteractions, historicalStats);
    
    return {
      fatigueDetected: fatigueScore > 0.7,
      confidence: fatigueScore,
      metrics: this.buildFatigueMetrics(recentInteractions, historicalStats),
      recommendation: this.getFatigueRecommendation(fatigueScore),
    };
  }

  private async getUserHistoricalStats(userId: string) {
    const historicalInteractions = await this.prisma.questionInteraction.findMany({
      where: { session: { userId } },
      take: 100,
      orderBy: { timestamp: 'desc' },
    });

    if (historicalInteractions.length === 0) {
      return { avgAccuracy: 70, avgResponseTime: 30 };
    }

    const avgAccuracy = (historicalInteractions.filter(i => i.isCorrect).length / historicalInteractions.length) * 100;
    const avgResponseTime = historicalInteractions.reduce((sum, i) => sum + i.timeToAnswer, 0) / historicalInteractions.length;

    return { avgAccuracy, avgResponseTime };
  }

  private calculateFatigueScore(interactions: any[], historicalStats: any): number {
    if (interactions.length < 3) return 0;

    let fatigueIndicators = 0;
    const totalIndicators = 4;

    // 1. Aumento no tempo de resposta
    const responseTimes = interactions.map(i => i.timeToAnswer);
    const recentAvg = responseTimes.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
    const olderAvg = responseTimes.slice(-3).reduce((a, b) => a + b, 0) / 3;
    if (recentAvg > olderAvg * 1.3) fatigueIndicators++;

    // 2. Diminuição na precisão
    const recentAccuracy = interactions.slice(0, 3).filter(i => i.isCorrect).length / 3;
    const olderAccuracy = interactions.slice(-3).filter(i => i.isCorrect).length / 3;
    if (recentAccuracy < olderAccuracy * 0.8) fatigueIndicators++;

    // 3. Padrão de erros consecutivos
    const recentErrors = interactions.slice(0, 5).filter(i => !i.isCorrect).length;
    if (recentErrors >= 3) fatigueIndicators++;

    // 4. Uso excessivo de dicas
    const avgHints = interactions.slice(0, 5).reduce((sum, i) => sum + (i.hintsUsed || 0), 0) / 5;
    if (avgHints > 1.5) fatigueIndicators++;

    return fatigueIndicators / totalIndicators;
  }

  private buildFatigueMetrics(recentInteractions: any[], historicalStats: any) {
    const avgResponseTime = recentInteractions.reduce((sum, i) => sum + i.timeToAnswer, 0) / recentInteractions.length;
    const accuracy = (recentInteractions.filter(i => i.isCorrect).length / recentInteractions.length) * 100;
    
    return {
      currentAccuracy: accuracy,
      currentResponseTime: avgResponseTime,
      historicalAccuracy: historicalStats.avgAccuracy,
      historicalResponseTime: historicalStats.avgResponseTime,
      responseTimeIncrease: avgResponseTime > (historicalStats.avgResponseTime * 1.5),
      accuracyDecrease: accuracy < (historicalStats.avgAccuracy * 0.8),
    };
  }

  private getFatigueRecommendation(fatigueScore: number): string {
    if (fatigueScore > 0.8) {
      return 'Recomendamos uma pausa de 15-20 minutos para recuperar o foco';
    } else if (fatigueScore > 0.6) {
      return 'Considere uma pausa breve de 5-10 minutos';
    } else {
      return 'Continue estudando, você está indo bem!';
    }
  }
}