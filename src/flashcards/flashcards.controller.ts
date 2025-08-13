import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FlashcardsService } from './services/flashcards.service';
import { FlashcardReviewService } from './services/flashcard-review.service';
import { FlashcardGenerationService } from './services/flashcard-generation.service';
import { CreateFlashcardDto } from './dto/create-flashcard.dto';
import { ReviewFlashcardDto } from './dto/review-flashcard.dto';
import { FlashcardData, FlashcardReviewResult } from './interfaces/flashcard.interface';

@Controller('flashcards')
@UseGuards(JwtAuthGuard)
export class FlashcardsController {
  constructor(
    private readonly flashcardsService: FlashcardsService,
    private readonly reviewService: FlashcardReviewService,
    private readonly generationService: FlashcardGenerationService,
  ) {}

  // Criar novo flashcard
  @Post()
  async createFlashcard(
    @Request() req,
    @Body() createFlashcardDto: CreateFlashcardDto,
  ): Promise<FlashcardData> {
    return this.flashcardsService.createFlashcard(req.user.id, createFlashcardDto);
  }

  // Listar flashcards do usuário
  @Get()
  async getUserFlashcards(
    @Request() req,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<FlashcardData[]> {
    const limitNum = limit ? parseInt(limit, 10) : 20;
    const offsetNum = offset ? parseInt(offset, 10) : 0;
    return this.flashcardsService.getUserFlashcards(req.user.id, limitNum, offsetNum);
  }

  // Buscar flashcard por ID
  @Get(':id')
  async getFlashcardById(
    @Request() req,
    @Param('id') id: string,
  ): Promise<FlashcardData> {
    return this.flashcardsService.getFlashcardById(id, req.user.id);
  }

  // Atualizar flashcard
  @Put(':id')
  async updateFlashcard(
    @Request() req,
    @Param('id') id: string,
    @Body() updateData: Partial<CreateFlashcardDto>,
  ): Promise<FlashcardData> {
    return this.flashcardsService.updateFlashcard(id, req.user.id, updateData);
  }

  // Deletar flashcard
  @Delete(':id')
  async deleteFlashcard(
    @Request() req,
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    await this.flashcardsService.deleteFlashcard(id, req.user.id);
    return { message: 'Flashcard deletado com sucesso' };
  }

  // Buscar flashcards por tópico
  @Get('topic/:topic')
  async getFlashcardsByTopic(
    @Request() req,
    @Param('topic') topic: string,
  ): Promise<FlashcardData[]> {
    return this.flashcardsService.getFlashcardsByTopic(req.user.id, topic);
  }

  // === FUNCIONALIDADES DE REVISÃO ===

  // Buscar flashcards devido para revisão
  @Get('review/due')
  async getFlashcardsDue(
    @Request() req,
    @Query('limit') limit?: string,
  ): Promise<any[]> {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.reviewService.getFlashcardsDueForReview(req.user.id, limitNum);
  }

  // Contar flashcards devido
  @Get('review/count')
  async countFlashcardsDue(@Request() req): Promise<{ count: number }> {
    const count = await this.reviewService.countFlashcardsDue(req.user.id);
    return { count };
  }

  // Revisar um flashcard
  @Post(':id/review')
  async reviewFlashcard(
    @Request() req,
    @Param('id') id: string,
    @Body() reviewDto: ReviewFlashcardDto,
  ): Promise<FlashcardReviewResult> {
    return this.reviewService.reviewFlashcard(id, req.user.id, reviewDto);
  }

  // === FUNCIONALIDADES DE GERAÇÃO ===

  // Gerar flashcards a partir de uma sessão
  @Post('generate/session/:sessionId')
  async generateFromSession(
    @Request() req,
    @Param('sessionId') sessionId: string,
  ): Promise<{ flashcards: FlashcardData[]; count: number }> {
    const flashcards = await this.generationService.generateFromSession(sessionId, req.user.id);
    return {
      flashcards,
      count: flashcards.length,
    };
  }

  // Gerar flashcards a partir de conteúdo
  @Post('generate/content')
  async generateFromContent(
    @Request() req,
    @Body() body: {
      content: string;
      topic: string;
      maxFlashcards?: number;
      documentId?: string;
    },
  ): Promise<{ flashcards: FlashcardData[]; count: number }> {
    const flashcards = await this.generationService.generateFlashcards({
      sourceContent: body.content,
      sourceType: 'manual',
      topic: body.topic,
      maxFlashcards: body.maxFlashcards || 5,
      userId: req.user.id,
      documentId: body.documentId,
    });
    
    return {
      flashcards,
      count: flashcards.length,
    };
  }
}