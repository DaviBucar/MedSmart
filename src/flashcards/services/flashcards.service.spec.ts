import { Test, TestingModule } from '@nestjs/testing';
import { FlashcardsService } from './flashcards.service';
import { PrismaService } from '../../prisma/prisma.service';
import { FlashcardType, DifficultyLevel, FlashcardStatus } from '@prisma/client';
import { CreateFlashcardDto } from '../dto/create-flashcard.dto';

describe('FlashcardsService', () => {
  let service: FlashcardsService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    flashcard: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(), // Added missing method
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FlashcardsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<FlashcardsService>(FlashcardsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createFlashcard', () => {
    it('should create a flashcard successfully', async () => {
      const userId = 'user-123';
      const createFlashcardDto: CreateFlashcardDto = {
        type: FlashcardType.QUESTION_BASED,
        front: 'What is the capital of Brazil?',
        back: 'Brasília',
        topic: 'Geography',
        difficultyLevel: DifficultyLevel.EASY,
      };

      const mockCreatedFlashcard = {
        id: 'flashcard-123',
        userId,
        ...createFlashcardDto,
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
        sourceContent: null,
        sourceType: null,
        sourceReference: null,
        sessionId: null,
        documentId: null,
      };

      mockPrismaService.flashcard.create.mockResolvedValue(mockCreatedFlashcard);

      const result = await service.createFlashcard(userId, createFlashcardDto);

      expect(mockPrismaService.flashcard.create).toHaveBeenCalledWith({
        data: {
          userId,
          type: createFlashcardDto.type,
          front: createFlashcardDto.front,
          back: createFlashcardDto.back,
          topic: createFlashcardDto.topic,
          difficultyLevel: createFlashcardDto.difficultyLevel,
          status: FlashcardStatus.PENDING,
          tags: createFlashcardDto.tags || [],
          sessionId: createFlashcardDto.sessionId,
          documentId: createFlashcardDto.documentId,
          sourceContent: createFlashcardDto.sourceContent,
          sourceType: createFlashcardDto.sourceType,
          sourceReference: createFlashcardDto.sourceReference,
          // Added spaced repetition fields
          easeFactor: 2.5,
          interval: 1,
          repetitions: 0,
          nextReviewDate: expect.any(Date),
          totalReviews: 0,
          correctReviews: 0,
        },
      });

      expect(result).toEqual(expect.objectContaining({
        id: 'flashcard-123',
        type: FlashcardType.QUESTION_BASED,
        front: 'What is the capital of Brazil?',
        back: 'Brasília',
        topic: 'Geography',
        status: FlashcardStatus.PENDING,
      }));
    });
  });

  describe('getUserFlashcards', () => {
    it('should return user flashcards with default pagination', async () => {
      const userId = 'user-123';
      const mockFlashcards = [
        {
          id: 'flashcard-1',
          userId,
          type: FlashcardType.QUESTION_BASED,
          front: 'Question 1',
          back: 'Answer 1',
          topic: 'Topic 1',
          status: FlashcardStatus.ACTIVE,
          tags: [],
          difficultyLevel: DifficultyLevel.MEDIUM,
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
          sourceContent: null,
          sourceType: null,
          sourceReference: null,
          sessionId: null,
          documentId: null,
        },
      ];

      mockPrismaService.flashcard.findMany.mockResolvedValue(mockFlashcards);

      const result = await service.getUserFlashcards(userId);

      expect(mockPrismaService.flashcard.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        skip: 0,
      });

      expect(result).toEqual([
        expect.objectContaining({
          id: 'flashcard-1',
          front: 'Question 1',
          back: 'Answer 1',
        }),
      ]);
    });

    it('should return user flashcards with custom pagination', async () => {
      const userId = 'user-123';
      const limit = 10;
      const offset = 5;
      const mockFlashcards = [];

      mockPrismaService.flashcard.findMany.mockResolvedValue(mockFlashcards);

      const result = await service.getUserFlashcards(userId, limit, offset);

      expect(mockPrismaService.flashcard.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      });

      expect(result).toEqual([]);
    });
  });

  describe('getFlashcardById', () => {
    it('should return a flashcard by id', async () => {
      const flashcardId = 'flashcard-123';
      const userId = 'user-123';
      const mockFlashcard = {
        id: flashcardId,
        userId,
        type: FlashcardType.QUESTION_BASED,
        front: 'Question',
        back: 'Answer',
        topic: 'Topic',
        status: FlashcardStatus.ACTIVE,
        tags: [],
        difficultyLevel: DifficultyLevel.MEDIUM,
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
        sourceContent: null,
        sourceType: null,
        sourceReference: null,
        sessionId: null,
        documentId: null,
      };

      mockPrismaService.flashcard.findFirst.mockResolvedValue(mockFlashcard);

      const result = await service.getFlashcardById(flashcardId, userId);

      expect(mockPrismaService.flashcard.findFirst).toHaveBeenCalledWith({
        where: {
          id: flashcardId,
          userId,
        },
      });

      expect(result).toEqual(expect.objectContaining({
        id: flashcardId,
        front: 'Question',
        back: 'Answer',
      }));
    });

    it('should throw NotFoundException when flashcard not found', async () => {
      const flashcardId = 'non-existent';
      const userId = 'user-123';

      mockPrismaService.flashcard.findFirst.mockResolvedValue(null);

      await expect(service.getFlashcardById(flashcardId, userId))
        .rejects
        .toThrow('Flashcard não encontrado');
    });
  });

  describe('updateFlashcard', () => {
    it('should update a flashcard successfully', async () => {
      const flashcardId = 'flashcard-123';
      const userId = 'user-123';
      const updateData = {
        front: 'Updated question',
        back: 'Updated answer',
      };

      const mockUpdatedFlashcard = {
        id: flashcardId,
        userId,
        type: FlashcardType.QUESTION_BASED,
        front: 'Updated question',
        back: 'Updated answer',
        topic: 'Topic',
        status: FlashcardStatus.ACTIVE,
        tags: [],
        difficultyLevel: DifficultyLevel.MEDIUM,
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
        sourceContent: null,
        sourceType: null,
        sourceReference: null,
        sessionId: null,
        documentId: null,
      };

      // Mock para verificar se o flashcard existe
      mockPrismaService.flashcard.findFirst.mockResolvedValue(mockUpdatedFlashcard);
      mockPrismaService.flashcard.update.mockResolvedValue(mockUpdatedFlashcard);

      const result = await service.updateFlashcard(flashcardId, userId, updateData);

      expect(mockPrismaService.flashcard.update).toHaveBeenCalledWith({
        where: { id: flashcardId },
        data: updateData,
      });

      expect(result).toEqual(expect.objectContaining({
        front: 'Updated question',
        back: 'Updated answer',
      }));
    });
  });

  describe('deleteFlashcard', () => {
    it('should delete a flashcard successfully', async () => {
      const flashcardId = 'flashcard-123';
      const userId = 'user-123';

      const mockFlashcard = {
        id: flashcardId,
        userId,
      };

      mockPrismaService.flashcard.findFirst.mockResolvedValue(mockFlashcard);
      mockPrismaService.flashcard.delete.mockResolvedValue(mockFlashcard);

      await service.deleteFlashcard(flashcardId, userId);

      expect(mockPrismaService.flashcard.delete).toHaveBeenCalledWith({
        where: { id: flashcardId },
      });
    });

    it('should throw NotFoundException when trying to delete non-existent flashcard', async () => {
      const flashcardId = 'non-existent';
      const userId = 'user-123';

      mockPrismaService.flashcard.findFirst.mockResolvedValue(null);

      await expect(service.deleteFlashcard(flashcardId, userId))
        .rejects
        .toThrow('Flashcard não encontrado');
    });
  });

  describe('getFlashcardsByTopic', () => {
    it('should return flashcards filtered by topic', async () => {
      const userId = 'user-123';
      const topic = 'Medicine';
      const mockFlashcards = [
        {
          id: 'flashcard-1',
          userId,
          type: FlashcardType.QUESTION_BASED,
          front: 'Medical question',
          back: 'Medical answer',
          topic: 'Medicine',
          status: FlashcardStatus.ACTIVE,
          tags: [],
          difficultyLevel: DifficultyLevel.MEDIUM,
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
          sourceContent: null,
          sourceType: null,
          sourceReference: null,
          sessionId: null,
          documentId: null,
        },
      ];

      mockPrismaService.flashcard.findMany.mockResolvedValue(mockFlashcards);

      const result = await service.getFlashcardsByTopic(userId, topic);

      // Fixed expectation to match actual service implementation
      expect(mockPrismaService.flashcard.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          topic: {
            contains: 'Medicine',
            mode: 'insensitive',
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(expect.objectContaining({
        topic: 'Medicine',
        front: 'Medical question',
      }));
    });
  });
});

