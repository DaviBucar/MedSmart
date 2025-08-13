import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';

export class CreateDeckDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(7) // Formato hex color
  color?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsBoolean()
  allowSharing?: boolean;
}