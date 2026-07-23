import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsISO8601,
  IsEnum,
  IsArray,
  ArrayMinSize,
  ValidateNested,
  ArrayMaxSize,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { Mode } from '../enums/mode.enum';
import { Provider } from '../enums/provider.enum';
import { Contact } from '../interfaces/contact.interface';
import { Notification } from '../interfaces/notification.interface';

class SendNotificationContactDto implements Contact {
  @IsEnum(Provider)
  type!: Provider;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  value!: string;
}

export class SendNotificationDto implements Notification {
  @IsUUID()
  readonly id!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  readonly correlationId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  readonly clientId!: string;

  @IsISO8601({})
  readonly createdAt!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2)
  @ValidateNested({ each: true })
  @Type(() => SendNotificationContactDto)
  readonly contacts!: readonly SendNotificationContactDto[];

  @IsString()
  @IsNotEmpty()
  @MaxLength(1024)
  readonly message!: string;

  @IsEnum(Mode)
  readonly mode!: Mode;
}
