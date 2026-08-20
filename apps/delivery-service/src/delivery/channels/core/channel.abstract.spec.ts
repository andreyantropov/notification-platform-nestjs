import { Channel } from './channel.abstract';
import { Contact, Provider } from '@app/shared';
import { ChannelContext } from './channel.context';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('Channel', () => {
  class TestChannel extends Channel {
    protected readonly type = Provider.EMAIL;

    protected async performSend(): Promise<void> {
      return Promise.resolve();
    }
  }

  let channel: TestChannel;
  let mockContext: ChannelContext;
  let mockEventEmitter: jest.Mocked<Pick<EventEmitter2, 'emit'>>;

  beforeEach(() => {
    mockEventEmitter = {
      emit: jest.fn(),
    };

    mockContext = {
      events: mockEventEmitter,
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
        .spyOn(channel, 'performSend' as keyof TestChannel)
        .mockResolvedValue(undefined);

      await expect(channel.send(contact, message)).resolves.toBeUndefined();

      expect(performSendSpy).toHaveBeenCalledTimes(1);
      expect(performSendSpy).toHaveBeenCalledWith(contact, message);
    });

    it('should properly bubble up errors thrown by performSend through the limiter', async () => {
      const contact: Contact = { type: Provider.EMAIL, value: 'test@test.com' };
      const networkError = new Error('SMTP Timeout');

      jest
        .spyOn(channel, 'performSend' as keyof TestChannel)
        .mockRejectedValue(networkError);

      await expect(channel.send(contact, 'Hello')).rejects.toThrow(
        'SMTP Timeout',
      );
    });

    it('should emit initiated and success events upon successful send', async () => {
      const contact: Contact = { type: Provider.EMAIL, value: 'test@test.com' };
      const message = 'Hello';

      await channel.send(contact, message);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'channel.send.initiated',
        {
          provider: Provider.EMAIL,
          contact: 'test@test.com',
        },
      );

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'channel.send.successed',
        expect.objectContaining({
          provider: Provider.EMAIL,
          contact: 'test@test.com',
        }),
      );

      expect(mockEventEmitter.emit).not.toHaveBeenCalledWith(
        'channel.send.failed',
        expect.any(Object),
      );
    });

    it('should emit initiated and failed events when performSend fails', async () => {
      const contact: Contact = { type: Provider.EMAIL, value: 'test@test.com' };
      const testError = new Error('Failed');

      jest
        .spyOn(channel, 'performSend' as keyof TestChannel)
        .mockRejectedValue(testError);

      await expect(channel.send(contact, 'Hello')).rejects.toThrow('Failed');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'channel.send.initiated',
        {
          provider: Provider.EMAIL,
          contact: 'test@test.com',
        },
      );

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'channel.send.failed',
        expect.objectContaining({
          provider: Provider.EMAIL,
          contact: 'test@test.com',
          error: testError,
        }),
      );

      expect(mockEventEmitter.emit).not.toHaveBeenCalledWith(
        'channel.send.successed',
        expect.any(Object),
      );
    });
  });
});
