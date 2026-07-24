import { Channel } from './channel.abstract';
import { Contact, Provider } from '@app/shared';

describe('Channel', () => {
  class TestChannel extends Channel {
    protected readonly type = Provider.EMAIL;

    public async performSend(): Promise<void> {
      return Promise.resolve();
    }
  }

  let channel: TestChannel;

  beforeEach(() => {
    channel = new TestChannel({ maxConcurrent: 1, minTime: 0 });
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
  });
});
