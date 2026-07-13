import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DeliveryModule } from './delivery/delivery';

@Module({
  imports: [DeliveryModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
