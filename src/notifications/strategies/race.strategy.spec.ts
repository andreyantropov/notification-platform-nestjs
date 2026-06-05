import { raceStrategy } from './race.strategy';
import { Notification } from '../interfaces/notification.interface';
import { Channel } from '../interfaces/channel.interface';
import { Contact } from '../interfaces/contact.interface';
import { Mode } from '../enums/mode.enum';
import { Provider } from '../enums/provider.enum';

describe('RaceStrategy', () => {
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

  it('should succeed if at least one channel delivers successfully', async () => {
    emailSendSpy.mockRejectedValue(new Error('SMTP Gateway Error'));
    bitrixSendSpy.mockResolvedValue(undefined);

    await expect(
      raceStrategy(mockNotification, channels),
    ).resolves.not.toThrow();

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

    await expect(raceStrategy(mockNotification, channels)).rejects.toThrow(
      'Все попытки отправки уведомления (2 шт.) завершились неудачей',
    );

    expect(emailSendSpy).toHaveBeenCalledTimes(1);
    expect(bitrixSendSpy).toHaveBeenCalledTimes(1);
  });
});
