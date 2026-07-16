import { validateSync } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { EnvironmentVariables } from './env.config';

export const validate = (config: Record<string, unknown>) => {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
};
