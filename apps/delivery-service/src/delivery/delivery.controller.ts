import { Controller, UsePipes, ValidationPipe } from '@nestjs/common';
import { EventPattern, Payload, Ctx, RmqContext } from '@nestjs/microservices';
import { Channel, Message } from 'amqplib';
import { DeliveryService } from './delivery.service';
import { NOTIFICATIONS } from '../app.constants';
import { NotificationDto } from './dto/notification.dto';

@Controller()
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @EventPattern(NOTIFICATIONS)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async handleNotification(
    @Payload() data: NotificationDto,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    const channel = context.getChannelRef() as Channel;
    const originalMsg = context.getMessage() as Message;
    try {
      await this.deliveryService.deliver(data);

      channel.ack(originalMsg);
    } catch {
      channel.nack(originalMsg, false, true);
    }
  }
}
