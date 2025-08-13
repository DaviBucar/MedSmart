import { Test, TestingModule } from '@nestjs/testing';
import { FlashcardReviewService } from './flashcard-review.service';
import { PrismaService } from '../../prisma/prisma.service';
import { FlashcardStatus, ReviewResult } from '@prisma/client';
import { ReviewFlashcardDto } from '../dto/review-flashcard.dto';

describe('FlashcardReviewService', () => {
  let service: FlashcardReviewService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    flashcard: {
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
    },
    flashcardReview: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FlashcardReviewService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<FlashcardReviewService>(FlashcardReviewService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getFlashcardsDueForReview', () => {
    it('should return flashcards due for review', async () => {
      const userId = 'user-123';
      const mockFlashcards = [
        {
          id: 'flashcard-1',
          userId,
          front: 'Question 1',
          back: 'Answer 1',
          topic: 'Topic 1',
          status: FlashcardStatus.ACTIVE,
          nextReviewDate: new Date(),
          easeFactor: 2.5,
          interval: 1,
          repetitions: 0,
        },
        {
          id: 'flashcard-2',
          userId,
          front: 'Question 2',
          back: 'Answer 2',
          topic: 'Topic 2',
          status: FlashcardStatus.PENDING,
          nextReviewDate: new Date(),
          easeFactor: 2.5,
          interval: 1,
          repetitions: 0,
        },
      ];

      mockPrismaService.flashcard.findMany.mockResolvedValue(mockFlashcards);

      const result = await service.getFlashcardsDueForReview(userId, 10);

      expect(mockPrismaService.flashcard.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          status: {
            in: [FlashcardStatus.ACTIVE, FlashcardStatus.PENDING],
          },
          nextReviewDate: {
            lte: expect.any(Date),
          },
        },
        orderBy: {
          nextReviewDate: 'asc',
        },
        take: 10,
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(expect.objectContaining({
        id: 'flashcard-1',
        front: 'Question 1',
      }));
    });
  });

  describe('countFlashcardsDue', () => {
    it('should return count of flashcards due for review', async () => {
      const userId = 'user-123';
      const expectedCount = 5;

      mockPrismaService.flashcard.count.mockResolvedValue(expectedCount);

      const result = await service.countFlashcardsDue(userId);

      expect(mockPrismaService.flashcard.count).toHaveBeenCalledWith({
        where: {
          userId,
          status: {
            in: [FlashcardStatus.ACTIVE, FlashcardStatus.PENDING],
          },
          nextReviewDate: {
            lte: expect.any(Date),
          },
        },
      });

      expect(result).toBe(expectedCount);
    });
  });

  describe('reviewFlashcard', () => {
    it('should review a flashcard with correct answer', async () => {
      const flashcardId = 'flashcard-123';
      const userId = 'user-123';
      const reviewDto: ReviewFlashcardDto = {
        result: ReviewResult.GOOD,
        responseTime: 5000,
        confidence: 4,
      };

      const mockFlashcard = {
        id: flashcardId,
        userId,
        easeFactor: 2.5,
        interval: 1,
        repetitions: 0,
        totalReviews: 0,
        correctReviews: 0,
        averageResponseTime: null,
        status: FlashcardStatus.ACTIVE,
      };

      const mockUpdatedFlashcard = {
        ...mockFlashcard,
        easeFactor: 2.6,
        interval: 6,
        repetitions: 1,
        totalReviews: 1,
        correctReviews: 1,
        averageResponseTime: 5000,
        nextReviewDate: expect.any(Date),
        lastReviewedAt: expect.any(Date),
        lastReviewResult: ReviewResult.GOOD,
        status: FlashcardStatus.ACTIVE,
      };

      mockPrismaService.flashcard.findFirst.mockResolvedValue(mockFlashcard);
      mockPrismaService.flashcard.update.mockResolvedValue(mockUpdatedFlashcard);
      mockPrismaService.flashcardReview.create.mockResolvedValue({
        id: 'review-123',
        flashcardId,
        userId,
        result: ReviewResult.GOOD,
        responseTime: 5000,
        confidence: 4,
        reviewedAt: new Date(),
      });

      const result = await service.reviewFlashcard(flashcardId, userId, reviewDto);

      expect(mockPrismaService.flashcard.findFirst).toHaveBeenCalledWith({
        where: {
          id: flashcardId,
          userId,
        },
      });

      expect(result.flashcardId).toBe(flashcardId);
      expect(result.result).toBe(ReviewResult.GOOD);
    });

    it('should review a flashcard with incorrect answer', async () => {
      const flashcardId = 'flashcard-123';
      const userId = 'user-123';
      const reviewDto: ReviewFlashcardDto = {
        result: ReviewResult.AGAIN,
        responseTime: 10000,
        confidence: 1,
      };

      const mockFlashcard = {
        id: flashcardId,
        userId,
        easeFactor: 2.5,
        interval: 6,
        repetitions: 1,
        totalReviews: 1,
        correctReviews: 1,
        averageResponseTime: 5000,
        status: FlashcardStatus.ACTIVE,
        lastReviewResult: ReviewResult.GOOD,
      };

      const mockUpdatedFlashcard = {
        ...mockFlashcard,
        easeFactor: 2.3,
        interval: 1,
        repetitions: 0,
        totalReviews: 2,
        correctReviews: 1,
        averageResponseTime: 7500,
        nextReviewDate: expect.any(Date),
        lastReviewedAt: expect.any(Date),
        lastReviewResult: ReviewResult.AGAIN,
        status: FlashcardStatus.ACTIVE,
      };

      mockPrismaService.flashcard.findFirst.mockResolvedValue(mockFlashcard);
      mockPrismaService.flashcard.update.mockResolvedValue(mockUpdatedFlashcard);
      mockPrismaService.flashcardReview.create.mockResolvedValue({
        id: 'review-123',
        flashcardId,
        userId,
        result: ReviewResult.AGAIN,
        responseTime: 10000,
        confidence: 1,
        reviewedAt: new Date(),
      });

      const result = await service.reviewFlashcard(flashcardId, userId, reviewDto);

      expect(result.flashcardId).toBe(flashcardId);
      expect(result.result).toBe(ReviewResult.AGAIN);
    });

    it('should throw error when flashcard not found', async () => {
      const flashcardId = 'non-existent';
      const userId = 'user-123';
      const reviewDto: ReviewFlashcardDto = {
        result: ReviewResult.GOOD,
        responseTime: 5000,
      };

      mockPrismaService.flashcard.findFirst.mockResolvedValue(null);

      await expect(service.reviewFlashcard(flashcardId, userId, reviewDto))
        .rejects
        .toThrow('Flashcard não encontrado');
    });
  });
});