import { Module } from '@nestjs/common';
import { StrategyFactory } from './strategies/strategy.factory';
import { BroadcastStrategy } from './strategies/broadcast.strategy';
import { RaceStrategy } from './strategies/race.strategy';
import { SequentialStrategy } from './strategies/sequential.strategy';
import { DeliveryController } from './delivery.controller';
import { DeliveryService } from './delivery.service';
import { ChannelsModule } from './channels/channels.module';

@Module({
  imports: [ChannelsModule],
  controllers: [DeliveryController],
  providers: [
    DeliveryService,
    StrategyFactory,
    BroadcastStrategy,
    RaceStrategy,
    SequentialStrategy,
  ],
  exports: [],
})
export class DeliveryModule {}
