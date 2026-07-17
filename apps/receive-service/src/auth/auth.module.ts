import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { MockJwtAuthGuard } from './guards/mock-jwt-auth.guard';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtStrategyConfig } from './strategies/jwt.strategy.config';

const isDev = process.env.NODE_ENV === 'development';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  providers: [
    {
      provide: JwtStrategyConfig,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return new JwtStrategyConfig(
          config.getOrThrow<string>('KEYCLOAK_AUDIENCE'),
          config.getOrThrow<string>('KEYCLOAK_ISSUER_URL'),
          config.getOrThrow<string>('KEYCLOAK_JWKS_URI'),
        );
      },
    },
    JwtStrategy,
    {
      provide: JwtAuthGuard,
      useClass: isDev ? MockJwtAuthGuard : JwtAuthGuard,
    },
  ],
  exports: [JwtAuthGuard],
})
export class AuthModule {}
