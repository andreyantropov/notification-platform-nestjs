import { DELIVERY_NOTIFICATIONS_SEND_QUEUE, Notification } from '@app/shared';
import { Inject, Injectable } from '@nestjs/common';
import { CreateNotification } from './types/create-notification.type';
import { randomUUID } from 'node:crypto';
import { ClientProxy } from '@nestjs/microservices';
import { RMQ_CLIENT } from './receive.constants';
import { firstValueFrom } from 'rxjs';
import { SendNotificationDto } from '@app/shared';

@Injectable()
export class ReceiveService {
  constructor(
    @Inject(RMQ_CLIENT)
    private readonly rmqClient: ClientProxy,
  ) {}

  async receive(
    createNotification: CreateNotification,
    clientId: string,
  ): Promise<Notification> {
    const notification: SendNotificationDto = {
      ...createNotification,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      clientId,
    };

    await firstValueFrom(
      this.rmqClient.emit(DELIVERY_NOTIFICATIONS_SEND_QUEUE, notification),
    );

    return notification;
  }

  async receiveBatch(
    createNotifications: readonly CreateNotification[],
    clientId: string,
  ): Promise<Notification[]> {
    const promises = createNotifications.map((item) =>
      this.receive(item, clientId),
    );
    return await Promise.all(promises);
  }

  async checkHealth(): Promise<void> {
    try {
      await this.rmqClient.connect();
    } catch (error) {
      throw new Error('RabbitMQ недоступен', { cause: error });
    }
  }
}
