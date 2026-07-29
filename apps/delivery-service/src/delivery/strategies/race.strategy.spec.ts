import { RaceStrategy } from './race.strategy';
import { Notification, Mode, Provider, Contact } from '@app/shared';
import { Channel } from '../channels/channel.abstract';
import { ChannelContext } from '../channels/channel.context';
import { Counter, Histogram } from '@opentelemetry/api';
import { Logger } from '@nestjs/common';
import { MetricService } from 'nestjs-otel';

describe('RaceStrategy', () => {
  let strategy: RaceStrategy;

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
    id: 'notif-race',
    correlationId: 'corr-race',
    clientId: 'auth-service',
    createdAt: new Date().toISOString(),
    message: 'Race Message',
    mode: Mode.RACE,
    contacts: [
      { type: Provider.EMAIL, value: 'race-user@test.com' },
      { type: Provider.BITRIX, value: '22222' },
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

    strategy = new RaceStrategy();

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
    it('should succeed immediately if all channels deliver successfully', async () => {
      emailChannel.sendSpy.mockResolvedValue(undefined);
      bitrixChannel.sendSpy.mockResolvedValue(undefined);

      await expect(
        strategy.execute(mockNotification, channels),
      ).resolves.not.toThrow();

      expect(emailChannel.sendSpy).toHaveBeenCalledTimes(1);
      expect(bitrixChannel.sendSpy).toHaveBeenCalledTimes(1);
    });

    it('should succeed if at least one channel delivers successfully', async () => {
      emailChannel.sendSpy.mockRejectedValue(new Error('SMTP Gateway Error'));
      bitrixChannel.sendSpy.mockResolvedValue(undefined);

      await expect(
        strategy.execute(mockNotification, channels),
      ).resolves.not.toThrow();

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

    it('should throw an error with all aggregated causes when all channels fail', async () => {
      const emailError = new Error('SMTP Fatal Error');
      const bitrixError = new Error('Bitrix REST Error');

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
        `Стратегия ${Mode.RACE}: Все попытки отправки уведомления завершились неудачей`,
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
