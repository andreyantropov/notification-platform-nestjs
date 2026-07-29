import { Test, TestingModule } from '@nestjs/testing';
import { MockBitrixChannel } from './mock-bitrix.channel';
import { Provider, Contact } from '@app/shared';
import { ChannelContext } from './channel.context';
import { Counter, Histogram } from '@opentelemetry/api';
import { Logger } from '@nestjs/common';
import { MetricService } from 'nestjs-otel';

describe('MockBitrixChannel', () => {
  let channel: MockBitrixChannel;

  beforeEach(async () => {
    const dummyCounter = { add: jest.fn() } as unknown as Counter;
    const dummyHistogram = { record: jest.fn() } as unknown as Histogram;

    const mockMetricService = {
      getCounter: jest.fn().mockReturnValue(dummyCounter),
      getHistogram: jest.fn().mockReturnValue(dummyHistogram),
    } as unknown as MetricService;

    const dummyLogger = {
      log: jest.fn(),
      debug: jest.fn(),
    } as unknown as Logger;

    jest.spyOn(console, 'log').mockImplementation(() => {});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MockBitrixChannel,
        {
          provide: ChannelContext,
          useValue: {
            metrics: mockMetricService,
            logger: dummyLogger,
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

      await expect(channel.send(contact, message)).resolves.not.toThrow();

      expect(console.log).toHaveBeenCalledWith(
        `[MOCK BITRIX] To: 12345 | Message: Test payload`,
      );
    });
  });
});
