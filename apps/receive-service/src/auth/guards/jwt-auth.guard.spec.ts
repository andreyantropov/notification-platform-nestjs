import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;
  let mockExecutionContext: jest.Mocked<ExecutionContext>;

  beforeEach(() => {
    reflector = new Reflector();

    guard = new JwtAuthGuard(reflector);

    mockExecutionContext = {
      getHandler: jest.fn().mockReturnValue(() => {}),
      getClass: jest.fn().mockReturnValue(class {}),
    } as unknown as jest.Mocked<ExecutionContext>;
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(guard).toBeDefined();
    });
  });

  describe('canActivate', () => {
    let superCanActivateSpy: jest.SpyInstance;

    beforeEach(() => {
      superCanActivateSpy = jest
        .spyOn(AuthGuard('jwt').prototype, 'canActivate')
        .mockReturnValue(true);
    });

    afterEach(() => {
      superCanActivateSpy.mockRestore();
    });

    it('should return true and NOT call super.canActivate if route is public', async () => {
      const getAllAndOverrideSpy = jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue(true);

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(superCanActivateSpy).not.toHaveBeenCalled();

      expect(getAllAndOverrideSpy).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        mockExecutionContext.getHandler(),
        mockExecutionContext.getClass(),
      ]);
    });

    it('should call super.canActivate to trigger passport strategy if route is NOT public', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(superCanActivateSpy).toHaveBeenCalledTimes(1);
      expect(superCanActivateSpy).toHaveBeenCalledWith(mockExecutionContext);
    });
  });
});
