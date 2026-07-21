import { Injectable } from '@nestjs/common';
import {
  HealthIndicatorService,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { ReceiveService } from '../receive.service';

@Injectable()
export class RmqIndicator {
  constructor(
    private readonly healthIndicatorService: HealthIndicatorService,
    private readonly receiveService: ReceiveService,
  ) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);

    try {
      await this.receiveService.checkHealth();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Неизвестная ошибка';
      return indicator.down({ message });
    }

    return indicator.up();
  }
}
