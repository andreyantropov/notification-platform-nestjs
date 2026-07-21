import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { AppAuthGuard } from './app-auth.guard';
import { AUTH_GUARD } from '../auth.constants';

describe('AppAuthGuard', () => {
  let guard: AppAuthGuard;
  let mockGuard: { canActivate: jest.Mock };

  beforeEach(async () => {
    mockGuard = {
      canActivate: jest.fn().mockReturnValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppAuthGuard,
        {
          provide: AUTH_GUARD,
          useValue: mockGuard,
        },
      ],
    }).compile();

    guard = module.get<AppAuthGuard>(AppAuthGuard);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should delegate canActivate to the injected implementation', async () => {
    const context = {} as ExecutionContext;

    await guard.canActivate(context);

    expect(mockGuard.canActivate).toHaveBeenCalledWith(context);
  });
});
