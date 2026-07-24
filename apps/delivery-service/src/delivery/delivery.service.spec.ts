import { Test, TestingModule } from '@nestjs/testing';
import { DeliveryService } from './delivery.service';
import { StrategyFactory } from './strategies/strategy.factory';
import { CHANNELS } from './delivery.constants';
import { Channel } from './channels/channel.abstract';
import { Mode, Notification, Provider } from '@app/shared';

describe('DeliveryService', () => {
  let service: DeliveryService;
  let mockGetStrategy: jest.Mock;
  let mockStrategyExecute: jest.Mock<
    Promise<void>,
    [Notification, readonly Channel[]]
  >;

  const mockChannel: Channel = {
    type: Provider.EMAIL,
    isSupports: jest.fn(),
    send: jest.fn(),
    checkHealth: jest.fn(),
  } as unknown as Channel;

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
    mockStrategyExecute = jest.fn<
      Promise<void>,
      [Notification, readonly Channel[]]
    >();
    mockGetStrategy = jest
      .fn()
      .mockReturnValue({ execute: mockStrategyExecute });

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

  describe('constructor', () => {
    it('should be successfully initialized and injected with dependencies', () => {
      expect(service).toBeDefined();
    });
  });

  describe('deliver', () => {
    it('should successfully fetch strategy from factory and execute it with channels list', async () => {
      mockStrategyExecute.mockResolvedValue(undefined);

      await expect(service.deliver(mockNotification)).resolves.not.toThrow();

      expect(mockGetStrategy).toHaveBeenCalledTimes(1);
      expect(mockGetStrategy).toHaveBeenCalledWith(mockNotification.mode);

      expect(mockStrategyExecute).toHaveBeenCalledTimes(1);
      expect(mockStrategyExecute).toHaveBeenCalledWith(
        mockNotification,
        mockChannelsList,
      );
    });

    it('should properly propagate errors upward if the executed strategy throws an exception', async () => {
      const strategyError = new Error('Strategy execution failed');
      mockStrategyExecute.mockRejectedValue(strategyError);

      await expect(service.deliver(mockNotification)).rejects.toThrow(
        'Strategy execution failed',
      );

      expect(mockGetStrategy).toHaveBeenCalledTimes(1);
      expect(mockStrategyExecute).toHaveBeenCalledTimes(1);
    });

    it('should propagate error if strategy factory fails to find a strategy', async () => {
      const factoryError = new Error('Unsupported mode');
      mockGetStrategy.mockImplementation(() => {
        throw factoryError;
      });

      await expect(service.deliver(mockNotification)).rejects.toThrow(
        'Unsupported mode',
      );

      expect(mockGetStrategy).toHaveBeenCalledTimes(1);
      expect(mockStrategyExecute).not.toHaveBeenCalled();
    });

    it('should successfully pass an empty channels list to the strategy if no channels registered', async () => {
      const localModule = await Test.createTestingModule({
        providers: [
          DeliveryService,
          { provide: StrategyFactory, useValue: { get: mockGetStrategy } },
          { provide: CHANNELS, useValue: [] },
        ],
      }).compile();

      const localService = localModule.get<DeliveryService>(DeliveryService);
      mockStrategyExecute.mockResolvedValue(undefined);

      await expect(
        localService.deliver(mockNotification),
      ).resolves.not.toThrow();
      expect(mockStrategyExecute).toHaveBeenCalledWith(mockNotification, []);
    });
  });
});
