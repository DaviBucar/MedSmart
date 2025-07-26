import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class UploadDocumentDto {
  @IsOptional()
  @IsString()
  description?: string;
}