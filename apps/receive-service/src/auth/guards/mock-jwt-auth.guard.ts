import { ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { AuthorizedUser } from '../types/authorized-user.interface';

@Injectable()
export class MockJwtAuthGuard extends AuthGuard('jwt') {
  override canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthorizedUser }>();

    request.user = {
      clientId: 'mock-client-id',
    };

    return true;
  }
}
