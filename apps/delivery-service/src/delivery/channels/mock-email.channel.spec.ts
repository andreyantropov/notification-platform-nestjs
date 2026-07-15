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
});
