import { IsString, IsOptional, IsArray, IsEnum, IsUUID, MaxLength, MinLength } from 'class-validator';
import { FlashcardType, DifficultyLevel } from '@prisma/client';

export class CreateFlashcardDto {
  @IsEnum(FlashcardType)
  type!: FlashcardType;

  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  front!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  back!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  topic!: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsEnum(DifficultyLevel)
  @IsOptional()
  difficultyLevel?: DifficultyLevel;

  @IsUUID()
  @IsOptional()
  sessionId?: string;

  @IsUUID()
  @IsOptional()
  documentId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  sourceContent?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  sourceType?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  sourceReference?: string;
}