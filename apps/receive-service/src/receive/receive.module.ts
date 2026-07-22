import { Module } from '@nestjs/common';
import { ReceiveService } from './receive.service';
import { ReceiveController } from './receive.controller';
import { RmqIndicator } from './indicators/rmq.indicator';
import { AuthModule } from '../auth';
import { ConfigService } from '@nestjs/config';
import { RMQ_CLIENT } from './receive.constants';
import { ClientsModule } from '@nestjs/microservices';
import { TerminusModule } from '@nestjs/terminus';
import { getRmqOptions } from '../config/rmq.config';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: RMQ_CLIENT,
        inject: [ConfigService],
        useFactory: (configService: ConfigService) =>
          getRmqOptions(configService),
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
