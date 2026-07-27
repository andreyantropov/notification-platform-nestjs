import { Test, TestingModule } from '@nestjs/testing';
import { ClientProxy } from '@nestjs/microservices';
import { of, throwError } from 'rxjs';
import { ReceiveService } from './receive.service';
import { CreateNotification } from './types/create-notification.type';
import {
  Notification,
  Mode,
  Provider,
  DELIVERY_NOTIFICATIONS_SEND_QUEUE,
} from '@app/shared';
import { RMQ_CLIENT } from './receive.constants';
import { BatchResultStatus } from './types/batch-result-status.enum';
import { Logger } from '@nestjs/common';

jest.mock('node:crypto', () => ({
  randomUUID: () => 'mocked-uuid-value',
}));

describe('ReceiveService', () => {
  let service: ReceiveService;
  let clientProxyMock: jest.Mocked<Pick<ClientProxy, 'emit' | 'connect'>>;

  beforeEach(async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    clientProxyMock = {
      emit: jest.fn().mockReturnValue(of(undefined)),
      connect: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReceiveService,
        {
          provide: RMQ_CLIENT,
          useValue: clientProxyMock,
        },
      ],
    }).compile();

    service = module.get<ReceiveService>(ReceiveService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('receive', () => {
    it('should successfully create a notification and emit it to RabbitMQ', async () => {
      const mockClientId = 'client-123';
      const mockCreateNotificationDto: CreateNotification = {
        message: 'Hello, World!',
        mode: Mode.SEQUENTIAL,
        contacts: [
          {
            type: Provider.BITRIX,
            value: '123',
          },
        ],
        correlationId: 'corr-456',
      };

      const result: Notification = await service.receive(
        mockCreateNotificationDto,
        mockClientId,
      );

      expect(result).toBeDefined();
      expect(result.message).toBe(mockCreateNotificationDto.message);
      expect(result.mode).toBe(mockCreateNotificationDto.mode);
      expect(result.correlationId).toBe(
        mockCreateNotificationDto.correlationId,
      );
      expect(result.clientId).toBe(mockClientId);
      expect(result.id).toBe('mocked-uuid-value');
      expect(result.createdAt).toBeDefined();
      expect(new Date(result.createdAt).toString()).not.toBe('Invalid Date');

      expect(clientProxyMock.emit).toHaveBeenCalledTimes(1);
      expect(clientProxyMock.emit).toHaveBeenCalledWith(
        DELIVERY_NOTIFICATIONS_SEND_QUEUE,
        result,
      );
    });

    it('should throw an error if RabbitMQ emit fails', async () => {
      const mockClientId = 'client-123';
      const mockCreateNotificationDto: CreateNotification = {
        message: 'Hello, World!',
        mode: Mode.SEQUENTIAL,
        contacts: [{ type: Provider.BITRIX, value: '123' }],
        correlationId: 'corr-456',
      };

      const mockError = new Error('RMQ Connection Lost');
      clientProxyMock.emit.mockReturnValue(throwError(() => mockError));

      await expect(
        service.receive(mockCreateNotificationDto, mockClientId),
      ).rejects.toThrow('RMQ Connection Lost');
    });
  });

  describe('receiveBatch', () => {
    const mockClientId = 'client-123';

    const validItem: CreateNotification = {
      message: 'Valid notification',
      mode: Mode.SEQUENTIAL,
      contacts: [{ type: Provider.BITRIX, value: '123' }],
      correlationId: 'corr-valid',
    };

    it('should process a mix of successful, invalid, and server-error items correctly', async () => {
      const invalidItem = {
        mode: Mode.SEQUENTIAL,
        contacts: [{ type: Provider.BITRIX, value: '123' }],
        correlationId: 'corr-invalid',
      };

      const serverErrorItem: CreateNotification = {
        message: 'Triggers server error',
        mode: Mode.SEQUENTIAL,
        contacts: [{ type: Provider.BITRIX, value: '123' }],
        correlationId: 'corr-server-error',
      };

      const items: readonly unknown[] = [
        validItem,
        invalidItem,
        serverErrorItem,
      ];

      const mockError = new Error('RMQ Internal Error');
      clientProxyMock.emit
        .mockReturnValueOnce(of(undefined))
        .mockReturnValueOnce(throwError(() => mockError));

      const response = await service.receiveBatch(items, mockClientId);

      expect(response.total).toBe(3);
      expect(response.success).toBe(1);
      expect(response.clientError).toBe(1);
      expect(response.serverError).toBe(1);
      expect(response.items).toHaveLength(3);

      const successItem = response.items[0];
      expect(successItem.status).toBe(BatchResultStatus.SUCCESS);

      const successData = successItem.data as Notification;
      expect(successData.id).toBe('mocked-uuid-value');
      expect(successData.clientId).toBe(mockClientId);
      expect(successData.message).toBe(validItem.message);
      expect(successData.mode).toBe(validItem.mode);
      expect(successData.correlationId).toBe(validItem.correlationId);
      expect(typeof successData.createdAt).toBe('string');

      expect(successData.contacts).toHaveLength(1);
      expect(successData.contacts[0].type).toBe(Provider.BITRIX);
      expect(successData.contacts[0].value).toBe('123');

      const clientErrorItemResult = response.items[1];
      expect(clientErrorItemResult.status).toBe(BatchResultStatus.CLIENT_ERROR);
      expect(clientErrorItemResult.data).toEqual(invalidItem);

      const validationErrors = clientErrorItemResult.error as Array<{
        property: string;
        constraints: Record<string, string>;
      }>;
      expect(validationErrors).toEqual([
        {
          property: 'message',
          constraints: {
            isNotEmpty: 'message should not be empty',
            isString: 'message must be a string',
            maxLength:
              'message must be shorter than or equal to 1024 characters',
          },
        },
      ]);

      expect(response.items[2]).toEqual({
        status: BatchResultStatus.SERVER_ERROR,
        data: serverErrorItem,
        error: 'Internal Error',
      });

      expect(clientProxyMock.emit).toHaveBeenCalledTimes(2);
    });

    it('should return 100% success summary when all batch items are valid', async () => {
      clientProxyMock.emit.mockReturnValue(of(undefined));
      const items = [validItem, validItem];

      const response = await service.receiveBatch(items, mockClientId);

      expect(response.total).toBe(2);
      expect(response.success).toBe(2);
      expect(response.clientError).toBe(0);
      expect(response.serverError).toBe(0);

      expect(response.items[0].status).toBe(BatchResultStatus.SUCCESS);
      expect(response.items[1].status).toBe(BatchResultStatus.SUCCESS);
      expect(clientProxyMock.emit).toHaveBeenCalledTimes(2);
    });

    it('should return 100% server error summary when rmq broker completely fails', async () => {
      const mockError = new Error('RabbitMQ Down');
      clientProxyMock.emit.mockReturnValue(throwError(() => mockError));
      const items = [validItem, validItem];

      const response = await service.receiveBatch(items, mockClientId);

      expect(response.total).toBe(2);
      expect(response.success).toBe(0);
      expect(response.clientError).toBe(0);
      expect(response.serverError).toBe(2);

      expect(response.items[0].status).toBe(BatchResultStatus.SERVER_ERROR);
      expect(response.items[1].status).toBe(BatchResultStatus.SERVER_ERROR);
      expect(clientProxyMock.emit).toHaveBeenCalledTimes(2);
    });
  });

  describe('checkHealth', () => {
    it('should resolve successfully when RabbitMQ client connects without errors', async () => {
      clientProxyMock.connect.mockResolvedValue(undefined);

      await expect(service.checkHealth()).resolves.not.toThrow();

      expect(clientProxyMock.connect).toHaveBeenCalledTimes(1);
    });

    it('should throw an error during health check if connect fails', async () => {
      clientProxyMock.connect.mockRejectedValue(new Error('Connection failed'));

      await expect(service.checkHealth()).rejects.toThrow(
        'RabbitMQ недоступен',
      );
      expect(clientProxyMock.connect).toHaveBeenCalledTimes(1);
    });

    it('should throw an error if RabbitMQ client is not initialized', async () => {
      const moduleWithoutClient: TestingModule = await Test.createTestingModule(
        {
          providers: [
            ReceiveService,
            {
              provide: RMQ_CLIENT,
              useValue: {
                connect: jest.fn().mockRejectedValue(new Error('No client')),
              },
            },
          ],
        },
      ).compile();

      const serviceWithoutClient =
        moduleWithoutClient.get<ReceiveService>(ReceiveService);

      await expect(serviceWithoutClient.checkHealth()).rejects.toThrow(
        'RabbitMQ недоступен',
      );
    });
  });
});
