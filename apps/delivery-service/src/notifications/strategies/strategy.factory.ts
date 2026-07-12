import { Injectable } from '@nestjs/common';
import { Strategy } from '../types/strategy.type';
import { sequentialStrategy } from './sequential.strategy';
import { broadcastStrategy } from './broadcast.strategy';
import { raceStrategy } from './race.strategy';
import { Mode } from '@app/shared';

@Injectable()
export class StrategyFactory {
  private readonly strategies: Record<Mode, Strategy> = {
    [Mode.SEQUENTIAL]: sequentialStrategy,
    [Mode.BROADCAST]: broadcastStrategy,
    [Mode.RACE]: raceStrategy,
  };

  get(mode: Mode): Strategy {
    const strategy = this.strategies[mode];

    if (!strategy) {
      throw new Error(
        `[StrategyFactory] Стратегия для режима "${mode}" не реализована`,
      );
    }

    return strategy;
  }
}
