import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckService, HealthCheckResult } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { ChannelsIndicator } from '../delivery';

describe('HealthController', () => {
  let controller: HealthController;

  let mockCheck: jest.Mock<Promise<HealthCheckResult>, [unknown[]]>;
  let mockisHealthy: jest.Mock<Promise<Record<string, unknown>>, [string]>;

  const mockHealthyResult: HealthCheckResult = {
    status: 'ok',
    info: { gateways: { status: 'up' } },
    error: {},
    details: { gateways: { status: 'up' } },
  };

  beforeEach(async () => {
    mockCheck = jest.fn<Promise<HealthCheckResult>, [unknown[]]>();
    mockisHealthy = jest.fn<Promise<Record<string, unknown>>, [string]>();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: {
            check: mockCheck,
          },
        },
        {
          provide: ChannelsIndicator,
          useValue: {
            isHealthy: mockisHealthy,
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be successfully initialized with its dependencies', () => {
      expect(controller).toBeDefined();
    });
  });

  describe('liveness', () => {
    it('should successfully execute liveness probe and return active application status', async () => {
      mockCheck.mockResolvedValue(mockHealthyResult);

      const result = await controller.liveness();

      expect(result).toEqual(mockHealthyResult);
      expect(mockCheck).toHaveBeenCalledTimes(1);

      const passedFunctions = mockCheck.mock.calls[0][0];
      expect(passedFunctions).toHaveLength(1);
      expect(typeof passedFunctions[0]).toBe('function');

      const appStatus = (passedFunctions[0] as () => unknown)();
      expect(appStatus).toEqual({ application: { status: 'up' } });
    });
  });

  describe('readiness', () => {
    it('should successfully execute readiness probe by delegating check to channels indicator', async () => {
      mockCheck.mockResolvedValue(mockHealthyResult);
      mockisHealthy.mockResolvedValue({ gateways: { status: 'up' } });

      const result = await controller.readiness();

      expect(result).toEqual(mockHealthyResult);
      expect(mockCheck).toHaveBeenCalledTimes(1);

      const passedFunctions = mockCheck.mock.calls[0][0];
      expect(passedFunctions).toHaveLength(1);
      expect(typeof passedFunctions[0]).toBe('function');

      await (passedFunctions[0] as () => Promise<unknown>)();
      expect(mockisHealthy).toHaveBeenCalledTimes(1);
      expect(mockisHealthy).toHaveBeenCalledWith('channels');
    });

    it('should throw an error if channels indicator fails', async () => {
      const mockError = new Error('Connection failed');
      mockisHealthy.mockRejectedValue(mockError);

      mockCheck.mockImplementation(async (indicators) => {
        const indicatorFn = indicators[0] as () => Promise<unknown>;
        await indicatorFn();

        return mockHealthyResult;
      });

      await expect(controller.readiness()).rejects.toThrow('Connection failed');
      expect(mockisHealthy).toHaveBeenCalledTimes(1);
    });
  });
});
