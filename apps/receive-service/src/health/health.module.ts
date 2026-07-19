import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { ReceiveModule } from '../receive';
import { HealthController } from './health.controller';

@Module({
  imports: [TerminusModule, ReceiveModule],
  controllers: [HealthController],
  providers: [],
})
export class HealthModule {}
