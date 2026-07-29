import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DeliveryModule } from './delivery';
import { HealthModule } from './health';
import {
  appConfig,
  axiosConfig,
  bitrixConfig,
  emailConfig,
  rmqConfig,
  smtpConfig,
} from './config';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { OpenTelemetryModule } from 'nestjs-otel';
import { LoggerModule } from 'nestjs-pino';
import { Environment, RmqExceptionFilter } from '@app/shared';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        `apps/delivery-service/.env.${process.env.NODE_ENV}.local`,
        `apps/delivery-service/.env.${process.env.NODE_ENV}`,
        'apps/delivery-service/.env',
      ],
      load: [
        appConfig,
        axiosConfig,
        bitrixConfig,
        emailConfig,
        rmqConfig,
        smtpConfig,
      ],
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
    DeliveryModule,
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
      useClass: RmqExceptionFilter,
    },
  ],
})
export class AppModule {}
