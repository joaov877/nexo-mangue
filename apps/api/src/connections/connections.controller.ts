import { Controller, Delete, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AuthUser, CurrentUser } from '../common/current-user';
import { ConnectionsService } from './connections.service';

@Controller('connections')
@UseGuards(AuthGuard)
export class ConnectionsController {
  constructor(private readonly connections: ConnectionsService) {}

  @Get()
  mutual(@CurrentUser() user: AuthUser) {
    return this.connections.mutual(user.sub);
  }

  @Get('pending')
  pending(@CurrentUser() user: AuthUser) {
    return this.connections.pending(user.sub);
  }

  @Post(':userId/interest')
  interest(@CurrentUser() user: AuthUser, @Param('userId', ParseUUIDPipe) userId: string) {
    return this.connections.expressInterest(user.sub, user.role, userId);
  }

  @Delete(':userId/interest')
  withdraw(@CurrentUser() user: AuthUser, @Param('userId', ParseUUIDPipe) userId: string) {
    return this.connections.withdraw(user.sub, userId);
  }
}
