import { registerAs } from '@nestjs/config';
import { plainToInstance, Transform } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
  Max,
  IsBoolean,
  validateSync,
} from 'class-validator';

class Env {
  @IsString()
  @IsNotEmpty()
  SMTP_HOST!: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(65535)
  @Transform(({ value }) => Number(value))
  SMTP_PORT = 25;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  SMTP_SECURE = false;

  @IsString()
  @IsNotEmpty()
  SMTP_USER!: string;

  @IsString()
  @IsNotEmpty()
  SMTP_PASS!: string;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  SMTP_GREETING_TIMEOUT_MS = 5_000;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  SMTP_SOCKET_TIMEOUT_MS = 5_000;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  SMTP_CONNECTION_TIMEOUT_MS = 5_000;
}

export const smtpConfig = registerAs('smtp', () => {
  const config = plainToInstance(Env, process.env, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(config);

  if (errors.length > 0) {
    throw new Error('Не удалось отвалидировать конфиг SMTP', {
      cause: errors,
    });
  }

  return {
    transport: {
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: config.SMTP_SECURE,
      auth: {
        user: config.SMTP_USER,
        pass: config.SMTP_PASS,
      },
      greetingTimeout: config.SMTP_GREETING_TIMEOUT_MS,
      socketTimeout: config.SMTP_SOCKET_TIMEOUT_MS,
      connectionTimeout: config.SMTP_CONNECTION_TIMEOUT_MS,
      pool: true,
    },
  };
});
