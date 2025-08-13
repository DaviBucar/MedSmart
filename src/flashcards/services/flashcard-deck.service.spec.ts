import { Test, TestingModule } from '@nestjs/testing';
import { FlashcardDeckService } from './flashcard-deck.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { CreateDeckDto } from '../dto/create-deck.dto';
import { UpdateDeckDto } from '../dto/update-deck.dto';
import { AddToDeckDto } from '../dto/add-to-deck.dto';
import { FlashcardType, DifficultyLevel, FlashcardStatus } from '@prisma/client';

describe('FlashcardDeckService', () => {
  let service: FlashcardDeckService;
  let prismaService: PrismaService;

  // Corrigir a estrutura do mockPrismaService
  const mockPrismaService = {
    flashcardDeck: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    flashcardDeckItem: {
      create: jest.fn(),
      findFirst: jest.fn(),
      deleteMany: jest.fn(),
      aggregate: jest.fn().mockResolvedValue({
        _count: { flashcardId: 5 }
      }),
      count: jest.fn(),
      delete: jest.fn(),
    },
    flashcard: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  const mockDeck = {
    id: 'deck-123',
    userId: 'user-123',
    name: 'Test Deck',
    description: 'Test Description',
    color: '#3B82F6',
    isPublic: false,
    allowSharing: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    flashcards: [],
  };

  const mockFlashcard = {
    id: 'flashcard-123',
    userId: 'user-123',
    type: FlashcardType.QUESTION_BASED,
    front: 'Test Question',
    back: 'Test Answer',
    topic: 'Test Topic',
    difficultyLevel: DifficultyLevel.MEDIUM,
    status: FlashcardStatus.PENDING,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FlashcardDeckService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<FlashcardDeckService>(FlashcardDeckService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createDeck', () => {
    it('should create a deck successfully', async () => {
      const userId = 'user-123';
      const createDeckDto: CreateDeckDto = {
        name: 'New Deck',
        description: 'New Description',
        color: '#FF5733',
        isPublic: true,
        allowSharing: true,
      };

      const expectedDeck = {
        ...mockDeck,
        ...createDeckDto,
      };

      mockPrismaService.flashcardDeck.create.mockResolvedValue(expectedDeck);

      const result = await service.createDeck(userId, createDeckDto);

      expect(mockPrismaService.flashcardDeck.create).toHaveBeenCalledWith({
        data: {
          userId,
          name: createDeckDto.name,
          description: createDeckDto.description,
          color: createDeckDto.color,
          isPublic: createDeckDto.isPublic,
          allowSharing: createDeckDto.allowSharing,
        },
        include: {
          flashcards: {
            include: {
              flashcard: true,
            },
            orderBy: {
              position: 'asc',
            },
          },
        },
      });

      expect(result).toEqual(expect.objectContaining({
        id: expectedDeck.id,
        name: expectedDeck.name,
        description: expectedDeck.description,
      }));
    });

    it('should create deck with default values', async () => {
      const userId = 'user-123';
      const createDeckDto: CreateDeckDto = {
        name: 'Minimal Deck',
      };

      const expectedDeck = {
        ...mockDeck,
        name: 'Minimal Deck',
        color: '#3B82F6',
        isPublic: false,
        allowSharing: false,
      };

      mockPrismaService.flashcardDeck.create.mockResolvedValue(expectedDeck);

      const result = await service.createDeck(userId, createDeckDto);

      expect(mockPrismaService.flashcardDeck.create).toHaveBeenCalledWith({
        data: {
          userId,
          name: createDeckDto.name,
          description: undefined,
          color: '#3B82F6',
          isPublic: false,
          allowSharing: false,
        },
        include: expect.any(Object),
      });
    });
  });

  describe('getUserDecks', () => {
    it('should return user decks', async () => {
      const userId = 'user-123';
      const mockDecks = [mockDeck];

      mockPrismaService.flashcardDeck.findMany.mockResolvedValue(mockDecks);

      const result = await service.getUserDecks(userId);

      expect(mockPrismaService.flashcardDeck.findMany).toHaveBeenCalledWith({
        where: { userId },
        include: {
          flashcards: {
            include: {
              flashcard: true,
            },
            orderBy: {
              position: 'asc',
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });

      expect(result).toHaveLength(1);
    });

    it('should return empty array when user has no decks', async () => {
      const userId = 'user-123';

      mockPrismaService.flashcardDeck.findMany.mockResolvedValue([]);

      const result = await service.getUserDecks(userId);

      expect(result).toEqual([]);
    });
  });

  describe('getDeckById', () => {
    it('should return deck when user owns it', async () => {
      const deckId = 'deck-123';
      const userId = 'user-123';

      mockPrismaService.flashcardDeck.findFirst.mockResolvedValue(mockDeck);

      const result = await service.getDeckById(deckId, userId);

      expect(mockPrismaService.flashcardDeck.findFirst).toHaveBeenCalledWith({
        where: {
          id: deckId,
          OR: [
            { userId },
            { isPublic: true },
          ],
        },
        include: expect.any(Object),
      });

      expect(result).toEqual(expect.objectContaining({
        id: mockDeck.id,
        name: mockDeck.name,
      }));
    });

    it('should return public deck even if user does not own it', async () => {
      const deckId = 'deck-123';
      const userId = 'user-456';
      const publicDeck = { ...mockDeck, userId: 'user-123', isPublic: true };

      mockPrismaService.flashcardDeck.findFirst.mockResolvedValue(publicDeck);

      const result = await service.getDeckById(deckId, userId);

      expect(result).toEqual(expect.objectContaining({
        id: publicDeck.id,
        name: publicDeck.name,
      }));
    });

    it('should throw NotFoundException when deck not found', async () => {
      const deckId = 'deck-123';
      const userId = 'user-123';

      mockPrismaService.flashcardDeck.findFirst.mockResolvedValue(null);

      await expect(service.getDeckById(deckId, userId))
        .rejects
        .toThrow(NotFoundException);
    });
  });

  describe('updateDeck', () => {
    it('should update deck successfully', async () => {
      const deckId = 'deck-123';
      const userId = 'user-123';
      const updateDeckDto: UpdateDeckDto = {
        name: 'Updated Deck',
        description: 'Updated Description',
      };

      const updatedDeck = {
        ...mockDeck,
        ...updateDeckDto,
      };

      mockPrismaService.flashcardDeck.findFirst.mockResolvedValue(mockDeck);
      mockPrismaService.flashcardDeck.update.mockResolvedValue(updatedDeck);

      const result = await service.updateDeck(deckId, userId, updateDeckDto);

      expect(mockPrismaService.flashcardDeck.findFirst).toHaveBeenCalledWith({
        where: { id: deckId, userId },
      });

      expect(mockPrismaService.flashcardDeck.update).toHaveBeenCalledWith({
        where: { id: deckId },
        data: updateDeckDto,
        include: expect.any(Object),
      });

      expect(result).toEqual(expect.objectContaining({
        name: updateDeckDto.name,
        description: updateDeckDto.description,
      }));
    });

    it('should throw NotFoundException when deck not found', async () => {
      const deckId = 'deck-123';
      const userId = 'user-123';
      const updateDeckDto: UpdateDeckDto = {
        name: 'Updated Deck',
      };

      mockPrismaService.flashcardDeck.findFirst.mockResolvedValue(null);

      await expect(service.updateDeck(deckId, userId, updateDeckDto))
        .rejects
        .toThrow(NotFoundException);
    });
  });

  describe('deleteDeck', () => {
    it('should delete deck successfully', async () => {
      const deckId = 'deck-123';
      const userId = 'user-123';

        const mockDeckItem = {
        id: 'deck-item-123',
        deckId: 'deck-123',
        flashcardId: 'flashcard-123',
        position: 0,
      };

      mockPrismaService.flashcardDeck.findFirst.mockResolvedValue({
        ...mockDeck,
        userId,
      });
      // Na linha 420, dentro do teste removeFlashcardFromDeck
      // Verificar se na linha ~426 o mock está correto
      mockPrismaService.flashcardDeckItem.findFirst.mockResolvedValue(mockDeckItem);
      mockPrismaService.flashcardDeckItem.delete.mockResolvedValue(mockDeckItem);
      mockPrismaService.flashcardDeck.delete.mockResolvedValue(mockDeck);

      await service.deleteDeck(deckId, userId);

      expect(mockPrismaService.flashcardDeck.findFirst).toHaveBeenCalledWith({
        where: { id: deckId, userId },
      });

      expect(mockPrismaService.flashcardDeck.delete).toHaveBeenCalledWith({
        where: { id: deckId },
      });
    });

    it('should throw NotFoundException when deck not found', async () => {
      const deckId = 'deck-123';
      const userId = 'user-123';

      mockPrismaService.flashcardDeck.findFirst.mockResolvedValue(null);

      await expect(service.deleteDeck(deckId, userId))
        .rejects
        .toThrow(NotFoundException);
    });
  });

  describe('addFlashcardToDeck', () => {
    it('should add flashcard to deck successfully', async () => {
      const deckId = 'deck-123';
      const userId = 'user-123';
      const addToDeckDto: AddToDeckDto = {
        flashcardId: 'flashcard-123',
        position: 1,
      };

      mockPrismaService.flashcardDeck.findFirst.mockResolvedValue(mockDeck);
      mockPrismaService.flashcard.findFirst.mockResolvedValue(mockFlashcard);
      mockPrismaService.flashcardDeckItem.findFirst.mockResolvedValue(null);
      mockPrismaService.flashcardDeckItem.create.mockResolvedValue({});

      await service.addFlashcardToDeck(deckId, userId, addToDeckDto);

      expect(mockPrismaService.flashcardDeck.findFirst).toHaveBeenCalledWith({
        where: { id: deckId, userId },
      });

      expect(mockPrismaService.flashcard.findFirst).toHaveBeenCalledWith({
        where: { id: addToDeckDto.flashcardId, userId },
      });

      expect(mockPrismaService.flashcardDeckItem.create).toHaveBeenCalledWith({
        data: {
          deckId,
          flashcardId: addToDeckDto.flashcardId,
          position: addToDeckDto.position || 0,
        },
      });
    });

    it('should throw NotFoundException when deck not found', async () => {
      const deckId = 'deck-123';
      const userId = 'user-123';
      const addToDeckDto: AddToDeckDto = {
        flashcardId: 'flashcard-123',
      };

      mockPrismaService.flashcardDeck.findFirst.mockResolvedValue(null);

      await expect(service.addFlashcardToDeck(deckId, userId, addToDeckDto))
        .rejects
        .toThrow(NotFoundException);
    });

    it('should throw NotFoundException when flashcard not found', async () => {
      const deckId = 'deck-123';
      const userId = 'user-123';
      const addToDeckDto: AddToDeckDto = {
        flashcardId: 'flashcard-123',
      };

      mockPrismaService.flashcardDeck.findFirst.mockResolvedValue(mockDeck);
      mockPrismaService.flashcard.findFirst.mockResolvedValue(null);

      await expect(service.addFlashcardToDeck(deckId, userId, addToDeckDto))
        .rejects
        .toThrow(NotFoundException);
    });
  });

  describe('removeFlashcardFromDeck', () => {
    beforeEach(() => {
      // Reset mocks before each test in this describe block
      jest.clearAllMocks();
    });

    it('should remove flashcard from deck successfully', async () => {
      const deckId = 'deck-123';
      const flashcardId = 'flashcard-123';
      const userId = 'user-123';

      const mockDeckItem = {
        id: 'deck-item-123',
        deckId: 'deck-123',
        flashcardId: 'flashcard-123',
        position: 0,
      };

      mockPrismaService.flashcardDeck.findFirst.mockResolvedValue(mockDeck);
      mockPrismaService.flashcardDeckItem.deleteMany.mockResolvedValue({ count: 1 });

      await service.removeFlashcardFromDeck(deckId, flashcardId, userId);

      expect(mockPrismaService.flashcardDeckItem.deleteMany).toHaveBeenCalledWith({
        where: {
          deckId,
          flashcardId,
        },
      });
    });

    it('should throw NotFoundException when deck not found', async () => {
      const deckId = 'deck-123';
      const flashcardId = 'flashcard-123';
      const userId = 'user-123';

      mockPrismaService.flashcardDeck.findFirst.mockResolvedValue(null);

      await expect(service.removeFlashcardFromDeck(deckId, flashcardId, userId))
        .rejects
        .toThrow(NotFoundException);
    });
  });

  describe('getPublicDecks', () => {
    it('should return public decks', async () => {
      const limit = 10;
      const offset = 0;
      const publicDecks = [{ ...mockDeck, isPublic: true }];

      mockPrismaService.flashcardDeck.findMany.mockResolvedValue(publicDecks);

      const result = await service.getPublicDecks(limit, offset);

      expect(mockPrismaService.flashcardDeck.findMany).toHaveBeenCalledWith({
        where: { isPublic: true },
        include: expect.any(Object),
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip: offset,
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(expect.objectContaining({
        isPublic: true,
      }));
    });

    it('should use default pagination values', async () => {
      mockPrismaService.flashcardDeck.findMany.mockResolvedValue([]);

      await service.getPublicDecks();

      expect(mockPrismaService.flashcardDeck.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
          skip: 0,
        })
      );
    });
  });
});
