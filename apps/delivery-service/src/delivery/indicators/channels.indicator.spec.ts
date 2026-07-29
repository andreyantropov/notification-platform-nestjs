import { Test, TestingModule } from '@nestjs/testing';
import { HealthIndicatorService } from '@nestjs/terminus';
import { ChannelsIndicator } from './channels.indicator';
import { Channel } from '../channels/channel.abstract';
import { Provider } from '@app/shared';
import { CHANNELS } from '../delivery.constants';
import { ChannelContext } from '../channels/channel.context';
import { Counter, Histogram } from '@opentelemetry/api';
import { Logger } from '@nestjs/common';
import { MetricService } from 'nestjs-otel';

describe('ChannelsIndicator', () => {
  let indicator: ChannelsIndicator;
  let mockUp: jest.Mock;
  let mockDown: jest.Mock;

  class TestChannel extends Channel {
    constructor(
      protected readonly type: Provider,
      public readonly checkHealthSpy: jest.Mock<Promise<void>, []>,
      ctx: ChannelContext,
    ) {
      super(ctx);
    }

    override async checkHealth(): Promise<void> {
      return this.checkHealthSpy();
    }

    protected async performSend(): Promise<void> {
      return Promise.resolve();
    }
  }

  let emailSpy: jest.Mock<Promise<void>, []>;
  let bitrixSpy: jest.Mock<Promise<void>, []>;
  let mockChannelsList: readonly Channel[];

  beforeEach(async () => {
    mockUp = jest.fn();
    mockDown = jest.fn();

    emailSpy = jest.fn<Promise<void>, []>();
    bitrixSpy = jest.fn<Promise<void>, []>();

    const dummyCounter = { add: jest.fn() } as unknown as Counter;
    const dummyHistogram = { record: jest.fn() } as unknown as Histogram;

    const mockMetricService = {
      getCounter: jest.fn().mockReturnValue(dummyCounter),
      getHistogram: jest.fn().mockReturnValue(dummyHistogram),
    } as unknown as MetricService;

    const dummyLogger = {
      log: jest.fn(),
      debug: jest.fn(),
    } as unknown as Logger;

    const mockChannelContext: ChannelContext = {
      metrics: mockMetricService,
      logger: dummyLogger,
    };

    const emailChannel = new TestChannel(
      Provider.EMAIL,
      emailSpy,
      mockChannelContext,
    );
    const bitrixChannel = new TestChannel(
      Provider.BITRIX,
      bitrixSpy,
      mockChannelContext,
    );
    mockChannelsList = [emailChannel, bitrixChannel];

    const mockIndicatorInstance = { up: mockUp, down: mockDown };
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
        { provide: CHANNELS, useValue: mockChannelsList },
      ],
    }).compile();

    indicator = module.get<ChannelsIndicator>(ChannelsIndicator);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('isHealthy', () => {
    it('should return indicator.up() if all notification channels pass health check', async () => {
      mockUp.mockReturnValue({ gateways: { status: 'up' } });
      emailSpy.mockResolvedValue(undefined);
      bitrixSpy.mockResolvedValue(undefined);

      const result = await indicator.isHealthy('gateways');

      expect(result).toEqual({ gateways: { status: 'up' } });
      expect(mockUp).toHaveBeenCalledTimes(1);
      expect(mockDown).not.toHaveBeenCalled();
    });

    it('should return indicator.down() with all collected errors if multiple channels fail', async () => {
      const emailError = new Error('SMTP Offline');
      const bitrixError = new Error('Bitrix Timeout');

      mockDown.mockReturnValue({
        gateways: { status: 'down', errors: [emailError, bitrixError] },
      });

      emailSpy.mockRejectedValue(emailError);
      bitrixSpy.mockRejectedValue(bitrixError);

      const result = await indicator.isHealthy('gateways');

      expect(result).toEqual({
        gateways: { status: 'down', errors: [emailError, bitrixError] },
      });
      expect(mockDown).toHaveBeenCalledTimes(1);
      expect(mockDown).toHaveBeenCalledWith({
        errors: [emailError, bitrixError],
      });
      expect(mockUp).not.toHaveBeenCalled();
    });
  });
});
