import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validate } from './config';
import { ReceiveModule } from './receive/receive.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    ReceiveModule,
  ],
})
export class AppModule {}
