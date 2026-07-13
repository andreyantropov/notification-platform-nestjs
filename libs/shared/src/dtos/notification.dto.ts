import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsISO8601,
  IsEnum,
  IsArray,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { Mode } from '../enums/mode.enum';
import { ContactDto } from './contact.dto';
import { Notification } from '../interfaces/notification.interface';

export class NotificationDto implements Notification {
  @IsString()
  @IsNotEmpty()
  readonly id!: string;

  @IsString()
  @IsNotEmpty()
  readonly correlationId!: string;

  @IsString()
  @IsNotEmpty()
  readonly clientId!: string;

  @IsISO8601({})
  readonly createdAt!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ContactDto)
  readonly contacts!: ContactDto[];

  @IsString()
  @IsNotEmpty()
  readonly message!: string;

  @IsEnum(Mode)
  readonly mode!: Mode;
}
