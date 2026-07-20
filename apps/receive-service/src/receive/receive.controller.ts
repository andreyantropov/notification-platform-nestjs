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
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { NotificationBatchResponseDto } from './dto/notification-batch-response.dto';
import { NotificationResponseDto } from './dto/notification-response.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard)
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
  @ApiResponse({
    status: 401,
    description: 'Неавторизованный запрос (отсутствует или просрочен JWT).',
  })
  async createNotification(
    @Body() data: CreateNotificationDto,
    @GetClientId() clientId: string,
  ) {
    return await this.receiveService.receive(data, clientId);
  }

  @Post('batch')
  @ApiOperation({
    summary: 'Пакетное создание уведомлений (до 50 штук)',
    description:
      'Позволяет отправить массив уведомлений. Валидация происходит внутри сервиса для каждого элемента отдельно. Если весь пакет валиден, возвращается статус 202. Если хотя бы одно уведомление содержит ошибку, возвращается статус 207.',
  })
  @ApiResponse({
    status: 202,
    description: 'Все уведомления в пакете успешно прошли валидацию и приняты.',
    type: NotificationBatchResponseDto,
  })
  @ApiResponse({
    status: 207,
    description:
      'Частичный успех. Некоторые уведомления отклонены из-за ошибок валидации или внутренних сбоев.',
    type: NotificationBatchResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Неавторизованный запрос (отсутствует или просрочен JWT).',
  })
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
