import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { BitrixChannel } from './bitrix.channel';
import { bitrixConfig } from '../../config';
import { Provider, Contact } from '@app/shared';
import { ChannelContext } from './channel.context';
import { Counter, Histogram } from '@opentelemetry/api';
import { Logger } from '@nestjs/common';
import { MetricService } from 'nestjs-otel';

interface BitrixResponse {
  readonly result?: unknown;
  readonly error?: string;
  readonly error_description?: string;
}

describe('BitrixChannel', () => {
  let channel: BitrixChannel;
  let mockHttpPost: jest.Mock;

  const mockConfig = {
    url: 'https://bitrix24.ru',
    userId: 1,
    authToken: 'secret-token',
    timeoutMs: 5_000,
    throttle: {
      maxConcurrent: 1,
      minTime: 500,
    },
  };

  const createAxiosResponse = (
    data: BitrixResponse,
  ): AxiosResponse<BitrixResponse> => ({
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {} as InternalAxiosRequestConfig,
  });

  beforeEach(async () => {
    mockHttpPost = jest.fn();

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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BitrixChannel,
        {
          provide: HttpService,
          useValue: {
            post: mockHttpPost,
          },
        },
        {
          provide: bitrixConfig.KEY,
          useValue: mockConfig,
        },
        {
          provide: ChannelContext,
          useValue: {
            metrics: mockMetricService,
            logger: dummyLogger,
          } satisfies Partial<ChannelContext>,
        },
      ],
    }).compile();

    channel = module.get<BitrixChannel>(BitrixChannel);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be successfully initialized with correct provider type', () => {
      expect(channel).toBeDefined();
      expect(channel['type']).toBe(Provider.BITRIX);
    });
  });

  describe('send', () => {
    const contact: Contact = { type: Provider.BITRIX, value: '14253' };
    const message = 'Test Bitrix payload';

    it('should successfully send notification when Bitrix API returns valid result', async () => {
      const axiosResponse = createAxiosResponse({ result: 42 });
      mockHttpPost.mockReturnValue(of(axiosResponse));

      await expect(channel.send(contact, message)).resolves.not.toThrow();

      expect(mockHttpPost).toHaveBeenCalledWith(
        expect.stringContaining('https://bitrix24.ru'),
        expect.objectContaining({ user_id: '14253', message }),
        expect.objectContaining({ timeout: 5_000 }),
      );
    });

    it('should throw an error when Bitrix API returns an explicit error payload', async () => {
      const axiosResponse = createAxiosResponse({
        error: 'INVALID_CREDENTIALS',
        error_description: 'Invalid request credentials',
      });
      mockHttpPost.mockReturnValue(of(axiosResponse));

      await expect(channel.send(contact, message)).rejects.toThrow(
        'Канал bitrix: Не удалось отправить уведомление',
      );
    });

    it('should throw an error when HTTP network request completely fails', async () => {
      const networkError = new Error('Gateway Timeout');
      mockHttpPost.mockReturnValue(throwError(() => networkError));

      await expect(channel.send(contact, message)).rejects.toThrow(
        'Канал bitrix: Не удалось отправить уведомление',
      );
    });
  });

  describe('checkHealth', () => {
    it('should successfully pass health check when Bitrix API is reachable', async () => {
      const axiosResponse = createAxiosResponse({ result: { ID: '1' } });
      mockHttpPost.mockReturnValue(of(axiosResponse));

      await expect(channel.checkHealth()).resolves.not.toThrow();

      expect(mockHttpPost).toHaveBeenCalledWith(
        expect.stringContaining('https://bitrix24.ru'),
        expect.any(Object),
        expect.any(Object),
      );
    });

    it('should throw an error when network request to Bitrix fails', async () => {
      const networkError = new Error('Network Error');
      mockHttpPost.mockReturnValue(throwError(() => networkError));

      await expect(channel.checkHealth()).rejects.toThrow(
        'Канал bitrix: Bitrix API недоступен',
      );
    });
  });
});
