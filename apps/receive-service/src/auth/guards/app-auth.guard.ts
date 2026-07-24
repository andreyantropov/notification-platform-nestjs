import {
  type CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { AUTH_GUARD } from '../auth.constants';

@Injectable()
export class AppAuthGuard implements CanActivate {
  constructor(@Inject(AUTH_GUARD) private readonly guard: CanActivate) {}

  canActivate(context: ExecutionContext) {
    return this.guard.canActivate(context);
  }
}
