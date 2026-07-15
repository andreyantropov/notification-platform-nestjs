import { Test, TestingModule } from '@nestjs/testing';
import { StrategyFactory } from './strategy.factory';
import { SequentialStrategy } from './sequential.strategy';
import { BroadcastStrategy } from './broadcast.strategy';
import { RaceStrategy } from './race.strategy';
import { Mode } from '@app/shared';

describe('StrategyFactory', () => {
  let factory: StrategyFactory;
  let sequentialStrategy: SequentialStrategy;
  let broadcastStrategy: BroadcastStrategy;
  let raceStrategy: RaceStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StrategyFactory,
        SequentialStrategy,
        BroadcastStrategy,
        RaceStrategy,
      ],
    }).compile();

    factory = module.get<StrategyFactory>(StrategyFactory);
    sequentialStrategy = module.get<SequentialStrategy>(SequentialStrategy);
    broadcastStrategy = module.get<BroadcastStrategy>(BroadcastStrategy);
    raceStrategy = module.get<RaceStrategy>(RaceStrategy);
  });

  it('should be successfully initialized', () => {
    expect(factory).toBeDefined();
  });

  it('should return sequential strategy for SEQUENTIAL mode', () => {
    const strategy = factory.get(Mode.SEQUENTIAL);
    expect(strategy).toBe(sequentialStrategy);
  });

  it('should return broadcast strategy for BROADCAST mode', () => {
    const strategy = factory.get(Mode.BROADCAST);
    expect(strategy).toBe(broadcastStrategy);
  });

  it('should return race strategy for RACE mode', () => {
    const strategy = factory.get(Mode.RACE);
    expect(strategy).toBe(raceStrategy);
  });

  it('should throw an error if an unhandled mode is passed', () => {
    const invalidMode = 'invalid_mode' as unknown as Mode;

    expect(() => factory.get(invalidMode)).toThrow(
      `Стратегия для режима "${invalidMode}" не реализована`,
    );
  });
});
