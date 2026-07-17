import { Test, TestingModule } from '@nestjs/testing';
import { ClientProxy } from '@nestjs/microservices';
import { of } from 'rxjs';
import { ReceiveService } from './receive.service';
import { CreateNotification } from './types/CreateNotification';
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
    it('should successfully create a notification and emit it to RabbitMQ', () => {
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

      const result: Notification = service.receive(
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
  });
});
