import { SequentialStrategy } from './sequential.strategy';
import { Notification, Mode, Provider, Contact } from '@app/shared';
import { Counter, Histogram } from '@opentelemetry/api';
import { Logger } from 'nestjs-pino';
import { MetricService } from 'nestjs-otel';
import { Channel } from '../channels/core/channel.abstract';
import { ChannelContext } from '../channels/core/channel.context';

describe('SequentialStrategy', () => {
  let strategy: SequentialStrategy;

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
    id: 'notif-sequential',
    correlationId: 'corr-sequential',
    clientId: 'billing-service',
    createdAt: new Date().toISOString(),
    message: 'Sequential Message',
    mode: Mode.SEQUENTIAL,
    contacts: [
      { type: Provider.EMAIL, value: 'user@test.com' },
      { type: Provider.BITRIX, value: '55555' },
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

    strategy = new SequentialStrategy();

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
    it('should stop and return after the first successful delivery', async () => {
      emailChannel.sendSpy.mockResolvedValue(undefined);

      await strategy.execute(mockNotification, channels);

      expect(emailChannel.sendSpy).toHaveBeenCalledTimes(1);
      expect(bitrixChannel.sendSpy).not.toHaveBeenCalled();

      expect(emailChannel.sendSpy).toHaveBeenCalledWith(
        mockNotification.contacts[0],
        mockNotification.message,
      );
    });

    it('should try the next channel if the previous one fails', async () => {
      emailChannel.sendSpy.mockRejectedValue(new Error('SMTP Gateway Error'));
      bitrixChannel.sendSpy.mockResolvedValue(undefined);

      await strategy.execute(mockNotification, channels);

      expect(emailChannel.sendSpy).toHaveBeenCalledTimes(1);
      expect(bitrixChannel.sendSpy).toHaveBeenCalledTimes(1);

      expect(bitrixChannel.sendSpy).toHaveBeenCalledWith(
        mockNotification.contacts[1],
        mockNotification.message,
      );
    });

    it('should throw an error with all aggregated errors in cause if all channels fail', async () => {
      const emailError = new Error('SMTP Error');
      const bitrixError = new Error('Bitrix Error');

      emailChannel.sendSpy.mockRejectedValue(emailError);
      bitrixChannel.sendSpy.mockRejectedValue(bitrixError);

      let thrownError: Error | undefined;
      try {
        await strategy.execute(mockNotification, channels);
      } catch (error) {
        thrownError = error as Error;
      }

      expect(thrownError).toBeDefined();
      expect(thrownError?.message).toBe(
        `Стратегия ${Mode.SEQUENTIAL}: Все попытки отправки уведомления завершились неудачей`,
      );

      expect(thrownError?.cause).toBeInstanceOf(Array);
      expect(thrownError?.cause).toHaveLength(2);
      expect((thrownError?.cause as unknown[])[0]).toBe(emailError);
      expect((thrownError?.cause as unknown[])[1]).toBe(bitrixError);

      expect(emailChannel.sendSpy).toHaveBeenCalledTimes(1);
      expect(bitrixChannel.sendSpy).toHaveBeenCalledTimes(1);
    });
  });
});
