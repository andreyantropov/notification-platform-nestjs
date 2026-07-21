import { Test, TestingModule } from '@nestjs/testing';
import {
  HealthIndicatorService,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { RmqIndicator } from './rmq.indicator';
import { ReceiveService } from '../receive.service';

describe('RmqIndicator', () => {
  let indicator: RmqIndicator;

  let receiveServiceMock: Record<'checkHealth', jest.Mock>;
  let healthIndicatorServiceMock: Record<'check', jest.Mock>;

  let mockIndicatorBuilder: Record<'up' | 'down', jest.Mock>;

  beforeEach(async () => {
    mockIndicatorBuilder = {
      up: jest.fn(),
      down: jest.fn(),
    };

    receiveServiceMock = {
      checkHealth: jest.fn(),
    };

    healthIndicatorServiceMock = {
      check: jest.fn().mockImplementation(() => mockIndicatorBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RmqIndicator,
        {
          provide: ReceiveService,
          useValue: receiveServiceMock,
        },
        {
          provide: HealthIndicatorService,
          useValue: healthIndicatorServiceMock,
        },
      ],
    }).compile();

    indicator = module.get<RmqIndicator>(RmqIndicator);
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(indicator).toBeDefined();
    });
  });

  describe('isHealthy', () => {
    it('should return up status when receiveService checkHealth succeeds', async () => {
      const mockKey = 'delivery-service';
      const mockUpResult: HealthIndicatorResult = {
        [mockKey]: { status: 'up' },
      };

      receiveServiceMock.checkHealth.mockImplementation(() =>
        Promise.resolve(),
      );
      mockIndicatorBuilder.up.mockImplementation(() => mockUpResult);

      const result = await indicator.isHealthy(mockKey);

      expect(result).toEqual(mockUpResult);
      expect(healthIndicatorServiceMock.check).toHaveBeenCalledWith(mockKey);
      expect(receiveServiceMock.checkHealth).toHaveBeenCalledTimes(1);
      expect(mockIndicatorBuilder.up).toHaveBeenCalledTimes(1);
    });

    it('should return down status when receiveService checkHealth throws an error', async () => {
      const mockKey = 'delivery-service';
      const mockError = new Error('RabbitMQ недоступен');

      const mockDownResult: HealthIndicatorResult = {
        [mockKey]: { status: 'down', message: 'RabbitMQ недоступен' },
      };

      receiveServiceMock.checkHealth.mockImplementation(() =>
        Promise.reject(mockError),
      );
      mockIndicatorBuilder.down.mockImplementation(() => mockDownResult);

      const result = await indicator.isHealthy(mockKey);

      expect(result).toEqual(mockDownResult);
      expect(healthIndicatorServiceMock.check).toHaveBeenCalledWith(mockKey);
      expect(receiveServiceMock.checkHealth).toHaveBeenCalledTimes(1);

      expect(mockIndicatorBuilder.down).toHaveBeenCalledWith({
        message: 'RabbitMQ недоступен',
      });
    });
  });
});
