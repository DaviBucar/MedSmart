import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDeckDto } from '../dto/create-deck.dto';
import { UpdateDeckDto } from '../dto/update-deck.dto';
import { AddToDeckDto } from '../dto/add-to-deck.dto';
import { FlashcardDeckData } from '../interfaces/flashcard.interface';

@Injectable()
export class FlashcardDeckService {
  constructor(private prisma: PrismaService) {}

  async createDeck(userId: string, createDeckDto: CreateDeckDto): Promise<FlashcardDeckData> {
    const deck = await this.prisma.flashcardDeck.create({
      data: {
        userId,
        name: createDeckDto.name,
        description: createDeckDto.description,
        color: createDeckDto.color || '#3B82F6',
        isPublic: createDeckDto.isPublic || false,
        allowSharing: createDeckDto.allowSharing || false,
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

    return this.mapDeckData(deck);
  }

  async getUserDecks(userId: string): Promise<FlashcardDeckData[]> {
    const decks = await this.prisma.flashcardDeck.findMany({
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

    return decks.map(deck => this.mapDeckData(deck));
  }

  async getDeckById(deckId: string, userId: string): Promise<FlashcardDeckData> {
    const deck = await this.prisma.flashcardDeck.findFirst({
      where: {
        id: deckId,
        OR: [
          { userId },
          { isPublic: true },
        ],
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

    if (!deck) {
      throw new NotFoundException('Deck não encontrado');
    }

    return this.mapDeckData(deck);
  }

  async updateDeck(deckId: string, userId: string, updateDeckDto: UpdateDeckDto): Promise<FlashcardDeckData> {
    // Verificar se o deck pertence ao usuário
    const existingDeck = await this.prisma.flashcardDeck.findFirst({
      where: { id: deckId, userId },
    });

    if (!existingDeck) {
      throw new NotFoundException('Deck não encontrado');
    }

    const deck = await this.prisma.flashcardDeck.update({
      where: { id: deckId },
      data: updateDeckDto,
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

    return this.mapDeckData(deck);
  }

  async deleteDeck(deckId: string, userId: string): Promise<void> {
    // Verificar se o deck pertence ao usuário
    const existingDeck = await this.prisma.flashcardDeck.findFirst({
      where: { id: deckId, userId },
    });

    if (!existingDeck) {
      throw new NotFoundException('Deck não encontrado');
    }

    await this.prisma.flashcardDeck.delete({
      where: { id: deckId },
    });
  }

  async addFlashcardToDeck(deckId: string, userId: string, addToDeckDto: AddToDeckDto): Promise<void> {
    // Verificar se o deck pertence ao usuário
    const deck = await this.prisma.flashcardDeck.findFirst({
      where: { id: deckId, userId },
    });

    if (!deck) {
      throw new NotFoundException('Deck não encontrado');
    }

    // Verificar se o flashcard pertence ao usuário
    const flashcard = await this.prisma.flashcard.findFirst({
      where: { id: addToDeckDto.flashcardId, userId },
    });

    if (!flashcard) {
      throw new NotFoundException('Flashcard não encontrado');
    }

    // Verificar se o flashcard já está no deck
    const existingItem = await this.prisma.flashcardDeckItem.findFirst({
      where: {
        deckId,
        flashcardId: addToDeckDto.flashcardId,
      },
    });

    if (existingItem) {
      return; // Já está no deck
    }

    // Determinar posição
    let position = addToDeckDto.position;
    if (position === undefined) {
      const lastItem = await this.prisma.flashcardDeckItem.findFirst({
        where: { deckId },
        orderBy: { position: 'desc' },
      });
      position = (lastItem?.position || 0) + 1;
    }

    // Adicionar ao deck
    await this.prisma.flashcardDeckItem.create({
      data: {
        deckId,
        flashcardId: addToDeckDto.flashcardId,
        position,
      },
    });

    // Atualizar contadores do deck
    await this.updateDeckStats(deckId);
  }

  async removeFlashcardFromDeck(deckId: string, flashcardId: string, userId: string): Promise<void> {
    // Verificar se o deck pertence ao usuário
    const deck = await this.prisma.flashcardDeck.findFirst({
      where: { id: deckId, userId },
    });

    if (!deck) {
      throw new NotFoundException('Deck não encontrado');
    }

    // Remover do deck
    await this.prisma.flashcardDeckItem.deleteMany({
      where: {
        deckId,
        flashcardId,
      },
    });

    // Atualizar contadores do deck
    await this.updateDeckStats(deckId);
  }

  async getPublicDecks(limit: number = 20, offset: number = 0): Promise<FlashcardDeckData[]> {
    const decks = await this.prisma.flashcardDeck.findMany({
      where: { isPublic: true },
      include: {
        flashcards: {
          include: {
            flashcard: true,
          },
          orderBy: {
            position: 'asc',
          },
        },
        user: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: limit,
      skip: offset,
    });

    return decks.map(deck => this.mapDeckData(deck));
  }

  private async updateDeckStats(deckId: string): Promise<void> {
    const stats = await this.prisma.flashcardDeckItem.aggregate({
      where: { deckId },
      _count: { flashcardId: true },
    });

    const masteredCount = await this.prisma.flashcardDeckItem.count({
      where: {
        deckId,
        flashcard: {
          status: 'MASTERED',
        },
      },
    });

    await this.prisma.flashcardDeck.update({
      where: { id: deckId },
      data: {
        totalFlashcards: stats._count.flashcardId,
        masteredCards: masteredCount,
      },
    });
  }

  private mapDeckData(deck: any): FlashcardDeckData {
    return {
      id: deck.id,
      userId: deck.userId,
      name: deck.name,
      description: deck.description,
      color: deck.color,
      isPublic: deck.isPublic,
      allowSharing: deck.allowSharing,
      flashcardCount: deck._count?.flashcards || 0,
      flashcards: deck.flashcards?.map((item: any) => ({
        id: item.flashcard.id,
        type: item.flashcard.type,
        status: item.flashcard.status,
        front: item.flashcard.front,
        back: item.flashcard.back,
        topic: item.flashcard.topic,
        tags: item.flashcard.tags,
        difficultyLevel: item.flashcard.difficultyLevel,
        easeFactor: item.flashcard.easeFactor,
        interval: item.flashcard.interval,
        repetitions: item.flashcard.repetitions,
        nextReviewDate: item.flashcard.nextReviewDate,
        totalReviews: item.flashcard.totalReviews,
        correctReviews: item.flashcard.correctReviews,
        averageResponseTime: item.flashcard.averageResponseTime,
        lastReviewResult: item.flashcard.lastReviewResult,
        createdAt: item.flashcard.createdAt,
        updatedAt: item.flashcard.updatedAt,
        lastReviewedAt: item.flashcard.lastReviewedAt,
        sourceContent: item.flashcard.sourceContent,
        sourceType: item.flashcard.sourceType,
        sourceReference: item.flashcard.sourceReference,
        position: item.position,
      })) || [],
      createdAt: deck.createdAt,
      updatedAt: deck.updatedAt,
    };
  }
}