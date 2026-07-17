import { ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '@nestjs/passport';

interface MockUser {
  readonly clientId: string;
}

@Injectable()
export class MockJwtAuthGuard extends AuthGuard('jwt') {
  override canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: MockUser }>();

    request.user = {
      clientId: 'mock-client-id',
    };

    return true;
  }
}
