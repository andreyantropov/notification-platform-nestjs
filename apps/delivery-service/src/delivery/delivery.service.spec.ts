import { Test, TestingModule } from '@nestjs/testing';
import { DeliveryService } from './delivery.service';
import { StrategyFactory } from './strategies/strategy.factory';
import { Mode, Notification, Provider } from '@app/shared';
import { CHANNELS } from './channels/channels.constants';
import { Channel } from './channels/core/channel.abstract';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('DeliveryService', () => {
  let service: DeliveryService;
  let mockGetStrategy: jest.Mock;
  let mockStrategyExecute: jest.Mock<
    Promise<void>,
    [Notification, readonly Channel[]]
  >;
  let mockEventEmitter: jest.Mocked<Pick<EventEmitter2, 'emit'>>;

  const mockChannel = {
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

    mockEventEmitter = {
      emit: jest.fn(),
    };

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
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<DeliveryService>(DeliveryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be successfully initialized and injected with dependencies', () => {
      expect(service).toBeDefined();
    });
  });

  describe('deliver', () => {
    it('should successfully fetch strategy from factory and execute it with channels list', async () => {
      mockStrategyExecute.mockResolvedValue(undefined);

      await expect(service.deliver(mockNotification)).resolves.toBeUndefined();

      expect(mockGetStrategy).toHaveBeenCalledTimes(1);
      expect(mockGetStrategy).toHaveBeenCalledWith(mockNotification.mode);

      expect(mockStrategyExecute).toHaveBeenCalledTimes(1);
      expect(mockStrategyExecute).toHaveBeenCalledWith(
        mockNotification,
        mockChannelsList,
      );

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('delivery.initiated', {
        notification: mockNotification,
      });

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('delivery.completed', {
        notification: mockNotification,
      });
    });

    it('should properly propagate errors upward if the executed strategy throws an exception', async () => {
      const strategyError = new Error('Strategy execution failed');
      mockStrategyExecute.mockRejectedValue(strategyError);

      await expect(service.deliver(mockNotification)).rejects.toThrow(
        'Strategy execution failed',
      );

      expect(mockGetStrategy).toHaveBeenCalledTimes(1);
      expect(mockStrategyExecute).toHaveBeenCalledTimes(1);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('delivery.initiated', {
        notification: mockNotification,
      });
      expect(mockEventEmitter.emit).not.toHaveBeenCalledWith(
        'delivery.completed',
        expect.any(Object),
      );
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

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('delivery.initiated', {
        notification: mockNotification,
      });
    });

    it('should successfully pass an empty channels list to the strategy if no channels registered', async () => {
      const localModule = await Test.createTestingModule({
        providers: [
          DeliveryService,
          { provide: StrategyFactory, useValue: { get: mockGetStrategy } },
          { provide: CHANNELS, useValue: [] },
          { provide: EventEmitter2, useValue: mockEventEmitter },
        ],
      }).compile();

      const localService = localModule.get<DeliveryService>(DeliveryService);
      mockStrategyExecute.mockResolvedValue(undefined);

      await expect(
        localService.deliver(mockNotification),
      ).resolves.toBeUndefined();
      expect(mockStrategyExecute).toHaveBeenCalledWith(mockNotification, []);
    });
  });
});
