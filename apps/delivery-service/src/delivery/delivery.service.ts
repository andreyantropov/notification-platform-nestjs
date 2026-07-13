import { Inject, Injectable } from '@nestjs/common';
import { Channel } from './abstracts/channel.abstract';
import { Notification } from '@app/shared';
import { StrategyFactory } from './strategies/strategy.factory';
import { CHANNELS } from './tokens/channels.token';

@Injectable()
export class DeliveryService {
  constructor(
    @Inject(CHANNELS) private readonly channels: readonly Channel[],
    private readonly strategyFactory: StrategyFactory,
  ) {}

  async deliver(notification: Notification): Promise<void> {
    await this.strategyFactory.get(notification.mode)(
      notification,
      this.channels,
    );
  }
}
