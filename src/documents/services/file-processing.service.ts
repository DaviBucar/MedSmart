import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import pdfParse from 'pdf-parse';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FileProcessingService {
  private readonly logger = new Logger(FileProcessingService.name);
  private readonly uploadDir: string;
  private readonly maxFileSize: number;
  private readonly allowedMimeTypes: string[];

  constructor(private configService: ConfigService) {
    this.uploadDir = this.configService.get<string>('upload.uploadDir') || './uploads';
    this.maxFileSize = this.configService.get<number>('upload.maxFileSize') || 10485760;
    this.allowedMimeTypes = this.configService.get<string[]>('upload.allowedMimeTypes') || ['application/pdf'];
    
    this.initializeUploadDir();
  }

  private async initializeUploadDir(): Promise<void> {
    try {
      await fs.access(this.uploadDir);
      this.logger.log(`Diretório de upload verificado: ${this.uploadDir}`);
    } catch {
      try {
        await fs.mkdir(this.uploadDir, { recursive: true });
        this.logger.log(`Diretório de upload criado: ${this.uploadDir}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        this.logger.error(`Erro ao criar diretório de upload: ${errorMessage}`);
      }
    }
  }

  async saveFile(file: Express.Multer.File): Promise<{ filename: string; filePath: string }> {
    if (!file) {
      throw new HttpException(
        'Nenhum arquivo foi fornecido',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      await this.ensureUploadDirExists();

      const fileExtension = path.extname(file.originalname);
      const filename = `${uuidv4()}${fileExtension}`;
      const filePath = path.join(this.uploadDir, filename);

      await fs.writeFile(filePath, file.buffer);
      
      this.logger.log(`Arquivo salvo: ${filename} (${file.size} bytes)`);
      return { filename, filePath };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error('Erro ao salvar arquivo:', errorMessage);
      throw new HttpException(
        'Erro ao salvar arquivo no servidor',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async extractTextFromPdf(filePath: string): Promise<string> {
    if (!filePath) {
      throw new HttpException(
        'Caminho do arquivo não fornecido',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      await fs.access(filePath);

      const fileBuffer = await fs.readFile(filePath);
      
      if (fileBuffer.length === 0) {
        throw new Error('Arquivo está vazio');
      }

      const pdfData = await pdfParse(fileBuffer);
      
      const text = pdfData.text?.trim();
      if (!text || text.length === 0) {
        throw new Error('Nenhum texto encontrado no PDF');
      }

      this.logger.log(`Texto extraído do PDF: ${text.length} caracteres`);
      return text;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error(`Erro ao extrair texto do PDF (${filePath}):`, errorMessage);
      
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        throw new HttpException(
          'Arquivo PDF não encontrado',
          HttpStatus.NOT_FOUND,
        );
      }
      
      throw new HttpException(
        'Erro ao extrair texto do PDF. Verifique se o arquivo é um PDF válido.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    if (!filePath) {
      this.logger.warn('Tentativa de deletar arquivo com caminho vazio');
      return;
    }

    try {
      await fs.access(filePath);
      await fs.unlink(filePath);
      this.logger.log(`Arquivo deletado: ${filePath}`);
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        this.logger.warn(`Arquivo não encontrado para deleção: ${filePath}`);
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        this.logger.error(`Erro ao deletar arquivo ${filePath}:`, errorMessage);
      }
    }
  }

  validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new HttpException(
        'Nenhum arquivo foi fornecido',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Validar tipo MIME
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new HttpException(
        `Tipo de arquivo não permitido. Apenas os seguintes tipos são aceitos: ${this.allowedMimeTypes.join(', ')}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // Validar tamanho do arquivo
    if (file.size > this.maxFileSize) {
      const maxSizeMB = (this.maxFileSize / 1024 / 1024).toFixed(2);
      const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
      throw new HttpException(
        `Arquivo muito grande (${fileSizeMB}MB). Tamanho máximo permitido: ${maxSizeMB}MB`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // Validar se o arquivo tem conteúdo
    if (file.size === 0) {
      throw new HttpException(
        'Arquivo está vazio',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Validar nome do arquivo
    if (!file.originalname || file.originalname.trim().length === 0) {
      throw new HttpException(
        'Nome do arquivo é obrigatório',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Validar extensão do arquivo
    const fileExtension = path.extname(file.originalname).toLowerCase();
    if (fileExtension !== '.pdf') {
      throw new HttpException(
        'Apenas arquivos PDF são permitidos',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async ensureUploadDirExists(): Promise<void> {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
      this.logger.log(`Diretório de upload criado: ${this.uploadDir}`);
    }
  }

  // Método utilitário para obter informações do arquivo
  getFileInfo(file: Express.Multer.File): { 
    name: string; 
    size: string; 
    type: string; 
    extension: string; 
  } {
    return {
      name: file.originalname,
      size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
      type: file.mimetype,
      extension: path.extname(file.originalname).toLowerCase(),
    };
  }

  // Método para verificar se um arquivo existe
  async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}