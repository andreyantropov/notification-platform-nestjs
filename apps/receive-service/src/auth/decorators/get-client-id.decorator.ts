import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthorizedUser } from '../types/authorized-user.interface';

export const getClientIdFactory = (
  data: unknown,
  ctx: ExecutionContext,
): string => {
  const request = ctx
    .switchToHttp()
    .getRequest<Request & { user?: AuthorizedUser }>();

  const clientId = request.user?.clientId;

  if (!clientId) {
    throw new UnauthorizedException('В запросе отсутствует id клиента');
  }

  return clientId;
};

export const GetClientId = createParamDecorator(getClientIdFactory);
