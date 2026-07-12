import { Module } from '@nestjs/common';
import { NotificationsService } from './delivery.service';
import { NotificationsController } from './notifications.controller';

@Module({
  providers: [NotificationsService],
  controllers: [NotificationsController],
})
export class NotificationsModule {}
