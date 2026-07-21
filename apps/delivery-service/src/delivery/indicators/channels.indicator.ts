import { Inject, Injectable } from '@nestjs/common';
import {
  HealthIndicatorService,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { Channel } from '../channels/channel.abstract';
import { CHANNELS } from '../delivery.constants';

@Injectable()
export class ChannelsIndicator {
  constructor(
    private readonly healthIndicatorService: HealthIndicatorService,
    @Inject(CHANNELS) private readonly channels: readonly Channel[],
  ) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);
    const errors: string[] = [];

    for (const channel of this.channels) {
      try {
        await channel.checkHealth();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Неизвестная ошибка';
        errors.push(`${channel.constructor.name}: ${message}`);
      }
    }

    if (errors.length !== 0) {
      return indicator.down({ errors });
    }

    return indicator.up();
  }
}
