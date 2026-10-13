import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AuthUser, CurrentUser } from '../common/current-user';
import { ProfilesService } from './profiles.service';

@Controller('profiles')
@UseGuards(AuthGuard)
export class ProfilesController {
  constructor(private readonly profiles: ProfilesService) {}

  @Get('me')
  getMine(@CurrentUser() user: AuthUser) {
    return this.profiles.getMine(user.sub, user.role);
  }

  /** O corpo depende do tipo de perfil; a validação é feita no service. */
  @Put('me')
  upsertMine(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.profiles.upsertMine(user.sub, user.role, body);
  }
}
