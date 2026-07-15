import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { ApiExcludeController } from '@nestjs/swagger';
import { DeliveryIndicator } from '../delivery';

@ApiExcludeController()
@Controller('health')
export class HealthController {
  constructor(
    private readonly healthCheckService: HealthCheckService,
    private readonly deliveryIndicator: DeliveryIndicator,
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
      () => this.deliveryIndicator.isHealthy('delivery-service'),
    ]);
  }
}
