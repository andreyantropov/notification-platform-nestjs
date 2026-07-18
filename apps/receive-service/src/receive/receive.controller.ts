import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  Res,
} from '@nestjs/common';
import { ReceiveService } from './receive.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { CreateNotificationBatchDto } from './dto/create-notification-batch.dto';
import { JwtAuthGuard, GetClientId } from '../auth';
import { ServerResponse } from 'http';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class ReceiveController {
  constructor(private readonly receiveService: ReceiveService) {}

  @Post()
  @HttpCode(202)
  async createNotification(
    @Body() data: CreateNotificationDto,
    @GetClientId() clientId: string,
  ) {
    return await this.receiveService.receive(data, clientId);
  }

  @Post('batch')
  async createNotificationBatch(
    @Body() data: CreateNotificationBatchDto,
    @GetClientId() clientId: string,
    @Res({ passthrough: true }) res: ServerResponse,
  ) {
    const batchResult = await this.receiveService.receiveBatch(
      data.items,
      clientId,
    );

    const hasErrors =
      batchResult.summary.clientError > 0 ||
      batchResult.summary.serverError > 0;
    res.statusCode = hasErrors ? 207 : 202;

    return batchResult;
  }
}
