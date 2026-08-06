import { NOTIFICATION_RECEIVED, Notification } from '@app/shared';
import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ClientProxy } from '@nestjs/microservices';
import { RMQ_CLIENT } from './receive.constants';
import { firstValueFrom } from 'rxjs';
import { SendNotificationDto } from '@app/shared';
import { plainToInstance } from 'class-transformer';
import { EventEmitter2 } from '@nestjs/event-emitter';

type CreateNotification = Omit<Notification, 'id' | 'clientId' | 'createdAt'>;

@Injectable()
export class ReceiveService {
  constructor(
    @Inject(RMQ_CLIENT)
    private readonly rmqClient: ClientProxy,
    private readonly events: EventEmitter2,
  ) {}

  async receive(
    createNotification: CreateNotification,
    clientId: string,
  ): Promise<Notification> {
    this.events.emit('receive.initiated', { createNotification, clientId });

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

    this.events.emit('receive.completed', { notification });

    return notification;
  }

  async receiveBatch(
    createNotifications: readonly CreateNotification[],
    clientId: string,
  ): Promise<Notification[]> {
    this.events.emit('receive.batch.initiated', {
      batchSize: createNotifications.length,
      clientId,
    });

    const promises = createNotifications.map((item) =>
      this.receive(item, clientId),
    );

    this.events.emit('receive.batch.completed', {
      batchSize: createNotifications.length,
      clientId,
    });

    return await Promise.all(promises);
  }
}
