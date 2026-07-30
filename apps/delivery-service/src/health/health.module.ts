import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { ChannelsModule } from '../delivery/channels/channels.module';

@Module({
  imports: [TerminusModule, ChannelsModule],
  controllers: [HealthController],
  providers: [],
})
export class HealthModule {}
