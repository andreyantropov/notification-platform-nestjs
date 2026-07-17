import { Type } from 'class-transformer';
import {
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested,
} from 'class-validator';
import { CreateNotificationDto } from './create-notification.dto';

export class CreateNotificationBatchDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CreateNotificationDto)
  readonly items!: readonly CreateNotificationDto[];
}
