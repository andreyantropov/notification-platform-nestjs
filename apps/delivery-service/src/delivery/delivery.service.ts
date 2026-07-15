import { Inject, Injectable } from '@nestjs/common';
import { Channel } from './channels/channel.abstract';
import { Notification } from '@app/shared';
import { StrategyFactory } from './strategies/strategy.factory';
import { CHANNELS } from './delivery.constants';

@Injectable()
export class DeliveryService {
  constructor(
    @Inject(CHANNELS) private readonly channels: readonly Channel[],
    private readonly strategyFactory: StrategyFactory,
  ) {}

  async deliver(notification: Notification): Promise<void> {
    await this.strategyFactory
      .get(notification.mode)
      .execute(notification, this.channels);
  }
}
