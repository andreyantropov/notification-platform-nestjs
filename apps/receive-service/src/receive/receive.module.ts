import { Module } from '@nestjs/common';
import { ReceiveService } from './receive.service';
import { ReceiveController } from './receive.controller';

@Module({
  controllers: [ReceiveController],
  providers: [ReceiveService],
})
export class ReceiveModule {}
