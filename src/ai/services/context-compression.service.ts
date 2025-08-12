import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { 
  CompressedUserContext, 
  UserLearningProfile, 
  LearningProfileType,
  AdaptationTag,
  ContextCompressionMetrics 
} from '../interfaces/context-compression.interface';
import { DifficultyLevel } from '@prisma/client';

@Injectable()
export class ContextCompressionService {
  private readonly logger = new Logger(ContextCompressionService.name);
  
  constructor(private prisma: PrismaService) {}

  async compressUserContext(
    userId: string, 
    sessionId?: string
  ): Promise<CompressedUserContext> {
    const startTime = Date.now();
    
    try {
      // Buscar dados essenciais em paralelo
      const [
        userMetrics,
        recentInteractions,
        topicProgress,
        learningProfile,
        currentSession
      ] = await Promise.all([
        this.getUserMetricsCache(userId),
        this.getRecentInteractions(userId, 10),
        this.getCriticalTopicProgress(userId),
        this.getLearningProfile(userId),
        sessionId ? this.getCurrentSession(sessionId) : null
      ]);

      // Comprimir contexto
      const compressedContext: CompressedUserContext = {
        immediate: this.compressImmediateContext(
          recentInteractions, 
          currentSession
        ),
        performance: this.compressPerformanceContext(
          userMetrics, 
          topicProgress
        ),
        profile: this.compressProfileContext(learningProfile)
      };

      // Log métricas de compressão
      const processingTime = Date.now() - startTime;
      this.logCompressionMetrics(userId, processingTime, compressedContext);

      return compressedContext;

    } catch (error) {
      this.logger.error(`Erro ao comprimir contexto para usuário ${userId}:`, error);
      return this.createFallbackContext();
    }
  }

  private async getUserMetricsCache(userId: string) {
    return this.prisma.userMetricsCache.findUnique({
      where: { userId }
    });
  }

