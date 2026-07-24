import { Channel } from '../channels/channel.abstract';
import { Mode, Notification } from '@app/shared';
import { Strategy } from './strategy.abstract';
import { Injectable } from '@nestjs/common';

@Injectable()
export class BroadcastStrategy extends Strategy {
  readonly type = Mode.BROADCAST;

  async execute(
    notification: Notification,
    channels: readonly Channel[],
  ): Promise<void> {
    const { contacts, message } = notification;
    const attempts = this.getAttempts(channels, contacts);

    const results = await Promise.allSettled(
      attempts.map(({ channel, contact }) => channel.send(contact, message)),
    );

    const errors = results
      .filter(
        (result): result is PromiseRejectedResult =>
          result.status === 'rejected',
      )
      .map((result) =>
        result.reason instanceof Error
          ? result.reason
          : new Error(String(result.reason)),
      );

    if (errors.length > 0) {
      throw new Error(
        `Стратегия ${this.type}: Одна или несколько попыток отправки уведомления завершились неудачей`,
        {
          cause: errors,
        },
      );
    }
  }
}
