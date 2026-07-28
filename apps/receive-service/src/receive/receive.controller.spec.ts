import { Test, TestingModule } from '@nestjs/testing';
import { ReceiveController } from './receive.controller';
import { ReceiveService } from './receive.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { CreateNotificationBatchDto } from './dto/create-notification-batch.dto';
import { Mode, Notification, Provider } from '@app/shared';
import { AppAuthGuard } from '../auth';

jest.mock('jwks-rsa', () => ({
  passportJwtSecret: jest.fn().mockReturnValue(() => 'mocked-secret'),
}));

describe('ReceiveController', () => {
  let controller: ReceiveController;
  let serviceMock: jest.Mocked<
    Pick<ReceiveService, 'receive' | 'receiveBatch'>
  >;

  beforeEach(async () => {
    serviceMock = {
      receive: jest.fn(),
      receiveBatch: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReceiveController],
      providers: [
        {
          provide: ReceiveService,
          useValue: serviceMock,
        },
      ],
    })
      .overrideGuard(AppAuthGuard)
      .useValue({
        canActivate: () => true,
      })
      .compile();

    controller = module.get<ReceiveController>(ReceiveController);
  });

  describe('createNotification', () => {
    const mockClientId = 'client-123';
    const mockDto: CreateNotificationDto = {
      message: 'Hello World',
      contacts: [{ type: Provider.BITRIX, value: '123' }],
      correlationId: 'corr-111',
      mode: Mode.SEQUENTIAL,
    };

    it('should successfully forward data to service and return result', async () => {
      const mockNotification: Notification = {
        id: 'uuid-123',
        clientId: mockClientId,
        createdAt: '2026-07-28T11:00:00.000Z',
        ...mockDto,
      };

      serviceMock.receive.mockResolvedValue(mockNotification);

      const result = await controller.createNotification(mockDto, mockClientId);

      expect(result).toEqual(mockNotification);
      expect(serviceMock.receive).toHaveBeenCalledTimes(1);
      expect(serviceMock.receive).toHaveBeenCalledWith(mockDto, mockClientId);
    });

    it('should propagate error upward if underlying service fails', async () => {
      const rmqError = new Error('RabbitMQ connection lost');
      serviceMock.receive.mockRejectedValue(rmqError);

      await expect(
        controller.createNotification(mockDto, mockClientId),
      ).rejects.toThrow('RabbitMQ connection lost');

      expect(serviceMock.receive).toHaveBeenCalledTimes(1);
    });
  });

  describe('createNotificationBatch', () => {
    const mockClientId = 'client-123';

    it('should successfully process batch and wrap the service array into items object', async () => {
      const mockBatchDto: CreateNotificationBatchDto = {
        items: [
          {
            message: 'Hello 1',
            contacts: [{ type: Provider.BITRIX, value: '123' }],
            correlationId: 'corr-batch-1',
            mode: Mode.SEQUENTIAL,
          },
          {
            message: 'Hello 2',
            contacts: [{ type: Provider.EMAIL, value: 'test@test.com' }],
            correlationId: 'corr-batch-2',
            mode: Mode.SEQUENTIAL,
          },
        ],
      };

      const mockServiceResult: Notification[] = [
        {
          id: 'uuid-1',
          clientId: mockClientId,
          createdAt: '2026-07-28T11:00:00.000Z',
          message: 'Hello 1',
          contacts: [{ type: Provider.BITRIX, value: '123' }],
          correlationId: 'corr-batch-1',
          mode: Mode.SEQUENTIAL,
        },
        {
          id: 'uuid-2',
          clientId: mockClientId,
          createdAt: '2026-07-28T11:00:00.000Z',
          message: 'Hello 2',
          contacts: [{ type: Provider.EMAIL, value: 'test@test.com' }],
          correlationId: 'corr-batch-2',
          mode: Mode.SEQUENTIAL,
        },
      ];

      serviceMock.receiveBatch.mockResolvedValue(mockServiceResult);

      const result = await controller.createNotificationBatch(
        mockBatchDto,
        mockClientId,
      );

      expect(result).toEqual({ items: mockServiceResult });

      expect(serviceMock.receiveBatch).toHaveBeenCalledTimes(1);
      expect(serviceMock.receiveBatch).toHaveBeenCalledWith(
        mockBatchDto.items,
        mockClientId,
      );
    });

    it('should propagate error upward if batch processing in service fails', async () => {
      const mockBatchDto: CreateNotificationBatchDto = {
        items: [
          {
            message: 'Hello',
            contacts: [{ type: Provider.BITRIX, value: '123' }],
            correlationId: 'corr-batch-1',
            mode: Mode.SEQUENTIAL,
          },
        ],
      };

      const rmqError = new Error('RabbitMQ batch failed');
      serviceMock.receiveBatch.mockRejectedValue(rmqError);

      await expect(
        controller.createNotificationBatch(mockBatchDto, mockClientId),
      ).rejects.toThrow('RabbitMQ batch failed');

      expect(serviceMock.receiveBatch).toHaveBeenCalledTimes(1);
    });
  });
});
