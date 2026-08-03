import './instrumentation';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import {
  NestFastifyApplication,
  FastifyAdapter,
} from '@nestjs/platform-fastify';
import { setupSwagger } from './config/swagger.config';
import { Logger } from 'nestjs-pino';
import { LoggingInterceptor } from '@app/shared';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { bufferLogs: true },
  );

  const logger = app.get(Logger);
  app.useLogger(logger);

  app.useGlobalInterceptors(new LoggingInterceptor(logger));

  app.enableShutdownHooks();

  app.setGlobalPrefix('api', {
    exclude: ['health/{*path}'],
  });

  setupSwagger(app);

  const configService = app.get(ConfigService);

  const httpPort = configService.getOrThrow<number>('app.port');
  await app.listen(httpPort, '0.0.0.0');
}

bootstrap().catch(() => {
  process.exit(1);
});
