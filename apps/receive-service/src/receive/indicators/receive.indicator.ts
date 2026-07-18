import { Injectable } from '@nestjs/common';
import {
  HealthIndicatorService,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { ReceiveService } from '../receive.service';

@Injectable()
export class ReceiveIndicator {
  constructor(
    private readonly healthIndicatorService: HealthIndicatorService,
    private readonly receiveService: ReceiveService,
  ) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);

    try {
      await this.receiveService.checkHealth();
    } catch (error) {
      return indicator.down({ error });
    }

    return indicator.up();
  }
}
