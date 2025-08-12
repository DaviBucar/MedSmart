import { Module } from '@nestjs/common';
import { ContextCompressionService } from './services/context-compression.service';
import { DeepSeekService } from './services/deepseek.service';
import { QuestionGeneratorService } from './services/question-generator.service';
import { AICacheService } from './services/ai-cache.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [DeepSeekService, QuestionGeneratorService, AICacheService, ContextCompressionService],
  exports: [DeepSeekService, QuestionGeneratorService, AICacheService, ContextCompressionService],
})
export class AiModule {}