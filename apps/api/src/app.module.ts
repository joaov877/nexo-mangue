import { Controller, Get, Module } from '@nestjs/common';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { ConnectionsModule } from './connections/connections.module';
import { MatchmakingModule } from './matchmaking/matchmaking.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProfilesModule } from './profiles/profiles.module';
import { OpportunitiesModule } from './opportunities/opportunities.module';
import { CallsModule } from './calls/calls.module';

@Controller('health')
class HealthController {
  @Get()
  check() {
    return { status: 'ok' };
  }
}

@Module({
  imports: [PrismaModule, AuditModule, AuthModule, ProfilesModule, MatchmakingModule, ConnectionsModule, OpportunitiesModule, CallsModule],
  controllers: [HealthController],
})
export class AppModule {}
