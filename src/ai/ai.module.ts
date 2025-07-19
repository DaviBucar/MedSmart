import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AiService } from './ai.service';
import { PromptService } from './prompt.service';

@Module({
  imports: [HttpModule], // disponibiliza HttpService
  providers: [AiService, PromptService],
  exports: [AiService], // outros módulos (e.g. ProcessingModule) usarão AiService
})
export class AiModule {}
