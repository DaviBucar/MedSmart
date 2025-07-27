import { IsString, IsEnum, IsOptional, IsNumber, IsBoolean, IsInt, Min, Max } from 'class-validator';
import { DifficultyLevel, BloomLevel } from '@prisma/client';

export class CreateQuestionInteractionDto {
  @IsString()
  questionId!: string;

  @IsString()
  topic!: string;

  @IsEnum(DifficultyLevel)
  difficultyLevel!: DifficultyLevel;

  @IsEnum(BloomLevel)
  bloomLevel!: BloomLevel;

  @IsInt()
  @Min(0)
  timeToAnswer!: number;

  @IsBoolean()
  isCorrect!: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  confidenceLevel?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  hintsUsed?: number;
}