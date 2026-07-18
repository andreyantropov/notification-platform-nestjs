import { Notification } from '@app/shared';
import { Inject, Injectable } from '@nestjs/common';
import { CreateNotification } from './types/CreateNotification';
import { v4 } from 'uuid';
import { ClientProxy } from '@nestjs/microservices';
import {
  DELIVERY_NOTIFICATIONS_SEND_QUEUE,
  RMQ_CLIENT,
} from './receive.constants';
import { firstValueFrom } from 'rxjs';

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
    const notification: Notification = {
      ...createNotification,
      id: v4(),
      createdAt: new Date().toISOString(),
      clientId,
    };

    await firstValueFrom(
      this.rmqClient.emit(DELIVERY_NOTIFICATIONS_SEND_QUEUE, notification),
    );

    return notification;
  }
}
