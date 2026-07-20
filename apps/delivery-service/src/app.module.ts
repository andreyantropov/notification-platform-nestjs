import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validate } from './config';
import { DeliveryModule } from './delivery';
import { HealthModule } from './health';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        `apps/delivery-service/.env.${process.env.NODE_ENV}.local`,
        `apps/delivery-service/.env.${process.env.NODE_ENV}`,
        'apps/delivery-service/.env',
      ],
      validate,
    }),
    DeliveryModule,
    HealthModule,
  ],
})
export class AppModule {}
