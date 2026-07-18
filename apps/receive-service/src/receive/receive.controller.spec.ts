import { Test, TestingModule } from '@nestjs/testing';
import { ReceiveController } from './receive.controller';
import { ReceiveService } from './receive.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { CreateNotificationBatchDto } from './dto/create-notification-batch.dto';
import { ServerResponse, IncomingMessage } from 'http';
import { BatchResponse } from './types/batch-response.interface';
import { Mode, Notification, Provider } from '@app/shared';

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
    }).compile();

    controller = module.get<ReceiveController>(ReceiveController);
  });

  describe('createNotification', () => {
    it('should successfully forward data to service and return result', async () => {
      const mockClientId = 'client-123';
      const mockDto: CreateNotificationDto = {
        message: 'Hello World',
        contacts: [{ type: Provider.BITRIX, value: '123' }],
        correlationId: 'corr-111',
        mode: Mode.SEQUENTIAL,
      };

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
  });

  describe('createNotificationBatch', () => {
    it('should return status 202 when all items are successfully processed', async () => {
      const mockClientId = 'client-123';
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
        summary: { total: 1, success: 1, clientError: 0, serverError: 0 },
        items: [{ status: 'success', data: {} }],
      };

      serviceMock.receiveBatch.mockResolvedValue(mockBatchResponse);

      const mockRequest = { method: 'POST' } as unknown as IncomingMessage;
      const mockResponse = new ServerResponse(mockRequest);

      const result = await controller.createNotificationBatch(
        mockBatchDto,
        mockClientId,
        mockResponse,
      );

      expect(result).toEqual(mockBatchResponse);
      expect(mockResponse.statusCode).toBe(202);
      expect(serviceMock.receiveBatch).toHaveBeenCalledTimes(1);
      expect(serviceMock.receiveBatch).toHaveBeenCalledWith(
        mockBatchDto.items,
        mockClientId,
      );
    });

    it('should return status 207 when batch contains client or server errors', async () => {
      const mockClientId = 'client-123';
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
        summary: { total: 2, success: 1, clientError: 1, serverError: 0 },
        items: [
          { status: 'success', data: {} },
          { status: 'client_error', data: {}, error: [] },
        ],
      };

      serviceMock.receiveBatch.mockResolvedValue(mockBatchResponse);

      const mockRequest = { method: 'POST' } as unknown as IncomingMessage;
      const mockResponse = new ServerResponse(mockRequest);

      const result = await controller.createNotificationBatch(
        mockBatchDto,
        mockClientId,
        mockResponse,
      );

      expect(result).toEqual(mockBatchResponse);
      expect(mockResponse.statusCode).toBe(207);
      expect(serviceMock.receiveBatch).toHaveBeenCalledTimes(1);
      expect(serviceMock.receiveBatch).toHaveBeenCalledWith(
        mockBatchDto.items,
        mockClientId,
      );
    });
  });
});
