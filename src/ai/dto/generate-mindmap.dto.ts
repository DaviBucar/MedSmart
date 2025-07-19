import { IsString } from 'class-validator';
export class GenerateMindMapDto {
  @IsString()
  text!: string;
}
