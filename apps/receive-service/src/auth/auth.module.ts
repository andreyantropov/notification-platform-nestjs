import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { MockJwtAuthGuard } from './guards/mock-jwt-auth.guard';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AppAuthGuard } from './guards/app-auth.guard';
import { Environment } from '@app/shared';
import { ConfigType } from '@nestjs/config';
import { appConfig } from '../config/app.config';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  providers: [
    JwtStrategy,
    MockJwtAuthGuard,
    JwtAuthGuard,
    {
      provide: AppAuthGuard,
      inject: [appConfig.KEY, MockJwtAuthGuard, JwtAuthGuard],
      useFactory: (
        config: ConfigType<typeof appConfig>,
        mockJwtAuthGuard: MockJwtAuthGuard,
        jwtAuthGuard: JwtAuthGuard,
      ) => {
        return config.nodeEnv === Environment.DEVELOPMENT
          ? mockJwtAuthGuard
          : jwtAuthGuard;
      },
    },
  ],
  exports: [AppAuthGuard],
})
export class AuthModule {}
