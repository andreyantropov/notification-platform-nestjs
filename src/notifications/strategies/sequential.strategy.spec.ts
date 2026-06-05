import { sequentialStrategy } from './sequential.strategy';
import { Notification } from '../interfaces/notification.interface';
import { Channel } from '../interfaces/channel.interface';
import { Contact } from '../interfaces/contact.interface';
import { Mode } from '../enums/mode.enum';
import { Provider } from '../enums/provider.enum';

describe('SequentialStrategy', () => {
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

  let emailSendSpy: jest.Mock<Promise<void>, [Contact, string]>;
  let bitrixSendSpy: jest.Mock<Promise<void>, [Contact, string]>;

  let mockEmailChannel: Channel;
  let mockBitrixChannel: Channel;
  let channels: readonly Channel[];

  beforeEach(() => {
    emailSendSpy = jest.fn();
    bitrixSendSpy = jest.fn();

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

  it('should stop and return after the first successful delivery', async () => {
    emailSendSpy.mockResolvedValue(undefined);

    await sequentialStrategy(mockNotification, channels);

    expect(emailSendSpy).toHaveBeenCalledTimes(1);
    expect(bitrixSendSpy).not.toHaveBeenCalled();

    expect(emailSendSpy).toHaveBeenCalledWith(
      mockNotification.contacts,
      mockNotification.message,
    );
  });

  it('should try the next channel if the previous one fails', async () => {
    emailSendSpy.mockRejectedValue(new Error('SMTP Gateway Error'));
    bitrixSendSpy.mockResolvedValue(undefined);

    await sequentialStrategy(mockNotification, channels);

    expect(emailSendSpy).toHaveBeenCalledTimes(1);
    expect(bitrixSendSpy).toHaveBeenCalledTimes(1);

    expect(bitrixSendSpy).toHaveBeenCalledWith(
      mockNotification.contacts,
      mockNotification.message,
    );
  });

  it('should throw an error with attempt count if all channels fail', async () => {
    и;
    emailSendSpy.mockRejectedValue(new Error('SMTP Error'));
    bitrixSendSpy.mockRejectedValue(new Error('Bitrix Error'));

    await expect(
      sequentialStrategy(mockNotification, channels),
    ).rejects.toThrow(
      'Все попытки отправки уведомления (2 шт.) завершились неудачей',
    );

    expect(emailSendSpy).toHaveBeenCalledTimes(1);
    expect(bitrixSendSpy).toHaveBeenCalledTimes(1);
  });
});
