import { Module } from '@nestjs/common';
import { SessionsController } from './sessions.controller';

// Services principais
import { SessionsService } from './services/sessions.service';
import { SessionTrackingService } from './services/session-tracking.service';
import { SessionAnalyticsService } from './services/session-analytics.service';
import { SessionRecommendationService } from './services/session-recommendation.service';
import { SessionGameficationService } from './services/session-gamefication.service';

// Providers especializados
import { SessionValidatorProvider } from './services/providers/session-validator.provider';
import { SessionCalculatorProvider } from './services/providers/session-calculator.provider';
import { MetricsUpdaterProvider } from './services/providers/metrics-updater.provider';
import { FatigueDetectorProvider } from './services/providers/fatigue-detector.provider';
import { StreakCalculatorProvider } from './services/providers/streak-calculator.provider';
import { AnalyticsCalculatorProvider } from './services/providers/analytics-calculator.provider';
import { PerformanceAnalyzerProvider } from './services/providers/performance-analyzer.provider';
import { RecommendationEngineProvider } from './services/providers/recommendation-engine.provider';
import { GamificationEngineProvider } from './services/providers/gamification-engine.provider';

import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [PrismaModule, AiModule],
  controllers: [SessionsController],
  providers: [
    // Services principais
    SessionsService,
    SessionTrackingService,
    SessionAnalyticsService,
    SessionRecommendationService,
    SessionGameficationService,
    
    // Providers especializados
    SessionValidatorProvider,
    SessionCalculatorProvider,
    MetricsUpdaterProvider,
    FatigueDetectorProvider,
    StreakCalculatorProvider,
    AnalyticsCalculatorProvider,
    PerformanceAnalyzerProvider,
    RecommendationEngineProvider,
    GamificationEngineProvider,
  ],
  exports: [
    SessionsService,
    SessionTrackingService,
    SessionAnalyticsService,
    SessionRecommendationService,
    SessionGameficationService,
  ],
})
export class SessionsModule {}