import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ReceiveModule } from './receive';
import { HealthModule } from './health';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { appConfig, authConfig, rmqConfig } from './config';
import { OpenTelemetryModule } from 'nestjs-otel';
import { LoggerModule } from 'nestjs-pino';
import { Environment, HttpExceptionFilter } from '@app/shared';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        `apps/receive-service/.env.${process.env.NODE_ENV}.local`,
        `apps/receive-service/.env.${process.env.NODE_ENV}`,
        'apps/receive-service/.env',
      ],
      load: [appConfig, authConfig, rmqConfig],
    }),
    OpenTelemetryModule.forRoot({}),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL,
        transport:
          process.env.NODE_ENV == Environment.DEVELOPMENT
            ? {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  singleLine: true,
                  levelFirst: true,
                  translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
                },
              }
            : undefined,
      },
    }),
    ReceiveModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
