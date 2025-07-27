import { IsEnum, IsOptional, IsString, IsArray, IsInt, Min } from 'class-validator';
import { StudyGoal, DifficultyLevel } from '@prisma/client';

export class CreateSessionDto {
  @IsEnum(StudyGoal)
  studyGoal!: StudyGoal;

  @IsEnum(DifficultyLevel)
  difficultyLevel!: DifficultyLevel;

  @IsOptional()
  @IsString()
  deviceType?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  plannedTopics?: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  plannedDurationMinutes?: number;

  @IsOptional()
  @IsString()
  environment?: string;
}