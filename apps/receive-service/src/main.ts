import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import {
  NestFastifyApplication,
  FastifyAdapter,
} from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  app.enableShutdownHooks();

  const config = new DocumentBuilder()
    .setTitle('Notification Platform API')
    .setDescription(
      '**Сервис приема и маршрутизации уведомлений.**\n\n' +
        'Принимает одиночные уведомления или пакеты и отправляет их в брокер очередей ' +
        'для последующей доставки в Bitrix/Email. Доставка зависит от указанного типа (`mode`):\n' +
        '* `sequential` — отправка по очереди до первого успеха (по умолчанию).\n' +
        '* `race` — отправка всем сразу, дойти должно хотя бы до одного.\n' +
        '* `broadcast` — отправка всем, дойти должно до каждого.\n\n',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Введите ваш access токен',
        in: 'header',
      },
      'bearer',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const configService = app.get(ConfigService);
  const httpPort = configService.get<number>('PORT')!;
  await app.listen(httpPort);
}

bootstrap().catch(() => {
  process.exit(1);
});
