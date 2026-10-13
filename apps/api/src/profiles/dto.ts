import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { STAGE_ORDER, StageValue } from '../matchmaking/scoring';

const upper = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.toUpperCase() : value);

class LocationDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  city!: string;

  @Transform(upper)
  @IsString()
  @Length(2, 2)
  state!: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  sectors!: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  impactAreas: string[] = [];
}

export class StartupProfileDto extends LocationDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  companyName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsIn(STAGE_ORDER)
  stage!: StageValue;

  @IsOptional()
  @IsInt()
  @Min(0)
  ticketNeeded?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  needs: string[] = [];
}

export class MentorProfileDto extends LocationDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  headline?: string;

  @IsArray()
  @IsIn(STAGE_ORDER, { each: true })
  stages!: StageValue[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(15)
  expertise: string[] = [];
}

export class InvestorProfileDto extends LocationDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  thesis?: string;

  @IsArray()
  @IsIn(STAGE_ORDER, { each: true })
  stages!: StageValue[];

  @IsInt()
  @Min(0)
  ticketMin!: number;

  @IsInt()
  @Min(0)
  ticketMax!: number;
}
