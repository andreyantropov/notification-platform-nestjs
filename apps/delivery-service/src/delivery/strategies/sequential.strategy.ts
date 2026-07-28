import { Injectable } from '@nestjs/common';
import { Channel } from '../channels/channel.abstract';
import { Mode, type Notification } from '@app/shared';
import { Strategy } from './strategy.abstract';
import { OtelMethodCounter } from 'nestjs-otel';

@Injectable()
export class SequentialStrategy extends Strategy {
  protected readonly type = Mode.SEQUENTIAL;

  @OtelMethodCounter()
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
