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
import { Notification, Mode, Contact, Provider } from '@app/shared';

class SendNotificationContactDto implements Contact {
  @IsEnum(Provider)
  type!: Provider;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  value!: string;
}

export class SendNotificationCommandDto implements Notification {
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
