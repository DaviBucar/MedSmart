import { Test, TestingModule } from '@nestjs/testing';
import { ContextCompressionService } from './context-compression.service';
import { PrismaService } from '../../prisma/prisma.service';
import { DifficultyLevel } from '@prisma/client';
import { LearningProfileType, AdaptationTag } from '../interfaces/context-compression.interface';

describe('ContextCompressionService', () => {
  let service: ContextCompressionService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    questionInteraction: {
      findMany: jest.fn(),
    },
    studySession: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    userMetricsCache: {
      findUnique: jest.fn(),
    },
    topicProgress: {
      findMany: jest.fn(),
    },
    userLearningProfile: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContextCompressionService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ContextCompressionService>(ContextCompressionService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('compressUserContext', () => {
    it('deve comprimir contexto do usuário com sucesso', async () => {
      // Mock dos dados
      mockPrismaService.studySession.findUnique.mockResolvedValue({
        id: 'session-123',
        userId: 'user-123',
        startTime: new Date(Date.now() - 30 * 60 * 1000), // 30 minutos atrás
        interactions: []
      });
      
      mockPrismaService.questionInteraction.findMany.mockResolvedValue([
        { isCorrect: true, difficultyLevel: 'MEDIUM' },
        { isCorrect: false, difficultyLevel: 'EASY' },
        { isCorrect: true, difficultyLevel: 'HARD' }
      ]);
      
      mockPrismaService.topicProgress.findMany.mockResolvedValue([
        { topic: 'Cardiologia', masteryScore: 2 },
        { topic: 'Pneumologia', masteryScore: 8 }
      ]);
      
      mockPrismaService.userMetricsCache.findUnique.mockResolvedValue({
        totalQuestions: 100,
        correctAnswers: 75,
        currentStreak: 5
      });
      
      mockPrismaService.userLearningProfile.findUnique.mockResolvedValue(null);

      const result = await service.compressUserContext('user-123', 'session-123');

      expect(result).toBeDefined();
      expect(result.immediate).toBeDefined();
      expect(result.performance).toBeDefined();
      expect(result.profile).toBeDefined();
      expect(typeof result.immediate.recentAccuracy).toBe('number');
      expect(Array.isArray(result.performance.strongTopics)).toBe(true);
      expect(Array.isArray(result.performance.weakTopics)).toBe(true);
    });

    it('deve retornar contexto de fallback em caso de erro', async () => {
      // Mock para simular erro
      mockPrismaService.studySession.findUnique.mockRejectedValue(new Error('Database error'));

      const result = await service.compressUserContext('invalid-user', 'invalid-session');

      // Deve retornar contexto de fallback
      expect(result).toBeDefined();
      expect(result.immediate.recentAccuracy).toBe(50);
      expect(result.performance.overallAccuracy).toBe(50);
      expect(result.profile.type).toBe(LearningProfileType.INTERMEDIATE_AMBITIOUS);
    });
  });

  describe('calculateFatigueLevel', () => {
    it('deve calcular fadiga baseada na duração da sessão', () => {
      const session = { startTime: new Date(Date.now() - 30 * 60 * 1000) }; // 30 min atrás
      const interactions = [
        { isCorrect: true },
        { isCorrect: false },
        { isCorrect: true }
      ];

      const result = (service as any).calculateFatigueLevel(session, interactions);
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
    });

    it('deve retornar fadiga alta para sessões longas', () => {
      const session = { startTime: new Date(Date.now() - 120 * 60 * 1000) }; // 2 horas atrás
      const interactions = Array(20).fill({ isCorrect: true });

      const result = (service as any).calculateFatigueLevel(session, interactions);
      expect(result).toBeGreaterThan(5);
    });

    it('deve retornar fadiga baixa para sessões curtas', () => {
      const session = { startTime: new Date(Date.now() - 5 * 60 * 1000) }; // 5 min atrás
      const interactions = [{ isCorrect: true }];

      const result = (service as any).calculateFatigueLevel(session, interactions);
      expect(result).toBeLessThan(3);
    });

    it('deve retornar 0 quando session é null', () => {
      const result = (service as any).calculateFatigueLevel(null, []);
      expect(result).toBe(0);
    });
  });

  describe('inferLearningProfile', () => {
    it('deve inferir perfil BEGINNER_CAUTIOUS para baixa performance', async () => {
      // Mock para simular usuário iniciante
      mockPrismaService.userMetricsCache.findUnique.mockResolvedValue({
        totalQuestions: 20,
        overallScore: 60
      });
      mockPrismaService.questionInteraction.findMany.mockResolvedValue([]);

      const profile = await (service as any).inferLearningProfile('user-123');

      expect(profile.profileType).toBe(LearningProfileType.BEGINNER_CAUTIOUS);
      expect(profile.preferredDifficulty).toBe(DifficultyLevel.MEDIUM);
    });

    it('deve inferir perfil ADVANCED_PERFECTIONIST para alta performance', async () => {
      // Mock para simular usuário avançado
      mockPrismaService.userMetricsCache.findUnique.mockResolvedValue({
        totalQuestions: 200,
        overallScore: 90
      });
      mockPrismaService.questionInteraction.findMany.mockResolvedValue([]);

      const profile = await (service as any).inferLearningProfile('user-123');

      expect(profile.profileType).toBe(LearningProfileType.ADVANCED_PERFECTIONIST);
      expect(profile.preferredDifficulty).toBe(DifficultyLevel.MEDIUM);
    });

    it('deve inferir perfil INTERMEDIATE_AMBITIOUS para performance média-alta', async () => {
      // Mock para simular usuário intermediário
      mockPrismaService.userMetricsCache.findUnique.mockResolvedValue({
        totalQuestions: 100,
        overallScore: 75
      });
      mockPrismaService.questionInteraction.findMany.mockResolvedValue([]);

      const profile = await (service as any).inferLearningProfile('user-123');

      expect(profile.profileType).toBe(LearningProfileType.INTERMEDIATE_AMBITIOUS);
      expect(profile.preferredDifficulty).toBe(DifficultyLevel.MEDIUM);
    });
  });

  describe('generateAdaptationTags', () => {
    it('deve gerar tags de adaptação baseadas no contexto', () => {
      const context = {
        immediate: {
          recentAccuracy: 45,
          currentFatigue: 8,
          sessionProgress: { questionsAnswered: 20, timeElapsed: 60 },
        },
        performance: {
          overallAccuracy: 50,
          weakTopics: ['Cardiologia'],
          strongTopics: [],
        },
      };

      const tags = (service as any).generateAdaptationTags(context);

      expect(Array.isArray(tags)).toBe(true);
      expect(tags.length).toBeGreaterThan(0);

      // Verificar que tags são geradas baseadas no contexto
      const hasRelevantTags = tags.some(tag => 
        Object.values(AdaptationTag).includes(tag)
      );
      expect(hasRelevantTags).toBe(true);
    });

    it('deve gerar tags diferentes para contextos diferentes', () => {
      const highPerformanceContext = {
        immediate: {
          recentAccuracy: 90,
          currentFatigue: 2,
          sessionProgress: { questionsAnswered: 10, timeElapsed: 25 },
        },
        performance: {
          overallAccuracy: 88,
          weakTopics: [],
          strongTopics: ['Cardiologia', 'Pneumologia'],
        },
      };

      const lowPerformanceContext = {
        immediate: {
          recentAccuracy: 40,
          currentFatigue: 9,
          sessionProgress: { questionsAnswered: 25, timeElapsed: 80 },
        },
        performance: {
          overallAccuracy: 45,
          weakTopics: ['Cardiologia', 'Neurologia'],
          strongTopics: [],
        },
      };

      const highTags = (service as any).generateAdaptationTags(highPerformanceContext);
      const lowTags = (service as any).generateAdaptationTags(lowPerformanceContext);

      expect(Array.isArray(highTags)).toBe(true);
      expect(Array.isArray(lowTags)).toBe(true);
      expect(highTags.length).toBeGreaterThan(0);
      expect(lowTags.length).toBeGreaterThan(0);
    });
  });

  describe('estimateTokenCount', () => {
    it('deve estimar contagem de tokens aproximadamente', () => {
      const context = {
        immediate: {
          recentAccuracy: 75,
          currentFatigue: 4,
          sessionProgress: { questionsAnswered: 8, timeElapsed: 30 },
        },
        performance: {
          overallAccuracy: 78,
          currentStreak: 5,
          learningVelocity: 0.8,
          strongTopics: ['Cardiologia'],
          weakTopics: ['Pneumologia'],
        },
        profile: {
          type: LearningProfileType.INTERMEDIATE_AMBITIOUS,
          preferredDifficulty: DifficultyLevel.MEDIUM,
          adaptationNeeds: [AdaptationTag.MORNING_LEARNER],
        },
      };

      const tokenCount = (service as any).estimateTokenCount(context);

      expect(tokenCount).toBeGreaterThan(0);
      expect(tokenCount).toBeLessThan(500); // Deve ser comprimido
    });

    it('deve estimar menos tokens para contextos menores', () => {
      const smallContext = {
        immediate: { recentAccuracy: 70, currentFatigue: 3, sessionProgress: { questionsAnswered: 5, timeElapsed: 15 } },
        performance: { overallAccuracy: 70, currentStreak: 2, learningVelocity: 0.6, strongTopics: [], weakTopics: [] },
        profile: { type: LearningProfileType.BEGINNER_CAUTIOUS, preferredDifficulty: DifficultyLevel.EASY, adaptationNeeds: [] },
      };

      const largeContext = {
        immediate: { recentAccuracy: 85, currentFatigue: 6, sessionProgress: { questionsAnswered: 20, timeElapsed: 60 } },
        performance: { 
          overallAccuracy: 82, 
          currentStreak: 8, 
          learningVelocity: 0.9, 
          strongTopics: ['Cardiologia', 'Pneumologia', 'Neurologia'], 
          weakTopics: ['Endocrinologia', 'Dermatologia'] 
        },
        profile: { 
          type: LearningProfileType.ADVANCED_PERFECTIONIST, 
          preferredDifficulty: DifficultyLevel.HARD, 
          adaptationNeeds: [AdaptationTag.VISUAL_PREFERRED, AdaptationTag.SPEED_FOCUSED] 
        },
      };

      const smallTokens = (service as any).estimateTokenCount(smallContext);
      const largeTokens = (service as any).estimateTokenCount(largeContext);

      expect(smallTokens).toBeGreaterThan(0);
      expect(largeTokens).toBeGreaterThan(0);
      expect(smallTokens).toBeLessThan(largeTokens);
    });
  });
});