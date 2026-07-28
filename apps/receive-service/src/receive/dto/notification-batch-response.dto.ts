import { ApiProperty } from '@nestjs/swagger';
import { NotificationResponseDto } from './notification-response.dto';
import { Notification } from '@app/shared';

export class NotificationBatchResponseDto {
  @ApiProperty({
    type: [NotificationResponseDto],
    description: 'Массив успешно созданных уведомлений',
  })
  readonly items!: readonly Notification[];
}
