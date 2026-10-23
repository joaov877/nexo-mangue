import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AuthUser, CurrentUser } from '../common/current-user';
import { OpportunitiesService } from './opportunities.service';

@Controller('opportunities')
@UseGuards(AuthGuard)
export class OpportunitiesController {
  constructor(private readonly opportunities: OpportunitiesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.opportunities.list(user.sub);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() body: {
    counterpartId?: string; title?: string; description?: string; expectedValue?: number; targetDate?: string;
  }) {
    return this.opportunities.create(user.sub, body);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() body: {
    title?: string; description?: string | null; stage?: any; nextStep?: string | null;
    expectedValue?: number | null; targetDate?: string | null; note?: string;
  }) {
    return this.opportunities.update(user.sub, id, body);
  }
}
