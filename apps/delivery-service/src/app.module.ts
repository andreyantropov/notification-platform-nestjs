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
import { APP_PIPE } from '@nestjs/core';
import { OpenTelemetryModule } from 'nestjs-otel';
import { LoggerModule } from 'nestjs-pino';

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
    LoggerModule.forRoot({}),
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
  ],
})
export class AppModule {}
