import { IsUUID, IsOptional, IsInt, Min } from 'class-validator';

export class AddToDeckDto {
  @IsUUID()
  flashcardId!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}