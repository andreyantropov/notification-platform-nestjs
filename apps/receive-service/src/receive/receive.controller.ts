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
import { AppAuthGuard, GetClientId } from '../auth';
import { ServerResponse } from 'http';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { NotificationBatchResponseDto } from './dto/notification-batch-response.dto';
import { NotificationResponseDto } from './dto/notification-response.dto';
import { BatchResultStatus } from './types/batch-result-status.enum';
import { Mode, Provider } from '@app/shared';
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
  ) {
    return await this.receiveService.receive(data, clientId);
  }

  @Post('batch')
  @ApiOperation({
    summary: 'Пакетное создание уведомлений (до 50 штук)',
    description:
      'Позволяет отправить массив уведомлений. Валидация происходит внутри сервиса для каждого элемента отдельно. Если весь пакет валиден, возвращается статус 202. Если хотя бы одно уведомление содержит ошибку, возвращается статус 207.',
  })
  @ApiBody({
    type: CreateNotificationBatchDto,
    examples: {
      'Валидный пакет (для теста 202)': {
        summary: 'Полностью валидные данные',
        value: {
          items: [
            {
              correlationId: 'req-101',
              contacts: [{ type: Provider.BITRIX, value: '205' }],
              message: 'Валидное уведомление',
            },
            {
              correlationId: 'req-102',
              contacts: [
                { type: Provider.BITRIX, value: '799' },
                { type: Provider.EMAIL, value: 'user@example.com' },
              ],
              message: 'И еще одно валидное уведомление',
              mode: Mode.BROADCAST,
            },
          ],
        },
      },
      'Частично битый пакет (для теста 207)': {
        summary: 'Пакет, где второе уведомление с ошибкой',
        value: {
          items: [
            {
              correlationId: 'req-101',
              contacts: [{ type: Provider.BITRIX, value: '205' }],
              message: 'Валидное уведомление',
              mode: Mode.SEQUENTIAL,
            },
            {
              correlationId: 'req-102',
              contacts: [
                { type: Provider.BITRIX, value: '799' },
                { type: Provider.EMAIL, value: 'user@example.com' },
              ],
              message: 'Невалидное уведомление',
              mode: 'invalid_mode',
            },
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 202,
    description: 'Все уведомления в пакете успешно прошли валидацию и приняты.',
    type: NotificationBatchResponseDto,
    example: {
      total: 2,
      success: 2,
      clientError: 0,
      serverError: 0,
      items: [
        {
          status: BatchResultStatus.SUCCESS,
          data: {
            id: 'uuid-1',
            correlationId: 'req-101',
            clientId: 'client_system_name',
            createdAt: '2026-07-20T11:00:00.000Z',
            contacts: [{ type: Provider.BITRIX, value: '205' }],
            message: 'Валидное уведомление',
            mode: Mode.SEQUENTIAL,
          },
        },
        {
          status: BatchResultStatus.SUCCESS,
          data: {
            id: 'uuid-2',
            correlationId: 'req-102',
            clientId: 'client_system_name',
            createdAt: '2026-07-20T11:00:00.000Z',
            contacts: [
              { type: Provider.BITRIX, value: '799' },
              { type: Provider.EMAIL, value: 'user@example.com' },
            ],
            message: 'И еще одно валидное уведомление',
            mode: Mode.BROADCAST,
          },
        },
      ],
    },
  })
  @ApiResponse({
    status: 207,
    description:
      'Частичный успех. Некоторые уведомления отклонены из-за ошибок валидации.',
    type: NotificationBatchResponseDto,
    example: {
      total: 2,
      success: 1,
      clientError: 1,
      serverError: 0,
      items: [
        {
          status: BatchResultStatus.SUCCESS,
          data: {
            id: 'uuid-1',
            correlationId: 'req-101',
            clientId: 'client_system_name',
            createdAt: '2026-07-20T11:00:00.000Z',
            contacts: [{ type: Provider.BITRIX, value: '205' }],
            message: 'Валидное уведомление',
            mode: Mode.SEQUENTIAL,
          },
        },
        {
          status: BatchResultStatus.CLIENT_ERROR,
          data: {
            correlationId: 'uuid-2',
            contacts: [
              { type: Provider.BITRIX, value: '799' },
              { type: Provider.EMAIL, value: 'user@example.com' },
            ],
            message: 'Невалидное уведомление',
            mode: 'invalid_mode',
          },
          error:
            'Bad Request: mode must be one of sequential, race, broadcast.',
        },
      ],
    },
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
      batchResult.clientError > 0 || batchResult.serverError > 0;
    res.statusCode = hasErrors ? 207 : 202;

    return batchResult;
  }
}
