import { ExceptionFilter, Catch, ArgumentsHost } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Logger } from 'nestjs-pino';
import { Observable, throwError } from 'rxjs';

@Catch()
export class RmqExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost): Observable<unknown> {
    const ctx = host.switchToRpc();
    const data = ctx.getData<unknown>();

    let message = 'Internal microservice error';
    if (exception instanceof RpcException) {
      message = exception.message;
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    this.logger.error(
      {
        err: exception,
        rmqPayload: data,
      },
      `[GlobalRpcExceptionFilter] Ошибка сервера: ${message}`,
    );

    return throwError(() => exception);
  }
}
