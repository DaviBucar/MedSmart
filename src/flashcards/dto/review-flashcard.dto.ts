import { IsEnum, IsOptional, IsNumber, IsString, IsUUID, Min, Max } from 'class-validator';
import { ReviewResult } from '@prisma/client';

export class ReviewFlashcardDto {
  @IsEnum(ReviewResult)
  result!: ReviewResult;

  @IsNumber()
  @Min(0)
  @IsOptional()
  responseTime?: number;

  @IsNumber()
  @Min(1)
  @Max(5)
  @IsOptional()
  confidence?: number;

  @IsString()
  @IsOptional()
  deviceType?: string;

  @IsString()
  @IsOptional()
  studyEnvironment?: string;

  @IsUUID()
  @IsOptional()
  sessionId?: string;
}