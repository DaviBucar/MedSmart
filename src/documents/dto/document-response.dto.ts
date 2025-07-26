import { DocumentStatus } from '@prisma/client';

export class DocumentResponseDto {
  id!: string;
  filename!: string;
  originalName!: string;
  mimeType!: string;
  size!: number;
  status!: DocumentStatus;
  createdAt!: Date;
  updatedAt!: Date;
  analysis?: DocumentAnalysisResponseDto;
}

export class DocumentAnalysisResponseDto {
  id!: string;
  summary!: string;
  keywords!: string[];
  mindMap!: any;
  questions!: any[];
  createdAt!: Date;
  updatedAt!: Date;
}