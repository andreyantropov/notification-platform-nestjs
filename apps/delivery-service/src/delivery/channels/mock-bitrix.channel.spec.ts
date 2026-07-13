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

  describe('constructor', () => {
    it('should be successfully initialized with correct provider type', () => {
      expect(channel).toBeDefined();
      expect(channel.type).toBe(Provider.BITRIX);
    });
  });

  describe('isSupports', () => {
    it('should return true if contact type matches BITRIX provider', () => {
      const validContact: Contact = { type: Provider.BITRIX, value: '12345' };
      expect(channel.isSupports(validContact)).toBe(true);
    });

    it('should return false if contact type does not match BITRIX provider', () => {
      const invalidContact: Contact = {
        type: Provider.EMAIL,
        value: 'test@test.com',
      };
      expect(channel.isSupports(invalidContact)).toBe(false);
    });
  });

  describe('send', () => {
    it('should successfully simulate message delivery without throwing an error', async () => {
      const contact: Contact = { type: Provider.BITRIX, value: '12345' };
      const message = 'Test payload';

      await expect(channel.send(contact, message)).resolves.not.toThrow();
    });
  });

  describe('checkHealth', () => {
    it('should successfully pass health check with default resolved promise', async () => {
      await expect(channel.checkHealth()).resolves.not.toThrow();
    });
  });
});
