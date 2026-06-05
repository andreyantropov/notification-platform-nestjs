import { getAttempts } from './get-attempts.util';
import { Channel } from '../../interfaces/channel.interface';
import { Contact } from '../../interfaces/contact.interface';
import { Provider } from '../../enums/provider.enum';

describe('getAttempts', () => {
  const mockEmailContact: Contact = {
    type: Provider.EMAIL,
    value: 'test@email.com',
  };
  const mockBitrixContact: Contact = { type: Provider.BITRIX, value: '12345' };

  const mockEmailChannel: Channel = {
    type: Provider.EMAIL,
    isSupports(contact: Contact): boolean {
      return contact.type === Provider.EMAIL;
    },
    async send(): Promise<void> {
      return Promise.resolve();
    },
  };

  const mockBitrixChannel: Channel = {
    type: Provider.BITRIX,
    isSupports(contact: Contact): boolean {
      return contact.type === Provider.BITRIX;
    },
    async send(): Promise<void> {
      return Promise.resolve();
    },
  };

  const channels: readonly Channel[] = [mockEmailChannel, mockBitrixChannel];

  it('should map contacts to their corresponding supporting channels', () => {
    const contacts: readonly Contact[] = [mockEmailContact, mockBitrixContact];

    const result = getAttempts(contacts, channels);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      channel: mockEmailChannel,
      contact: mockEmailContact,
    });
    expect(result[1]).toEqual({
      channel: mockBitrixChannel,
      contact: mockBitrixContact,
    });
  });

  it('should ignore contacts if no supporting channel is found', () => {
    const contacts: readonly Contact[] = [mockEmailContact];
    const filteredChannels: readonly Channel[] = [mockBitrixChannel];

    const result = getAttempts(contacts, filteredChannels);

    expect(result).toHaveLength(0);
  });

  it('should duplicate pairs if multiple channels support the same contact', () => {
    const contacts: readonly Contact[] = [mockEmailContact];

    const secondaryEmailChannel: Channel = {
      type: Provider.EMAIL,
      isSupports(contact: Contact): boolean {
        return contact.type === Provider.EMAIL;
      },
      async send(): Promise<void> {
        return Promise.resolve();
      },
    };

    const multipleChannels: readonly Channel[] = [
      mockEmailChannel,
      secondaryEmailChannel,
    ];

    const result = getAttempts(contacts, multipleChannels);

    expect(result).toHaveLength(2);
    expect(result[0].channel).toBe(mockEmailChannel);
    expect(result[1].channel).toBe(secondaryEmailChannel);
  });
});
