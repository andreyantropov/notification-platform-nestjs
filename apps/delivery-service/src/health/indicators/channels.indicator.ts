import { Inject, Injectable } from '@nestjs/common';
import {
  HealthIndicatorService,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { Channel } from '../../delivery';
import { CHANNELS } from '../../delivery';

@Injectable()
export class ChannelsIndicator {
  constructor(
    private readonly healthIndicatorService: HealthIndicatorService,
    @Inject(CHANNELS) private readonly channels: readonly Channel[],
  ) {}

  async checkChannels(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);
    const errors: string[] = [];

    for (const channel of this.channels) {
      try {
        await channel.checkHealth();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${channel.constructor.name}: ${message}`);
      }
    }

    const isHealthy = errors.length === 0;

    if (isHealthy) {
      return indicator.up();
    }

    return indicator.down({ errors });
  }
}
