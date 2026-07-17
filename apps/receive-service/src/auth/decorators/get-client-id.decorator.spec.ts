import { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { Request } from 'express';
import { GetClientId } from './get-client-id.decorator';
import { AuthorizedUser } from '../types/authorized-user.interface';

function getDecoratorFactory(
  decorator: (...args: unknown[]) => unknown,
): (data: unknown, ctx: ExecutionContext) => string {
  const target = { [ROUTE_ARGS_METADATA]: undefined } as object;
  decorator(target, 'property', 0);
  const metadata = Reflect.getMetadata(
    ROUTE_ARGS_METADATA,
    target.constructor,
  ) as Record<
    string,
    { factory: (data: unknown, ctx: ExecutionContext) => string }
  >;
  return metadata[Object.keys(metadata)[0]].factory;
}

describe('GetClientIdDecorator', () => {
  let factory: (data: unknown, ctx: ExecutionContext) => string;
  let mockRequest: Partial<Request & { user?: AuthorizedUser }>;
  let mockExecutionContext: jest.Mocked<ExecutionContext>;

  beforeEach(() => {
    factory = getDecoratorFactory(GetClientId);

    mockRequest = {};

    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
    } as unknown as jest.Mocked<ExecutionContext>;
  });

  describe('execute', () => {
    it('should successfully extract clientId from request user object', () => {
      mockRequest.user = {
        clientId: 'test-client-id',
      };

      const result = factory(undefined, mockExecutionContext);

      expect(result).toBe('test-client-id');
      expect(mockExecutionContext.switchToHttp).toHaveBeenCalledTimes(1);
    });

    it('should return an empty string if user object is missing in request', () => {
      mockRequest.user = undefined;

      const result = factory(undefined, mockExecutionContext);

      expect(result).toBe('');
    });

    it('should return an empty string if clientId is missing in user object', () => {
      mockRequest.user = {} as AuthorizedUser;

      const result = factory(undefined, mockExecutionContext);

      expect(result).toBe('');
    });
  });
});
