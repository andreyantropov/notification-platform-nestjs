import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { NOTIFICATIONS } from '../app.constants';

export const getRmqOptions = (
  configService: ConfigService,
): MicroserviceOptions => ({
  transport: Transport.RMQ,
  options: {
    urls: [configService.getOrThrow<string>('RABBITMQ_URL')],
    queue: NOTIFICATIONS,
    noAck: false,
    prefetchCount: 1,
    queueOptions: {
      durable: true,
    },
  },
});
