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
  @IsNotEmpty({ message: 'Идентификатор id обязателен' })
  readonly id!: string;

  @IsString()
  @IsNotEmpty({ message: 'correlationId обязателен для трейсинга' })
  readonly correlationId!: string;

  @IsString()
  @IsNotEmpty({ message: 'clientId обязателен для идентификации отправителя' })
  readonly clientId!: string;

  @IsISO8601({}, { message: 'createdAt должен быть валидной строкой ISO8601' })
  readonly createdAt!: string;

  @IsArray()
  @ArrayMinSize(1, {
    message: 'Должен быть указан минимум один контакт для отправки',
  })
  @ValidateNested({ each: true })
  @Type(() => ContactDto)
  readonly contacts!: ContactDto[];

  @IsString()
  @IsNotEmpty({ message: 'Текст сообщения не должен быть пустым' })
  readonly message!: string;

  @IsEnum(Mode, { message: 'Указан некорректный режим отправки mode' })
  readonly mode!: Mode;
}
