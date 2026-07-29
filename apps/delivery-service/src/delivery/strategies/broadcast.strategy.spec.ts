import { BroadcastStrategy } from './broadcast.strategy';
import { Notification, Mode, Provider, Contact } from '@app/shared';
import { Channel } from '../channels/channel.abstract';
import { ChannelContext } from '../channels/channel.context';
import { Counter, Histogram } from '@opentelemetry/api';
import { Logger } from 'nestjs-pino';
import { MetricService } from 'nestjs-otel';

describe('BroadcastStrategy', () => {
  let strategy: BroadcastStrategy;

  class MockChannel extends Channel {
    constructor(
      public readonly type: Provider,
      public sendSpy: jest.Mock<Promise<void>, [Contact, string]>,
      ctx: ChannelContext,
    ) {
      super(ctx);
    }

    override async send(contact: Contact, message: string): Promise<void> {
      return this.sendSpy(contact, message);
    }

    protected async performSend(): Promise<void> {
      return Promise.resolve();
    }
  }

  const mockNotification: Notification = {
    id: 'notif-broadcast',
    correlationId: 'corr-broadcast',
    clientId: 'marketing-service',
    createdAt: new Date().toISOString(),
    message: 'Broadcast Message',
    mode: Mode.BROADCAST,
    contacts: [
      { type: Provider.EMAIL, value: 'user1@test.com' },
      { type: Provider.BITRIX, value: '11111' },
    ],
  };

  let emailChannel: MockChannel;
  let bitrixChannel: MockChannel;
  let channels: Channel[];

  beforeEach(() => {
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

    strategy = new BroadcastStrategy();

    const emailSpy = jest.fn<Promise<void>, [Contact, string]>();
    const bitrixSpy = jest.fn<Promise<void>, [Contact, string]>();

    emailChannel = new MockChannel(
      Provider.EMAIL,
      emailSpy,
      mockChannelContext,
    );
    bitrixChannel = new MockChannel(
      Provider.BITRIX,
      bitrixSpy,
      mockChannelContext,
    );

    channels = [emailChannel, bitrixChannel];
  });

  describe('execute', () => {
    it('should send messages to all supporting channels simultaneously', async () => {
      emailChannel.sendSpy.mockResolvedValue(undefined);
      bitrixChannel.sendSpy.mockResolvedValue(undefined);

      await strategy.execute(mockNotification, channels);

      expect(emailChannel.sendSpy).toHaveBeenCalledTimes(1);
      expect(bitrixChannel.sendSpy).toHaveBeenCalledTimes(1);

      expect(emailChannel.sendSpy).toHaveBeenCalledWith(
        mockNotification.contacts[0],
        mockNotification.message,
      );
      expect(bitrixChannel.sendSpy).toHaveBeenCalledWith(
        mockNotification.contacts[1],
        mockNotification.message,
      );
    });

    it('should throw an error with only failed channels inside cause if at least one channel fails', async () => {
      const bitrixError = new Error('Bitrix API Timeout');

      emailChannel.sendSpy.mockResolvedValue(undefined);
      bitrixChannel.sendSpy.mockRejectedValue(bitrixError);

      let thrownError: Error | undefined;
      try {
        await strategy.execute(mockNotification, channels);
      } catch (error) {
        thrownError = error as Error;
      }

      expect(thrownError).toBeDefined();
      expect(thrownError?.message).toBe(
        `Стратегия ${Mode.BROADCAST}: Одна или несколько попыток отправки уведомления завершились неудачей`,
      );

      expect(thrownError?.cause).toBeInstanceOf(Array);
      expect(thrownError?.cause).toHaveLength(1);
      expect((thrownError?.cause as unknown[])[0]).toBe(bitrixError);

      expect(emailChannel.sendSpy).toHaveBeenCalledTimes(1);
      expect(bitrixChannel.sendSpy).toHaveBeenCalledTimes(1);
    });
  });
});
