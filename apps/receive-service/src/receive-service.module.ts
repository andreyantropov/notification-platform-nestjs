import { Module } from '@nestjs/common';
import { ReceiveServiceController } from './receive-service.controller';
import { ReceiveServiceService } from './receive-service.service';

@Module({
  imports: [],
  controllers: [ReceiveServiceController],
  providers: [ReceiveServiceService],
})
export class ReceiveServiceModule {}
