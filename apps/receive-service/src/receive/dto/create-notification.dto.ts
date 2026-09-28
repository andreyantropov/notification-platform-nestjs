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
import { Mode } from '@app/shared';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateNotificationContactDto } from './create-notification-contact.dto';

export class CreateNotificationDto {
  @ApiProperty({
    example: 'req-12345',
    maxLength: 64,
    description: 'Уникальный ID запроса для идемпотентности',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  readonly correlationId!: string;

  @ApiProperty({
    type: [CreateNotificationContactDto],
    minItems: 1,
    maxItems: 2,
    description: 'Список контактов',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2)
  @ValidateNested({ each: true })
  @Type(() => CreateNotificationContactDto)
  readonly contacts!: readonly CreateNotificationContactDto[];

  @ApiProperty({
    example: 'Тестовое уведомление',
    maxLength: 1024,
    description: 'Текст уведомления',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1024)
  readonly message!: string;

  @ApiPropertyOptional({
    enum: Mode,
    default: Mode.SEQUENTIAL,
    description: 'Режим отправки уведомления',
  })
  @IsEnum(Mode)
  @IsOptional()
  readonly mode = Mode.SEQUENTIAL;
}
