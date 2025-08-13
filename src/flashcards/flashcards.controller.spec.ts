import { Test, TestingModule } from '@nestjs/testing';
import { FlashcardsController } from './flashcards.controller';
import { FlashcardsService } from './services/flashcards.service';
import { FlashcardReviewService } from './services/flashcard-review.service';
import { FlashcardGenerationService } from './services/flashcard-generation.service';
import { FlashcardType, DifficultyLevel, FlashcardStatus, ReviewResult } from '@prisma/client';
import { CreateFlashcardDto } from './dto/create-flashcard.dto';
import { UpdateFlashcardDto } from './dto/update-flashcard.dto';
import { ReviewFlashcardDto } from './dto/review-flashcard.dto';

describe('FlashcardsController', () => {
  let controller: FlashcardsController;
  let flashcardsService: FlashcardsService;
  let reviewService: FlashcardReviewService;
  let generationService: FlashcardGenerationService;

  const mockFlashcardsService = {
    createFlashcard: jest.fn(),
    getUserFlashcards: jest.fn(),
    getFlashcardById: jest.fn(),
    updateFlashcard: jest.fn(),
    deleteFlashcard: jest.fn(),
    getFlashcardsByTopic: jest.fn(),
  };

  const mockReviewService = {
    reviewFlashcard: jest.fn(),
    getFlashcardsDueForReview: jest.fn(),
    countFlashcardsDue: jest.fn(),
  };

  const mockGenerationService = {
    generateFromSession: jest.fn(),
    generateFlashcards: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FlashcardsController],
      providers: [
        {
          provide: FlashcardsService,
          useValue: mockFlashcardsService,
        },
        {
          provide: FlashcardReviewService,
          useValue: mockReviewService,
        },
        {
          provide: FlashcardGenerationService,
          useValue: mockGenerationService,
        },
      ],
    }).compile();

    controller = module.get<FlashcardsController>(FlashcardsController);
    flashcardsService = module.get<FlashcardsService>(FlashcardsService);
    reviewService = module.get<FlashcardReviewService>(FlashcardReviewService);
    generationService = module.get<FlashcardGenerationService>(FlashcardGenerationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a flashcard', async () => {
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

      mockFlashcardsService.createFlashcard.mockResolvedValue(mockCreatedFlashcard);

      const result = await controller.createFlashcard({ user: { id: userId } } as any, createFlashcardDto);

      expect(mockFlashcardsService.createFlashcard).toHaveBeenCalledWith(userId, createFlashcardDto);
      expect(result).toEqual(mockCreatedFlashcard);
    });
  });

  describe('findAll', () => {
    it('should return paginated flashcards', async () => {
      const userId = 'user-123';
      const mockResponse = {
        flashcards: [
          {
            id: 'flashcard-1',
            userId,
            type: FlashcardType.QUESTION_BASED,
            front: 'Question 1',
            back: 'Answer 1',
            topic: 'Topic 1',
            status: FlashcardStatus.ACTIVE,
            difficultyLevel: DifficultyLevel.MEDIUM,
            createdAt: new Date(),
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      mockFlashcardsService.getUserFlashcards.mockResolvedValue(mockResponse);

      const result = await controller.getUserFlashcards(
        { user: { id: userId } } as any,
        '20',
        '0',
      );

      expect(mockFlashcardsService.getUserFlashcards).toHaveBeenCalledWith(
        userId,
        20,
        0,
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('findOne', () => {
    it('should return a specific flashcard', async () => {
      const userId = 'user-123';
      const flashcardId = 'flashcard-123';
      const mockFlashcard = {
        id: flashcardId,
        userId,
        type: FlashcardType.QUESTION_BASED,
        front: 'Question',
        back: 'Answer',
        topic: 'Topic',
        status: FlashcardStatus.ACTIVE,
        difficultyLevel: DifficultyLevel.MEDIUM,
        createdAt: new Date(),
      };

      mockFlashcardsService.getFlashcardById.mockResolvedValue(mockFlashcard);

      const result = await controller.getFlashcardById({ user: { id: userId } } as any, flashcardId);

      expect(mockFlashcardsService.getFlashcardById).toHaveBeenCalledWith(flashcardId, userId);
      expect(result).toEqual(mockFlashcard);
    });
  });

  describe('update', () => {
    it('should update a flashcard', async () => {
      const userId = 'user-123';
      const flashcardId = 'flashcard-123';
      const updateFlashcardDto: UpdateFlashcardDto = {
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
        difficultyLevel: DifficultyLevel.MEDIUM,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockFlashcardsService.updateFlashcard.mockResolvedValue(mockUpdatedFlashcard);

      const result = await controller.updateFlashcard(
        { user: { id: userId } } as any,
        flashcardId,
        updateFlashcardDto,
      );

      expect(mockFlashcardsService.updateFlashcard).toHaveBeenCalledWith(
        flashcardId,
        userId,
        updateFlashcardDto,
      );
      expect(result).toEqual(mockUpdatedFlashcard);
    });
  });

  describe('remove', () => {
    it('should delete a flashcard', async () => {
      const userId = 'user-123';
      const flashcardId = 'flashcard-123';

      mockFlashcardsService.deleteFlashcard.mockResolvedValue(undefined);

      await controller.deleteFlashcard({ user: { id: userId } } as any, flashcardId);

      expect(mockFlashcardsService.deleteFlashcard).toHaveBeenCalledWith(flashcardId, userId);
    });
  });

  describe('getByTopic', () => {
    it('should return flashcards by topic', async () => {
      const userId = 'user-123';
      const topic = 'Medicine';
      const mockFlashcards = [
        {
          id: 'flashcard-1',
          userId,
          topic,
          type: FlashcardType.QUESTION_BASED,
          front: 'Medical question',
          back: 'Medical answer',
          status: FlashcardStatus.ACTIVE,
          difficultyLevel: DifficultyLevel.MEDIUM,
          createdAt: new Date(),
        },
      ];

      mockFlashcardsService.getFlashcardsByTopic.mockResolvedValue(mockFlashcards);

      const result = await controller.getFlashcardsByTopic({ user: { id: userId } } as any, topic);

      expect(mockFlashcardsService.getFlashcardsByTopic).toHaveBeenCalledWith(userId, topic);
      expect(result).toEqual(mockFlashcards);
    });
  });

  describe('getDueForReview', () => {
    it('should return flashcards due for review', async () => {
      const userId = 'user-123';
      const limit = '10';
      const mockFlashcards = [{ id: 'flashcard-1', front: 'Question 1' }];

      mockReviewService.getFlashcardsDueForReview.mockResolvedValue(mockFlashcards);

      const result = await controller.getFlashcardsDue(
        { user: { id: userId } } as any,
        limit,
      );

      expect(mockReviewService.getFlashcardsDueForReview).toHaveBeenCalledWith(userId, 10);
      expect(result).toEqual(mockFlashcards);
    });
  });

  describe('countDueForReview', () => {
    it('should return count of flashcards due for review', async () => {
      const userId = 'user-123';
      const expectedCount = 5;

      mockReviewService.countFlashcardsDue.mockResolvedValue(expectedCount);

      const result = await controller.countFlashcardsDue(
        { user: { id: userId } } as any,
      );

      expect(mockReviewService.countFlashcardsDue).toHaveBeenCalledWith(userId);
      expect(result).toEqual({ count: expectedCount });
    });
  });

  describe('reviewFlashcard', () => {
    it('should review a flashcard', async () => {
      const userId = 'user-123';
      const flashcardId = 'flashcard-123';
      const reviewDto: ReviewFlashcardDto = {
        result: ReviewResult.GOOD,
        responseTime: 5000,
        confidence: 4,
      };

      const mockReviewResult = {
        flashcard: {
          id: flashcardId,
          userId,
          easeFactor: 2.6,
          interval: 6,
          repetitions: 1,
          nextReviewDate: new Date(),
          status: FlashcardStatus.ACTIVE,
        },
        review: {
          id: 'review-123',
          flashcardId,
          userId,
          result: ReviewResult.GOOD,
          responseTime: 5000,
          confidence: 4,
          reviewedAt: new Date(),
        },
      };

      mockReviewService.reviewFlashcard.mockResolvedValue(mockReviewResult);

      const result = await controller.reviewFlashcard(
        { user: { id: userId } } as any,
        flashcardId,
        reviewDto,
      );

      expect(mockReviewService.reviewFlashcard).toHaveBeenCalledWith(
        flashcardId,
        userId,
        reviewDto,
      );
      expect(result).toEqual(mockReviewResult);
    });
  });

  describe('generateFromSession', () => {
    it('should generate flashcards from a session', async () => {
      const userId = 'user-123';
      const sessionId = 'session-123';
      const count = 5;

      const mockGenerationResult = [
        {
          id: 'flashcard-1',
          userId,
          sessionId,
          front: 'Generated question 1',
          back: 'Generated answer 1',
          topic: 'Topic 1',
          type: FlashcardType.QUESTION_BASED,
          status: FlashcardStatus.PENDING,
        },
        {
          id: 'flashcard-2',
          userId,
          sessionId,
          front: 'Generated question 2',
          back: 'Generated answer 2',
          topic: 'Topic 2',
          type: FlashcardType.QUESTION_BASED,
          status: FlashcardStatus.PENDING,
        },
      ];

      mockGenerationService.generateFromSession.mockResolvedValue(mockGenerationResult);

      const result = await controller.generateFromSession(
        { user: { id: userId } } as any,
        sessionId,
      );

      expect(mockGenerationService.generateFromSession).toHaveBeenCalledWith(
        sessionId,
        userId,
      );
      expect(result).toEqual({
        flashcards: mockGenerationResult,
        count: mockGenerationResult.length,
      });
    });
  });

  describe('generateFromContent', () => {
    it('should generate flashcards from content', async () => {
      const userId = 'user-123';
      const content = 'Educational content about medicine';
      const topic = 'Medicine';
      const count = 3;

      const mockGenerationResult = [
        {
          id: 'flashcard-1',
          userId,
          front: 'Generated question 1',
          back: 'Generated answer 1',
          topic: 'Medicine',
          type: FlashcardType.QUESTION_BASED,
          status: FlashcardStatus.PENDING,
          sourceContent: content,
          sourceType: 'manual',
        },
      ];

      mockGenerationService.generateFlashcards.mockResolvedValue(mockGenerationResult);

      const result = await controller.generateFromContent(
          { user: { id: userId } } as any,
          { content, topic, maxFlashcards: count },
        );

      expect(mockGenerationService.generateFlashcards).toHaveBeenCalledWith({
          sourceContent: content,
          sourceType: 'manual',
          topic: topic,
          maxFlashcards: count,
          userId: userId,
          documentId: undefined,
        });
      expect(result).toEqual({
        flashcards: mockGenerationResult,
        count: mockGenerationResult.length,
      });
    });
  });
});