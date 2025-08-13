import {
  Controller,
  Get,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { FlashcardAnalyticsService } from '../services/flashcard-analytics.service';

@Controller('flashcards/analytics')
@UseGuards(JwtAuthGuard)
export class FlashcardAnalyticsController {
  constructor(private readonly analyticsService: FlashcardAnalyticsService) {}

  @Get()
  async getUserAnalytics(@Request() req: any) {
    return this.analyticsService.getUserAnalytics(req.user.userId);
  }
}