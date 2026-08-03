import { registerAs } from '@nestjs/config';
import { Transport } from '@nestjs/microservices';
import { plainToInstance } from 'class-transformer';
import { IsUrl, IsNotEmpty, validateSync, IsString } from 'class-validator';

class Env {
  @IsUrl({ require_tld: false, protocols: ['amqp', 'amqps'] })
  @IsNotEmpty()
  RMQ_URL!: string;

  @IsString()
  @IsNotEmpty()
  RMQ_EXCHANGE!: string;
}

export const rmqConfig = registerAs('rmq', () => {
  const config = plainToInstance(Env, process.env, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(config);

  if (errors.length > 0) {
    throw new Error('Не удалось отвалидировать конфиг RMQ', {
      cause: errors,
    });
  }

  return {
    transport: Transport.RMQ as const,
    options: {
      urls: [config.RMQ_URL],
      wildcards: true,
      exchange: config.RMQ_EXCHANGE,
      noAssert: true,
    },
  };
});
