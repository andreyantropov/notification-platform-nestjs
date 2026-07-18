import { Test, TestingModule } from '@nestjs/testing';
import { ClientProxy } from '@nestjs/microservices';
import { of, throwError } from 'rxjs';
import { ReceiveService } from './receive.service';
import { CreateNotification } from './types/create-notification.type';
import { Notification, Mode, Provider } from '@app/shared';
import {
  RMQ_CLIENT,
  DELIVERY_NOTIFICATIONS_SEND_QUEUE,
} from './receive.constants';

describe('ReceiveService', () => {
  let service: ReceiveService;
  let clientProxyMock: jest.Mocked<Pick<ClientProxy, 'emit'>>;

  beforeEach(async () => {
    clientProxyMock = {
      emit: jest.fn().mockReturnValue(of(undefined)),
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

      expect(result.id).toBeDefined();
      expect(typeof result.id).toBe('string');
      expect(result.id).toHaveLength(36);

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
    it('should process a mix of successful, invalid, and server-error items correctly', async () => {
      const mockClientId = 'client-123';

      const validItem: CreateNotification = {
        message: 'Valid notification',
        mode: Mode.SEQUENTIAL,
        contacts: [{ type: Provider.BITRIX, value: '123' }],
        correlationId: 'corr-valid',
      };

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
  });
});
