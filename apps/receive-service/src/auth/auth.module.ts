import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { MockJwtAuthGuard } from './guards/mock-jwt-auth.guard';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtStrategyConfig } from './strategies/jwt.strategy.config';
import { AUTH_GUARD } from './auth.constants';
import { AppAuthGuard } from './guards/app-auth.guard';

const isDev = process.env.NODE_ENV === 'development';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  providers: [
    {
      provide: JwtStrategyConfig,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return new JwtStrategyConfig(
          config.getOrThrow<string>('AUTH_AUDIENCE'),
          config.getOrThrow<string>('AUTH_ISSUER_URL'),
          config.getOrThrow<string>('AUTH_JWKS_URI'),
        );
      },
    },
    JwtStrategy,
    {
      provide: AUTH_GUARD,
      useClass: isDev ? MockJwtAuthGuard : JwtAuthGuard,
    },
    AppAuthGuard,
  ],
  exports: [AUTH_GUARD, AppAuthGuard],
})
export class AuthModule {}
