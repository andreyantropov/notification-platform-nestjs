import { Test, TestingModule } from '@nestjs/testing';
import { MockBitrixChannel } from './mock-bitrix.channel';
import { Provider, Contact } from '@app/shared';
import { ChannelContext } from '../../core/channel.context';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('MockBitrixChannel', () => {
  let channel: MockBitrixChannel;

  beforeEach(async () => {
    jest.useRealTimers();
    jest.spyOn(console, 'log').mockImplementation(() => {});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MockBitrixChannel,
        {
          provide: ChannelContext,
          useValue: {
            events: { emit: jest.fn() } as unknown as EventEmitter2,
          } satisfies Partial<ChannelContext>,
        },
      ],
    }).compile();

    channel = module.get<MockBitrixChannel>(MockBitrixChannel);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('send', () => {
    it('should successfully simulate message delivery without throwing an error', async () => {
      const contact: Contact = { type: Provider.BITRIX, value: '12345' };
      const message = 'Test payload';

      await expect(channel.send(contact, message)).resolves.toBeUndefined();

      expect(console.log).toHaveBeenCalledWith(
        `[MOCK BITRIX] To: 12345 | Message: Test payload`,
      );
    });
  });
});
