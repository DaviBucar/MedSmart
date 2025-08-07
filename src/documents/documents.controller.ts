import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Request,
  HttpStatus,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DocumentsService } from './services/documents.service';
import { DocumentResponseDto } from './dto/document-response.dto';
import { validate as isUUID } from 'uuid';

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private documentsService: DocumentsService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ): Promise<{ message: string; document: DocumentResponseDto }> {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo foi enviado');
    }

    const document = await this.documentsService.uploadDocument(file, req.user.id);

    return {
      message: 'Documento enviado com sucesso. O processamento foi iniciado.',
      document,
    };
  }

  @Get()
  async getUserDocuments(@Request() req): Promise<DocumentResponseDto[]> {
    return this.documentsService.getUserDocuments(req.user.id);
  }

  @Get(':id')
  async getDocument(
    @Param('id') id: string,
    @Request() req,
  ): Promise<DocumentResponseDto> {
    // Validate UUID format manually to return 404 for invalid IDs
    if (!isUUID(id)) {
      throw new NotFoundException('Documento não encontrado');
    }
    
    return this.documentsService.getDocument(id, req.user.id);
  }

  @Delete(':id')
  async deleteDocument(
    @Param('id') id: string,
    @Request() req,
  ): Promise<{ message: string }> {
    // Validate UUID format manually to return 404 for invalid IDs
    if (!isUUID(id)) {
      throw new NotFoundException('Documento não encontrado');
    }
    
    await this.documentsService.deleteDocument(id, req.user.id);
    return { message: 'Documento deletado com sucesso' };
  }
}