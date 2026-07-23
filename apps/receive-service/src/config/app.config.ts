import { Environment } from '@app/shared';
import { registerAs } from '@nestjs/config';
import { plainToInstance, Transform } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsNumber,
  Min,
  Max,
  validateSync,
} from 'class-validator';

class Env {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(65535)
  @Transform(({ value }) => Number(value))
  PORT = 3000;
}

export const appConfig = registerAs('app', () => {
  const config = plainToInstance(Env, process.env, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(config, { skipMissingProperties: true });

  if (errors.length > 0) {
    throw new Error('Не удалось отвалидировать конфиг App', {
      cause: errors,
    });
  }

  return {
    nodeEnv: config.NODE_ENV,
    port: config.PORT,
  };
});
