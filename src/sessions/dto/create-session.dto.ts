import { IsEnum, IsOptional, IsString, IsArray, IsInt, Min, IsUUID } from 'class-validator';
import { StudyGoal } from '@prisma/client';

export class CreateSessionDto {
  @IsEnum(StudyGoal)
  studyGoal!: StudyGoal;

  @IsOptional()
  @IsUUID()
  documentId?: string;

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