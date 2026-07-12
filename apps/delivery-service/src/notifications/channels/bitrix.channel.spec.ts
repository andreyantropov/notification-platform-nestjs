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

  it('should be successfully initialized', () => {
    expect(channel).toBeDefined();
    expect(channel.type).toBe(Provider.BITRIX);
  });

  it('should support BITRIX contact type', () => {
    const validContact: Contact = { type: Provider.BITRIX, value: '14253' };

    expect(channel.isSupports(validContact)).toBe(true);
  });

  it('should not support EMAIL contact type', () => {
    const invalidContact: Contact = {
      type: Provider.EMAIL,
      value: 'test@test.com',
    };
    expect(channel.isSupports(invalidContact)).toBe(false);
  });

  it('should successfully send notification when Bitrix returns result', async () => {
    const contact: Contact = { type: Provider.BITRIX, value: '14253' };
    const message = 'Test Bitrix payload';

    const axiosResponse = createAxiosResponse({ result: 42 });
    mockHttpPost.mockReturnValue(of(axiosResponse));

    await expect(channel.send(contact, message)).resolves.not.toThrow();
    expect(mockHttpPost).toHaveBeenCalledTimes(1);
  });

  it('should throw an error when Bitrix returns an explicit API error', async () => {
    const contact: Contact = { type: Provider.BITRIX, value: '14253' };
    const message = 'Test Bitrix payload';

    const axiosResponse = createAxiosResponse({
      error: 'INVALID_CREDENTIALS',
      error_description: 'Invalid request credentials',
    });
    mockHttpPost.mockReturnValue(of(axiosResponse));

    await expect(channel.send(contact, message)).rejects.toThrow(
      'Не удалось отправить уведомление через Bitrix',
    );
  });

  it('should throw an error when network request completely fails', async () => {
    const contact: Contact = { type: Provider.BITRIX, value: '14253' };
    const message = 'Test Bitrix payload';

    const networkError = new Error('Gateway Timeout');
    mockHttpPost.mockReturnValue(throwError(() => networkError));

    await expect(channel.send(contact, message)).rejects.toThrow(
      'Не удалось отправить уведомление через Bitrix',
    );
  });
});
