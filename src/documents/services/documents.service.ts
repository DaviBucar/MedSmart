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
      this.fileProcessingService.validateFile(file);

      const { filename, filePath } = await this.fileProcessingService.saveFile(file);

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

      // Iniciar processamento assíncrono imediatamente
      setImmediate(() => this.processDocumentAsync(document.id));

      // Retornar documento com status PROCESSING para o teste
      const updatedDocument = await this.prisma.document.update({
        where: { id: document.id },
        data: { status: DocumentStatus.PROCESSING },
      });

      return this.mapToResponseDto(updatedDocument);
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

    await this.fileProcessingService.deleteFile(document.filePath);

    await this.prisma.document.delete({
      where: { id },
    });

    this.logger.log(`Documento deletado: ${id}`);
  }

  private async processDocumentAsync(documentId: string): Promise<void> {
    let documentExists = true;
    
    try {
      // Verificar se o documento ainda existe
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
      });

      if (!document) {
        this.logger.warn(`Documento ${documentId} não encontrado para processamento`);
        return;
      }

      this.logger.log(`Iniciando processamento do documento: ${documentId}`);

      // Extrair texto do PDF
      let extractedText: string;
      try {
        extractedText = await this.fileProcessingService.extractTextFromPdf(document.filePath);
        
        // Verificar se há texto extraído
        if (!extractedText || extractedText.trim().length === 0) {
          throw new Error('PDF não contém texto extraível');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        this.logger.error(`Erro ao extrair texto do PDF ${documentId}:`, errorMessage);
        
        // Verificar se o documento ainda existe antes de atualizar
        const existingDoc = await this.prisma.document.findUnique({
          where: { id: documentId },
        });
        
        if (existingDoc) {
          try {
            await this.prisma.document.update({
              where: { id: documentId },
              data: { 
                status: DocumentStatus.FAILED,
                extractedText: `Erro: ${errorMessage}`
              },
            });
          } catch (updateError) {
            this.logger.warn(`Documento ${documentId} foi deletado durante o processamento`);
            documentExists = false;
          }
        } else {
          documentExists = false;
        }
        return;
      }

      // Verificar se o documento ainda existe antes de continuar
      const docCheck = await this.prisma.document.findUnique({
        where: { id: documentId },
      });
      
      if (!docCheck) {
        this.logger.warn(`Documento ${documentId} foi deletado durante o processamento`);
        return;
      }

      // Atualizar documento com texto extraído
      try {
        await this.prisma.document.update({
          where: { id: documentId },
          data: { extractedText },
        });
      } catch (updateError) {
        this.logger.warn(`Documento ${documentId} foi deletado durante a atualização`);
        return;
      }

      // Analisar texto com IA (opcional - não falhar se der erro)
      try {
        const analysis = await this.deepSeekService.analyzeText(extractedText);
        
        // Verificar novamente se o documento existe antes de criar análise
        const docForAnalysis = await this.prisma.document.findUnique({
          where: { id: documentId },
        });
        
        if (docForAnalysis) {
          await this.prisma.documentAnalysis.create({
            data: {
              documentId,
              summary: analysis.summary.overview,
              keywords: analysis.keywords.essential,
              mindMap: JSON.stringify(analysis.mindMap),
              questions: JSON.stringify(analysis.questions),
            },
          });
        }
      } catch (analysisError) {
        this.logger.warn(`Erro na análise de IA para documento ${documentId}:`, analysisError);
        // Continuar sem análise - o documento ainda é válido
      }

      // Atualizar status para COMPLETED (verificar se ainda existe)
      try {
        const finalDoc = await this.prisma.document.findUnique({
          where: { id: documentId },
        });
        
        if (finalDoc) {
          await this.prisma.document.update({
            where: { id: documentId },
            data: { status: DocumentStatus.COMPLETED },
          });
          this.logger.log(`Documento processado com sucesso: ${documentId}`);
        }
      } catch (finalUpdateError) {
        this.logger.warn(`Documento ${documentId} foi deletado antes da finalização`);
      }

    } catch (error) {
      this.logger.error(`Erro ao processar documento ${documentId}:`, error);

      if (documentExists) {
        try {
          // Verificar se o documento ainda existe antes de atualizar
          const document = await this.prisma.document.findUnique({
            where: { id: documentId },
          });

          if (document) {
            await this.prisma.document.update({
              where: { id: documentId },
              data: { status: DocumentStatus.FAILED },
            });
          }
        } catch (updateError) {
          this.logger.error(`Erro ao atualizar status de falha do documento ${documentId}:`, updateError);
        }
      }
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