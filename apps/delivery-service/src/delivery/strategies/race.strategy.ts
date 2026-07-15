import { Injectable } from '@nestjs/common';
import { Channel } from '../channels/channel.abstract';
import { Notification } from '@app/shared';
import { Strategy } from './strategy.abstract';

@Injectable()
export class RaceStrategy extends Strategy {
  async execute(
    notification: Notification,
    channels: readonly Channel[],
  ): Promise<void> {
    const { contacts, message } = notification;
    const attempts = this.getAttempts(channels, contacts);

    try {
      await Promise.any(
        attempts.map(({ channel, contact }) => channel.send(contact, message)),
      );
    } catch {
      throw new Error(
        `Все попытки отправки уведомления (${attempts.length} шт.) завершились неудачей`,
      );
    }
  }
}
