import { SequentialStrategy } from './sequential.strategy';
import { Notification, Mode, Provider, Contact } from '@app/shared';
import { Channel } from '../channels/channel.abstract';

describe('SequentialStrategy', () => {
  let strategy: SequentialStrategy;

  class MockChannel extends Channel {
    constructor(
      public readonly type: Provider,
      public sendSpy: jest.Mock<Promise<void>, [Contact, string]>,
    ) {
      super();
    }

    async send(contact: Contact, message: string): Promise<void> {
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
    strategy = new SequentialStrategy();

    const emailSpy = jest.fn<Promise<void>, [Contact, string]>();
    const bitrixSpy = jest.fn<Promise<void>, [Contact, string]>();

    emailChannel = new MockChannel(Provider.EMAIL, emailSpy);
    bitrixChannel = new MockChannel(Provider.BITRIX, bitrixSpy);

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

    it('should throw an error with attempt count if all channels fail', async () => {
      emailChannel.sendSpy.mockRejectedValue(new Error('SMTP Error'));
      bitrixChannel.sendSpy.mockRejectedValue(new Error('Bitrix Error'));

      await expect(
        strategy.execute(mockNotification, channels),
      ).rejects.toThrow(
        'Все попытки отправки уведомления (2 шт.) завершились неудачей',
      );

      expect(emailChannel.sendSpy).toHaveBeenCalledTimes(1);
      expect(bitrixChannel.sendSpy).toHaveBeenCalledTimes(1);
    });
  });
});
