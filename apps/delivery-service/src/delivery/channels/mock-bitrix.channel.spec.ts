import { Test, TestingModule } from '@nestjs/testing';
import { MockBitrixChannel } from './mock-bitrix.channel';
import { Provider, Contact } from '@app/shared';

describe('MockBitrixChannel', () => {
  let channel: MockBitrixChannel;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MockBitrixChannel],
    }).compile();

    channel = module.get<MockBitrixChannel>(MockBitrixChannel);
  });

  describe('send', () => {
    it('should successfully simulate message delivery without throwing an error', async () => {
      const contact: Contact = { type: Provider.BITRIX, value: '12345' };
      const message = 'Test payload';

      await expect(channel.send(contact, message)).resolves.not.toThrow();
    });
  });
});
