import { Module } from '@nestjs/common';
import { DeepSeekService } from './services/deepseek.service';
import { QuestionGeneratorService } from './services/question-generator.service';
import { AICacheService } from './services/ai-cache.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [DeepSeekService, QuestionGeneratorService, AICacheService],
  exports: [DeepSeekService, QuestionGeneratorService, AICacheService],
})
export class AIModule {}