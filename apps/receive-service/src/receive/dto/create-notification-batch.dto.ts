import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { CreateNotificationDto } from './create-notification.dto';

export class CreateNotificationBatchDto {
  @ApiProperty({
    type: [CreateNotificationDto],
    minItems: 1,
    maxItems: 50,
    description: 'Массив уведомлений для пакетной обработки',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  readonly items!: readonly unknown[];
}
