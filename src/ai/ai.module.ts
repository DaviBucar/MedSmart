import { Module } from '@nestjs/common';
import { DeepSeekService } from './services/deepseek.service';

@Module({
  providers: [DeepSeekService],
  exports: [DeepSeekService],
})
export class AIModule {}