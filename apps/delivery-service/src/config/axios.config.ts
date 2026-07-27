import { registerAs } from '@nestjs/config';
import { plainToInstance, Transform } from 'class-transformer';
import { IsNumber, IsOptional, validateSync } from 'class-validator';

class Env {
  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  AXIOS_TIMEOUT_MS = 30_000;
}

export const axiosConfig = registerAs('axios', () => {
  const config = plainToInstance(Env, process.env, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(config);

  if (errors.length > 0) {
    throw new Error('Не удалось отвалидировать конфиг Axios', {
      cause: errors,
    });
  }

  return {
    timeout: config.AXIOS_TIMEOUT_MS,
  };
});
