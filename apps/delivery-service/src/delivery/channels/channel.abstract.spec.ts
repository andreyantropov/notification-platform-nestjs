import { Channel } from './channel.abstract';
import { Contact, Provider } from '@app/shared';
import { ChannelContext } from './channel.context';
import { Counter, Histogram } from '@opentelemetry/api';
import { Logger } from '@nestjs/common';
import { MetricService } from 'nestjs-otel';

describe('Channel', () => {
  class TestChannel extends Channel {
    protected readonly type = Provider.EMAIL;

    public async performSend(): Promise<void> {
      return Promise.resolve();
    }
  }

  let channel: TestChannel;
  let mockContext: ChannelContext;

  let mockCounter: jest.Mocked<Pick<Counter, 'add'>>;
  let mockHistogram: jest.Mocked<Pick<Histogram, 'record'>>;
  let mockLogger: jest.Mocked<Pick<Logger, 'log' | 'debug'>>;

  beforeEach(() => {
    mockCounter = { add: jest.fn() };
    mockHistogram = { record: jest.fn() };
    mockLogger = { log: jest.fn(), debug: jest.fn() };

    const mockMetricService = {
      getCounter: jest.fn().mockReturnValue(mockCounter),
      getHistogram: jest.fn().mockReturnValue(mockHistogram),
    } as unknown as MetricService;

    mockContext = {
      metrics: mockMetricService,
      logger: mockLogger as unknown as Logger,
    };

    channel = new TestChannel(mockContext, { maxConcurrent: 1, minTime: 0 });
  });

  describe('isSupports', () => {
    it('should return true if contact type matches channel type', () => {
      const contact: Contact = { type: Provider.EMAIL, value: 'test@test.com' };
      expect(channel.isSupports(contact)).toBe(true);
    });

    it('should return false if contact type does not match channel type', () => {
      const contact: Contact = { type: Provider.BITRIX, value: '12345' };
      expect(channel.isSupports(contact)).toBe(false);
    });
  });

  describe('checkHealth', () => {
    it('should resolve successfully by default', async () => {
      await expect(channel.checkHealth()).resolves.toBeUndefined();
    });
  });

  describe('send', () => {
    it('should call performSend through the limiter', async () => {
      const contact: Contact = { type: Provider.EMAIL, value: 'test@test.com' };
      const message = 'Hello';

      await expect(channel.send(contact, message)).resolves.toBeUndefined();
    });

    it('should route send requests through the limiter to performSend with correct arguments', async () => {
      const contact: Contact = { type: Provider.EMAIL, value: 'test@test.com' };
      const message = 'Hello';

      const performSendSpy = jest
        .spyOn(channel, 'performSend')
        .mockResolvedValue(undefined);

      await expect(channel.send(contact, message)).resolves.toBeUndefined();

      expect(performSendSpy).toHaveBeenCalledTimes(1);
      expect(performSendSpy).toHaveBeenCalledWith(contact, message);
    });

    it('should properly bubble up errors thrown by performSend through the limiter', async () => {
      const contact: Contact = { type: Provider.EMAIL, value: 'test@test.com' };
      const networkError = new Error('SMTP Timeout');

      jest.spyOn(channel, 'performSend').mockRejectedValue(networkError);

      await expect(channel.send(contact, 'Hello')).rejects.toThrow(
        'SMTP Timeout',
      );
    });

    it('should record success metrics and log debug/info upon successful send', async () => {
      const contact: Contact = { type: Provider.EMAIL, value: 'test@test.com' };
      const message = 'Hello';

      await channel.send(contact, message);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        { provider: Provider.EMAIL, contact: 'test@test.com' },
        `Инициирована отправка уведомления.`,
      );

      expect(mockLogger.log).toHaveBeenCalledWith(
        { provider: Provider.EMAIL, contact: 'test@test.com' },
        `Уведомление успешно отправлено.`,
      );

      expect(mockCounter.add).toHaveBeenCalledTimes(1);
      expect(mockCounter.add).toHaveBeenCalledWith(1, {
        provider: Provider.EMAIL,
        status: 'success',
      });

      expect(mockHistogram.record).toHaveBeenCalledTimes(1);
      expect(mockHistogram.record).toHaveBeenCalledWith(expect.any(Number), {
        provider: Provider.EMAIL,
        status: 'success',
      });
    });

    it('should record error metrics, log debug, but NOT log info when performSend fails', async () => {
      const contact: Contact = { type: Provider.EMAIL, value: 'test@test.com' };
      jest.spyOn(channel, 'performSend').mockRejectedValue(new Error('Failed'));

      await expect(channel.send(contact, 'Hello')).rejects.toThrow('Failed');

      expect(mockLogger.debug).toHaveBeenCalledWith(
        { provider: Provider.EMAIL, contact: 'test@test.com' },
        `Инициирована отправка уведомления.`,
      );

      expect(mockLogger.log).not.toHaveBeenCalled();

      expect(mockCounter.add).toHaveBeenCalledTimes(1);
      expect(mockCounter.add).toHaveBeenCalledWith(1, {
        provider: Provider.EMAIL,
        status: 'error',
      });

      expect(mockHistogram.record).toHaveBeenCalledTimes(1);
      expect(mockHistogram.record).toHaveBeenCalledWith(expect.any(Number), {
        provider: Provider.EMAIL,
        status: 'error',
      });
    });
  });
});
