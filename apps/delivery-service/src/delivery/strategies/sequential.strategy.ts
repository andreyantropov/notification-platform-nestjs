import { Injectable } from '@nestjs/common';
import { Channel } from '../channels/channel.abstract';
import { Notification } from '@app/shared';
import { Strategy } from './strategy.abstract';

@Injectable()
export class SequentialStrategy extends Strategy {
  async execute(
    notification: Notification,
    channels: readonly Channel[],
  ): Promise<void> {
    const { contacts, message } = notification;

    const attempts = this.getAttempts(channels, contacts);

    for (const { channel, contact } of attempts) {
      try {
        return await channel.send(contact, message);
      } catch {
        continue;
      }
    }

    throw new Error(
      `Все попытки отправки уведомления (${attempts.length} шт.) завершились неудачей`,
    );
  }
}
