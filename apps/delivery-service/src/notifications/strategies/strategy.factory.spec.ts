import { Test, TestingModule } from '@nestjs/testing';
import { StrategyFactory } from './strategy.factory';
import { sequentialStrategy } from './sequential.strategy';
import { broadcastStrategy } from './broadcast.strategy';
import { raceStrategy } from './race.strategy';
import { Mode } from '@app/shared';

describe('StrategyFactory', () => {
  let factory: StrategyFactory;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StrategyFactory],
    }).compile();

    factory = module.get<StrategyFactory>(StrategyFactory);
  });

  it('should be successfully initialized', () => {
    expect(factory).toBeDefined();
  });

  it('should return sequentialStrategy for SEQUENTIAL mode', () => {
    const strategy = factory.get(Mode.SEQUENTIAL);
    expect(strategy).toBe(sequentialStrategy);
  });

  it('should return broadcastStrategy for BROADCAST mode', () => {
    const strategy = factory.get(Mode.BROADCAST);
    expect(strategy).toBe(broadcastStrategy);
  });

  it('should return raceStrategy for RACE mode', () => {
    const strategy = factory.get(Mode.RACE);
    expect(strategy).toBe(raceStrategy);
  });

  it('should throw an error if an unhandled mode is passed', () => {
    const invalidMode = 'invalid_mode' as unknown as Mode;

    expect(() => factory.get(invalidMode)).toThrow(
      `[StrategyFactory] Стратегия для режима "${invalidMode}" не реализована`,
    );
  });
});
