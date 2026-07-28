import { Controller, Post, Body, UseGuards, HttpCode } from '@nestjs/common';
import { ReceiveService } from './receive.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { CreateNotificationBatchDto } from './dto/create-notification-batch.dto';
import { AppAuthGuard, GetClientId } from '../auth';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { NotificationResponseDto } from './dto/notification-response.dto';
import { Mode, Provider } from '@app/shared';
import { NotificationBatchResponseDto } from './dto/notification-batch-response.dto';
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
  @HttpCode(202)
  @ApiOperation({
    summary: 'Пакетное создание уведомлений (до 50 штук)',
    description:
      'Принимает пакет уведомлений (до 50 штук). Для каждого уведомления генерирует UUID, проставляет дату создания и отправляет в очередь.',
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
    },
  })
  @ApiResponse({
    status: 202,
    description: 'Все уведомления в пакете успешно прошли валидацию и приняты.',
    type: NotificationBatchResponseDto,
    example: {
      items: [
        {
          id: 'uuid-1',
          correlationId: 'req-101',
          clientId: 'client_system_name',
          createdAt: '2026-07-20T11:00:00.000Z',
          contacts: [{ type: Provider.BITRIX, value: '205' }],
          message: 'Валидное уведомление',
          mode: Mode.SEQUENTIAL,
        },
        {
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
      ],
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Ошибка валидации входных данных.',
  })
  async createNotificationBatch(
    @Body() data: CreateNotificationBatchDto,
    @GetClientId() clientId: string,
  ) {
    const result = await this.receiveService.receiveBatch(data.items, clientId);

    return { items: result };
  }
}
