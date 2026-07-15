import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { DeliveryModule } from '../delivery/delivery.module';
import { HealthController } from './health.controller';

@Module({
  imports: [TerminusModule, DeliveryModule],
  controllers: [HealthController],
  providers: [],
})
export class HealthModule {}
