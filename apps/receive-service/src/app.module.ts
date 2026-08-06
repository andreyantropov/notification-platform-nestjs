import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_PIPE } from '@nestjs/core';
import { OpenTelemetryModule } from 'nestjs-otel';
import { LoggerModule } from 'nestjs-pino';
import { Environment } from '@app/shared';
import { appConfig } from './config/app.config';
import { authConfig } from './config/auth.config';
import { rmqConfig } from './config/rmq.config';
import { HealthModule } from './health/health.module';
import { ReceiveModule } from './receive/receive.module';
import { TelemetryModule } from './telemetry/telemetry.module';
import { EventEmitterModule } from '@nestjs/event-emitter';

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
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
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
    TelemetryModule,
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
  ],
})
export class AppModule {}
