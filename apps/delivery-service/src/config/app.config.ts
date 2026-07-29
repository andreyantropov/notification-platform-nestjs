import { Environment, LogLevel } from '@app/shared';
import { registerAs } from '@nestjs/config';
import { plainToInstance, Transform } from 'class-transformer';
import {
  validateSync,
  IsEnum,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

class Env {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV = Environment.DEVELOPMENT;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(65535)
  @Transform(({ value }) => Number(value))
  PORT = 3001;

  @IsEnum(LogLevel)
  @IsOptional()
  LOG_LEVEL = LogLevel.INFO;
}

export const appConfig = registerAs('app', () => {
  const config = plainToInstance(Env, process.env, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(config);

  if (errors.length > 0) {
    throw new Error('Не удалось отвалидировать конфиг App', {
      cause: errors,
    });
  }

  return {
    nodeEnv: config.NODE_ENV,
    port: config.PORT,
    logLevel: config.LOG_LEVEL,
  };
});
