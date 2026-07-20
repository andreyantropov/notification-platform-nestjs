import { Environment } from '@app/shared';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsUrl,
  IsNotEmpty,
  IsNumber,
  IsString,
} from 'class-validator';

export class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsUrl({ require_tld: false, protocols: ['amqp', 'amqps'] })
  @IsNotEmpty()
  RABBITMQ_URL!: string;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  PORT = 3000;

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
