import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validate } from './config';
import { DeliveryModule } from './delivery/delivery.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    DeliveryModule,
    HealthModule,
  ],
})
export class AppModule {}
