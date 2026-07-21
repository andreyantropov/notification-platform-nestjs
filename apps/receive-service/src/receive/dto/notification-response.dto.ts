import { Contact, Mode } from '@app/shared';
import { ApiProperty } from '@nestjs/swagger';
import { CreateNotificationContactDto } from './create-notification-contact.dto';

export class NotificationResponseDto {
  @ApiProperty({
    example: '764b815a-9694-4d1a-bf41-692e92ec4cb8',
    description:
      'Внутренний уникальный идентификатор уведомления в формате UUID v4',
  })
  id!: string;

  @ApiProperty({
    example: 'req-12345',
    description: 'Уникальный ID запроса для идемпотентности',
  })
  correlationId!: string;

  @ApiProperty({
    example: 'client_system_name',
    description:
      'Идентификатор системы-отправителя (определяется по JWT-токену)',
  })
  clientId!: string;

  @ApiProperty({
    example: '2026-07-20T11:00:00.000Z',
    description: 'Дата и время создания уведомления в формате ISO 8601',
  })
  createdAt!: string;

  @ApiProperty({
    type: [CreateNotificationContactDto],
    description: 'Список контактов',
  })
  contacts!: readonly Contact[];

  @ApiProperty({
    example: 'Тестовое уведомление',
    description: 'Текст уведомления',
  })
  message!: string;

  @ApiProperty({
    enum: Mode,
    example: Mode.SEQUENTIAL,
    description: 'Режим отправки уведомления',
  })
  mode!: Mode;
}
