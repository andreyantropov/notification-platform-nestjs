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
import { Logger } from '@nestjs/common';
import { MetricService } from 'nestjs-otel';
import { Counter } from '@opentelemetry/api';

jest.mock('node:crypto', () => ({
  randomUUID: () => 'mocked-uuid-value',
}));

describe('ReceiveService', () => {
  let service: ReceiveService;
  let clientProxyMock: jest.Mocked<Pick<ClientProxy, 'emit' | 'connect'>>;

  let dummyMetricService: MetricService;
  let dummyLogger: Logger;

  beforeEach(async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    clientProxyMock = {
      emit: jest.fn().mockReturnValue(of(undefined)),
      connect: jest.fn().mockResolvedValue(undefined),
    };

    const dummyCounter = { add: jest.fn() } as unknown as Counter;
    dummyMetricService = {
      getCounter: jest.fn().mockReturnValue(dummyCounter),
    } as unknown as MetricService;

    dummyLogger = {
      log: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
    } as unknown as Logger;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReceiveService,
        {
          provide: RMQ_CLIENT,
          useValue: clientProxyMock,
        },
        {
          provide: MetricService,
          useValue: dummyMetricService,
        },
        {
          provide: Logger,
          useValue: dummyLogger,
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
        contacts: [{ type: Provider.BITRIX, value: '123' }],
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

    const validItem1: CreateNotification = {
      message: 'Notification 1',
      mode: Mode.SEQUENTIAL,
      contacts: [{ type: Provider.BITRIX, value: '123' }],
      correlationId: 'corr-1',
    };

    const validItem2: CreateNotification = {
      message: 'Notification 2',
      mode: Mode.BROADCAST,
      contacts: [{ type: Provider.EMAIL, value: 'test@test.com' }],
      correlationId: 'corr-2',
    };

    it('should successfully process all items in the batch concurrently', async () => {
      clientProxyMock.emit.mockReturnValue(of(undefined));
      const items: readonly CreateNotification[] = [validItem1, validItem2];

      const response = await service.receiveBatch(items, mockClientId);

      expect(response).toHaveLength(2);

      expect(response[0].id).toBe('mocked-uuid-value');
      expect(response[0].message).toBe(validItem1.message);
      expect(response[0].clientId).toBe(mockClientId);
      expect(response[0].createdAt).toBeDefined();

      expect(response[1].id).toBe('mocked-uuid-value');
      expect(response[1].message).toBe(validItem2.message);
      expect(response[1].clientId).toBe(mockClientId);

      expect(clientProxyMock.emit).toHaveBeenCalledTimes(2);
      expect(clientProxyMock.emit).toHaveBeenNthCalledWith(
        1,
        DELIVERY_NOTIFICATIONS_SEND_QUEUE,
        response[0],
      );
      expect(clientProxyMock.emit).toHaveBeenNthCalledWith(
        2,
        DELIVERY_NOTIFICATIONS_SEND_QUEUE,
        response[1],
      );
    });

    it('should fail entirely if at least one item in Promise.all fails to emit', async () => {
      const mockError = new Error('RMQ Connection Lost During Batch');

      clientProxyMock.emit
        .mockReturnValueOnce(of(undefined))
        .mockReturnValueOnce(throwError(() => mockError));

      const items: readonly CreateNotification[] = [validItem1, validItem2];

      await expect(service.receiveBatch(items, mockClientId)).rejects.toThrow(
        'RMQ Connection Lost During Batch',
      );

      expect(clientProxyMock.emit).toHaveBeenCalledTimes(2);
    });
  });

  describe('checkHealth', () => {
    it('should successfully connect to RabbitMQ', async () => {
      clientProxyMock.connect.mockResolvedValue(undefined);

      await expect(service.checkHealth()).resolves.toBeUndefined();
      expect(clientProxyMock.connect).toHaveBeenCalledTimes(1);
    });

    it('should throw an error during health check if connect fails', async () => {
      clientProxyMock.connect.mockRejectedValue(new Error('Connection failed'));

      await expect(service.checkHealth()).rejects.toThrow(
        'RabbitMQ недоступен',
      );
      expect(clientProxyMock.connect).toHaveBeenCalledTimes(1);
    });
  });
});
