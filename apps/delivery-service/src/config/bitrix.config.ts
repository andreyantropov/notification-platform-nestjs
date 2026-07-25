import { registerAs } from '@nestjs/config';
import { plainToInstance, Transform } from 'class-transformer';
import {
  validateSync,
  IsUrl,
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';

class Env {
  @IsUrl({})
  @IsNotEmpty()
  BITRIX_BASE_URL!: string;

  @IsString()
  @IsNotEmpty()
  BITRIX_USER_ID!: string;

  @IsString()
  @IsNotEmpty()
  BITRIX_AUTH_TOKEN!: string;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  BITRIX_TIMEOUT_MS = 10_000;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Transform(({ value }) => Number(value))
  BITRIX_CONCURRENCY = 1;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  BITRIX_DELAY_MS = 500;
}

export const bitrixConfig = registerAs('bitrix', () => {
  const config = plainToInstance(Env, process.env, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(config);

  if (errors.length > 0) {
    throw new Error('Не удалось отвалидировать конфиг Bitrix', {
      cause: errors,
    });
  }

  return {
    url: config.BITRIX_BASE_URL,
    userId: config.BITRIX_USER_ID,
    authToken: config.BITRIX_AUTH_TOKEN,
    timeoutMs: config.BITRIX_TIMEOUT_MS,
    throttle: {
      maxConcurrent: config.BITRIX_CONCURRENCY,
      minTime: config.BITRIX_DELAY_MS,
    },
  };
});
