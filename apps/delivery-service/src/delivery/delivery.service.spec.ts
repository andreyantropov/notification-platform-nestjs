import { Test, TestingModule } from '@nestjs/testing';
import { DeliveryService } from './delivery.service';
import { StrategyFactory } from './strategies/strategy.factory';
import { CHANNELS } from './types/channels.token';
import { Channel } from './types/channel.abstract';
import { Mode, Notification, Provider } from '@app/shared';

describe('DeliveryService', () => {
  let service: DeliveryService;
  let mockGetStrategy: jest.Mock;
  let mockStrategy: jest.Mock<
    Promise<void>,
    [Notification, readonly Channel[]]
  >;

  class TestChannel extends Channel {
    protected readonly type = Provider.EMAIL;
    async send(): Promise<void> {
      return Promise.resolve();
    }
  }

  const mockChannel = new TestChannel();
  const mockChannelsList: readonly Channel[] = [mockChannel];

  const mockNotification: Notification = {
    id: 'notif-123',
    correlationId: 'corr-123',
    clientId: 'test-service',
    createdAt: new Date().toISOString(),
    message: 'Hello World',
    mode: Mode.BROADCAST,
    contacts: [{ type: Provider.EMAIL, value: 'test@test.com' }],
  };

  beforeEach(async () => {
    mockStrategy = jest.fn<Promise<void>, [Notification, readonly Channel[]]>();

    mockGetStrategy = jest.fn().mockReturnValue(mockStrategy);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliveryService,
        {
          provide: StrategyFactory,
          useValue: {
            get: mockGetStrategy,
          },
        },
        {
          provide: CHANNELS,
          useValue: mockChannelsList,
        },
      ],
    }).compile();

    service = module.get<DeliveryService>(DeliveryService);
  });

  it('should be successfully initialized', () => {
    expect(service).toBeDefined();
  });

  it('should successfully fetch strategy from factory and execute it with channels', async () => {
    mockStrategy.mockResolvedValue(undefined);

    await expect(service.deliver(mockNotification)).resolves.not.toThrow();

    expect(mockGetStrategy).toHaveBeenCalledTimes(1);
    expect(mockGetStrategy).toHaveBeenCalledWith(mockNotification.mode);

    expect(mockStrategy).toHaveBeenCalledTimes(1);
    expect(mockStrategy).toHaveBeenCalledWith(
      mockNotification,
      mockChannelsList,
    );
  });

  it('should propagate errors if the executed strategy throws an exception', async () => {
    const strategyError = new Error('Strategy execution failed');
    mockStrategy.mockRejectedValue(strategyError);

    await expect(service.deliver(mockNotification)).rejects.toThrow(
      'Strategy execution failed',
    );

    expect(mockGetStrategy).toHaveBeenCalledTimes(1);
    expect(mockStrategy).toHaveBeenCalledTimes(1);
  });
});
