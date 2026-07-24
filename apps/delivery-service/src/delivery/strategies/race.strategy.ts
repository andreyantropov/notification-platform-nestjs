import { Injectable } from '@nestjs/common';
import { Channel } from '../channels/channel.abstract';
import { Mode, Notification } from '@app/shared';
import { Strategy } from './strategy.abstract';

@Injectable()
export class RaceStrategy extends Strategy {
  readonly type = Mode.RACE;

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
    } catch (error) {
      const errors = error instanceof AggregateError ? error.errors : [error];
      throw new Error(
        `Стратегия ${this.type}: Все попытки отправки уведомления завершились неудачей`,
        { cause: errors },
      );
    }
  }
}
