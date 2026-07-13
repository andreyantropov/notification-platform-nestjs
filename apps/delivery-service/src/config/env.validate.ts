import { validateSync } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { EnvironmentVariables } from './env.config';

export const validateEnv = (
  config: Record<string, unknown>,
): EnvironmentVariables => {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const errorMessages = errors
      .map((err) => {
        const constraints = err.constraints
          ? Object.values(err.constraints).join(', ')
          : 'Ошибка конфигурации';
        return `[${err.property}]: ${constraints}`;
      })
      .join('\n');

    throw new Error(
      `Ошибка валидации переменных окружения (.env): ${errorMessages}`,
    );
  }

  return validatedConfig;
};
