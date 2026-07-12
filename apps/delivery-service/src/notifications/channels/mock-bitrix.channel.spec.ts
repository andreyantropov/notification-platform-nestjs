import { Test, TestingModule } from '@nestjs/testing';
import { MockBitrixChannel } from './mock-bitrix.channel';
import { Provider } from '@app/shared';
import { Contact } from '@app/shared';

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
});
