import { IsString, IsInt, Min } from 'class-validator';
export class GenerateQuestionsDto {
  @IsString()
  text!: string;

  @IsInt()
  @Min(1)
  count!: number;
}
