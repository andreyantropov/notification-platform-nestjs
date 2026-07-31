import { Injectable } from '@nestjs/common';
import { Mode, Notification } from '@app/shared';
import { Strategy } from './strategy.abstract';
import { Channel } from '../channels/core/channel.abstract';

@Injectable()
export class SequentialStrategy extends Strategy {
  protected readonly type = Mode.SEQUENTIAL;

  async execute(
    notification: Notification,
    channels: readonly Channel[],
  ): Promise<void> {
    const { contacts, message } = notification;
    const attempts = this.getAttempts(channels, contacts);

    const errors = [];

    for (const { channel, contact } of attempts) {
      try {
        return await channel.send(contact, message);
      } catch (error) {
        errors.push(error);
      }
    }

    throw new Error(
      `Стратегия ${this.type}: Все попытки отправки уведомления завершились неудачей`,
      { cause: errors },
    );
  }
}
