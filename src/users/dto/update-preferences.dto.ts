import { IsString, IsInt, Min } from 'class-validator';

export class UpdatePreferencesDto {
  @IsString()
  preferredStudyMethod!: string;

  @IsInt()
  @Min(1)
  dailyGoal!: number;

  @IsString()
  preferredTimeOfDay!: string;
}
