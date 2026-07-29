import { Module } from '@nestjs/common';
import { ReceiveService } from './receive.service';
import { ReceiveController } from './receive.controller';
import { AuthModule } from '../auth';
import { ConfigType } from '@nestjs/config';
import { RMQ_CLIENT } from './receive.constants';
import { ClientsModule } from '@nestjs/microservices';
import { TerminusModule } from '@nestjs/terminus';
import { rmqConfig } from '../config/rmq.config';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: RMQ_CLIENT,
        inject: [rmqConfig.KEY],
        useFactory: (config: ConfigType<typeof rmqConfig>) => config,
      },
    ]),
    AuthModule,
    TerminusModule,
  ],
  controllers: [ReceiveController],
  providers: [ReceiveService],
  exports: [],
})
export class ReceiveModule {}
