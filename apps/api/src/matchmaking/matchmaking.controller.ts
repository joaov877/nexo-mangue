import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { AuthGuard } from '../auth/auth.guard';
import { AuthUser, CurrentUser } from '../common/current-user';
import { MatchmakingService } from './matchmaking.service';
import { STAGE_ORDER, StageValue } from './scoring';

class RecommendationQuery {
  @IsOptional()
  @IsIn(['MENTOR', 'INVESTOR'])
  kind?: 'MENTOR' | 'INVESTOR';

  @IsOptional()
  @IsString()
  sector?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsIn(STAGE_ORDER)
  stage?: StageValue;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  minScore?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

@Controller('matchmaking')
@UseGuards(AuthGuard)
export class MatchmakingController {
  constructor(private readonly matchmaking: MatchmakingService) {}

  /** GET /api/matchmaking/recommendations?kind=INVESTOR&sector=Fintech&minScore=50&limit=10 */
  @Get('recommendations')
  recommendations(@CurrentUser() user: AuthUser, @Query() query: RecommendationQuery) {
    return this.matchmaking.recommendations(user.sub, user.role, query);
  }
}
