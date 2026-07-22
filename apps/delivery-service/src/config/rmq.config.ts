import { RmqOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { DELIVERY_NOTIFICATIONS_SEND_QUEUE } from '../app.constants';

export const getRmqOptions = (config: ConfigService): RmqOptions => ({
  transport: Transport.RMQ,
  options: {
    urls: [config.getOrThrow<string>('RABBITMQ_URL')],
    queue: DELIVERY_NOTIFICATIONS_SEND_QUEUE,
    noAck: false,
    prefetchCount: 1,
    noAssert: true,
  },
});
