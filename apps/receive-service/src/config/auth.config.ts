import { registerAs } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { validateSync, IsNotEmpty, IsString, IsUrl } from 'class-validator';

class Env {
  @IsString()
  @IsNotEmpty()
  AUTH_AUDIENCE!: string;

  @IsUrl({ require_tld: false })
  @IsNotEmpty()
  AUTH_ISSUER_URL!: string;

  @IsUrl({ require_tld: false })
  @IsNotEmpty()
  AUTH_JWKS_URI!: string;
}

export const authConfig = registerAs('auth', () => {
  const config = plainToInstance(Env, process.env, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(config);

  if (errors.length > 0) {
    throw new Error('Не удалось отвалидировать конфиг Auth', {
      cause: errors,
    });
  }

  return {
    ignoreExpiration: false,
    audience: config.AUTH_AUDIENCE,
    issuer: config.AUTH_ISSUER_URL,
    jwksOptions: {
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 10,
      cacheMaxAge: 15 * 60 * 1_000,
      timeout: 5_000,
      jwksUri: config.AUTH_JWKS_URI,
    },
  };
});
