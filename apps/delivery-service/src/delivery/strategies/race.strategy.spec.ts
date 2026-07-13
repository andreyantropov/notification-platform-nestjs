import { race } from './race.strategy';
import { Notification } from '@app/shared';
import { Channel } from '../types/channel.abstract';
import { Mode } from '@app/shared';
import { Provider } from '@app/shared';
import { Contact } from '@app/shared';

describe('race', () => {
  class TestEmailChannel extends Channel {
    protected readonly type = Provider.EMAIL;

    constructor(
      private readonly sendSpy: jest.Mock<Promise<void>, [Contact, string]>,
    ) {
      super();
    }

    async send(contact: Contact, message: string): Promise<void> {
      return this.sendSpy(contact, message);
    }
  }

  class TestBitrixChannel extends Channel {
    protected readonly type = Provider.BITRIX;

    constructor(
      private readonly sendSpy: jest.Mock<Promise<void>, [Contact, string]>,
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

  let emailSendSpy: jest.Mock<Promise<void>, [Contact, string]>;
  let bitrixSendSpy: jest.Mock<Promise<void>, [Contact, string]>;

  let mockEmailChannel: Channel;
  let mockBitrixChannel: Channel;
  let channels: readonly Channel[];

  beforeEach(() => {
    emailSendSpy = jest.fn<Promise<void>, [Contact, string]>();
    bitrixSendSpy = jest.fn<Promise<void>, [Contact, string]>();

    mockEmailChannel = new TestEmailChannel(emailSendSpy);
    mockBitrixChannel = new TestBitrixChannel(bitrixSendSpy);

    channels = [mockEmailChannel, mockBitrixChannel];
  });

  it('should succeed if at least one channel delivers successfully', async () => {
    emailSendSpy.mockRejectedValue(new Error('SMTP Gateway Error'));
    bitrixSendSpy.mockResolvedValue(undefined);

    await expect(race(mockNotification, channels)).resolves.not.toThrow();

    expect(emailSendSpy).toHaveBeenCalledTimes(1);
    expect(bitrixSendSpy).toHaveBeenCalledTimes(1);

    expect(emailSendSpy).toHaveBeenCalledWith(
      mockNotification.contacts[0],
      mockNotification.message,
    );
    expect(bitrixSendSpy).toHaveBeenCalledWith(
      mockNotification.contacts[1],
      mockNotification.message,
    );
  });

  it('should throw an error only when all channels fail', async () => {
    emailSendSpy.mockRejectedValue(new Error('SMTP Fatal Error'));
    bitrixSendSpy.mockRejectedValue(new Error('Bitrix REST Error'));

    await expect(race(mockNotification, channels)).rejects.toThrow(
      'Все попытки отправки уведомления (2 шт.) завершились неудачей',
    );

    expect(emailSendSpy).toHaveBeenCalledTimes(1);
    expect(bitrixSendSpy).toHaveBeenCalledTimes(1);
  });
});
