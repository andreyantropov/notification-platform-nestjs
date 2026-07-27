import { ApiProperty } from '@nestjs/swagger';
import { BatchResultStatus } from '../types/batch-result-status.enum';
import { BatchItemResponse } from '../types/batch-item-response.interface';
import { BatchResponse } from '../types/batch-response.interface';
import { NotificationResponseDto } from './notification-response.dto';

class NotificationBatchItemResponseDto implements BatchItemResponse {
  @ApiProperty({
    description: 'Статус обработки конкретного уведомления в пакете',
    enum: BatchResultStatus,
    example: BatchResultStatus.SUCCESS,
  })
  status!: BatchResultStatus;

  @ApiProperty({
    description:
      'При успехе возвращает обогащенный объект созданного уведомления. При ошибке возвращает исходный объект, присланный клиентом',
    type: NotificationResponseDto,
  })
  data!: unknown;

  @ApiProperty({
    description: 'Текст ошибки валидации или системного сбоя"',
    example: 'Bad Request: message must be a string',
    nullable: true,
    required: false,
  })
  error?: unknown;
}

export class NotificationBatchResponseDto implements BatchResponse {
  @ApiProperty({
    description: 'Общее количество переданных в пакете уведомлений',
    example: 3,
  })
  total!: number;

  @ApiProperty({
    description: 'Количество успешно принятых и обработанных уведомлений',
    example: 2,
  })
  success!: number;

  @ApiProperty({
    description:
      'Количество уведомлений, отклоненных из-за ошибок со стороны клиента',
    example: 1,
  })
  clientError!: number;

  @ApiProperty({
    description:
      'Количество уведомлений, упавших из-за непредвиденных внутренних ошибок сервера',
    example: 0,
  })
  serverError!: number;

  @ApiProperty({
    description:
      'Массив с детализированными результатами обработки по каждому элементу пакета',
    type: [NotificationBatchItemResponseDto],
  })
  items!: NotificationBatchItemResponseDto[];
}
