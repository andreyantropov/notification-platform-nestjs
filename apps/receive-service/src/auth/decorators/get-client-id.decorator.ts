import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { AuthorizedUser } from '../types/authorized-user.interface';

export const GetClientId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user?: AuthorizedUser }>();

    return request.user?.clientId ?? '';
  },
);
