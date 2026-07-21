import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { BitrixChannel } from './bitrix.channel';
import { BitrixChannelConfig } from './bitrix.channel.config';
import { Provider, Contact } from '@app/shared';

interface BitrixResponse {
  readonly result?: unknown;
  readonly error?: string;
  readonly error_description?: string;
}

describe('BitrixChannel', () => {
  let channel: BitrixChannel;
  let mockHttpPost: jest.Mock;

  const mockConfig: BitrixChannelConfig = new BitrixChannelConfig(
    'https://bitrix24.ru',
    '1',
    'secret-token',
    5000,
    {},
  );

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
          provide: BitrixChannelConfig,
          useValue: mockConfig,
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
      expect(channel.type).toBe(Provider.BITRIX);
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
        expect.stringContaining('/im.notify.personal.add.json'),
        expect.objectContaining({ user_id: '14253', message }),
        expect.objectContaining({ timeout: 5000 }),
      );
    });

    it('should throw an error when Bitrix API returns an explicit error payload', async () => {
      const axiosResponse = createAxiosResponse({
        error: 'INVALID_CREDENTIALS',
        error_description: 'Invalid request credentials',
      });
      mockHttpPost.mockReturnValue(of(axiosResponse));

      await expect(channel.send(contact, message)).rejects.toThrow(
        'Не удалось отправить уведомление через Bitrix',
      );
    });

    it('should throw an error when HTTP network request completely fails', async () => {
      const networkError = new Error('Gateway Timeout');
      mockHttpPost.mockReturnValue(throwError(() => networkError));

      await expect(channel.send(contact, message)).rejects.toThrow(
        'Не удалось отправить уведомление через Bitrix',
      );
    });
  });

  describe('checkHealth', () => {
    it('should successfully pass health check when Bitrix API is reachable', async () => {
      const axiosResponse = createAxiosResponse({ result: { ID: '1' } });
      mockHttpPost.mockReturnValue(of(axiosResponse));

      await expect(channel.checkHealth()).resolves.not.toThrow();

      expect(mockHttpPost).toHaveBeenCalledWith(
        expect.stringContaining('/server.time.json'),
        expect.any(Object),
        expect.any(Object),
      );
    });

    it('should throw an error when network request to Bitrix fails', async () => {
      const networkError = new Error('Network Error');
      mockHttpPost.mockReturnValue(throwError(() => networkError));

      await expect(channel.checkHealth()).rejects.toThrow(
        'Bitrix API недоступен',
      );
    });
  });
});
