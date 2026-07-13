import { Module } from '@nestjs/common';
import { NotificationsService } from './delivery.service';
import { NotificationsController } from './delivery.controller';

@Module({
  providers: [NotificationsService],
  controllers: [NotificationsController],
})
export class NotificationsModule {}
