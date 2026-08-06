import { Test, TestingModule } from '@nestjs/testing';
import { TelemetryService } from './telemetry.service';
import { MetricService } from 'nestjs-otel';
import { Logger } from 'nestjs-pino';
import { Counter, Histogram } from '@opentelemetry/api';
import { Mode, Notification, Provider } from '@app/shared';

describe('TelemetryService', () => {
  let service: TelemetryService;

  let mockCounter: jest.Mocked<Pick<Counter, 'add'>>;
  let mockHistogram: jest.Mocked<Pick<Histogram, 'record'>>;
  let mockLogger: jest.Mocked<Pick<Logger, 'log' | 'debug' | 'warn'>>;

  const mockNotification: Notification = {
    id: 'notif-123',
    correlationId: 'corr-123',
    clientId: 'test-service',
    createdAt: '2026-01-01T00:00:00.000Z',
    message: 'Hello World',
    mode: Mode.BROADCAST,
    contacts: [{ type: Provider.EMAIL, value: 'test@test.com' }],
  };

  beforeEach(async () => {
    mockCounter = { add: jest.fn() };
    mockHistogram = { record: jest.fn() };
    mockLogger = { log: jest.fn(), debug: jest.fn(), warn: jest.fn() };

    const mockMetricService = {
      getCounter: jest.fn().mockReturnValue(mockCounter),
      getHistogram: jest.fn().mockReturnValue(mockHistogram),
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

  describe('delivery events', () => {
    it('should increment strategy counter and log info on delivery.initiated', () => {
      service.handleDeliveryInitiated({ notification: mockNotification });

      expect(mockCounter.add).toHaveBeenCalledTimes(1);
      expect(mockCounter.add).toHaveBeenCalledWith(1, {
        strategy_type: mockNotification.mode,
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
        'Принят запрос на обработку уведомления',
      );
    });

    it('should log debug info on delivery.completed', () => {
      service.handleDeliveryCompleted({ notification: mockNotification });

      expect(mockLogger.debug).toHaveBeenCalledTimes(1);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          id: mockNotification.id,
          correlationId: mockNotification.correlationId,
          clientId: mockNotification.clientId,
          createdAt: mockNotification.createdAt,
          contacts: mockNotification.contacts,
          mode: mockNotification.mode,
        },
        'Запрос на обработку уведомления успешно выполнен',
      );
    });
  });

  describe('channel events', () => {
    it('should log debug info on channel.delivery.initiated', () => {
      const payload = { provider: 'email', contact: 'test@test.com' };

      service.handleChannelDeliveryInitiated(payload);

      expect(mockLogger.debug).toHaveBeenCalledTimes(1);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        payload,
        'Инициирована отправка уведомления.',
      );
    });

    it('should record success metrics and log info on channel.delivery.success', () => {
      const payload = {
        provider: 'email',
        contact: 'test@test.com',
        duration: 120,
      };

      service.handleChannelDeliverySuccess(payload);

      expect(mockLogger.log).toHaveBeenCalledTimes(1);
      expect(mockLogger.log).toHaveBeenCalledWith(
        { provider: payload.provider, contact: payload.contact },
        'Уведомление успешно отправлено.',
      );

      const expectedLabels = { provider: payload.provider, status: 'success' };

      expect(mockCounter.add).toHaveBeenCalledTimes(1);
      expect(mockCounter.add).toHaveBeenCalledWith(1, expectedLabels);

      expect(mockHistogram.record).toHaveBeenCalledTimes(1);
      expect(mockHistogram.record).toHaveBeenCalledWith(
        payload.duration,
        expectedLabels,
      );
    });

    it('should record error metrics and log warn on channel.delivery.failed', () => {
      const testError = new Error('SMTP Timeout');
      const payload = {
        provider: 'email',
        contact: 'test@test.com',
        duration: 250,
        error: testError,
      };

      service.handleChannelDeliveryFailed(payload);

      expect(mockLogger.warn).toHaveBeenCalledTimes(1);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        {
          error: payload.error,
          provider: payload.provider,
          contact: payload.contact,
        },
        'Сбой при отправке уведомления',
      );

      const expectedLabels = { provider: payload.provider, status: 'error' };

      expect(mockCounter.add).toHaveBeenCalledTimes(1);
      expect(mockCounter.add).toHaveBeenCalledWith(1, expectedLabels);

      expect(mockHistogram.record).toHaveBeenCalledTimes(1);
      expect(mockHistogram.record).toHaveBeenCalledWith(
        payload.duration,
        expectedLabels,
      );
    });
  });
});
