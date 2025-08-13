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
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { FlashcardDeckService } from '../services/flashcard-deck.service';
import { CreateDeckDto } from '../dto/create-deck.dto';
import { UpdateDeckDto } from '../dto/update-deck.dto';
import { AddToDeckDto } from '../dto/add-to-deck.dto';

@Controller('flashcards/decks')
@UseGuards(JwtAuthGuard)
export class FlashcardDeckController {
  constructor(private readonly deckService: FlashcardDeckService) {}

  @Post()
  async createDeck(@Request() req: any, @Body() createDeckDto: CreateDeckDto) {
    return this.deckService.createDeck(req.user.userId, createDeckDto);
  }

  @Get()
  async getUserDecks(@Request() req: any) {
    return this.deckService.getUserDecks(req.user.userId);
  }

  @Get('public')
  async getPublicDecks(
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    return this.deckService.getPublicDecks(limit, offset);
  }

  @Get(':deckId')
  async getDeckById(@Param('deckId') deckId: string, @Request() req: any) {
    return this.deckService.getDeckById(deckId, req.user.userId);
  }

  @Put(':deckId')
  async updateDeck(
    @Param('deckId') deckId: string,
    @Request() req: any,
    @Body() updateDeckDto: UpdateDeckDto,
  ) {
    return this.deckService.updateDeck(deckId, req.user.userId, updateDeckDto);
  }

  @Delete(':deckId')
  async deleteDeck(@Param('deckId') deckId: string, @Request() req: any) {
    await this.deckService.deleteDeck(deckId, req.user.userId);
    return { message: 'Deck excluído com sucesso' };
  }

  @Post(':deckId/flashcards')
  async addFlashcardToDeck(
    @Param('deckId') deckId: string,
    @Request() req: any,
    @Body() addToDeckDto: AddToDeckDto,
  ) {
    await this.deckService.addFlashcardToDeck(deckId, req.user.userId, addToDeckDto);
    return { message: 'Flashcard adicionado ao deck com sucesso' };
  }

  @Delete(':deckId/flashcards/:flashcardId')
  async removeFlashcardFromDeck(
    @Param('deckId') deckId: string,
    @Param('flashcardId') flashcardId: string,
    @Request() req: any,
  ) {
    await this.deckService.removeFlashcardFromDeck(deckId, flashcardId, req.user.userId);
    return { message: 'Flashcard removido do deck com sucesso' };
  }
}