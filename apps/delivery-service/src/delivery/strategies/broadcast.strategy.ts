import { Channel } from '../channels/channel.abstract';
import { Notification } from '@app/shared';
import { Strategy } from './strategy.abstract';
import { Injectable } from '@nestjs/common';

@Injectable()
export class BroadcastStrategy extends Strategy {
  async execute(
    notification: Notification,
    channels: readonly Channel[],
  ): Promise<void> {
    const { contacts, message } = notification;
    const attempts = this.getAttempts(channels, contacts);

    try {
      await Promise.all(
        attempts.map(({ channel, contact }) => channel.send(contact, message)),
      );
    } catch {
      throw new Error(
        `Один или несколько каналов вернули ошибку во время массовой отправки`,
      );
    }
  }
}
