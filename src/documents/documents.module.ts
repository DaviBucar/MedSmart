import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './services/documents.service';
import { FileProcessingService } from './services/file-processing.service';
import { AIModule } from '../ai/ai.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [AIModule, PrismaModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, FileProcessingService],
  exports: [DocumentsService, FileProcessingService],
})
export class DocumentsModule {}