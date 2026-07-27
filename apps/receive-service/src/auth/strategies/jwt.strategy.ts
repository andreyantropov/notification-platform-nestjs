import { Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { AuthorizedUser } from '../types/authorized-user.interface';
import { type ConfigType } from '@nestjs/config';
import { authConfig } from '../../config';

interface KeycloakJwtPayload {
  readonly azp?: string;
  readonly sub: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    @Inject(authConfig.KEY)
    { audience, issuerUrl, jwksUri }: ConfigType<typeof authConfig>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      audience: audience,
      issuer: issuerUrl,
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 20,
        cacheMaxAge: 24 * 60 * 60 * 1000,
        timeout: 5000,
        jwksUri: jwksUri,
      }),
    });
  }

  validate(payload: KeycloakJwtPayload): AuthorizedUser {
    return {
      clientId: payload.azp || payload.sub,
    };
  }
}
