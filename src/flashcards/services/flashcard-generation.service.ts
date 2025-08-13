import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DeepSeekService } from '../../ai/services/deepseek.service';
import { FlashcardType, DifficultyLevel, FlashcardStatus } from '@prisma/client';
import { FlashcardData } from '../interfaces/flashcard.interface';

interface GenerateFlashcardsRequest {
  sourceContent: string;
  sourceType: 'document' | 'session' | 'manual';
  topic: string;
  difficultyLevel?: DifficultyLevel;
  maxFlashcards?: number;
  userId: string;
  sessionId?: string;
  documentId?: string;
}

interface GeneratedFlashcard {
  type: FlashcardType;
  front: string;
  back: string;
  topic: string;
  tags: string[];
  difficultyLevel: DifficultyLevel;
}

@Injectable()
export class FlashcardGenerationService {
  constructor(
    private prisma: PrismaService,
    private deepSeekService: DeepSeekService,
  ) {}

  // Gerar flashcards a partir de conteúdo
  async generateFlashcards(request: GenerateFlashcardsRequest): Promise<FlashcardData[]> {
    try {
      // Construir prompt para IA
      const prompt = this.buildGenerationPrompt(
        request.sourceContent,
        request.topic,
        request.difficultyLevel || DifficultyLevel.MEDIUM,
        request.maxFlashcards || 5,
      );

      // Gerar flashcards usando IA
      const aiResponse = await this.deepSeekService.generateQuestion(prompt);
      
      // Parsear resposta da IA
      const generatedFlashcards = this.parseAIResponse(aiResponse);

      // Salvar flashcards no banco
      const savedFlashcards = await this.saveFlashcards(
        generatedFlashcards,
        request.userId,
        request.sessionId,
        request.documentId,
        request.sourceContent,
        request.sourceType,
      );

      return savedFlashcards;
    } catch (error) {
      console.error('Erro ao gerar flashcards:', error);
      throw new Error('Falha na geração de flashcards');
    }
  }

  // Gerar flashcards a partir de uma sessão de estudo
  async generateFromSession(sessionId: string, userId: string): Promise<FlashcardData[]> {
    // Buscar dados da sessão
    const session = await this.prisma.studySession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new Error('Sessão não encontrada');
    }

    // Verificar se a sessão tem tópicos para gerar flashcards
    if (!session.topicsStudied || session.topicsStudied.length === 0) {
      throw new Error('Sessão não possui tópicos para gerar flashcards');
    }

    // Gerar flashcards baseados nos tópicos da sessão
    const allFlashcards: FlashcardData[] = [];
    for (const topic of session.topicsStudied) {
      const flashcards = await this.generateFlashcards({
        sourceContent: `Tópico de estudo: ${topic}`,
        sourceType: 'session',
        topic: topic,
        difficultyLevel: DifficultyLevel.MEDIUM,
        maxFlashcards: 3,
        userId,
        sessionId,
      });
      allFlashcards.push(...flashcards);
    }

