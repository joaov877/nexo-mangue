import { Module } from '@nestjs/common';
import { ConnectionsController } from './connections.controller';
import { ConnectionsService } from './connections.service';
import { NotificationsService } from './notifications.service';

@Module({ controllers: [ConnectionsController], providers: [ConnectionsService, NotificationsService] })
export class ConnectionsModule {}
