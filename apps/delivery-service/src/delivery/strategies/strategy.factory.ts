import { Injectable } from '@nestjs/common';
import { Strategy } from '../types/strategy.type';
import { sequential } from './sequential.strategy';
import { broadcast } from './broadcast.strategy';
import { race } from './race.strategy';
import { Mode } from '@app/shared';

@Injectable()
export class StrategyFactory {
  private readonly strategies: Record<Mode, Strategy> = {
    [Mode.SEQUENTIAL]: sequential,
    [Mode.BROADCAST]: broadcast,
    [Mode.RACE]: race,
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
