import { Injectable } from '@nestjs/common';
import { Mode } from '@app/shared';
import { Strategy } from './strategy.abstract';
import { SequentialStrategy } from './sequential.strategy';
import { BroadcastStrategy } from './broadcast.strategy';
import { RaceStrategy } from './race.strategy';

@Injectable()
export class StrategyFactory {
  private readonly strategies: Record<Mode, Strategy>;

  constructor(
    sequentialStrategy: SequentialStrategy,
    broadcastStrategy: BroadcastStrategy,
    raceStrategy: RaceStrategy,
  ) {
    this.strategies = {
      [Mode.SEQUENTIAL]: sequentialStrategy,
      [Mode.BROADCAST]: broadcastStrategy,
      [Mode.RACE]: raceStrategy,
    };
  }

  get(mode: Mode): Strategy {
    const strategy = this.strategies[mode];

    if (!strategy) {
      throw new Error(`Стратегия для режима "${mode}" не реализована`);
    }

    return strategy;
  }
}
