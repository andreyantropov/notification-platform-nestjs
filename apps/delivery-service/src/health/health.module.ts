import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { DeliveryModule } from '../delivery/delivery.module';
import { HealthController } from './health.controller';
import { ChannelsIndicator } from './indicators/channels.indicator';

@Module({
  imports: [TerminusModule, DeliveryModule],
  controllers: [HealthController],
  providers: [ChannelsIndicator],
})
export class HealthModule {}
