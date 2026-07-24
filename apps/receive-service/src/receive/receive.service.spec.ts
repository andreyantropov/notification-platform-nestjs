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

jest.mock('node:crypto', () => ({
  randomUUID: () => 'mocked-uuid-value',
}));

describe('ReceiveService', () => {
  let service: ReceiveService;
  let clientProxyMock: jest.Mocked<Pick<ClientProxy, 'emit' | 'connect'>>;

  beforeEach(async () => {
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
        contacts: [
          {
            type: Provider.BITRIX,
            value: '123',
          },
        ],
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

      expect(response.summary).toEqual({
        total: 3,
        success: 1,
        clientError: 1,
        serverError: 1,
      });

      expect(response.items).toHaveLength(3);

      expect(response.items[0]).toMatchObject({
        status: 'success',
        data: {
          message: validItem.message,
          correlationId: validItem.correlationId,
          clientId: mockClientId,
        },
      });

      expect(response.items[1]).toMatchObject({
        status: 'client_error',
        data: invalidItem,
      });
      expect(response.items[1].error).toBeDefined();
      expect(Array.isArray(response.items[1].error)).toBe(true);

      expect(response.items[2]).toEqual({
        status: 'server_error',
        data: serverErrorItem,
        error: 'Internal Error',
      });

      expect(clientProxyMock.emit).toHaveBeenCalledTimes(2);
    });

    it('should return 100% success summary when all batch items are valid', async () => {
      clientProxyMock.emit.mockReturnValue(of(undefined));
      const items = [validItem, validItem];

      const response = await service.receiveBatch(items, mockClientId);

      expect(response.summary).toEqual({
        total: 2,
        success: 2,
        clientError: 0,
        serverError: 0,
      });
      expect(response.items[0].status).toBe('success');
      expect(response.items[1].status).toBe('success');
      expect(clientProxyMock.emit).toHaveBeenCalledTimes(2);
    });

    it('should return 100% server error summary when rmq broker completely fails', async () => {
      const mockError = new Error('RabbitMQ Down');
      clientProxyMock.emit.mockReturnValue(throwError(() => mockError));
      const items = [validItem, validItem];

      const response = await service.receiveBatch(items, mockClientId);

      expect(response.summary).toEqual({
        total: 2,
        success: 0,
        clientError: 0,
        serverError: 2,
      });
      expect(response.items[0].status).toBe('server_error');
      expect(response.items[1].status).toBe('server_error');
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
              useValue: null,
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
