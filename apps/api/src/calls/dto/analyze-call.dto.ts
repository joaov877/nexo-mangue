import { IsString, IsUrl, MinLength } from 'class-validator';

export class AnalyzeCallDto {
  @IsUrl({ require_protocol: true })
  sourceUrl!: string;

  @IsString()
  @MinLength(100)
  sourceText!: string;
}