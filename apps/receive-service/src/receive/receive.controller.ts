import { Controller, Post, Body, UseGuards, HttpCode } from '@nestjs/common';
import { ReceiveService } from './receive.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { CreateNotificationBatchDto } from './dto/create-notification-batch.dto';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { NotificationResponseDto } from './dto/notification-response.dto';
import { NotificationBatchResponseDto } from './dto/notification-batch-response.dto';
import { GetClientId } from '../auth/decorators/get-client-id.decorator';
import { AppAuthGuard } from '../auth/guards/app-auth.guard';

@ApiTags('Notifications')
@ApiBearerAuth()
@ApiResponse({
  status: 401,
  description: 'Неавторизованный запрос (отсутствует или просрочен JWT).',
})
@Controller('notifications')
@UseGuards(AppAuthGuard)
export class ReceiveController {
  constructor(private readonly receiveService: ReceiveService) {}

  @Post()
  @HttpCode(202)
  @ApiOperation({
    summary: 'Отправка одиночного уведомления',
    description:
      'Принимает объект уведомления, генерирует UUID, проставляет дату создания и отправляет в очередь.',
  })
  @ApiResponse({
    status: 202,
    description: 'Уведомление успешно валидировано и принято в обработку.',
    type: NotificationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Ошибка валидации входных данных.',
  })
  async createNotification(
    @Body() data: CreateNotificationDto,
    @GetClientId() clientId: string,
  ): Promise<NotificationResponseDto> {
    return await this.receiveService.receive(data, clientId);
  }

  @Post('batch')
  @HttpCode(202)
  @ApiOperation({
    summary: 'Пакетное создание уведомлений (до 50 штук)',
    description:
      'Принимает пакет уведомлений (до 50 штук). Для каждого уведомления генерирует UUID, проставляет дату создания и отправляет в очередь.',
  })
  @ApiResponse({
    status: 202,
    description: 'Пакет уведомлений успешно валидирован и принят в обработку.',
    type: NotificationBatchResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Ошибка валидации входных данных.',
  })
  async createNotificationBatch(
    @Body() data: CreateNotificationBatchDto,
    @GetClientId() clientId: string,
  ): Promise<NotificationBatchResponseDto> {
    const result = await this.receiveService.receiveBatch(data.items, clientId);

    return { items: result };
  }
}
