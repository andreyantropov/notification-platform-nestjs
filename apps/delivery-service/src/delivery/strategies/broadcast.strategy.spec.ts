import { broadcast } from './broadcast.strategy';
import { Notification } from '@app/shared';
import { Channel } from '../types/channel.abstract';
import { Mode } from '@app/shared';
import { Provider } from '@app/shared';
import { Contact } from '@app/shared';

describe('broadcast', () => {
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

  it('should send messages to all supporting channels simultaneously', async () => {
    emailSendSpy.mockResolvedValue(undefined);
    bitrixSendSpy.mockResolvedValue(undefined);

    await broadcast(mockNotification, channels);

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

  it('should throw an error if at least one channel fails', async () => {
    emailSendSpy.mockResolvedValue(undefined);
    bitrixSendSpy.mockRejectedValue(new Error('Bitrix API Timeout'));

    await expect(broadcast(mockNotification, channels)).rejects.toThrow(
      'Один или несколько каналов вернули ошибку во время массовой отправки',
    );

    expect(emailSendSpy).toHaveBeenCalledTimes(1);
    expect(bitrixSendSpy).toHaveBeenCalledTimes(1);
  });
});
