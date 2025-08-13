import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFlashcardDto } from '../dto/create-flashcard.dto';
import { FlashcardData } from '../interfaces/flashcard.interface';
import { FlashcardStatus, DifficultyLevel } from '@prisma/client';

@Injectable()
export class FlashcardsService {
  constructor(private prisma: PrismaService) {}

  // Criar um novo flashcard
  async createFlashcard(userId: string, createFlashcardDto: CreateFlashcardDto): Promise<FlashcardData> {
    const flashcard = await this.prisma.flashcard.create({
      data: {
        userId,
        type: createFlashcardDto.type,
        front: createFlashcardDto.front,
        back: createFlashcardDto.back,
        topic: createFlashcardDto.topic,
        tags: createFlashcardDto.tags || [],
        difficultyLevel: createFlashcardDto.difficultyLevel || DifficultyLevel.MEDIUM,
        status: FlashcardStatus.PENDING,
        sessionId: createFlashcardDto.sessionId,
        documentId: createFlashcardDto.documentId,
        sourceContent: createFlashcardDto.sourceContent,
        sourceType: createFlashcardDto.sourceType,
        sourceReference: createFlashcardDto.sourceReference,
        // Valores iniciais para spaced repetition
        easeFactor: 2.5,
        interval: 1,
        repetitions: 0,
        nextReviewDate: new Date(),
        totalReviews: 0,
        correctReviews: 0,
      },
    });

    return this.mapFlashcardData(flashcard);
  }

  // Buscar flashcards do usuário
  async getUserFlashcards(userId: string, limit = 20, offset = 0): Promise<FlashcardData[]> {
    const flashcards = await this.prisma.flashcard.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return flashcards.map(this.mapFlashcardData);
  }

  // Buscar flashcard por ID
  async getFlashcardById(id: string, userId: string): Promise<FlashcardData> {
    const flashcard = await this.prisma.flashcard.findFirst({
      where: { id, userId },
    });

    if (!flashcard) {
      throw new NotFoundException('Flashcard não encontrado');
    }

    return this.mapFlashcardData(flashcard);
  }

  // Atualizar flashcard
  async updateFlashcard(id: string, userId: string, updateData: Partial<CreateFlashcardDto>): Promise<FlashcardData> {
    const flashcard = await this.prisma.flashcard.findFirst({
      where: { id, userId },
    });

    if (!flashcard) {
      throw new NotFoundException('Flashcard não encontrado');
    }

    const updatedFlashcard = await this.prisma.flashcard.update({
      where: { id },
      data: updateData,
    });

    return this.mapFlashcardData(updatedFlashcard);
  }

  // Deletar flashcard
  async deleteFlashcard(id: string, userId: string): Promise<void> {
    const flashcard = await this.prisma.flashcard.findFirst({
      where: { id, userId },
    });

    if (!flashcard) {
      throw new NotFoundException('Flashcard não encontrado');
    }

    await this.prisma.flashcard.delete({
      where: { id },
    });
  }

  // Buscar flashcards por tópico
  async getFlashcardsByTopic(userId: string, topic: string): Promise<FlashcardData[]> {
    const flashcards = await this.prisma.flashcard.findMany({
      where: {
        userId,
        topic: {
          contains: topic,
          mode: 'insensitive',
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return flashcards.map(this.mapFlashcardData);
  }

  // Mapear dados do flashcard
  private mapFlashcardData(flashcard: any): FlashcardData {
    return {
      id: flashcard.id,
      userId: flashcard.userId,
      type: flashcard.type,
      front: flashcard.front,
      back: flashcard.back,
      topic: flashcard.topic,
      tags: flashcard.tags,
      difficultyLevel: flashcard.difficultyLevel,
      status: flashcard.status,
      sessionId: flashcard.sessionId,
      documentId: flashcard.documentId,
      sourceContent: flashcard.sourceContent,
      sourceType: flashcard.sourceType,
      sourceReference: flashcard.sourceReference,
      easeFactor: flashcard.easeFactor,
      interval: flashcard.interval,
      repetitions: flashcard.repetitions,
      nextReviewDate: flashcard.nextReviewDate,
      totalReviews: flashcard.totalReviews,
      correctReviews: flashcard.correctReviews,
      lastReviewResult: flashcard.lastReviewResult,
      lastReviewedAt: flashcard.lastReviewedAt,
      averageResponseTime: flashcard.averageResponseTime,
      createdAt: flashcard.createdAt,
      updatedAt: flashcard.updatedAt,
    };
  }
}