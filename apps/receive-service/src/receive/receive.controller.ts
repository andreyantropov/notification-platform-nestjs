import { Controller, Post, Body, UseGuards, HttpCode } from '@nestjs/common';
import { ReceiveService } from './receive.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { CreateNotificationBatchDto } from './dto/create-notification-batch.dto';
import { Notification } from '@app/shared';
import { JwtAuthGuard, GetClientId } from '../auth';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class ReceiveController {
  constructor(private readonly receiveService: ReceiveService) {}

  @Post()
  @HttpCode(202)
  createSingle(
    @Body() data: CreateNotificationDto,
    @GetClientId() clientId: string,
  ): Notification {
    return this.receiveService.receive(data, clientId);
  }

  @Post('batch')
  @HttpCode(202)
  createBatch(
    @Body() data: CreateNotificationBatchDto,
    @GetClientId() clientId: string,
  ): Notification[] {
    return data.notifications.map((singleDto) =>
      this.receiveService.receive(singleDto, clientId),
    );
  }
}
