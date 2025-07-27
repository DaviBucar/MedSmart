import { IsString, IsEnum, IsOptional, IsBoolean, IsInt, Min, Max } from 'class-validator';

export enum RecommendationType {
  TOPIC = 'TOPIC',
  DURATION = 'DURATION',
  DIFFICULTY = 'DIFFICULTY',
  SCHEDULE = 'SCHEDULE',
}

export class SessionRecommendationDto {
  @IsString()
  recommendationId!: string;

  @IsEnum(RecommendationType)
  type!: RecommendationType;

  @IsBoolean()
  wasHelpful!: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsString()
  feedback?: string;
}