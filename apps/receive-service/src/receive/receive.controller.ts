import { Controller, Post, Body } from '@nestjs/common';
import { ReceiveService } from './receive.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { CreateNotificationBatchDto } from './dto/create-notification-batch.dto';
import { Notification } from '@app/shared';

@Controller('notifications')
export class ReceiveController {
  constructor(private readonly receiveService: ReceiveService) {}

  @Post()
  createSingle(@Body() dto: CreateNotificationDto): Notification {
    const mockClientId = 'system-client-id';
    return this.receiveService.receive(dto, mockClientId);
  }

  @Post('batch')
  createBatch(@Body() dto: CreateNotificationBatchDto): Notification[] {
    const mockClientId = 'system-client-id';

    return dto.notifications.map((singleDto) =>
      this.receiveService.receive(singleDto, mockClientId),
    );
  }
}
