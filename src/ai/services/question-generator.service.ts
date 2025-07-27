import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DeepSeekService } from './deepseek.service';
import { 
  QuestionGenerationRequest, 
  GeneratedQuestion, 
  QuestionGenerationResponse,
  UserPerformanceContext,
  AdaptiveLearningMetrics 
} from '../interfaces/question-generation.interface';
import { DifficultyLevel, BloomLevel } from '@prisma/client';

@Injectable()
export class QuestionGeneratorService {
  private readonly logger = new Logger(QuestionGeneratorService.name);

  constructor(
    private prisma: PrismaService,
    private deepSeekService: DeepSeekService,
  ) {}

  async generateAdaptiveQuestion(request: QuestionGenerationRequest): Promise<QuestionGenerationResponse> {
    try {
      this.logger.log(`Gerando questão adaptativa para usuário ${request.userId}`);

      // 1. Analisar contexto do usuário
      const userContext = await this.analyzeUserPerformance(request.userId, request.sessionId);
      
      // 2. Determinar parâmetros adaptativos
      const adaptiveMetrics = await this.calculateAdaptiveLearning(userContext);
      
      // 3. Gerar questão personalizada
      const question = await this.generatePersonalizedQuestion(request, userContext, adaptiveMetrics);
      
      // 4. Preparar resposta com insights
      return {
        question,
        reasoning: this.buildReasoningExplanation(userContext, adaptiveMetrics),
        adaptationNotes: this.buildAdaptationNotes(userContext),
        nextRecommendedDifficulty: adaptiveMetrics.optimalDifficulty,
        suggestedTopics: adaptiveMetrics.recommendedTopics,
      };

    } catch (error) {
      this.logger.error('Erro ao gerar questão adaptativa:', error);
      throw error;
    }
  }

