import { BroadcastStrategy } from './broadcast.strategy';
import { Notification, Mode, Provider, Contact } from '@app/shared';
import { Channel } from '../channels/channel.abstract';

describe('BroadcastStrategy', () => {
  let strategy: BroadcastStrategy;

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
    strategy = new BroadcastStrategy();

    const emailSpy = jest.fn<Promise<void>, [Contact, string]>();
    const bitrixSpy = jest.fn<Promise<void>, [Contact, string]>();

    emailChannel = new MockChannel(Provider.EMAIL, emailSpy);
    bitrixChannel = new MockChannel(Provider.BITRIX, bitrixSpy);

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

    it('should throw an error if at least one channel fails', async () => {
      emailChannel.sendSpy.mockResolvedValue(undefined);
      bitrixChannel.sendSpy.mockRejectedValue(new Error('Bitrix API Timeout'));

      await expect(
        strategy.execute(mockNotification, channels),
      ).rejects.toThrow(
        'Один или несколько каналов вернули ошибку во время массовой отправки',
      );

      expect(emailChannel.sendSpy).toHaveBeenCalledTimes(1);
      expect(bitrixChannel.sendSpy).toHaveBeenCalledTimes(1);
    });
  });
});
