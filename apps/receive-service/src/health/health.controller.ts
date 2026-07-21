import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { ApiExcludeController } from '@nestjs/swagger';
import { RmqIndicator } from '../receive';

@ApiExcludeController()
@Controller('health')
export class HealthController {
  constructor(
    private readonly healthCheckService: HealthCheckService,
    private readonly rmqIndicator: RmqIndicator,
  ) {}

  @Get('live')
  @HealthCheck()
  async liveness() {
    return this.healthCheckService.check([
      () => ({ application: { status: 'up' } }),
    ]);
  }

  @Get('ready')
  @HealthCheck()
  async readiness() {
    return this.healthCheckService.check([
      () => this.rmqIndicator.isHealthy('rmq'),
    ]);
  }
}