  private async analyzeUserPerformance(userId: string, sessionId: string): Promise<UserPerformanceContext> {
    // Buscar dados da sessão atual
    const currentSession = await this.prisma.studySession.findUnique({
      where: { id: sessionId },
      include: {
        interactions: {
          orderBy: { timestamp: 'desc' },
          take: 10,
        },
      },
    });

    // Buscar histórico recente (últimas 50 interações)
    const recentInteractions = await this.prisma.questionInteraction.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: 50,
    });

    // Buscar progresso por tópico
    const topicProgress = await this.prisma.topicProgress.findMany({
      where: { userId },
      orderBy: { masteryScore: 'asc' },
    });

    // Calcular métricas
    const recentAccuracy = recentInteractions.length > 0 
      ? (recentInteractions.filter(i => i.isCorrect).length / recentInteractions.length) * 100 
      : 50;

    const averageResponseTime = recentInteractions.length > 0
      ? recentInteractions.reduce((sum, i) => sum + i.timeToAnswer, 0) / recentInteractions.length
      : 30;

    const weakTopics = topicProgress
      .filter(tp => tp.masteryScore < 3)
      .map(tp => tp.topic)
      .slice(0, 3);

    const strongTopics = topicProgress
      .filter(tp => tp.masteryScore >= 4)
      .map(tp => tp.topic)
      .slice(0, 3);

    // Calcular nível de fadiga baseado na sessão atual
    const sessionDuration = currentSession?.startTime 
      ? Math.round((new Date().getTime() - currentSession.startTime.getTime()) / (1000 * 60))
      : 0;
    
    const fatigueLevel = this.calculateFatigueLevel(sessionDuration, currentSession?.interactions?.length || 0);

    return {
      recentAccuracy,
      averageResponseTime,
      weakTopics,
      strongTopics,
      preferredDifficulty: this.determinePreferredDifficulty(recentInteractions),
      currentStreak: await this.getCurrentStreak(userId),
      fatigueLevel,
      sessionProgress: {
        questionsAnswered: currentSession?.questionsAnswered || 0,
        correctAnswers: currentSession?.correctAnswers || 0,
        currentSessionDuration: sessionDuration,
      },
    };
  }

  private async calculateAdaptiveLearning(context: UserPerformanceContext): Promise<AdaptiveLearningMetrics> {
    // Determinar dificuldade ótima baseada na performance
    let optimalDifficulty: DifficultyLevel;
    
    if (context.recentAccuracy >= 80) {
      optimalDifficulty = DifficultyLevel.HARD;
    } else if (context.recentAccuracy >= 60) {
      optimalDifficulty = DifficultyLevel.MEDIUM;
    } else {
      optimalDifficulty = DifficultyLevel.EASY;
    }

    // Ajustar por fadiga
    if (context.fatigueLevel > 7) {
      optimalDifficulty = this.reduceDifficulty(optimalDifficulty);
    }

    // Recomendar tópicos baseado em fraquezas e força
    const recommendedTopics = [
      ...context.weakTopics.slice(0, 2), // Focar em pontos fracos
      ...context.strongTopics.slice(0, 1), // Manter pontos fortes
    ];

    return {
      optimalDifficulty,
      recommendedTopics,
      learningVelocity: this.calculateLearningVelocity(context),
      retentionScore: this.calculateRetentionScore(context),
      engagementLevel: this.calculateEngagementLevel(context),
      nextReviewTopics: context.weakTopics,
    };
  }

  private async generatePersonalizedQuestion(
    request: QuestionGenerationRequest,
    context: UserPerformanceContext,
    metrics: AdaptiveLearningMetrics
  ): Promise<GeneratedQuestion> {
    // Determinar tópico da questão
    const topic = request.topic || 
                 (context.weakTopics.length > 0 ? context.weakTopics[0] : 'Medicina Geral');

    // Determinar dificuldade
    const difficulty = request.difficultyLevel || metrics.optimalDifficulty;

    // Determinar nível de Bloom
    const bloomLevel = request.bloomLevel || this.selectOptimalBloomLevel(context, difficulty);

    // Gerar prompt personalizado para a IA
    const prompt = this.buildPersonalizedPrompt(topic, difficulty, bloomLevel, context, metrics);

    // Chamar IA para gerar questão
    const aiResponse = await this.deepSeekService.analyzeText(prompt);

    // Processar resposta da IA
    return this.parseQuestionFromAI(aiResponse, topic, difficulty, bloomLevel);
  }

  private buildPersonalizedPrompt(
    topic: string,
    difficulty: DifficultyLevel,
    bloomLevel: BloomLevel,
    context: UserPerformanceContext,
    metrics: AdaptiveLearningMetrics
  ): string {
    return `
# GERADOR DE QUESTÃO PERSONALIZADA - MEDICINA

## CONTEXTO DO ESTUDANTE:
- **Precisão Recente**: ${context.recentAccuracy.toFixed(1)}%
- **Tempo Médio de Resposta**: ${context.averageResponseTime}s
- **Tópicos Fracos**: ${context.weakTopics.join(', ') || 'Nenhum identificado'}
- **Tópicos Fortes**: ${context.strongTopics.join(', ') || 'Nenhum identificado'}
- **Nível de Fadiga**: ${context.fatigueLevel}/10
- **Questões na Sessão**: ${context.sessionProgress.questionsAnswered}

## PARÂMETROS DA QUESTÃO:
- **Tópico**: ${topic}
- **Dificuldade**: ${difficulty}
- **Nível de Bloom**: ${bloomLevel}
- **Velocidade de Aprendizado**: ${metrics.learningVelocity.toFixed(2)}

## INSTRUÇÕES:
Crie UMA questão de múltipla escolha personalizada que:

1. **Seja adequada ao nível atual** do estudante
2. **Foque no tópico especificado** com contexto médico realista
3. **Tenha dificuldade ${difficulty}** apropriada para a performance atual
4. **Use nível de Bloom ${bloomLevel}** adequadamente
5. **Considere o nível de fadiga** (${context.fatigueLevel}/10)

## FORMATO DE RESPOSTA (JSON):
{
  "question": "Pergunta clara e específica sobre ${topic}",
  "options": [
    "A) Opção correta e precisa",
    "B) Distrator inteligente baseado em erro comum",
    "C) Distrator plausível mas incorreto",
    "D) Distrator obviamente incorreto"
  ],
  "correctAnswer": 0,
  "explanation": "Explicação detalhada da resposta correta",
  "studyTip": "Dica específica para memorizar/compreender este conceito",
  "estimatedTimeSeconds": 45,
  "tags": ["${topic}", "nivel-${difficulty}", "bloom-${bloomLevel}"],
  "context": "Contexto clínico ou situação prática relevante"
}

## DIRETRIZES ESPECÍFICAS:
- **Para fadiga alta (>7)**: Questões mais diretas e conceituais
- **Para precisão baixa (<60%)**: Focar em conceitos fundamentais
- **Para precisão alta (>80%)**: Incluir nuances e casos complexos
- **Sempre**: Usar linguagem médica apropriada e cenários realistas

RESPONDA APENAS COM JSON VÁLIDO.
`;
  }

  private parseQuestionFromAI(aiResponse: any, topic: string, difficulty: DifficultyLevel, bloomLevel: BloomLevel): GeneratedQuestion {
    try {
      // Extrair questão da resposta da IA
      const questionData = typeof aiResponse === 'string' ? JSON.parse(aiResponse) : aiResponse.questions?.[0];
      
      if (!questionData) {
        throw new Error('Resposta da IA não contém questão válida');
      }

      return {
        id: this.generateQuestionId(),
        question: questionData.question,
        type: 'multiple_choice',
        topic,
        difficultyLevel: difficulty,
        bloomLevel,
        options: questionData.options || [],
        correctAnswer: questionData.correctAnswer || 0,
        explanation: questionData.explanation || 'Explicação não disponível',
        studyTip: questionData.studyTip || 'Continue praticando este tópico',
        estimatedTimeSeconds: questionData.estimatedTimeSeconds || 60,
        tags: questionData.tags || [topic, difficulty, bloomLevel],
        context: questionData.context,
      };
    } catch (error) {
      this.logger.error('Erro ao processar resposta da IA:', error);
      
      // Fallback: questão básica
      return this.createFallbackQuestion(topic, difficulty, bloomLevel);
    }
  }

  // Métodos auxiliares
  private calculateFatigueLevel(sessionDuration: number, questionsAnswered: number): number {
    const durationFatigue = Math.min(sessionDuration / 10, 5); // Max 5 pontos por duração
    const volumeFatigue = Math.min(questionsAnswered / 5, 5); // Max 5 pontos por volume
    return Math.round(durationFatigue + volumeFatigue);
  }

  private determinePreferredDifficulty(interactions: any[]): DifficultyLevel {
    if (interactions.length === 0) return DifficultyLevel.MEDIUM;
    
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

    // Encontrar nível com melhor performance (70-80% accuracy)
    let bestLevel: DifficultyLevel = DifficultyLevel.MEDIUM;
    let bestScore = 0;

    Object.entries(difficultyStats).forEach(([level, stats]) => {
      const accuracy = stats.correct / stats.total;
      if (accuracy >= 0.7 && accuracy <= 0.8 && accuracy > bestScore) {
        bestScore = accuracy;
        // Validar se o level é um DifficultyLevel válido antes do cast
        if (Object.values(DifficultyLevel).includes(level as DifficultyLevel)) {
          bestLevel = level as DifficultyLevel;
        }
      }
    });

    return bestLevel;
  }

  private async getCurrentStreak(userId: string): Promise<number> {
    const cache = await this.prisma.userMetricsCache.findUnique({
      where: { userId },
    });
    return cache?.currentStreak || 0;
  }

  private reduceDifficulty(difficulty: DifficultyLevel): DifficultyLevel {
    switch (difficulty) {
      case DifficultyLevel.HARD:
        return DifficultyLevel.MEDIUM;
      case DifficultyLevel.MEDIUM:
        return DifficultyLevel.EASY;
      default:
        return difficulty;
    }
  }

  private selectOptimalBloomLevel(context: UserPerformanceContext, difficulty: DifficultyLevel): BloomLevel {
    if (context.recentAccuracy < 50) {
      return BloomLevel.REMEMBER;
    } else if (context.recentAccuracy < 70) {
      return BloomLevel.UNDERSTAND;
    } else if (difficulty === DifficultyLevel.EASY) {
      return BloomLevel.APPLY;
    } else if (difficulty === DifficultyLevel.MEDIUM) {
      return BloomLevel.ANALYZE;
    } else {
      return BloomLevel.EVALUATE;
    }
  }

  private calculateLearningVelocity(context: UserPerformanceContext): number {
    // Velocidade baseada em precisão e tempo de resposta
    const accuracyFactor = context.recentAccuracy / 100;
    const speedFactor = Math.max(0.1, 1 - (context.averageResponseTime / 120)); // Normalizar para 2 min
    return (accuracyFactor + speedFactor) / 2;
  }

  private calculateRetentionScore(context: UserPerformanceContext): number {
    // Score baseado na consistência da performance
    return Math.min(100, context.recentAccuracy + (context.currentStreak * 2));
  }

  private calculateEngagementLevel(context: UserPerformanceContext): number {
    // Engagement baseado em atividade e performance
    const sessionActivity = Math.min(10, context.sessionProgress.questionsAnswered);
    const performanceBonus = context.recentAccuracy > 70 ? 2 : 0;
    const fatigueReduction = context.fatigueLevel;
    
    return Math.max(1, sessionActivity + performanceBonus - fatigueReduction);
  }

  private buildReasoningExplanation(context: UserPerformanceContext, metrics: AdaptiveLearningMetrics): string {
    return `Questão adaptada baseada em: precisão recente de ${context.recentAccuracy.toFixed(1)}%, 
            nível de fadiga ${context.fatigueLevel}/10, e foco em tópicos com menor domínio. 
            Dificuldade ${metrics.optimalDifficulty} selecionada para otimizar aprendizado.`;
  }

  private buildAdaptationNotes(context: UserPerformanceContext): string {
    const notes: string[] = [];
    
    if (context.fatigueLevel > 7) {
      notes.push('Nível de fadiga alto - questão simplificada');
    }
    
    if (context.recentAccuracy < 60) {
      notes.push('Performance baixa - foco em conceitos fundamentais');
    }
    
    if (context.weakTopics.length > 0) {
      notes.push(`Priorizando tópicos fracos: ${context.weakTopics.join(', ')}`);
    }

    return notes.join('. ') || 'Questão padrão gerada';
  }

  private createFallbackQuestion(topic: string, difficulty: DifficultyLevel, bloomLevel: BloomLevel): GeneratedQuestion {
    return {
      id: this.generateQuestionId(),
      question: `Questão sobre ${topic} - nível ${difficulty}`,
      type: 'multiple_choice',
      topic,
      difficultyLevel: difficulty,
      bloomLevel,
      options: [
        'A) Opção A',
        'B) Opção B', 
        'C) Opção C',
        'D) Opção D'
      ],
      correctAnswer: 0,
      explanation: 'Explicação da questão',
      studyTip: 'Continue estudando este tópico',
      estimatedTimeSeconds: 60,
      tags: [topic, difficulty, bloomLevel],
    };
  }

  private generateQuestionId(): string {
    return `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}