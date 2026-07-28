import { Contact, Provider } from '@app/shared';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateNotificationContactDto implements Contact {
  @ApiProperty({
    enum: Provider,
    example: Provider.BITRIX,
    description: 'Тип канала отправки',
  })
  @IsEnum(Provider)
  readonly type!: Provider;

  @ApiProperty({
    example: '205',
    maxLength: 255,
    description: 'Адрес назначения (bitrix id/email)',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  readonly value!: string;
}
