import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsUrl,
  IsNotEmpty,
  IsString,
  IsNumber,
  IsBoolean,
  IsEmail,
} from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  AXIOS_TIMEOUT_MS = 30_000;

  @IsUrl({ require_tld: false })
  @IsNotEmpty()
  RABBITMQ_URL!: string;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  PORT = 3000;

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

  @IsString()
  @IsNotEmpty()
  SMTP_HOST!: string;

  @IsNumber()
  @IsOptional()
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

  @IsEmail({})
  @IsNotEmpty()
  SMTP_FROM!: string;

  @IsString()
  @IsNotEmpty()
  SMTP_SUBJECT!: string;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  SMTP_TIMEOUT_MS = 10_000;
}
