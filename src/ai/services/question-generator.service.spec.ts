import { Test, TestingModule } from '@nestjs/testing';
import { QuestionGeneratorService } from './question-generator.service';
import { PrismaService } from '../../prisma/prisma.service';
import { DeepSeekService } from './deepseek.service';
import { ContextCompressionService } from './context-compression.service';
import { BloomLevel, DifficultyLevel } from '@prisma/client';
import { 
  QuestionGenerationRequest, 
  UserPerformanceContext,
  AdaptiveLearningMetrics,
  GeneratedQuestion 
} from '../interfaces/question-generation.interface';
import { CompressedUserContext, LearningProfileType, AdaptationTag } from '../interfaces/context-compression.interface';

describe('QuestionGeneratorService', () => {
  let service: QuestionGeneratorService;
  let prismaService: PrismaService;
  let deepSeekService: DeepSeekService;
  let contextCompressionService: ContextCompressionService;

  const mockPrismaService = {
    studySession: {
      findUnique: jest.fn(),
    },
    questionInteraction: {
      findMany: jest.fn(),
    },
    topicProgress: {
      findMany: jest.fn(),
    },
    userMetricsCache: {
      findUnique: jest.fn(),
    },
  };

  const mockDeepSeekService = {
    generateQuestion: jest.fn(),
  };

  const mockContextCompressionService = {
    compressUserContext: jest.fn(),
  };

  // Helper functions for tests
  const createMockRequest = (overrides: Partial<QuestionGenerationRequest> = {}): QuestionGenerationRequest => {
    return {
      userId: 'user-123',
      sessionId: 'session-456',
      topic: 'Cardiologia',
      difficultyLevel: DifficultyLevel.MEDIUM,
      bloomLevel: BloomLevel.UNDERSTAND,
      ...overrides
    };
  };

  const mockContext: CompressedUserContext = {
    immediate: {
      recentAccuracy: 75,
      currentFatigue: 3,
      sessionProgress: {
        questionsAnswered: 5,
        timeElapsed: 15,
      },
    },
    performance: {
      overallAccuracy: 78,
      currentStreak: 4,
      learningVelocity: 0.7,
      strongTopics: ['Pneumologia'],
      weakTopics: ['Cardiologia'],
    },
    profile: {
      type: LearningProfileType.INTERMEDIATE_AMBITIOUS,
      preferredDifficulty: DifficultyLevel.MEDIUM,
      adaptationNeeds: [AdaptationTag.VISUAL_PREFERRED],
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuestionGeneratorService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: DeepSeekService,
          useValue: mockDeepSeekService,
        },
        {
          provide: ContextCompressionService,
          useValue: mockContextCompressionService,
        },
      ],
    }).compile();

    service = module.get<QuestionGeneratorService>(QuestionGeneratorService);
    prismaService = module.get<PrismaService>(PrismaService);
    deepSeekService = module.get<DeepSeekService>(DeepSeekService);
    contextCompressionService = module.get<ContextCompressionService>(ContextCompressionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('mapBloomToObjective', () => {
    it('should map REMEMBER to correct objective', () => {
      const result = service['mapBloomToObjective'](BloomLevel.REMEMBER);
      expect(result).toBe('Lembrar conceitos fundamentais');
    });

    it('should map UNDERSTAND to correct objective', () => {
      const result = service['mapBloomToObjective'](BloomLevel.UNDERSTAND);
      expect(result).toBe('Compreender e explicar');
    });

    it('should map APPLY to correct objective', () => {
      const result = service['mapBloomToObjective'](BloomLevel.APPLY);
      expect(result).toBe('Aplicar conhecimento na prática');
    });

    it('should map ANALYZE to correct objective', () => {
      const result = service['mapBloomToObjective'](BloomLevel.ANALYZE);
      expect(result).toBe('Analisar e comparar');
    });

    it('should map EVALUATE to correct objective', () => {
      const result = service['mapBloomToObjective'](BloomLevel.EVALUATE);
      expect(result).toBe('Avaliar e julgar');
    });

    it('should map CREATE to correct objective', () => {
      const result = service['mapBloomToObjective'](BloomLevel.CREATE);
      expect(result).toBe('Criar e sintetizar');
    });

    it('should return default for unknown bloom level', () => {
      const result = service['mapBloomToObjective']('UNKNOWN' as BloomLevel);
      expect(result).toBe('Objetivo de aprendizado');
    });
  });

  describe('buildQuestionTemplate', () => {
    it('should return valid JSON template string', () => {
      const template = service['buildQuestionTemplate']();
      
      expect(template).toContain('"question"');
      expect(template).toContain('"options"');
      expect(template).toContain('"correctAnswer"');
      expect(template).toContain('"explanation"');
      expect(template).toContain('"studyTip"');
      expect(template).toContain('"estimatedTimeSeconds"');
      expect(template).toContain('"tags"');
      expect(template).toContain('"context"');
    });

    it('should contain medical-specific instructions', () => {
      const template = service['buildQuestionTemplate']();
      
      expect(template).toContain('médica');
      expect(template).toContain('clínico');
      expect(template).toContain('clinicamente relevante');
      expect(template).toContain('prática médica');
    });

    it('should specify JSON format requirements', () => {
      const template = service['buildQuestionTemplate']();
      
      expect(template).toContain('JSON válido');
      expect(template).toContain('sem texto adicional');
    });
  });

  describe('selectOptimalBloomLevel', () => {
    it('should select REMEMBER for low accuracy', () => {
      const context: UserPerformanceContext = {
        recentAccuracy: 40,
        averageResponseTime: 90,
        weakTopics: ['Cardiologia'],
        strongTopics: [],
        preferredDifficulty: DifficultyLevel.EASY,
        currentStreak: 1,
        fatigueLevel: 6,
        sessionProgress: {
          questionsAnswered: 5,
          correctAnswers: 2,
          currentSessionDuration: 450,
        },
      };

      const result = service['selectOptimalBloomLevel'](context, DifficultyLevel.MEDIUM);
      expect(result).toBe(BloomLevel.REMEMBER);
    });

    it('should select UNDERSTAND for medium-low accuracy', () => {
      const context: UserPerformanceContext = {
        recentAccuracy: 60,
        averageResponseTime: 75,
        weakTopics: ['Pneumologia'],
        strongTopics: [],
        preferredDifficulty: DifficultyLevel.MEDIUM,
        currentStreak: 3,
        fatigueLevel: 4,
        sessionProgress: {
          questionsAnswered: 8,
          correctAnswers: 5,
          currentSessionDuration: 600,
        },
      };

      const result = service['selectOptimalBloomLevel'](context, DifficultyLevel.HARD);
      expect(result).toBe(BloomLevel.UNDERSTAND);
    });

    it('should select APPLY for easy difficulty with good accuracy', () => {
      const context: UserPerformanceContext = {
        recentAccuracy: 75,
        averageResponseTime: 60,
        weakTopics: [],
        strongTopics: ['Cardiologia'],
        preferredDifficulty: DifficultyLevel.EASY,
        currentStreak: 5,
        fatigueLevel: 3,
        sessionProgress: {
          questionsAnswered: 10,
          correctAnswers: 7,
          currentSessionDuration: 600,
        },
      };

      const result = service['selectOptimalBloomLevel'](context, DifficultyLevel.EASY);
      expect(result).toBe(BloomLevel.APPLY);
    });

    it('should select ANALYZE for medium difficulty with good accuracy', () => {
      const context: UserPerformanceContext = {
        recentAccuracy: 80,
        averageResponseTime: 55,
        weakTopics: [],
        strongTopics: ['Cardiologia'],
        preferredDifficulty: DifficultyLevel.MEDIUM,
        currentStreak: 6,
        fatigueLevel: 3,
        sessionProgress: {
          questionsAnswered: 12,
          correctAnswers: 10,
          currentSessionDuration: 660,
        },
      };

      const result = service['selectOptimalBloomLevel'](context, DifficultyLevel.MEDIUM);
      expect(result).toBe(BloomLevel.ANALYZE);
    });

    it('should select EVALUATE for hard difficulty with good accuracy', () => {
      const context: UserPerformanceContext = {
        recentAccuracy: 85,
        averageResponseTime: 45,
        weakTopics: [],
        strongTopics: ['Cardiologia'],
        preferredDifficulty: DifficultyLevel.HARD,
        currentStreak: 8,
        fatigueLevel: 2,
        sessionProgress: {
          questionsAnswered: 15,
          correctAnswers: 13,
          currentSessionDuration: 900,
        },
      };

      const result = service['selectOptimalBloomLevel'](context, DifficultyLevel.HARD);
      expect(result).toBe(BloomLevel.EVALUATE);
    });
  });

  describe('calculateLearningVelocity', () => {
    it('should calculate velocity based on accuracy and response time', () => {
      const context: UserPerformanceContext = {
        recentAccuracy: 80,
        averageResponseTime: 60,
        weakTopics: [],
        strongTopics: [],
        preferredDifficulty: DifficultyLevel.MEDIUM,
        currentStreak: 5,
        fatigueLevel: 3,
        sessionProgress: {
          questionsAnswered: 10,
          correctAnswers: 8,
          currentSessionDuration: 600,
        },
      };

      const result = service['calculateLearningVelocity'](context);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(1);
    });

    it('should return higher velocity for better performance', () => {
      const highPerformanceContext: UserPerformanceContext = {
        recentAccuracy: 90,
        averageResponseTime: 30,
        weakTopics: [],
        strongTopics: ['Cardiologia'],
        preferredDifficulty: DifficultyLevel.HARD,
        currentStreak: 10,
        fatigueLevel: 1,
        sessionProgress: {
          questionsAnswered: 15,
          correctAnswers: 14,
          currentSessionDuration: 450,
        },
      };

      const lowPerformanceContext: UserPerformanceContext = {
        recentAccuracy: 50,
        averageResponseTime: 120,
        weakTopics: ['Cardiologia'],
        strongTopics: [],
        preferredDifficulty: DifficultyLevel.EASY,
        currentStreak: 1,
        fatigueLevel: 8,
        sessionProgress: {
          questionsAnswered: 10,
          correctAnswers: 5,
          currentSessionDuration: 1200,
        },
      };

      const highVelocity = service['calculateLearningVelocity'](highPerformanceContext);
      const lowVelocity = service['calculateLearningVelocity'](lowPerformanceContext);

      expect(highVelocity).toBeGreaterThan(lowVelocity);
    });
  });

  describe('calculateRetentionScore', () => {
    it('should calculate retention based on accuracy and streak', () => {
      const context: UserPerformanceContext = {
        recentAccuracy: 75,
        averageResponseTime: 60,
        weakTopics: [],
        strongTopics: [],
        preferredDifficulty: DifficultyLevel.MEDIUM,
        currentStreak: 5,
        fatigueLevel: 3,
        sessionProgress: {
          questionsAnswered: 10,
          correctAnswers: 7,
          currentSessionDuration: 600,
        },
      };

      const result = service['calculateRetentionScore'](context);
      expect(result).toBe(85); // 75 + (5 * 2)
    });

    it('should cap retention score at 100', () => {
      const context: UserPerformanceContext = {
        recentAccuracy: 95,
        averageResponseTime: 30,
        weakTopics: [],
        strongTopics: [],
        preferredDifficulty: DifficultyLevel.HARD,
        currentStreak: 10,
        fatigueLevel: 1,
        sessionProgress: {
          questionsAnswered: 20,
          correctAnswers: 19,
          currentSessionDuration: 600,
        },
      };

      const result = service['calculateRetentionScore'](context);
      expect(result).toBe(100);
    });
  });

  describe('calculateEngagementLevel', () => {
    it('should calculate engagement based on activity and performance', () => {
      const context: UserPerformanceContext = {
        recentAccuracy: 80,
        averageResponseTime: 60,
        weakTopics: [],
        strongTopics: [],
        preferredDifficulty: DifficultyLevel.MEDIUM,
        currentStreak: 5,
        fatigueLevel: 3,
        sessionProgress: {
          questionsAnswered: 8,
          correctAnswers: 6,
          currentSessionDuration: 480,
        },
      };

      const result = service['calculateEngagementLevel'](context);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(10);
    });

    it('should reduce engagement for high fatigue', () => {
      const highFatigueContext: UserPerformanceContext = {
        recentAccuracy: 80,
        averageResponseTime: 60,
        weakTopics: [],
        strongTopics: [],
        preferredDifficulty: DifficultyLevel.MEDIUM,
        currentStreak: 5,
        fatigueLevel: 9,
        sessionProgress: {
          questionsAnswered: 8,
          correctAnswers: 6,
          currentSessionDuration: 480,
        },
      };

      const lowFatigueContext: UserPerformanceContext = {
        ...highFatigueContext,
        fatigueLevel: 2,
      };

      const highFatigueEngagement = service['calculateEngagementLevel'](highFatigueContext);
      const lowFatigueEngagement = service['calculateEngagementLevel'](lowFatigueContext);

      expect(lowFatigueEngagement).toBeGreaterThan(highFatigueEngagement);
    });
  });

  describe('buildReasoningExplanation', () => {
    it('should build explanation with context and metrics', () => {
      const context: UserPerformanceContext = {
        recentAccuracy: 75.5,
        averageResponseTime: 60,
        weakTopics: [],
        strongTopics: [],
        preferredDifficulty: DifficultyLevel.MEDIUM,
        currentStreak: 5,
        fatigueLevel: 4,
        sessionProgress: {
          questionsAnswered: 10,
          correctAnswers: 7,
          currentSessionDuration: 600,
        },
      };

      const metrics: AdaptiveLearningMetrics = {
        optimalDifficulty: DifficultyLevel.MEDIUM,
        recommendedTopics: ['Cardiologia'],
        learningVelocity: 0.8,
        retentionScore: 85,
        engagementLevel: 7,
        nextReviewTopics: ['Pneumologia'],
      };

      const result = service['buildReasoningExplanation'](context, metrics);
      
      expect(result).toContain('75.5%');
      expect(result).toContain('4/10');
      expect(result).toContain('menor domínio');
    });
  });

  describe('buildAdaptationNotes', () => {
    it('should include fatigue note for high fatigue', () => {
      const context: UserPerformanceContext = {
        recentAccuracy: 70,
        averageResponseTime: 60,
        weakTopics: [],
        strongTopics: [],
        preferredDifficulty: DifficultyLevel.MEDIUM,
        currentStreak: 3,
        fatigueLevel: 8,
        sessionProgress: {
          questionsAnswered: 10,
          correctAnswers: 7,
          currentSessionDuration: 600,
        },
      };

      const result = service['buildAdaptationNotes'](context);
      expect(result).toContain('Nível de fadiga alto - questão simplificada');
    });

    it('should include performance note for low accuracy', () => {
      const context: UserPerformanceContext = {
        recentAccuracy: 45,
        averageResponseTime: 60,
        weakTopics: ['Cardiologia'],
        strongTopics: [],
        preferredDifficulty: DifficultyLevel.EASY,
        currentStreak: 1,
        fatigueLevel: 3,
        sessionProgress: {
          questionsAnswered: 10,
          correctAnswers: 4,
          currentSessionDuration: 600,
        },
      };

      const result = service['buildAdaptationNotes'](context);
      expect(result).toContain('Performance baixa');
      expect(result).toContain('conceitos fundamentais');
    });

    it('should include weak topics note', () => {
      const context: UserPerformanceContext = {
        recentAccuracy: 70,
        averageResponseTime: 60,
        weakTopics: ['Cardiologia', 'Pneumologia'],
        strongTopics: [],
        preferredDifficulty: DifficultyLevel.MEDIUM,
        currentStreak: 3,
        fatigueLevel: 3,
        sessionProgress: {
          questionsAnswered: 10,
          correctAnswers: 7,
          currentSessionDuration: 600,
        },
      };

      const result = service['buildAdaptationNotes'](context);
      expect(result).toContain('Priorizando tópicos fracos');
      expect(result).toContain('Cardiologia, Pneumologia');
    });
  });

  describe('createFallbackQuestion', () => {
    it('should create fallback question with correct structure', () => {
      const result = service['createFallbackQuestion'](
        'Cardiologia',
        DifficultyLevel.MEDIUM,
        BloomLevel.UNDERSTAND
      );

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('question');
      expect(result).toHaveProperty('type', 'multiple_choice');
      expect(result).toHaveProperty('topic', 'Cardiologia');
      expect(result).toHaveProperty('difficultyLevel', DifficultyLevel.MEDIUM);
      expect(result).toHaveProperty('bloomLevel', BloomLevel.UNDERSTAND);
      expect(result).toHaveProperty('options');
      expect(result).toHaveProperty('correctAnswer');
      expect(result).toHaveProperty('explanation');
      expect(result).toHaveProperty('studyTip');
      expect(result).toHaveProperty('estimatedTimeSeconds');
      expect(result).toHaveProperty('tags');

      expect(Array.isArray(result.options)).toBe(true);
      if (result.options) {
        expect(result.options.length).toBe(4);
      }
      expect(Array.isArray(result.tags)).toBe(true);
      expect(result.tags).toContain('Cardiologia');
      expect(result.tags).toContain(DifficultyLevel.MEDIUM);
      expect(result.tags).toContain(BloomLevel.UNDERSTAND);
    });
  });

  describe('generateAdaptiveQuestion - Integration', () => {
    it('should generate question successfully with all components', async () => {
      const request: QuestionGenerationRequest = {
        userId: 'user-123',
        sessionId: 'session-456',
        topic: 'Cardiologia',
        difficultyLevel: DifficultyLevel.MEDIUM,
        bloomLevel: BloomLevel.UNDERSTAND,
      };

      const mockCompressedContext: CompressedUserContext = {
        immediate: {
          recentAccuracy: 75,
          currentFatigue: 3,
          sessionProgress: {
            questionsAnswered: 5,
            timeElapsed: 15,
          },
        },
        performance: {
          overallAccuracy: 78,
          currentStreak: 4,
          learningVelocity: 0.7,
          strongTopics: ['Pneumologia'],
          weakTopics: ['Cardiologia'],
        },
        profile: {
          type: LearningProfileType.INTERMEDIATE_AMBITIOUS,
          preferredDifficulty: DifficultyLevel.MEDIUM,
          adaptationNeeds: [AdaptationTag.VISUAL_PREFERRED],
        },
      };

      const mockAIResponse = {
        question: 'Qual é o principal sintoma da insuficiência cardíaca?',
        options: ['Dispneia', 'Cefaleia', 'Náusea', 'Tontura'],
        correctAnswer: 0,
        explanation: 'A dispneia é o sintoma mais comum da insuficiência cardíaca.',
        studyTip: 'Lembre-se dos sinais e sintomas cardiovasculares.',
        estimatedTimeSeconds: 60,
        tags: ['cardiologia', 'insuficiencia-cardiaca'],
        context: 'Paciente de 65 anos com histórico de hipertensão.',
      };

      // Mock das dependências
      mockPrismaService.studySession.findUnique.mockResolvedValue({
        id: 'session-456',
        userId: 'user-123',
        studyGoal: 'EXAM_PREP',
        interactions: [],
        questionsAnswered: 0,
        correctAnswers: 0,
        startTime: new Date(),
      });
      mockPrismaService.questionInteraction.findMany.mockResolvedValue([]);
      mockPrismaService.topicProgress.findMany.mockResolvedValue([]);
      mockPrismaService.userMetricsCache.findUnique.mockResolvedValue(null);
      mockContextCompressionService.compressUserContext.mockResolvedValue(mockCompressedContext);
      mockDeepSeekService.generateQuestion.mockResolvedValue(mockAIResponse);

      const result = await service.generateAdaptiveQuestion(request);

      expect(result).not.toBeNull();
      expect(result).toHaveProperty('question');
      expect(result).toHaveProperty('reasoning');
      expect(result).toHaveProperty('adaptationNotes');
      expect(result).toHaveProperty('nextRecommendedDifficulty');
      expect(result).toHaveProperty('suggestedTopics');

      // Verificar se result não é null antes de acessar suas propriedades
      if (result) {
        expect(result.question.topic).toBe('Cardiologia');
        expect(result.question.difficultyLevel).toBe(DifficultyLevel.MEDIUM);
        expect(result.question.bloomLevel).toBe(BloomLevel.UNDERSTAND);
      }

      expect(mockContextCompressionService.compressUserContext).toHaveBeenCalledWith(
        'user-123',
        'session-456'
      );
      expect(mockDeepSeekService.generateQuestion).toHaveBeenCalled();
    });

    it('should handle AI service failure gracefully', async () => {
      const request = createMockRequest();
      
      // Mock das dependências básicas
      mockPrismaService.studySession.findUnique.mockResolvedValue({
        id: 'session-456',
        userId: 'user-123',
        studyGoal: 'EXAM_PREP',
        interactions: [],
        questionsAnswered: 0,
        correctAnswers: 0,
        startTime: new Date(),
      });
      mockPrismaService.questionInteraction.findMany.mockResolvedValue([]);
      mockPrismaService.topicProgress.findMany.mockResolvedValue([]);
      mockPrismaService.userMetricsCache.findUnique.mockResolvedValue(null);
      mockContextCompressionService.compressUserContext.mockResolvedValue(mockContext);
      
      // Mock the rejection properly
      mockDeepSeekService.generateQuestion.mockRejectedValue(new Error('API Error'));

      const result = await service.generateAdaptiveQuestion(request);

      expect(result).toBeNull();
      expect(mockDeepSeekService.generateQuestion).toHaveBeenCalled();
    });
  });
});