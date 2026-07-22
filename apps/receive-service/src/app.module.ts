import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validate } from './config';
import { ReceiveModule } from './receive';
import { HealthModule } from './health';
import { APP_PIPE } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        `apps/receive-service/.env.${process.env.NODE_ENV}.local`,
        `apps/receive-service/.env.${process.env.NODE_ENV}`,
        'apps/receive-service/.env',
      ],
      validate,
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
  ],
})
export class AppModule {}
