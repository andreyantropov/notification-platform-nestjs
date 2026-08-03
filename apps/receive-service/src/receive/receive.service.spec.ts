import { Test, TestingModule } from '@nestjs/testing';
import { ClientProxy } from '@nestjs/microservices';
import { of, throwError } from 'rxjs';
import { ReceiveService } from './receive.service';
import {
  Notification,
  Mode,
  Provider,
  NOTIFICATION_RECEIVED,
} from '@app/shared';
import { RMQ_CLIENT } from './receive.constants';
import { Logger } from 'nestjs-pino';
import { MetricService } from 'nestjs-otel';
import { Counter } from '@opentelemetry/api';

type CreateNotification = Omit<Notification, 'id' | 'clientId' | 'createdAt'>;

jest.mock('node:crypto', () => ({
  randomUUID: () => 'mocked-uuid-value',
}));

describe('ReceiveService', () => {
  let service: ReceiveService;
  let clientProxyMock: jest.Mocked<Pick<ClientProxy, 'emit' | 'connect'>>;
  let dummyMetricService: MetricService;
  let dummyLogger: Logger;
  let dummyCounter: Counter;

  let mockAdd: jest.Mock;
  let mockLog: jest.Mock;
  let mockDebug: jest.Mock;

  beforeEach(async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    clientProxyMock = {
      emit: jest.fn().mockReturnValue(of(undefined)),
      connect: jest.fn().mockResolvedValue(undefined),
    };

    mockAdd = jest.fn();
    dummyCounter = { add: mockAdd };

    dummyMetricService = {
      getCounter: jest.fn().mockReturnValue(dummyCounter),
    } as unknown as MetricService;

    mockLog = jest.fn();
    mockDebug = jest.fn();

    dummyLogger = {
      log: mockLog,
      debug: mockDebug,
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
    const mockClientId = 'client-123';
    const mockCreateNotificationDto: CreateNotification = {
      message: 'Hello, World!',
      mode: Mode.SEQUENTIAL,
      contacts: [{ type: Provider.BITRIX, value: '123' }],
      correlationId: 'corr-456',
    };

    it('should successfully create a notification and emit it to RabbitMQ', async () => {
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

      expect(mockAdd).toHaveBeenCalledWith(1, { clientId: mockClientId });

      expect(clientProxyMock.emit).toHaveBeenCalledTimes(1);
      expect(clientProxyMock.emit).toHaveBeenCalledWith(
        NOTIFICATION_RECEIVED,
        expect.objectContaining({
          id: 'mocked-uuid-value',
          clientId: mockClientId,
          correlationId: 'corr-456',
          message: 'Hello, World!',
        }),
      );
    });

    it('should throw an error if RabbitMQ emit fails', async () => {
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
      expect(response[1].id).toBe('mocked-uuid-value');
      expect(response[1].message).toBe(validItem2.message);

      expect(clientProxyMock.emit).toHaveBeenCalledTimes(2);

      expect(mockDebug).toHaveBeenCalledWith(
        { batch_size: 2 },
        'Инициирована обработка пакета входящих уведомлений',
      );
      expect(mockLog).toHaveBeenCalledWith(
        { batch_size: 2 },
        'Пакет уведомлений успешно поставлен в очередь',
      );
    });

    it('should fail the whole batch if one item emit fails', async () => {
      clientProxyMock.emit
        .mockReturnValueOnce(of(undefined))
        .mockReturnValueOnce(throwError(() => new Error('Queue is full')));

      const items: readonly CreateNotification[] = [validItem1, validItem2];

      await expect(service.receiveBatch(items, mockClientId)).rejects.toThrow(
        'Queue is full',
      );
    });
  });
});
