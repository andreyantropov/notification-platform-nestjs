import { Test, TestingModule } from '@nestjs/testing';
import { MockBitrixChannel } from './mock-bitrix.channel';
import { Provider } from '@app/shared/enums/provider.enum';
import { Contact } from '@app/shared/interfaces/contact.interface';

describe('MockBitrixChannel', () => {
  let channel: MockBitrixChannel;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MockBitrixChannel],
    }).compile();

    channel = module.get<MockBitrixChannel>(MockBitrixChannel);
  });

  it('should be successfully initialized', () => {
    expect(channel).toBeDefined();
    expect(channel.type).toBe(Provider.BITRIX);
  });

  it('should support BITRIX contact type', () => {
    const validContact: Contact = { type: Provider.BITRIX, value: '12345' };
    expect(channel.isSupports(validContact)).toBe(true);
  });

  it('should not support EMAIL contact type', () => {
    const invalidContact: Contact = {
      type: Provider.EMAIL,
      value: 'test@test.com',
    };
    expect(channel.isSupports(invalidContact)).toBe(false);
  });

  it('should successfully mock message delivery for valid contact', async () => {
    const contact: Contact = { type: Provider.BITRIX, value: '12345' };
    const message = 'Test payload';

    await expect(channel.send(contact, message)).resolves.not.toThrow();
  });

  it('should throw an error when trying to send to an unsupported contact type', async () => {
    const invalidContact: Contact = {
      type: Provider.EMAIL,
      value: 'test@test.com',
    };
    const message = 'Test payload';

    await expect(channel.send(invalidContact, message)).rejects.toThrow(
      'Неверный тип получателя: ожидается id пользователя Bitrix, получено "email"',
    );
  });
});
