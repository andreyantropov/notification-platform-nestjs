import { broadcastStrategy } from './broadcast.strategy';
import { Notification } from '@app/shared/interfaces/notification.interface';
import { Channel } from '../interfaces/channel.interface';
import { Mode } from '@app/shared/enums/mode.enum';
import { Provider } from '@app/shared/enums/provider.enum';
import { Contact } from '@app/shared/interfaces/contact.interface';

describe('BroadcastStrategy', () => {
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

    mockEmailChannel = {
      type: Provider.EMAIL,
      isSupports: (contact: Contact) => contact.type === Provider.EMAIL,
      send: emailSendSpy,
    };

    mockBitrixChannel = {
      type: Provider.BITRIX,
      isSupports: (contact: Contact) => contact.type === Provider.BITRIX,
      send: bitrixSendSpy,
    };

    channels = [mockEmailChannel, mockBitrixChannel];
  });

  it('should send messages to all supporting channels simultaneously', async () => {
    emailSendSpy.mockResolvedValue(undefined);
    bitrixSendSpy.mockResolvedValue(undefined);

    await broadcastStrategy(mockNotification, channels);

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

    await expect(broadcastStrategy(mockNotification, channels)).rejects.toThrow(
      'Один или несколько каналов вернули ошибку во время массовой отправки',
    );

    expect(emailSendSpy).toHaveBeenCalledTimes(1);
    expect(bitrixSendSpy).toHaveBeenCalledTimes(1);
  });
});
