import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { AuthorizedUser } from '../types/authorized-user.interface';

@Injectable()
export class MockJwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthorizedUser }>();

    request.user = {
      clientId: 'mock-client-id',
    };

    return true;
  }
}
