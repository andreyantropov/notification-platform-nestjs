jest.mock('jwks-rsa', () => ({
  passportJwtSecret: jest.fn().mockReturnValue(() => 'mocked-secret'),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckService, HealthCheckResult } from '@nestjs/terminus';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;
  let mockCheck: jest.Mock<Promise<HealthCheckResult>, [unknown[]]>;

  const mockHealthyResult: HealthCheckResult = {
    status: 'ok',
    info: { application: { status: 'up' } },
    error: {},
    details: { application: { status: 'up' } },
  };

  beforeEach(async () => {
    mockCheck = jest.fn<Promise<HealthCheckResult>, [unknown[]]>();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: {
            check: mockCheck,
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
    it('should successfully execute readiness probe and return active application status', async () => {
      mockCheck.mockResolvedValue(mockHealthyResult);

      const result = await controller.readiness();

      expect(result).toEqual(mockHealthyResult);
      expect(mockCheck).toHaveBeenCalledTimes(1);

      const passedFunctions = mockCheck.mock.calls[0][0];
      expect(passedFunctions).toHaveLength(1);
      expect(typeof passedFunctions[0]).toBe('function');

      const appStatus = (passedFunctions[0] as () => unknown)();
      expect(appStatus).toEqual({ application: { status: 'up' } });
    });
  });
});
