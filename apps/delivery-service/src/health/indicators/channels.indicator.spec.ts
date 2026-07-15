import { Test, TestingModule } from '@nestjs/testing';
import { HealthIndicatorService } from '@nestjs/terminus';
import { ChannelsIndicator } from './channels.indicator';
import { CHANNELS } from '../../delivery/types/channels.token';
import { Channel } from '../../delivery/channels/channel.abstract';
import { Provider } from '@app/shared';

describe('ChannelsIndicator', () => {
  let indicator: ChannelsIndicator;
  let mockUp: jest.Mock;
  let mockDown: jest.Mock;

  class TestEmailChannel extends Channel {
    protected readonly type = Provider.EMAIL;
    async send(): Promise<void> {
      return Promise.resolve();
    }
    async checkHealth(): Promise<void> {
      return Promise.resolve();
    }
  }

  class TestBitrixChannel extends Channel {
    protected readonly type = Provider.BITRIX;
    async send(): Promise<void> {
      return Promise.resolve();
    }
    async checkHealth(): Promise<void> {
      return Promise.resolve();
    }
  }

  let emailChannel: TestEmailChannel;
  let bitrixChannel: TestBitrixChannel;
  let mockChannelsList: readonly Channel[];

  beforeEach(async () => {
    mockUp = jest.fn();
    mockDown = jest.fn();

    emailChannel = new TestEmailChannel();
    bitrixChannel = new TestBitrixChannel();
    mockChannelsList = [emailChannel, bitrixChannel];

    const mockIndicatorInstance = {
      up: mockUp,
      down: mockDown,
    };

    const mockHealthIndicatorService = {
      check: jest.fn().mockReturnValue(mockIndicatorInstance),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChannelsIndicator,
        {
          provide: HealthIndicatorService,
          useValue: mockHealthIndicatorService,
        },
        {
          provide: CHANNELS,
          useValue: mockChannelsList,
        },
      ],
    }).compile();

    indicator = module.get<ChannelsIndicator>(ChannelsIndicator);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be successfully initialized', () => {
      expect(indicator).toBeDefined();
    });
  });

  describe('checkChannels', () => {
    it('should return indicator.up() if all notification channels pass health check', async () => {
      mockUp.mockReturnValue({ gateways: { status: 'up' } });

      jest.spyOn(emailChannel, 'checkHealth').mockResolvedValue(undefined);
      jest.spyOn(bitrixChannel, 'checkHealth').mockResolvedValue(undefined);

      const result = await indicator.checkChannels('gateways');

      expect(result).toEqual({ gateways: { status: 'up' } });
      expect(mockUp).toHaveBeenCalledTimes(1);
      expect(mockDown).not.toHaveBeenCalled();
    });

    it('should return indicator.down() with collected errors if at least one channel fails', async () => {
      mockDown.mockReturnValue({
        gateways: {
          status: 'down',
          errors: ['TestBitrixChannel: Bitrix API Gateway Timeout'],
        },
      });

      jest.spyOn(emailChannel, 'checkHealth').mockResolvedValue(undefined);
      jest
        .spyOn(bitrixChannel, 'checkHealth')
        .mockRejectedValue(new Error('Bitrix API Gateway Timeout'));

      const result = await indicator.checkChannels('gateways');

      expect(result).toEqual({
        gateways: {
          status: 'down',
          errors: ['TestBitrixChannel: Bitrix API Gateway Timeout'],
        },
      });
      expect(mockDown).toHaveBeenCalledTimes(1);
      expect(mockDown).toHaveBeenCalledWith({
        errors: ['TestBitrixChannel: Bitrix API Gateway Timeout'],
      });
      expect(mockUp).not.toHaveBeenCalled();
    });
  });
});