  private async getRecentInteractions(userId: string, limit: number) {
    return this.prisma.questionInteraction.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: limit,
      select: {
        isCorrect: true,
        timeToAnswer: true,
        topic: true,
        difficultyLevel: true,
        timestamp: true,
        confidenceLevel: true
      }
    });
  }

  private async getCriticalTopicProgress(userId: string) {
    return this.prisma.topicProgress.findMany({
      where: { userId },
      orderBy: { masteryScore: 'asc' },
      take: 10,
      select: {
        topic: true,
        masteryScore: true,
        totalQuestions: true,
        correctAnswers: true
      }
    });
  }

  private async getLearningProfile(userId: string): Promise<UserLearningProfile | null> {
    // Buscar perfil existente ou criar um novo
    const existingProfile = await this.prisma.userLearningProfile?.findUnique({
      where: { userId }
    });

    if (existingProfile) {
      return existingProfile as UserLearningProfile;
    }

    // Se não existir, inferir perfil baseado no comportamento
    return this.inferLearningProfile(userId);
  }

  private async getCurrentSession(sessionId: string) {
    return this.prisma.studySession.findUnique({
      where: { id: sessionId },
      include: {
        interactions: {
          orderBy: { timestamp: 'desc' },
          take: 5
        }
      }
    });
  }

  private compressImmediateContext(interactions: any[], session: any) {
    const recentAccuracy = interactions.length > 0 
      ? (interactions.filter(i => i.isCorrect).length / interactions.length) * 100
      : 50;

    const avgResponseTime = interactions.length > 0
      ? interactions.reduce((sum, i) => sum + i.timeToAnswer, 0) / interactions.length
      : 30;

    // Calcular fadiga baseado em tempo de sessão e performance
    const currentFatigue = this.calculateFatigueLevel(session, interactions);

    return {
      recentAccuracy: Math.round(recentAccuracy),
      currentFatigue,
      sessionProgress: {
        questionsAnswered: session?.questionsAnswered || 0,
        timeElapsed: session ? this.calculateSessionDuration(session.startTime) : 0
      }
    };
  }

  private compressPerformanceContext(metrics: any, topicProgress: any[]) {
    const overallAccuracy = metrics 
      ? Math.round((metrics.correctAnswers / metrics.totalQuestions) * 100)
      : 50;

    // Identificar tópicos fortes e fracos
    const weakTopics = topicProgress
      .filter(tp => tp.masteryScore < 3)
      .slice(0, 3)
      .map(tp => tp.topic);

    const strongTopics = topicProgress
      .filter(tp => tp.masteryScore >= 7)
      .slice(-3)
      .map(tp => tp.topic);

    return {
      overallAccuracy,
      currentStreak: metrics?.currentStreak || 0,
      learningVelocity: this.calculateLearningVelocity(topicProgress),
      strongTopics,
      weakTopics
    };
  }

  private compressProfileContext(profile: UserLearningProfile | null) {
    if (!profile) {
      return {
        type: LearningProfileType.INTERMEDIATE_AMBITIOUS,
        preferredDifficulty: DifficultyLevel.MEDIUM,
        adaptationNeeds: []
      };
    }

    return {
      type: profile.profileType,
      preferredDifficulty: profile.preferredDifficulty,
      adaptationNeeds: this.generateAdaptationTags(profile)
    };
  }

  private calculateFatigueLevel(session: any, interactions: any[]): number {
    if (!session) return 0;

    const sessionDuration = this.calculateSessionDuration(session.startTime);
    const questionsAnswered = interactions.length;
    
    // Fadiga baseada em duração (0-5 pontos)
    const durationFatigue = Math.min(sessionDuration / 15, 5);
    
    // Fadiga baseada em volume (0-3 pontos)
    const volumeFatigue = Math.min(questionsAnswered / 10, 3);
    
    // Fadiga baseada em performance declinante (0-2 pontos)
    const performanceFatigue = this.calculatePerformanceDecline(interactions);

    return Math.round(durationFatigue + volumeFatigue + performanceFatigue);
  }

  private calculateSessionDuration(startTime: Date): number {
    return Math.round((Date.now() - startTime.getTime()) / (1000 * 60));
  }

  private calculateLearningVelocity(topicProgress: any[]): number {
    if (topicProgress.length === 0) return 0.5;

    const avgMastery = topicProgress.reduce((sum, tp) => sum + tp.masteryScore, 0) / topicProgress.length;
    return Math.min(avgMastery / 10, 1);
  }

  private calculatePerformanceDecline(interactions: any[]): number {
    if (interactions.length < 5) return 0;

    const recent = interactions.slice(0, 3);
    const earlier = interactions.slice(3, 6);

    const recentAccuracy = recent.filter(i => i.isCorrect).length / recent.length;
    const earlierAccuracy = earlier.filter(i => i.isCorrect).length / earlier.length;

    return recentAccuracy < earlierAccuracy ? 2 : 0;
  }

  private generateAdaptationTags(context: any): AdaptationTag[] {
    const tags: AdaptationTag[] = [];

    // Se recebeu um perfil (UserLearningProfile), usar a lógica original
    if (context.learningVelocity !== undefined && context.retentionRate !== undefined) {
      if (context.learningVelocity < 0.3) {
        tags.push(AdaptationTag.CONFIDENCE_LOW);
      }

      if (context.retentionRate < 0.6) {
        tags.push(AdaptationTag.STRUGGLING_CARDIO);
      }

      return tags.slice(0, 3);
    }

    // Se recebeu um contexto comprimido, gerar tags baseadas no contexto
    if (context.immediate && context.performance) {
      // Tags baseadas na fadiga
      if (context.immediate.currentFatigue > 7) {
        tags.push(AdaptationTag.FATIGUE_HIGH);
      }

      // Tags baseadas na performance
      if (context.immediate.recentAccuracy < 50) {
        tags.push(AdaptationTag.CONFIDENCE_LOW);
      }

      // Tags baseadas nos tópicos fracos
      if (context.performance.weakTopics?.includes('Cardiologia')) {
        tags.push(AdaptationTag.STRUGGLING_CARDIO);
      }

      // Tags baseadas na velocidade de aprendizado
      if (context.performance.learningVelocity < 0.5) {
        tags.push(AdaptationTag.SLOW_LEARNER);
      }

      // Tags baseadas na performance geral
      if (context.performance.overallAccuracy > 80) {
        tags.push(AdaptationTag.HIGH_PERFORMER);
      }
    }

    return tags.slice(0, 3); // Máximo 3 tags
  }

  private async inferLearningProfile(userId: string): Promise<UserLearningProfile> {
    // Lógica para inferir perfil baseado no comportamento histórico
    const metrics = await this.getUserMetricsCache(userId);
    const interactions = await this.getRecentInteractions(userId, 50);

    let profileType = LearningProfileType.INTERMEDIATE_AMBITIOUS;
    
    if (metrics && metrics.totalQuestions < 50) {
      profileType = LearningProfileType.BEGINNER_CAUTIOUS;
    } else if (metrics && metrics.overallScore > 85) {
      profileType = LearningProfileType.ADVANCED_PERFECTIONIST;
    }

    return {
      id: '', // Será gerado pelo Prisma
      userId,
      profileType,
      preferredDifficulty: this.inferPreferredDifficulty(interactions),
      optimalSessionDuration: this.inferOptimalDuration(interactions),
      preferredTimeSlots: [],
      learningVelocity: this.calculateLearningVelocity([]),
      retentionRate: 0.7, // Valor padrão
      lastUpdated: new Date()
    };
  }

  private inferPreferredDifficulty(interactions: any[]): DifficultyLevel {
    if (interactions.length === 0) return DifficultyLevel.MEDIUM;

    const difficultyStats = interactions.reduce((acc, interaction) => {
      const level = interaction.difficultyLevel;
      if (!acc[level]) acc[level] = { total: 0, correct: 0 };
      acc[level].total++;
      if (interaction.isCorrect) acc[level].correct++;
      return acc;
    }, {});

    // Encontrar nível com melhor performance (70-80% accuracy)
    let bestLevel: DifficultyLevel = DifficultyLevel.MEDIUM;
    let bestScore = 0;

    Object.entries(difficultyStats).forEach(([level, stats]: [string, any]) => {
      const accuracy = stats.correct / stats.total;
      if (accuracy >= 0.7 && accuracy <= 0.8 && accuracy > bestScore) {
        bestScore = accuracy;
        // Properly cast the string to DifficultyLevel enum
        if (Object.values(DifficultyLevel).includes(level as DifficultyLevel)) {
          bestLevel = level as DifficultyLevel;
        }
      }
    });

    return bestLevel;
  }

  private inferOptimalDuration(interactions: any[]): number {
    // Lógica simplificada - pode ser expandida
    return 30; // 30 minutos padrão
  }

  private createFallbackContext(): CompressedUserContext {
    return {
      immediate: {
        recentAccuracy: 50,
        currentFatigue: 0,
        sessionProgress: {
          questionsAnswered: 0,
          timeElapsed: 0
        }
      },
      performance: {
        overallAccuracy: 50,
        currentStreak: 0,
        learningVelocity: 0.5,
        strongTopics: [],
        weakTopics: []
      },
      profile: {
        type: LearningProfileType.INTERMEDIATE_AMBITIOUS,
        preferredDifficulty: DifficultyLevel.MEDIUM,
        adaptationNeeds: []
      }
    };
  }

  private logCompressionMetrics(
    userId: string, 
    processingTime: number, 
    context: CompressedUserContext
  ) {
    // Estimar tokens (aproximação)
    const estimatedTokens = this.estimateTokenCount(context);
    
    this.logger.log(`Contexto comprimido para ${userId}: ${estimatedTokens} tokens, ${processingTime}ms`);
  }

  private estimateTokenCount(context: CompressedUserContext): number {
    // Estimativa aproximada baseada no conteúdo
    const jsonString = JSON.stringify(context);
    return Math.ceil(jsonString.length / 4); // Aproximação: 4 chars = 1 token
  }
}