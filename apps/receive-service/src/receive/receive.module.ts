import { Module } from '@nestjs/common';
import { ReceiveService } from './receive.service';
import { ReceiveController } from './receive.controller';
import { RmqIndicator } from './indicators/rmq.indicator';
import { AuthModule } from '../auth';
import { ConfigService } from '@nestjs/config';
import {
  DELIVERY_NOTIFICATIONS_SEND_QUEUE,
  RMQ_CLIENT,
} from './receive.constants';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TerminusModule } from '@nestjs/terminus';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: RMQ_CLIENT,
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [config.getOrThrow<string>('RABBITMQ_URL')],
            queue: DELIVERY_NOTIFICATIONS_SEND_QUEUE,
            noAssert: true,
          },
        }),
      },
    ]),
    AuthModule,
    TerminusModule,
  ],
  controllers: [ReceiveController],
  providers: [ReceiveService, RmqIndicator],
  exports: [RmqIndicator],
})
export class ReceiveModule {}
