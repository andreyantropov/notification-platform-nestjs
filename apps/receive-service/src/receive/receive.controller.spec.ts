import { Test, TestingModule } from '@nestjs/testing';
import { ReceiveController } from './receive.controller';
import { ReceiveService } from './receive.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { CreateNotificationBatchDto } from './dto/create-notification-batch.dto';
import { ServerResponse } from 'http';
import { BatchResponse } from './types/batch-response.interface';
import { Mode, Notification, Provider } from '@app/shared';
import { AppAuthGuard } from '../auth';
import { BatchResultStatus } from './types/batch-result-status.enum';

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
        createdAt: '2026-07-18',
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
    let mockResponse: ServerResponse;

    beforeEach(() => {
      mockResponse = {
        statusCode: 200,
      } as unknown as ServerResponse;
    });

    it('should return status 202 when all items are successfully processed', async () => {
      const mockBatchDto: CreateNotificationBatchDto = {
        items: [
          {
            message: 'Hello',
            contacts: [{ type: Provider.BITRIX, value: '123' }],
            correlationId: 'corr-batch-1',
          },
        ],
      };

      const mockBatchResponse: BatchResponse = {
        total: 1,
        success: 1,
        clientError: 0,
        serverError: 0,
        items: [{ status: BatchResultStatus.SUCCESS, data: {} }],
      };

      serviceMock.receiveBatch.mockResolvedValue(mockBatchResponse);

      const result = await controller.createNotificationBatch(
        mockBatchDto,
        mockClientId,
        mockResponse,
      );

      expect(result).toEqual(mockBatchResponse);
      expect(mockResponse.statusCode).toBe(202);
      expect(serviceMock.receiveBatch).toHaveBeenCalledTimes(1);
    });

    it('should return status 207 when batch contains client or server errors', async () => {
      const mockBatchDto: CreateNotificationBatchDto = {
        items: [
          {
            message: 'Hello',
            contacts: [{ type: Provider.BITRIX, value: '123' }],
            correlationId: 'corr-batch-2',
          },
          {
            invalid: 'field',
          },
        ],
      };

      const mockBatchResponse: BatchResponse = {
        total: 2,
        success: 1,
        clientError: 1,
        serverError: 0,
        items: [
          { status: BatchResultStatus.SUCCESS, data: {} },
          { status: BatchResultStatus.CLIENT_ERROR, data: {}, error: [] },
        ],
      };

      serviceMock.receiveBatch.mockResolvedValue(mockBatchResponse);

      const result = await controller.createNotificationBatch(
        mockBatchDto,
        mockClientId,
        mockResponse,
      );

      expect(result).toEqual(mockBatchResponse);
      expect(mockResponse.statusCode).toBe(207);
      expect(serviceMock.receiveBatch).toHaveBeenCalledTimes(1);
    });

    it('should return status 207 even when 100% of batch items fail validation', async () => {
      const mockBatchDto: CreateNotificationBatchDto = {
        items: [{ invalid: 'field' }, { invalid: 'field' }],
      };

      const mockBatchResponse: BatchResponse = {
        total: 2,
        success: 0,
        clientError: 2,
        serverError: 0,
        items: [
          { status: BatchResultStatus.CLIENT_ERROR, data: {}, error: [] },
          { status: BatchResultStatus.CLIENT_ERROR, data: {}, error: [] },
        ],
      };

      serviceMock.receiveBatch.mockResolvedValue(mockBatchResponse);

      const result = await controller.createNotificationBatch(
        mockBatchDto,
        mockClientId,
        mockResponse,
      );

      expect(result).toEqual(mockBatchResponse);
      expect(mockResponse.statusCode).toBe(207);
      expect(serviceMock.receiveBatch).toHaveBeenCalledTimes(1);
    });
  });
});
