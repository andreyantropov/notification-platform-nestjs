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
import { EventEmitter2 } from '@nestjs/event-emitter';

type CreateNotification = Omit<Notification, 'id' | 'clientId' | 'createdAt'>;

jest.mock('node:crypto', () => ({
  randomUUID: () => 'mocked-uuid-value',
}));

describe('ReceiveService', () => {
  let service: ReceiveService;
  let clientProxyMock: jest.Mocked<Pick<ClientProxy, 'emit' | 'connect'>>;
  let mockEventEmitter: jest.Mocked<Pick<EventEmitter2, 'emit'>>;

  beforeEach(async () => {
    clientProxyMock = {
      emit: jest.fn().mockReturnValue(of(undefined)),
      connect: jest.fn().mockResolvedValue(undefined),
    };

    mockEventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReceiveService,
        {
          provide: RMQ_CLIENT,
          useValue: clientProxyMock,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
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

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('receive.initiated', {
        createNotification: mockCreateNotificationDto,
        clientId: mockClientId,
      });

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('receive.completed', {
        notification: result,
      });
    });

    it('should throw an error if RabbitMQ emit fails', async () => {
      const mockError = new Error('RMQ Connection Lost');
      clientProxyMock.emit.mockReturnValue(throwError(() => mockError));

      await expect(
        service.receive(mockCreateNotificationDto, mockClientId),
      ).rejects.toThrow('RMQ Connection Lost');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('receive.initiated', {
        createNotification: mockCreateNotificationDto,
        clientId: mockClientId,
      });
      expect(mockEventEmitter.emit).not.toHaveBeenCalledWith(
        'receive.completed',
        expect.any(Object),
      );
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

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'receive.batch.initiated',
        {
          batchSize: 2,
          clientId: mockClientId,
        },
      );

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'receive.batch.completed',
        {
          batchSize: 2,
          clientId: mockClientId,
        },
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
