import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';
import { FlashcardsController } from './flashcards.controller';
import { FlashcardDeckController } from './controllers/flashcard-deck.controller';
import { FlashcardAnalyticsController } from './controllers/flashcard-analytics.controller';
import { FlashcardsService } from './services/flashcards.service';
import { FlashcardReviewService } from './services/flashcard-review.service';
import { FlashcardGenerationService } from './services/flashcard-generation.service';
import { FlashcardDeckService } from './services/flashcard-deck.service';
import { FlashcardAnalyticsService } from './services/flashcard-analytics.service';

@Module({
  imports: [PrismaModule, AiModule],
  controllers: [
    FlashcardsController,
    FlashcardDeckController,
    FlashcardAnalyticsController,
  ],
  providers: [
    FlashcardsService,
    FlashcardReviewService,
    FlashcardGenerationService,
    FlashcardDeckService,
    FlashcardAnalyticsService,
  ],
  exports: [
    FlashcardsService,
    FlashcardReviewService,
    FlashcardGenerationService,
    FlashcardDeckService,
    FlashcardAnalyticsService,
  ],
})
export class FlashcardsModule {}