import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
} from '@nestjs/terminus';
import { ApiExcludeController } from '@nestjs/swagger';

@ApiExcludeController()
@Controller('health')
export class HealthController {
  constructor(private readonly healthCheckService: HealthCheckService) {}

  @Get('live')
  @HealthCheck()
  async liveness(): Promise<HealthCheckResult> {
    return this.healthCheckService.check([
      () => ({ application: { status: 'up' } }),
    ]);
  }

  @Get('ready')
  @HealthCheck()
  async readiness(): Promise<HealthCheckResult> {
    return this.healthCheckService.check([
      () => ({ application: { status: 'up' } }),
    ]);
  }
}
