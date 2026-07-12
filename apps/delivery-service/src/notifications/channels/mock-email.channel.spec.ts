import { Test, TestingModule } from '@nestjs/testing';
import { MockEmailChannel } from './mock-email.channel';
import { Provider } from '@app/shared';
import { Contact } from '@app/shared';

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
});
