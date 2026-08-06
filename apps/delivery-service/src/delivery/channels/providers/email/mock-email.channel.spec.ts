import { Test, TestingModule } from '@nestjs/testing';
import { MockEmailChannel } from './mock-email.channel';
import { Provider, Contact } from '@app/shared';
import { ChannelContext } from '../../core/channel.context';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('MockEmailChannel', () => {
  let channel: MockEmailChannel;

  beforeEach(async () => {
    jest.useRealTimers();
    jest.spyOn(console, 'log').mockImplementation(() => {});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MockEmailChannel,
        {
          provide: ChannelContext,
          useValue: {
            events: { emit: jest.fn() } as unknown as EventEmitter2,
          } satisfies Partial<ChannelContext>,
        },
      ],
    }).compile();

    channel = module.get<MockEmailChannel>(MockEmailChannel);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('send', () => {
    it('should successfully simulate email message delivery without throwing an error', async () => {
      const contact: Contact = {
        type: Provider.EMAIL,
        value: 'test@email.com',
      };
      const message = 'Test email payload';

      await expect(channel.send(contact, message)).resolves.toBeUndefined();

      expect(console.log).toHaveBeenCalledWith(
        `[MOCK EMAIL] To: test@email.com | Message: Test email payload`,
      );
    });
  });
});
