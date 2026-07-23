import { registerAs } from '@nestjs/config';
import { plainToInstance, Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  Min,
  validateSync,
} from 'class-validator';

class Env {
  @IsEmail({})
  @IsNotEmpty()
  EMAIL_FROM!: string;

  @IsString()
  @IsNotEmpty()
  EMAIL_SUBJECT!: string;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  EMAIL_TIMEOUT_MS = 10_000;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Transform(({ value }) => Number(value))
  EMAIL_CONCURRENCY = 1;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  EMAIL_DELAY_MS = 500;
}

export const emailConfig = registerAs('email', () => {
  const config = plainToInstance(Env, process.env, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(config, { skipMissingProperties: true });

  if (errors.length > 0) {
    throw new Error('Не удалось отвалидировать конфиг Email', {
      cause: errors,
    });
  }

  return {
    from: config.EMAIL_FROM,
    subject: config.EMAIL_SUBJECT,
    timeoutMs: config.EMAIL_TIMEOUT_MS,
    throttle: {
      maxConcurrent: config.EMAIL_CONCURRENCY,
      minTime: config.EMAIL_DELAY_MS,
    },
  };
});
