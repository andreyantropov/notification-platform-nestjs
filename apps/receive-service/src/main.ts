import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import {
  NestFastifyApplication,
  FastifyAdapter,
} from '@nestjs/platform-fastify';
import { setupSwagger } from './config/swagger.config';
import { RequestMethod } from '@nestjs/common';
import { Logger } from 'nestjs-pino';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { bufferLogs: true },
  );

  app.useLogger(app.get(Logger));

  app.enableShutdownHooks();

  app.setGlobalPrefix('api/v1', {
    exclude: [{ path: 'health/*path', method: RequestMethod.GET }],
  });

  setupSwagger(app);

  const configService = app.get(ConfigService);

  const httpPort = configService.getOrThrow<number>('app.port');
  await app.listen(httpPort, '0.0.0.0');
}

bootstrap().catch(() => {
  process.exit(1);
});
