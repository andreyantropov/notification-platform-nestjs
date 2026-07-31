import { Inject, Injectable } from '@nestjs/common';
import {
  HealthIndicatorService,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { CHANNELS } from '../../delivery/channels/channels.constants';
import { Channel } from '../../delivery/channels/core/channel.abstract';

@Injectable()
export class ChannelsIndicator {
  constructor(
    private readonly healthIndicatorService: HealthIndicatorService,
    @Inject(CHANNELS) private readonly channels: readonly Channel[],
  ) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);
    const errors = [];

    for (const channel of this.channels) {
      try {
        await channel.checkHealth();
      } catch (error) {
        errors.push(error);
      }
    }

    if (errors.length !== 0) {
      return indicator.down({ errors });
    }

    return indicator.up();
  }
}
