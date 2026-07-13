import { Test, TestingModule } from '@nestjs/testing';
import { MockEmailChannel } from './mock-email.channel';
import { Provider, Contact } from '@app/shared';

describe('MockEmailChannel', () => {
  let channel: MockEmailChannel;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MockEmailChannel],
    }).compile();

    channel = module.get<MockEmailChannel>(MockEmailChannel);
  });

  describe('constructor', () => {
    it('should be successfully initialized with correct provider type', () => {
      expect(channel).toBeDefined();
      expect(channel.type).toBe(Provider.EMAIL);
    });
  });

  describe('isSupports', () => {
    it('should return true if contact type matches EMAIL provider', () => {
      const validContact: Contact = {
        type: Provider.EMAIL,
        value: 'test@email.com',
      };
      expect(channel.isSupports(validContact)).toBe(true);
    });

    it('should return false if contact type does not match EMAIL provider', () => {
      const invalidContact: Contact = {
        type: Provider.BITRIX,
        value: '14253',
      };
      expect(channel.isSupports(invalidContact)).toBe(false);
    });
  });

  describe('send', () => {
    it('should successfully simulate email message delivery without throwing an error', async () => {
      const contact: Contact = {
        type: Provider.EMAIL,
        value: 'test@email.com',
      };
      const message = 'Test email payload';

      await expect(channel.send(contact, message)).resolves.not.toThrow();
    });
  });

  describe('checkHealth', () => {
    it('should successfully pass health check with default resolved promise from abstract base', async () => {
      await expect(channel.checkHealth()).resolves.not.toThrow();
    });
  });
});
