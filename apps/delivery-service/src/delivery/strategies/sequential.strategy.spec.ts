import { sequentialStrategy } from './sequential.strategy';
import { Notification } from '@app/shared';
import { Channel } from '../abstracts/channel.abstract';
import { Mode } from '@app/shared';
import { Provider } from '@app/shared';
import { Contact } from '@app/shared';

describe('SequentialStrategy', () => {
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
    emailSendSpy = jest.fn<Promise<void>, [Contact, string]>();
    bitrixSendSpy = jest.fn<Promise<void>, [Contact, string]>();

    mockEmailChannel = new TestEmailChannel(emailSendSpy);
    mockBitrixChannel = new TestBitrixChannel(bitrixSendSpy);

    channels = [mockEmailChannel, mockBitrixChannel];
  });

  it('should stop and return after the first successful delivery', async () => {
    emailSendSpy.mockResolvedValue(undefined);

    await sequentialStrategy(mockNotification, channels);

    expect(emailSendSpy).toHaveBeenCalledTimes(1);
    expect(bitrixSendSpy).not.toHaveBeenCalled();

    expect(emailSendSpy).toHaveBeenCalledWith(
      mockNotification.contacts[0],
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
      mockNotification.contacts[1],
      mockNotification.message,
    );
  });

  it('should throw an error with attempt count if all channels fail', async () => {
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
