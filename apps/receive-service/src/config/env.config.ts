import { Environment } from '@app/shared';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsUrl,
  IsNotEmpty,
  IsNumber,
} from 'class-validator';

export class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsUrl({ require_tld: false })
  @IsNotEmpty()
  RABBITMQ_URL!: string;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  PORT = 3000;
}
