import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested,
} from 'class-validator';
import { CreateNotificationDto } from './create-notification.dto';
import { Type } from 'class-transformer';
import { CreateNotification } from '../types/create-notification.type';

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
  @ValidateNested({ each: true })
  @Type(() => CreateNotificationDto)
  readonly items!: readonly CreateNotification[];
}
