import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { lastValueFrom, Observable, of, throwError } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;

  let spyLoggerError: jest.Mock;
  let spyHandle: jest.Mock;

  let mockLogger: jest.Mocked<Logger>;
  let mockExecutionContext: jest.Mocked<ExecutionContext>;
  let mockCallHandler: jest.Mocked<CallHandler>;

  beforeEach(() => {
    spyLoggerError = jest.fn(() => undefined);
    mockLogger = {
      error: spyLoggerError,
    } as unknown as jest.Mocked<Logger>;

    spyHandle = jest.fn(() => of('success'));
    mockCallHandler = {
      handle: spyHandle,
    };

    mockExecutionContext = {} as unknown as jest.Mocked<ExecutionContext>;

    interceptor = new LoggingInterceptor(mockLogger);
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(interceptor).toBeDefined();
    });
  });

  describe('intercept', () => {
    it('should pass through successfully when no error occurs', async () => {
      const result$ = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      expect(spyHandle).toHaveBeenCalledTimes(1);
      expect(spyLoggerError).not.toHaveBeenCalled();

      const value = await lastValueFrom(result$);
      expect(value).toBe('success');
    });

    it('should log error and throwError when an error occurs', async () => {
      const mockError = new Error('Database connection failure');
      spyHandle.mockReturnValue(throwError(() => mockError));

      const result$ = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      expect(result$).toBeInstanceOf(Observable);

      await expect(lastValueFrom(result$)).rejects.toThrow(mockError);

      expect(spyHandle).toHaveBeenCalledTimes(1);
      expect(spyLoggerError).toHaveBeenCalledWith(mockError, 'Ошибка сервера');
    });

    it('should log and rethrow unknown error types correctly', async () => {
      const mockRawError = { customStatus: 'failed', critical: true };
      spyHandle.mockReturnValue(throwError(() => mockRawError));

      const result$ = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      await expect(lastValueFrom(result$)).rejects.toEqual(mockRawError);

      expect(spyLoggerError).toHaveBeenCalledWith(
        mockRawError,
        'Ошибка сервера',
      );
    });
  });
});
