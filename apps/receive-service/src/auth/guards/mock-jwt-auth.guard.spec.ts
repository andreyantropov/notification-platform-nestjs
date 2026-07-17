import { ExecutionContext } from '@nestjs/common';
import { MockJwtAuthGuard } from './mock-jwt-auth.guard';
import { Request } from 'express';
import { AuthorizedUser } from '../types/authorized-user.interface';

describe('MockJwtAuthGuard', () => {
  let guard: MockJwtAuthGuard;
  let mockRequest: Partial<Request & { user?: AuthorizedUser }>;
  let mockExecutionContext: jest.Mocked<ExecutionContext>;

  beforeEach(() => {
    guard = new MockJwtAuthGuard();

    mockRequest = {};

    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
    } as unknown as jest.Mocked<ExecutionContext>;
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(guard).toBeDefined();
    });
  });

  describe('canActivate', () => {
    it('should inject mock user into the request and return true', () => {
      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);

      expect(mockRequest.user).toBeDefined();
      expect(mockRequest.user).toEqual({
        clientId: 'mock-client-id',
      });
    });
  });
});
