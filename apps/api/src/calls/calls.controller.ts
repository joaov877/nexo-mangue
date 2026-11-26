import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard, Roles } from '../auth/auth.guard';
import { AuthUser, CurrentUser } from '../common/current-user';
import { CallsService } from './calls.service';

@Controller('startups/me/editais-sugeridos')
@UseGuards(AuthGuard)
@Roles('STARTUP')
export class CallsController {
  constructor(private readonly calls: CallsService) {}

  @Get()
  getSuggested(@CurrentUser() user: AuthUser) {
    return this.calls.getSuggestedForStartup(user.sub);
  }
}
