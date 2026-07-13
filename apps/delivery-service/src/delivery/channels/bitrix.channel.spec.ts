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

  const mockConfig: BitrixChannelConfig = {
    url: 'https://bitrix24.ru',
    userId: '1',
    authToken: 'secret-token',
    timeoutMs: 5000,
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

  describe('isSupports', () => {
    it('should return true if contact type matches BITRIX provider', () => {
      const validContact: Contact = { type: Provider.BITRIX, value: '14253' };
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
    const contact: Contact = { type: Provider.BITRIX, value: '14253' };
    const message = 'Test Bitrix payload';

    it('should successfully send notification when Bitrix API returns valid result', async () => {
      const axiosResponse = createAxiosResponse({ result: 42 });
      mockHttpPost.mockReturnValue(of(axiosResponse));

      await expect(channel.send(contact, message)).resolves.not.toThrow();
      expect(mockHttpPost).toHaveBeenCalledTimes(1);
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
    it('should successfully pass health check when Bitrix API responds with HTTP 200', async () => {
      const axiosResponse = createAxiosResponse({ result: { id: 1 } });
      mockHttpPost.mockReturnValue(of(axiosResponse));

      await expect(channel.checkHealth()).resolves.not.toThrow();
      expect(mockHttpPost).toHaveBeenCalledTimes(1);
      expect(mockHttpPost).toHaveBeenCalledWith(
        `${mockConfig.url}/rest/${mockConfig.userId}/${mockConfig.authToken}/user.current.json`,
      );
    });

    it('should throw an error during health check if Bitrix API endpoint is unreachable', async () => {
      const networkError = new Error('Connection refused');
      mockHttpPost.mockReturnValue(throwError(() => networkError));

      await expect(channel.checkHealth()).rejects.toThrow(
        'Bitrix API недоступен',
      );
      expect(mockHttpPost).toHaveBeenCalledTimes(1);
    });
  });
});
