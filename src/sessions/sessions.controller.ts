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
import { SessionsService } from './services/sessions.service';
import { SessionTrackingService } from './services/session-tracking.service';
import { SessionAnalyticsService } from './services/session-analytics.service';
import { SessionRecommendationService } from './services/session-recommendation.service';
import { SessionGameficationService } from './services/session-gamefication.service';
import { QuestionGeneratorService } from '../ai/services/question-generator.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { CreateQuestionInteractionDto } from './dto/create-question-interaction.dto';
import { SessionFiltersDto } from './dto/session-filters.dto';
import { SessionRecommendationDto } from './dto/session-recommendation.dto';
import { GenerateQuestionDto } from '../ai/dto/generate-question.dto';

@Controller('sessions')
@UseGuards(JwtAuthGuard)
export class SessionsController {
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly trackingService: SessionTrackingService,
    private readonly analyticsService: SessionAnalyticsService,
    private readonly recommendationService: SessionRecommendationService,
    private readonly gameficationService: SessionGameficationService,
    private readonly questionGeneratorService: QuestionGeneratorService,
  ) {}

  // === GESTÃO DE SESSÕES ===
  @Post()
  async createSession(@Request() req, @Body() createSessionDto: CreateSessionDto) {
    return this.sessionsService.createSession(req.user.id, createSessionDto);
  }

  @Get()
  async getUserSessions(@Request() req, @Query() filters: SessionFiltersDto) {
    return this.sessionsService.getUserSessions(req.user.id, filters);
  }

  @Get(':id')
  async getSession(@Request() req, @Param('id') sessionId: string) {
    return this.sessionsService.getSessionById(req.user.id, sessionId);
  }

  @Put(':id')
  async updateSession(
    @Request() req,
    @Param('id') sessionId: string,
    @Body() updateSessionDto: UpdateSessionDto,
  ) {
    return this.sessionsService.updateSession(req.user.id, sessionId, updateSessionDto);
  }

  @Delete(':id')
  async deleteSession(@Request() req, @Param('id') sessionId: string) {
    return this.sessionsService.deleteSession(req.user.id, sessionId);
  }

  @Post(':id/finish')
  async finishSession(@Request() req, @Param('id') sessionId: string) {
    return this.sessionsService.finishSession(req.user.id, sessionId);
  }

  // === GERAÇÃO DE QUESTÕES ADAPTATIVAS ===
  @Post(':id/generate-question')
  async generateAdaptiveQuestion(
    @Request() req,
    @Param('id') sessionId: string,
    @Body() generateQuestionDto: GenerateQuestionDto,
  ) {
    const request = {
      userId: req.user.id,
      sessionId,
      ...generateQuestionDto,
    };
    
    return this.questionGeneratorService.generateAdaptiveQuestion(request);
  }

  // === TRACKING DE INTERAÇÕES ===
  @Post(':id/interactions')
  async createQuestionInteraction(
    @Request() req,
    @Param('id') sessionId: string,
    @Body() interactionDto: CreateQuestionInteractionDto,
  ) {
    return this.trackingService.createQuestionInteraction(
      req.user.id,
      sessionId,
      interactionDto,
    );
  }

  @Get(':id/interactions')
  async getSessionInteractions(@Request() req, @Param('id') sessionId: string) {
    return this.trackingService.getSessionInteractions(req.user.id, sessionId);
  }

  @Post(':id/heartbeat')
  async updateSessionHeartbeat(@Request() req, @Param('id') sessionId: string) {
    return this.trackingService.updateSessionHeartbeat(req.user.id, sessionId);
  }

  // === ANALYTICS E RELATÓRIOS ===
  @Get('analytics/dashboard')
  async getUserDashboard(@Request() req) {
    return this.analyticsService.getUserDashboard(req.user.id);
  }

  @Get('analytics/progress')
  async getUserProgress(@Request() req, @Query('period') period?: string) {
    return this.analyticsService.getUserProgress(req.user.id, period);
  }

  @Get('analytics/performance')
  async getUserPerformance(@Request() req, @Query('topic') topic?: string) {
    return this.analyticsService.getUserPerformance(req.user.id, topic);
  }

  @Get('analytics/weaknesses')
  async getUserWeaknesses(@Request() req) {
    return this.analyticsService.getUserWeaknesses(req.user.id);
  }

  // === RECOMENDAÇÕES ===
  @Get('recommendations/next-session')
  async getNextSessionRecommendation(@Request() req) {
    return this.recommendationService.getNextSessionRecommendation(req.user.id);
  }

  @Get('recommendations/topics')
  async getTopicRecommendations(@Request() req) {
    return this.recommendationService.getTopicRecommendations(req.user.id);
  }

  @Post('recommendations/feedback')
  async submitRecommendationFeedback(
    @Request() req,
    @Body() feedbackDto: SessionRecommendationDto,
  ) {
    return this.recommendationService.submitFeedback(req.user.id, feedbackDto);
  }

  // === GAMEFICAÇÃO ===
  @Get('achievements')
  async getUserAchievements(@Request() req) {
    return this.gameficationService.getUserAchievements(req.user.id);
  }

  @Get('achievements/available')
  async getAvailableAchievements(@Request() req) {
    return this.gameficationService.getAvailableAchievements(req.user.id);
  }

  @Get('leaderboard')
  async getLeaderboard(@Request() req, @Query('period') period?: string) {
    return this.gameficationService.getLeaderboard(period);
  }

  @Get('streak')
  async getUserStreak(@Request() req) {
    return this.gameficationService.getUserStreak(req.user.id);
  }
}