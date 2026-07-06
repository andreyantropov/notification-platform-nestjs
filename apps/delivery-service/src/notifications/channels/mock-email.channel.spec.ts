import { Test, TestingModule } from '@nestjs/testing';
import { MockEmailChannel } from './mock-email.channel';
import { Provider } from '@app/shared/enums/provider.enum';
import { Contact } from '@app/shared/interfaces/contact.interface';

describe('MockEmailChannel', () => {
  let channel: MockEmailChannel;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MockEmailChannel],
    }).compile();

    channel = module.get<MockEmailChannel>(MockEmailChannel);
  });

  it('should be successfully initialized', () => {
    expect(channel).toBeDefined();
    expect(channel.type).toBe(Provider.EMAIL);
  });

  it('should support EMAIL contact type', () => {
    const validContact: Contact = {
      type: Provider.EMAIL,
      value: 'test@example.com',
    };
    expect(channel.isSupports(validContact)).toBe(true);
  });

  it('should not support BITRIX contact type', () => {
    const invalidContact: Contact = { type: Provider.BITRIX, value: '12345' };
    expect(channel.isSupports(invalidContact)).toBe(false);
  });

  it('should successfully mock message delivery for valid contact', async () => {
    const contact: Contact = {
      type: Provider.EMAIL,
      value: 'test@example.com',
    };
    const message = 'Test email payload';

    await expect(channel.send(contact, message)).resolves.not.toThrow();
  });

  it('should throw an error when trying to send to an unsupported contact type', async () => {
    const invalidContact: Contact = { type: Provider.BITRIX, value: '12345' };
    const message = 'Test email payload';

    await expect(channel.send(invalidContact, message)).rejects.toThrow(
      'Неверный тип получателя: ожидается email, получено "bitrix"',
    );
  });
});
