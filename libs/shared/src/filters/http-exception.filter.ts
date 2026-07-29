import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Logger } from 'nestjs-pino';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly logger: Logger,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;

    const ctx = host.switchToHttp();

    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: unknown = 'Internal server error';

    if (exception instanceof HttpException) {
      const responseResponse = exception.getResponse();
      if (typeof responseResponse === 'object' && responseResponse !== null) {
        message =
          (responseResponse as Record<string, unknown>).message ??
          exception.message;
      } else {
        message = responseResponse;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    const request = ctx.getRequest<unknown>();
    const requestUrl = String(httpAdapter.getRequestUrl(request));

    const responseBody = {
      statusCode: httpStatus,
      timestamp: new Date().toISOString(),
      path: requestUrl,
      message,
    };

    // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
    if (httpStatus >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        { err: exception, path: responseBody.path },
        `[GlobalHttpExceptionFilter] Ошибка сервера: ${String(message)}`,
      );
    } else {
      this.logger.warn(
        { err: exception, path: responseBody.path },
        `[GlobalHttpExceptionFilter] Ошибка запроса: ${String(message)}`,
      );
    }

    httpAdapter.reply(ctx.getResponse<unknown>(), responseBody, httpStatus);
  }
}
