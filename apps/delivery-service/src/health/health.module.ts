import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { ChannelsModule } from '../delivery/channels/channels.module';
import { ChannelsIndicator } from './indicators/channels.indicator';

@Module({
  imports: [TerminusModule, ChannelsModule],
  controllers: [HealthController],
  providers: [ChannelsIndicator],
})
export class HealthModule {}
