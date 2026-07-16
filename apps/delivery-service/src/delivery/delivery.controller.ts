import { Controller, UsePipes, ValidationPipe } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { DeliveryService } from './delivery.service';
import { DELIVERY_NOTIFICATIONS_SEND_QUEUE } from '../app.constants';
import { SendNotificationCommandDto } from './dto/send-notification.command.dto';

@Controller()
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @EventPattern(DELIVERY_NOTIFICATIONS_SEND_QUEUE)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async handleNotification(
    @Payload() data: SendNotificationCommandDto,
  ): Promise<void> {
    await this.deliveryService.deliver(data);
  }
}
