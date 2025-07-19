import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  ArrayNotEmpty,
  ArrayMinSize,
  Min,
  Max,
} from 'class-validator';

export class UpdateProfileDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  weakSubjects!: string[];

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  strongSubjects!: string[];

  @IsNumber()
  @Min(0)
  @Max(1)
  accuracy!: number;

  @IsNumber()
  @Min(0)
  xp!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  studyHabitScore?: number;
}
