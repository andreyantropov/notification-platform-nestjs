import { Test, TestingModule } from '@nestjs/testing';
import { StrategyFactory } from './strategy.factory';
import { sequential } from './sequential.strategy';
import { broadcast } from './broadcast.strategy';
import { race } from './race.strategy';
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

  it('should return sequential for SEQUENTIAL mode', () => {
    const strategy = factory.get(Mode.SEQUENTIAL);
    expect(strategy).toBe(sequential);
  });

  it('should return broadcast for BROADCAST mode', () => {
    const strategy = factory.get(Mode.BROADCAST);
    expect(strategy).toBe(broadcast);
  });

  it('should return race for RACE mode', () => {
    const strategy = factory.get(Mode.RACE);
    expect(strategy).toBe(race);
  });

  it('should throw an error if an unhandled mode is passed', () => {
    const invalidMode = 'invalid_mode' as unknown as Mode;

    expect(() => factory.get(invalidMode)).toThrow(
      `[StrategyFactory] Стратегия для режима "${invalidMode}" не реализована`,
    );
  });
});
