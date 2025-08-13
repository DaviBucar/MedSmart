import { Test, TestingModule } from '@nestjs/testing';
import { FlashcardGenerationService } from './flashcard-generation.service';
import { PrismaService } from '../../prisma/prisma.service';
import { DeepSeekService } from '../../ai/services/deepseek.service';
import { AICacheService } from '../../ai/services/ai-cache.service'; // Adicionar import
import { ConfigService } from '@nestjs/config'; // Adicionar import
import { FlashcardType, DifficultyLevel, FlashcardStatus } from '@prisma/client';
import { AppConfigModule } from '../../config/config.module'; // Corrigir import

// Teste de integração com IA real - executar apenas quando necessário
describe('FlashcardGenerationService - Integration Tests', () => {
  let service: FlashcardGenerationService;
  let deepSeekService: DeepSeekService;
  let prismaService: PrismaService;

  // Adicionar mockPrismaService
  const mockPrismaService = {
    flashcard: {
      create: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppConfigModule], // Corrigir nome do módulo
      providers: [
        FlashcardGenerationService,
        DeepSeekService,
        AICacheService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('mock-api-key'),
          },
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<FlashcardGenerationService>(FlashcardGenerationService);
    deepSeekService = module.get<DeepSeekService>(DeepSeekService); // Adicionar esta linha
    prismaService = module.get<PrismaService>(PrismaService);
  });

  // Marcar como skip por padrão para evitar chamadas desnecessárias à IA
  describe.skip('Real AI Integration', () => {
    it('should generate flashcards from medical content using real AI', async () => {
      const request = {
        sourceContent: `
          O sistema cardiovascular é composto pelo coração e pelos vasos sanguíneos.
          O coração é um órgão muscular que bombeia sangue através do corpo.
          As artérias transportam sangue oxigenado do coração para os tecidos.
          As veias retornam sangue desoxigenado dos tecidos para o coração.
          Os capilares são vasos microscópicos onde ocorrem as trocas gasosas.
        `,
        sourceType: 'manual' as const,
        topic: 'Sistema Cardiovascular',
        maxFlashcards: 3,
        userId: 'test-user-integration',
      };

      // Mock do Prisma para não salvar no banco durante o teste
      const mockFlashcard = {
        id: 'test-flashcard',
        userId: request.userId,
        type: FlashcardType.QUESTION_BASED,
        front: 'Generated question',
        back: 'Generated answer',
        topic: request.topic,
        difficultyLevel: DifficultyLevel.MEDIUM,
        status: FlashcardStatus.PENDING,
        tags: [],
        easeFactor: 2.5,
        interval: 1,
        repetitions: 0,
        nextReviewDate: new Date(),
        totalReviews: 0,
        correctReviews: 0,
        averageResponseTime: null,
        lastReviewResult: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastReviewedAt: null,
        sourceContent: request.sourceContent,
        sourceType: request.sourceType,
        sourceReference: null,
        sessionId: null,
        documentId: null,
      };

      jest.spyOn(prismaService.flashcard, 'create').mockResolvedValue(mockFlashcard);

      const result = await service.generateFlashcards(request);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(result.length).toBeLessThanOrEqual(request.maxFlashcards);
      
      // Verificar se os flashcards gerados têm conteúdo relevante
      result.forEach(flashcard => {
        expect(flashcard.front).toBeTruthy();
        expect(flashcard.back).toBeTruthy();
        expect(flashcard.topic).toBe(request.topic);
        expect(flashcard.front.length).toBeGreaterThan(10);
        expect(flashcard.back.length).toBeGreaterThan(10);
      });

      console.log('Generated flashcards:', result.map(f => ({
        front: f.front,
        back: f.back,
        topic: f.topic
      })));
    }, 30000); // Timeout de 30 segundos para chamadas de IA

    it('should handle AI service errors gracefully', async () => {
      const request = {
        sourceContent: 'Invalid content that might cause AI errors',
        sourceType: 'manual' as const,
        topic: 'Test Topic',
        userId: 'test-user-error',
      };

      // Corrigir: deepSeekService agora está definido
      jest.spyOn(deepSeekService, 'generateQuestion')
        .mockRejectedValueOnce(new Error('AI Service Unavailable'));

      await expect(service.generateFlashcards(request))
        .rejects
        .toThrow('Falha na geração de flashcards');
    });

    it('should validate AI response format', async () => {
      const request = {
        sourceContent: 'Test content for validation',
        sourceType: 'manual' as const,
        topic: 'Validation Test',
        userId: 'test-user-validation',
      };

      // Mock resposta inválida da IA
      jest.spyOn(deepSeekService, 'generateQuestion')
        .mockResolvedValueOnce('Invalid JSON response');

      await expect(service.generateFlashcards(request))
        .rejects
        .toThrow('Falha na geração de flashcards');
    });
  });

  describe('Performance Tests', () => {
    it('should handle large content efficiently', async () => {
      const largeContent = 'Lorem ipsum '.repeat(1000); // ~11KB de texto
      
      const request = {
        sourceContent: largeContent,
        sourceType: 'manual' as const,
        topic: 'Performance Test',
        maxFlashcards: 5,
        userId: 'test-user-performance',
      };

      const mockFlashcard = {
        id: 'perf-test',
        userId: request.userId,
        type: FlashcardType.QUESTION_BASED,
        front: 'Performance question',
        back: 'Performance answer',
        topic: request.topic,
        difficultyLevel: DifficultyLevel.MEDIUM,
        status: FlashcardStatus.PENDING,
        tags: [],
        easeFactor: 2.5,
        interval: 1,
        repetitions: 0,
        nextReviewDate: new Date(),
        totalReviews: 0,
        correctReviews: 0,
        averageResponseTime: null,
        lastReviewResult: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastReviewedAt: null,
        sourceContent: request.sourceContent,
        sourceType: request.sourceType,
        sourceReference: null,
        sessionId: null,
        documentId: null,
      };

      jest.spyOn(prismaService.flashcard, 'create').mockResolvedValue(mockFlashcard);
      jest.spyOn(deepSeekService, 'generateQuestion')
        .mockResolvedValue(JSON.stringify([{
          front: 'Performance question',
          back: 'Performance answer',
          topic: request.topic,
          difficulty: 'MEDIUM'
        }]));

      const startTime = Date.now();
      const result = await service.generateFlashcards(request);
      const endTime = Date.now();

      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(10000); // Menos de 10 segundos
    });
  });
});