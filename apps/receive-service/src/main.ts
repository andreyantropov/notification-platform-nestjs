import { NestFactory } from '@nestjs/core';
import { ReceiveServiceModule } from './receive-service.module';

async function bootstrap() {
  const app = await NestFactory.create(ReceiveServiceModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
