import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import {
  NestFastifyApplication,
  FastifyAdapter,
} from '@nestjs/platform-fastify';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  app.enableShutdownHooks();

  app.setGlobalPrefix('api/v1', {
    exclude: ['health'],
  });

  const configService = app.get(ConfigService);
  const httpPort = configService.get<number>('PORT')!;
  await app.listen(httpPort);
}

bootstrap().catch(() => {
  process.exit(1);
});
