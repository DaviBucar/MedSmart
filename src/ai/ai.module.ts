import { Module } from '@nestjs/common';
import { DeepSeekService } from './services/deepseek.service';
import { QuestionGeneratorService } from './services/question-generator.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [DeepSeekService, QuestionGeneratorService],
  exports: [DeepSeekService, QuestionGeneratorService],
})
export class AIModule {}