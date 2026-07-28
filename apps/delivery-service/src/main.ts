import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import {
  NestFastifyApplication,
  FastifyAdapter,
} from '@nestjs/platform-fastify';
import { RmqOptions } from '@nestjs/microservices';
import { Logger } from 'nestjs-pino';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { bufferLogs: true },
  );

  app.useLogger(app.get(Logger));

  app.enableShutdownHooks();

  const configService = app.get(ConfigService);

  const rmqOptions = configService.getOrThrow<RmqOptions>('rmq');
  app.connectMicroservice(rmqOptions);
  await app.startAllMicroservices();

  const httpPort = configService.getOrThrow<number>('app.port');
  await app.listen(httpPort, '0.0.0.0');
}

bootstrap().catch(() => {
  process.exit(1);
});