    return allFlashcards;
  }

  // Construir prompt para geração de flashcards
  private buildGenerationPrompt(
    content: string,
    topic: string,
    difficulty: DifficultyLevel,
    maxCards: number,
  ): string {
    const difficultyMap = {
      [DifficultyLevel.EASY]: 'básico',
      [DifficultyLevel.MEDIUM]: 'intermediário',
      [DifficultyLevel.HARD]: 'avançado',
    };

    return `
Você é um especialista em educação médica. Crie ${maxCards} flashcards de nível ${difficultyMap[difficulty]} sobre o tópico "${topic}" baseado no seguinte conteúdo:

${content}

Retorne APENAS um JSON válido no seguinte formato:
{
  "flashcards": [
    {
      "type": "QUESTION_BASED",
      "front": "Pergunta clara e objetiva",
      "back": "Resposta completa e precisa",
      "topic": "${topic}",
      "tags": ["tag1", "tag2"],
      "difficultyLevel": "${difficulty}"
    }
  ]
}

Regras importantes:
- Use apenas o tipo "QUESTION_BASED"
- Perguntas devem ser claras e específicas
- Respostas devem ser completas mas concisas
- Inclua 2-4 tags relevantes por flashcard
- Foque nos conceitos mais importantes do conteúdo
- Varie o estilo das perguntas (definição, aplicação, comparação)
`;
  }

  // Parsear resposta da IA
  private parseAIResponse(response: string): GeneratedFlashcard[] {
    try {
      // Limpar resposta (remover markdown se houver)
      const cleanResponse = response.replace(/```json\n?|```\n?/g, '').trim();
      
      const parsed = JSON.parse(cleanResponse);
      
      if (!parsed.flashcards || !Array.isArray(parsed.flashcards)) {
        throw new Error('Formato de resposta inválido');
      }

      return parsed.flashcards.map((card: any) => ({
        type: FlashcardType.QUESTION_BASED,
        front: card.front || '',
        back: card.back || '',
        topic: card.topic || '',
        tags: Array.isArray(card.tags) ? card.tags : [],
        difficultyLevel: card.difficultyLevel || DifficultyLevel.MEDIUM,
      }));
    } catch (error) {
      console.error('Erro ao parsear resposta da IA:', error);
      // Fallback: tentar extrair flashcards manualmente
      return this.fallbackParsing(response);
    }
  }

  // Parsing de fallback em caso de erro
  private fallbackParsing(response: string): GeneratedFlashcard[] {
    // Implementação simples de fallback
    const lines = response.split('\n').filter(line => line.trim());
    const flashcards: GeneratedFlashcard[] = [];

    for (let i = 0; i < lines.length - 1; i += 2) {
      if (lines[i] && lines[i + 1]) {
        flashcards.push({
          type: FlashcardType.QUESTION_BASED,
          front: lines[i].replace(/^[\d\-\*\s]+/, '').trim(),
          back: lines[i + 1].replace(/^[\d\-\*\s]+/, '').trim(),
          topic: 'Revisão',
          tags: ['revisão'],
          difficultyLevel: DifficultyLevel.MEDIUM,
        });
      }
    }

    return flashcards.slice(0, 5); // Limitar a 5 flashcards
  }

  // Salvar flashcards no banco
  private async saveFlashcards(
    flashcards: GeneratedFlashcard[],
    userId: string,
    sessionId?: string,
    documentId?: string,
    sourceContent?: string,
    sourceType?: string,
  ): Promise<FlashcardData[]> {
    const savedFlashcards: FlashcardData[] = [];

    for (const card of flashcards) {
      if (!card.front.trim() || !card.back.trim()) continue;

      const flashcard = await this.prisma.flashcard.create({
        data: {
          userId,
          type: card.type,
          front: card.front,
          back: card.back,
          topic: card.topic,
          tags: card.tags,
          difficultyLevel: card.difficultyLevel,
          status: FlashcardStatus.PENDING,
          sessionId,
          documentId,
          sourceContent,
          sourceType,
          sourceReference: sessionId ? `session:${sessionId}` : documentId ? `document:${documentId}` : undefined,
          // Valores iniciais para spaced repetition
          easeFactor: 2.5,
          interval: 1,
          repetitions: 0,
          nextReviewDate: new Date(),
          totalReviews: 0,
          correctReviews: 0,
        },
      });

      savedFlashcards.push(this.mapFlashcardData(flashcard));
    }

    return savedFlashcards;
  }

  // Construir conteúdo da sessão para geração
  private buildSessionSourceContent(session: any): string {
    const content: string[] = [];

    // Adicionar informações da sessão
    if (session.topicsStudied && session.topicsStudied.length > 0) {
      content.push(`Tópicos estudados: ${session.topicsStudied.join(', ')}`);
    }

    if (session.summary) {
      content.push(`Resumo da sessão: ${session.summary}`);
    }

    return content.join('\n');
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