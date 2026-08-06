import { Test, TestingModule } from '@nestjs/testing';
import { TelemetryService } from './telemetry.service';
import { MetricService } from 'nestjs-otel';
import { Logger } from 'nestjs-pino';
import { Counter } from '@opentelemetry/api';
import { Mode, Notification, Provider } from '@app/shared';

describe('TelemetryService', () => {
  let service: TelemetryService;

  let mockCounter: jest.Mocked<Pick<Counter, 'add'>>;
  let mockLogger: jest.Mocked<Pick<Logger, 'log' | 'debug'>>;

  const mockCreateNotification = {
    message: 'Hello, Batch!',
    mode: Mode.SEQUENTIAL,
    contacts: [{ type: Provider.BITRIX, value: '123' }],
    correlationId: 'corr-456',
  };

  const mockNotification: Notification = {
    ...mockCreateNotification,
    id: 'mocked-uuid-value',
    clientId: 'client-123',
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  beforeEach(async () => {
    mockCounter = { add: jest.fn() };
    mockLogger = { log: jest.fn(), debug: jest.fn() };

    const mockMetricService = {
      getCounter: jest.fn().mockReturnValue(mockCounter),
    } as unknown as MetricService;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelemetryService,
        {
          provide: MetricService,
          useValue: mockMetricService,
        },
        {
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<TelemetryService>(TelemetryService);
  });

  describe('constructor', () => {
    it('should be successfully initialized', () => {
      expect(service).toBeDefined();
    });
  });

  describe('single notification receive events', () => {
    it('should log debug info on receive.initiated', () => {
      const payload = {
        createNotification: mockCreateNotification,
        clientId: 'client-123',
      };

      service.handleReceiveInitiated(payload);

      expect(mockLogger.debug).toHaveBeenCalledTimes(1);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          correlationId: mockCreateNotification.correlationId,
          clientId: payload.clientId,
          contacts: mockCreateNotification.contacts,
          mode: mockCreateNotification.mode,
        },
        'Инициирована обработка входящего уведомления',
      );
    });

    it('should increment received counter and log info on receive.completed', () => {
      const payload = { notification: mockNotification };

      service.handleReceiveCompleted(payload);

      expect(mockCounter.add).toHaveBeenCalledTimes(1);
      expect(mockCounter.add).toHaveBeenCalledWith(1, {
        clientId: mockNotification.clientId,
      });

      expect(mockLogger.log).toHaveBeenCalledTimes(1);
      expect(mockLogger.log).toHaveBeenCalledWith(
        {
          id: mockNotification.id,
          correlationId: mockNotification.correlationId,
          clientId: mockNotification.clientId,
          createdAt: mockNotification.createdAt,
          contacts: mockNotification.contacts,
          mode: mockNotification.mode,
        },
        'Уведомление успешно поставлено в очередь',
      );
    });
  });

  describe('batch notification receive events', () => {
    it('should log debug info on receive.batch.initiated', () => {
      const payload = { batchSize: 5, clientId: 'client-123' };

      service.handleReceiveBatchInitiated(payload);

      expect(mockLogger.debug).toHaveBeenCalledTimes(1);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { batch_size: payload.batchSize, clientId: payload.clientId },
        'Инициирована обработка пакета входящих уведомлений',
      );
    });

    it('should log info on receive.batch.completed', () => {
      const payload = { batchSize: 5, clientId: 'client-123' };

      service.handleReceiveBatchCompleted(payload);

      expect(mockLogger.log).toHaveBeenCalledTimes(1);
      expect(mockLogger.log).toHaveBeenCalledWith(
        { batch_size: payload.batchSize, clientId: payload.clientId },
        'Пакет уведомлений успешно поставлен в очередь',
      );
    });
  });
});
