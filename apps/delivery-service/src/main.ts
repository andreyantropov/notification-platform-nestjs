import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { getRmqOptions } from './config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableShutdownHooks();

  const configService = app.get(ConfigService);

  app.connectMicroservice(getRmqOptions(configService));
  await app.startAllMicroservices();

  const httpPort = configService.get<number>('PORT')!;
  await app.listen(httpPort);
}

bootstrap().catch(() => {
  process.exit(1);
});
