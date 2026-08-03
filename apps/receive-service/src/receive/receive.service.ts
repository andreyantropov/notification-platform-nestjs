import { NOTIFICATION_RECEIVED, Notification } from '@app/shared';
import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ClientProxy } from '@nestjs/microservices';
import { RMQ_CLIENT } from './receive.constants';
import { firstValueFrom } from 'rxjs';
import { SendNotificationDto } from '@app/shared';
import { MetricService } from 'nestjs-otel';
import { Counter } from '@opentelemetry/api';
import { Logger } from 'nestjs-pino';
import { plainToInstance } from 'class-transformer';

type CreateNotification = Omit<Notification, 'id' | 'clientId' | 'createdAt'>;

@Injectable()
export class ReceiveService {
  private readonly receivedCounter: Counter;

  constructor(
    @Inject(RMQ_CLIENT)
    private readonly rmqClient: ClientProxy,
    private readonly metrics: MetricService,
    private readonly logger: Logger,
  ) {
    this.receivedCounter = this.metrics.getCounter(
      'notification_incoming_received_total',
      {
        description: 'Количество принятых и отправленных в очередь уведомлений',
      },
    );
  }

  async receive(
    createNotification: CreateNotification,
    clientId: string,
  ): Promise<Notification> {
    const { correlationId, contacts, mode } = createNotification;

    this.logger.debug(
      { correlationId, clientId, contacts, mode },
      'Инициирована обработка входящего уведомления',
    );

    const notification: Notification = {
      ...createNotification,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      clientId,
    };

    const notificationDto = plainToInstance(SendNotificationDto, notification);

    await firstValueFrom(
      this.rmqClient.emit(NOTIFICATION_RECEIVED, notificationDto),
    );

    this.receivedCounter.add(1, { clientId });

    this.logger.log(
      {
        id: notification.id,
        correlationId,
        clientId,
        createdAt: notification.createdAt,
        contacts,
        mode,
      },
      'Уведомление успешно поставлено в очередь',
    );

    return notification;
  }

  async receiveBatch(
    createNotifications: readonly CreateNotification[],
    clientId: string,
  ): Promise<Notification[]> {
    this.logger.debug(
      { batch_size: createNotifications.length },
      'Инициирована обработка пакета входящих уведомлений',
    );

    const promises = createNotifications.map((item) =>
      this.receive(item, clientId),
    );

    this.logger.log(
      {
        batch_size: createNotifications.length,
      },
      'Пакет уведомлений успешно поставлен в очередь',
    );

    return await Promise.all(promises);
  }
}
