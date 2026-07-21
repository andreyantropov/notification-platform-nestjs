import { Controller, UsePipes, ValidationPipe } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { DeliveryService } from './delivery.service';
import { DELIVERY_NOTIFICATIONS_SEND_QUEUE } from '../app.constants';
import { SendNotificationCommandDto } from './dto/send-notification.command.dto';
import { Channel, Message } from 'amqplib';

@Controller()
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @EventPattern(DELIVERY_NOTIFICATIONS_SEND_QUEUE)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async handleNotification(
    @Payload() data: SendNotificationCommandDto,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    const channel: Channel = context.getChannelRef() as Channel;
    const originalMsg: Message = context.getMessage() as Message;

    try {
      await this.deliveryService.deliver(data);

      channel.ack(originalMsg);
    } catch {
      channel.nack(originalMsg, false, false);
    }
  }
}
