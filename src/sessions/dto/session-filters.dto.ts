import { IsOptional, IsEnum, IsDateString, IsString, IsInt, Min } from 'class-validator';
import { StudyGoal, SessionStatus } from '@prisma/client';

export class SessionFiltersDto {
  @IsOptional()
  @IsEnum(StudyGoal)
  goal?: StudyGoal;

  @IsOptional()
  @IsEnum(SessionStatus)
  status?: SessionStatus;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  topic?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number = 20;
}