import { Inject, Injectable } from '@nestjs/common';
import {
  HealthIndicatorService,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { Channel } from '../../delivery/channels/channel.abstract';
import { CHANNELS } from '../../delivery/channels/channels.constants';

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
