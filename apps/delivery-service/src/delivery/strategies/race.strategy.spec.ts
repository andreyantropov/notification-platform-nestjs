import { RaceStrategy } from './race.strategy';
import { Notification, Mode, Provider, Contact } from '@app/shared';
import { Channel } from '../channels/channel.abstract';

describe('RaceStrategy', () => {
  let strategy: RaceStrategy;

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
    strategy = new RaceStrategy();

    const emailSpy = jest.fn<Promise<void>, [Contact, string]>();
    const bitrixSpy = jest.fn<Promise<void>, [Contact, string]>();

    emailChannel = new MockChannel(Provider.EMAIL, emailSpy);
    bitrixChannel = new MockChannel(Provider.BITRIX, bitrixSpy);

    channels = [emailChannel, bitrixChannel];
  });

  describe('execute', () => {
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

    it('should throw an error only when all channels fail', async () => {
      emailChannel.sendSpy.mockRejectedValue(new Error('SMTP Fatal Error'));
      bitrixChannel.sendSpy.mockRejectedValue(new Error('Bitrix REST Error'));

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
