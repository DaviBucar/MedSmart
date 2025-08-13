import { Test, TestingModule } from '@nestjs/testing';
import { FlashcardGenerationService } from './flashcard-generation.service';
import { PrismaService } from '../../prisma/prisma.service';
import { DeepSeekService } from '../../ai/services/deepseek.service';
import { FlashcardType, DifficultyLevel, FlashcardStatus } from '@prisma/client';

describe('FlashcardGenerationService', () => {
  let service: FlashcardGenerationService;
  let prismaService: PrismaService;
  let deepSeekService: DeepSeekService;

  const mockPrismaService = {
    studySession: {
      findFirst: jest.fn(),
    },
    flashcard: {
      create: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockDeepSeekService = {
    generateQuestion: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FlashcardGenerationService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: DeepSeekService,
          useValue: mockDeepSeekService,
        },
      ],
    }).compile();

    service = module.get<FlashcardGenerationService>(FlashcardGenerationService);
    prismaService = module.get<PrismaService>(PrismaService);
    deepSeekService = module.get<DeepSeekService>(DeepSeekService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateFromSession', () => {
    it('should generate flashcards from a study session', async () => {
      const sessionId = 'session-123';
      const userId = 'user-123';

      const mockSession = {
        id: sessionId,
        userId,
        topicsStudied: ['Cardiology'], // Apenas 1 tópico em vez de 2
        summary: 'Study session content about heart',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Fixed: Return string instead of object
      const mockAIResponse = JSON.stringify({
        flashcards: [
          {
            type: 'QUESTION_BASED',
            front: 'What is the main function of the heart?',
            back: 'To pump blood throughout the body',
            topic: 'Cardiology',
            tags: ['heart', 'circulation'],
            difficultyLevel: 'MEDIUM',
          },
        ],
      });

      const mockSavedFlashcards = [
        {
          id: 'flashcard-1',
          userId,
          sessionId,
          type: FlashcardType.QUESTION_BASED,
          front: 'What is the main function of the heart?',
          back: 'To pump blood throughout the body',
          topic: 'Cardiology',
          difficultyLevel: DifficultyLevel.MEDIUM,
          status: FlashcardStatus.PENDING,
          tags: ['heart', 'circulation'],
          createdAt: new Date(),
          updatedAt: new Date(),
          easeFactor: 2.5,
          interval: 1,
          repetitions: 0,
          nextReviewDate: new Date(),
          totalReviews: 0,
          correctReviews: 0,
          averageResponseTime: null,
          lastReviewResult: null,
          lastReviewedAt: null,
          sourceContent: null,
          sourceType: null,
          sourceReference: null,
          documentId: null,
        },
      ];

      mockPrismaService.studySession.findFirst.mockResolvedValue(mockSession);
      mockDeepSeekService.generateQuestion.mockResolvedValue(mockAIResponse);
      mockPrismaService.flashcard.create.mockResolvedValue(mockSavedFlashcards[0]);
      
      const result = await service.generateFromSession(sessionId, userId);

      expect(mockPrismaService.studySession.findFirst).toHaveBeenCalledWith({
        where: {
          id: sessionId,
          userId,
        },
      });

      expect(result).toEqual(mockSavedFlashcards);
    });

    it('should throw error when session not found', async () => {
      const sessionId = 'non-existent';
      const userId = 'user-123';

      mockPrismaService.studySession.findFirst.mockResolvedValue(null);

      await expect(service.generateFromSession(sessionId, userId))
        .rejects
        .toThrow('Sessão não encontrada');
    });

    it('should throw error when session has no topics', async () => {
      const sessionId = 'session-123';
      const userId = 'user-123';

      const mockSession = {
        id: sessionId,
        userId,
        summary: 'Empty session',
        topicsStudied: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.studySession.findFirst.mockResolvedValue(mockSession);

      await expect(service.generateFromSession(sessionId, userId))
        .rejects
        .toThrow('Sessão não possui tópicos para gerar flashcards');
    });
  });

  describe('generateFlashcards', () => {
    it('should generate flashcards from provided request', async () => {
      const request = {
        sourceContent: 'The heart is a muscular organ that pumps blood throughout the body.',
        sourceType: 'manual' as const,
        topic: 'Cardiology',
        difficultyLevel: DifficultyLevel.MEDIUM,
        maxFlashcards: 3,
        userId: 'user-123',
      };

      // Fixed: Return string instead of object
      const mockAIResponse = JSON.stringify({
        flashcards: [
          {
            type: 'QUESTION_BASED',
            front: 'What is the main function of the heart?',
            back: 'To pump blood throughout the body',
            topic: 'Cardiology',
            tags: ['heart', 'circulation'],
            difficultyLevel: 'MEDIUM',
          },
        ],
      });

      const mockSavedFlashcards = [
        {
          id: 'flashcard-1',
          userId: 'user-123',
          sessionId: 'session-123',
          front: 'What is the main function of the heart?',
          back: 'To pump blood throughout the body',
          topic: 'Cardiology',
          status: FlashcardStatus.PENDING,
          difficultyLevel: DifficultyLevel.MEDIUM,
          type: FlashcardType.QUESTION_BASED,
          tags: ['heart', 'circulation'],
          createdAt: new Date(),
          updatedAt: new Date(),
          easeFactor: 2.5,
          interval: 1,
          repetitions: 0,
          nextReviewDate: new Date(),
          totalReviews: 0,
          correctReviews: 0,
          averageResponseTime: null,
          lastReviewResult: null,
          lastReviewedAt: null,
          sourceContent: null,
          sourceType: null,
          sourceReference: null,
          documentId: null,
        },
      ];

      mockDeepSeekService.generateQuestion.mockResolvedValue(mockAIResponse);
      mockPrismaService.flashcard.create.mockResolvedValue(mockSavedFlashcards[0]);

      const result = await service.generateFlashcards(request);

      expect(mockDeepSeekService.generateQuestion).toHaveBeenCalled();
      expect(result).toEqual(mockSavedFlashcards);
    });

    it('should handle AI service errors gracefully', async () => {
      const request = {
        sourceContent: 'Test content',
        sourceType: 'manual' as const,
        topic: 'Test',
        userId: 'user-123',
      };

      mockDeepSeekService.generateQuestion.mockRejectedValue(new Error('AI service error'));

      await expect(service.generateFlashcards(request))
        .rejects
        .toThrow('Falha na geração de flashcards');
    });

    it('should generate flashcards with default values when optional parameters are not provided', async () => {
      const request = {
        sourceContent: 'Basic medical content',
        sourceType: 'manual' as const,
        topic: 'Medicine',
        userId: 'user-123',
      };

      // Fixed: Return string instead of object
      const mockAIResponse = JSON.stringify({
        flashcards: [
          {
            type: 'QUESTION_BASED',
            front: 'What is medicine?',
            back: 'The science of healing',
            topic: 'Medicine',
            tags: ['medicine', 'health'],
            difficultyLevel: 'MEDIUM',
          },
        ],
      });

      const mockSavedFlashcards = [
        {
          id: 'flashcard-1',
          userId: request.userId,
          type: FlashcardType.QUESTION_BASED,
          front: 'What is medicine?',
          back: 'The science of healing',
          topic: 'Medicine',
          difficultyLevel: DifficultyLevel.MEDIUM,
          status: FlashcardStatus.PENDING,
          tags: ['medicine', 'health'],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockDeepSeekService.generateQuestion.mockResolvedValue(mockAIResponse);
      mockPrismaService.flashcard.create.mockResolvedValue(mockSavedFlashcards[0]);

      const result = await service.generateFlashcards(request);

      expect(result).toEqual(mockSavedFlashcards);
    });

    it('should handle empty flashcards response from AI', async () => {
      const request = {
        sourceContent: 'Test content',
        sourceType: 'manual' as const,
        topic: 'Test',
        userId: 'user-123',
      };

      // Fixed: Return string instead of object
      const mockAIResponse = JSON.stringify({
        flashcards: [],
      });

      mockDeepSeekService.generateQuestion.mockResolvedValue(mockAIResponse);

      const result = await service.generateFlashcards(request);

      expect(result).toEqual([]);
    });
  });
});
