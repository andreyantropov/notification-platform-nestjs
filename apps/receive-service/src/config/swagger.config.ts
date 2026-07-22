import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

const SWAGGER_PATH = 'api/docs';

const SWAGGER_DESCRIPTION =
  '**Сервис приема и маршрутизации уведомлений.**\n\n' +
  'Принимает одиночные уведомления или пакеты и отправляет их в брокер очередей ' +
  'для последующей доставки в Bitrix/Email. Доставка зависит от указанного типа (`mode`):\n' +
  '* `sequential` — отправка по очереди до первого успеха (по умолчанию).\n' +
  '* `race` — отправка всем сразу, дойти должно хотя бы до одного.\n' +
  '* `broadcast` — отправка всем, дойти должно до каждого.\n\n';

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Notification Platform API')
    .setDescription(SWAGGER_DESCRIPTION)
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

  SwaggerModule.setup(SWAGGER_PATH, app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}
