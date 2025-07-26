import { Injectable, Logger, NotFoundException, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FileProcessingService } from './file-processing.service';
import { DeepSeekService } from '../../ai/services/deepseek.service';
import { DocumentStatus } from '@prisma/client';
import { DocumentResponseDto } from '../dto/document-response.dto';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private prisma: PrismaService,
    private fileProcessingService: FileProcessingService,
    private deepSeekService: DeepSeekService,
  ) {}

  async uploadDocument(
    file: Express.Multer.File,
    userId: string,
  ): Promise<DocumentResponseDto> {
    try {
      // Validar arquivo
      this.fileProcessingService.validateFile(file);

      // Salvar arquivo
      const { filename, filePath } = await this.fileProcessingService.saveFile(file);

      // Criar registro no banco
      const document = await this.prisma.document.create({
        data: {
          userId,
          filename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          filePath,
          status: DocumentStatus.PENDING,
        },
      });

      this.logger.log(`Documento criado: ${document.id}`);

      // Processar documento em background
      this.processDocumentAsync(document.id);

      return this.mapToResponseDto(document);
    } catch (error) {
      this.logger.error('Erro ao fazer upload do documento:', error);
      throw error;
    }
  }

  async getDocument(id: string, userId: string): Promise<DocumentResponseDto> {
    const document = await this.prisma.document.findFirst({
      where: { id, userId },
      include: { analysis: true },
    });

    if (!document) {
      throw new NotFoundException('Documento não encontrado');
    }

    return this.mapToResponseDto(document);
  }

  async getUserDocuments(userId: string): Promise<DocumentResponseDto[]> {
    const documents = await this.prisma.document.findMany({
      where: { userId },
      include: { analysis: true },
      orderBy: { createdAt: 'desc' },
    });

    return documents.map(doc => this.mapToResponseDto(doc));
  }

  async deleteDocument(id: string, userId: string): Promise<void> {
    const document = await this.prisma.document.findFirst({
      where: { id, userId },
    });

    if (!document) {
      throw new NotFoundException('Documento não encontrado');
    }

    // Deletar arquivo físico
    await this.fileProcessingService.deleteFile(document.filePath);

    // Deletar do banco (cascade vai deletar a análise)
    await this.prisma.document.delete({
      where: { id },
    });

    this.logger.log(`Documento deletado: ${id}`);
  }

  private async processDocumentAsync(documentId: string): Promise<void> {
    try {
      // Atualizar status para PROCESSING
      await this.prisma.document.update({
        where: { id: documentId },
        data: { status: DocumentStatus.PROCESSING },
      });

      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
      });

      if (!document) {
        throw new Error('Documento não encontrado');
      }

      // Extrair texto do PDF
      const extractedText = await this.fileProcessingService.extractTextFromPdf(
        document.filePath,
      );

      // Atualizar documento com texto extraído
      await this.prisma.document.update({
        where: { id: documentId },
        data: { extractedText },
      });

      // Analisar com IA
      const analysis = await this.deepSeekService.analyzeText(extractedText);

      // Salvar análise
      await this.prisma.documentAnalysis.create({
        data: {
          documentId,
          summary: analysis.summary,
          keywords: analysis.keywords,
          mindMap: analysis.mindMap as any, // Conversão explícita para Json
          questions: analysis.questions as any, // Conversão explícita para Json
        },
      });

      // Atualizar status para COMPLETED
      await this.prisma.document.update({
        where: { id: documentId },
        data: { status: DocumentStatus.COMPLETED },
      });

      this.logger.log(`Documento processado com sucesso: ${documentId}`);
    } catch (error) {
      this.logger.error(`Erro ao processar documento ${documentId}:`, error);

      // Atualizar status para FAILED
      await this.prisma.document.update({
        where: { id: documentId },
        data: { status: DocumentStatus.FAILED },
      });
    }
  }

  private mapToResponseDto(document: any): DocumentResponseDto {
    return {
      id: document.id,
      filename: document.filename,
      originalName: document.originalName,
      mimeType: document.mimeType,
      size: document.size,
      status: document.status,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
      analysis: document.analysis ? {
        id: document.analysis.id,
        summary: document.analysis.summary,
        keywords: document.analysis.keywords,
        mindMap: document.analysis.mindMap,
        questions: document.analysis.questions,
        createdAt: document.analysis.createdAt,
        updatedAt: document.analysis.updatedAt,
      } : undefined,
    };
  }
}