import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { getClientIdFactory } from './get-client-id.decorator';
import { AuthorizedUser } from '../types/authorized-user.interface';

describe('GetClientId Decorator Factory', () => {
  const createMockContext = (user?: AuthorizedUser): ExecutionContext => {
    const mockRequest = { user } as { user?: AuthorizedUser };

    const mockHttpArgumentsHost = {
      getRequest: () => mockRequest,
      getResponse: () => ({}),
      getNext: () => ({}),
    } as unknown as HttpArgumentsHost;

    return {
      switchToHttp: () => mockHttpArgumentsHost,
      getClass: () => ({}),
      getHandler: () => ({}),
      getArgs: () => [],
      getType: () => 'http',
      switchToRpc: () => ({}),
      switchToWs: () => ({}),
    } as unknown as ExecutionContext;
  };

  it('should return clientId when it is present in the request user object', () => {
    const expectedClientId = 'client-123-abc';
    const mockUser: AuthorizedUser = {
      clientId: expectedClientId,
    };
    const mockContext = createMockContext(mockUser);

    const result = getClientIdFactory(null, mockContext);

    expect(result).toBe(expectedClientId);
  });

  it('should throw UnauthorizedException when user object is missing in request', () => {
    const mockContext = createMockContext(undefined);

    expect(() => getClientIdFactory(null, mockContext)).toThrow(
      UnauthorizedException,
    );
    expect(() => getClientIdFactory(null, mockContext)).toThrow(
      'В запросе отсутствует id клиента',
    );
  });

  it('should throw UnauthorizedException when clientId is missing in user object', () => {
    const mockUserWithoutClientId = {} as AuthorizedUser;
    const mockContext = createMockContext(mockUserWithoutClientId);

    expect(() => getClientIdFactory(null, mockContext)).toThrow(
      UnauthorizedException,
    );
    expect(() => getClientIdFactory(null, mockContext)).toThrow(
      'В запросе отсутствует id клиента',
    );
  });
});
