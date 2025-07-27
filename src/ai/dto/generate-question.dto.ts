import { IsOptional, IsEnum, IsString, IsArray, IsInt, Min, Max } from 'class-validator';
import { DifficultyLevel, BloomLevel } from '@prisma/client';

export class GenerateQuestionDto {
  @IsOptional()
  @IsString()
  topic?: string;

  @IsOptional()
  @IsEnum(DifficultyLevel)
  difficultyLevel?: DifficultyLevel;

  @IsOptional()
  @IsEnum(BloomLevel)
  bloomLevel?: BloomLevel;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  focusAreas?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  avoidTopics?: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  questionCount?: number = 1;

  @IsOptional()
  @IsString()
  context?: string;
}