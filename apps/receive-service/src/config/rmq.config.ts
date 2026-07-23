import { DELIVERY_NOTIFICATIONS_SEND_QUEUE } from '../app.constants';
import { registerAs } from '@nestjs/config';
import { RmqOptions, Transport } from '@nestjs/microservices';
import { plainToInstance } from 'class-transformer';
import { IsUrl, IsNotEmpty, validateSync } from 'class-validator';

class Env {
  @IsUrl({ require_tld: false, protocols: ['amqp', 'amqps'] })
  @IsNotEmpty()
  RABBITMQ_URL!: string;
}

export const rmqConfig = registerAs('rmq', (): RmqOptions => {
  const config = plainToInstance(Env, process.env, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(config, { skipMissingProperties: true });

  if (errors.length > 0) {
    throw new Error('Не удалось отвалидировать конфиг RMQ', {
      cause: errors,
    });
  }

  return {
    transport: Transport.RMQ,
    options: {
      urls: [config.RABBITMQ_URL],
      queue: DELIVERY_NOTIFICATIONS_SEND_QUEUE,
      noAssert: true,
    },
  };
});
