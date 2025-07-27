import { IsEnum, IsOptional, IsString, IsArray, IsInt, Min, Max, IsBoolean } from 'class-validator';
import { StudyGoal, DifficultyLevel, SessionStatus } from '@prisma/client';

export class UpdateSessionDto {
  @IsOptional()
  @IsEnum(StudyGoal)
  studyGoal?: StudyGoal;

  @IsOptional()
  @IsEnum(SessionStatus)
  status?: SessionStatus;

  @IsOptional()
  @IsString()
  deviceType?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  topicsStudied?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  questionsAnswered?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  correctAnswers?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  performanceScore?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  focusScore?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  duration?: number;

  @IsOptional()
  @IsString()
  feedback?: string;

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

  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;
}