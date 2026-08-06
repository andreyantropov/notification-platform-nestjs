import { Inject, Injectable } from '@nestjs/common';
import { Notification } from '@app/shared';
import { StrategyFactory } from './strategies/strategy.factory';
import { CHANNELS } from './channels/channels.constants';
import { Channel } from './channels/core/channel.abstract';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class DeliveryService {
  constructor(
    @Inject(CHANNELS) private readonly channels: readonly Channel[],
    private readonly strategyFactory: StrategyFactory,
    private readonly events: EventEmitter2,
  ) {}

  async deliver(notification: Notification): Promise<void> {
    this.events.emit('delivery.initiated', { notification });

    await this.strategyFactory
      .get(notification.mode)
      .execute(notification, this.channels);

    this.events.emit('delivery.completed', { notification });
  }
}
