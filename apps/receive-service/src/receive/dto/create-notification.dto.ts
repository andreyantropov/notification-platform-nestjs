import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsArray,
  ArrayMinSize,
  ValidateNested,
  IsOptional,
  ArrayMaxSize,
  MaxLength,
} from 'class-validator';
import { Mode, Contact, Provider } from '@app/shared';
import { CreateNotification } from '../types/create-notification.type';

class CreateNotificationContactDto implements Contact {
  @IsEnum(Provider)
  type!: Provider;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  value!: string;
}

export class CreateNotificationDto implements CreateNotification {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  readonly correlationId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2)
  @ValidateNested({ each: true })
  @Type(() => CreateNotificationContactDto)
  readonly contacts!: readonly CreateNotificationContactDto[];

  @IsString()
  @IsNotEmpty()
  @MaxLength(1024)
  readonly message!: string;

  @IsEnum(Mode)
  @IsOptional()
  readonly mode = Mode.SEQUENTIAL;
}
