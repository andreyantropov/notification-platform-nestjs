import { ClientOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { DELIVERY_NOTIFICATIONS_SEND_QUEUE } from '../app.constants';

export const getRmqOptions = (configService: ConfigService): ClientOptions => ({
  transport: Transport.RMQ,
  options: {
    urls: [configService.getOrThrow<string>('RABBITMQ_URL')],
    queue: DELIVERY_NOTIFICATIONS_SEND_QUEUE,
    noAssert: true,
  },
});
