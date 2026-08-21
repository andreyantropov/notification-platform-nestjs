import { Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { AuthorizedUser } from '../types/authorized-user.interface';
import { type ConfigType } from '@nestjs/config';
import { authConfig } from '../../config/auth.config';

interface KeycloakJwtPayload {
  readonly azp?: string;
  readonly sub: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    @Inject(authConfig.KEY)
    {
      ignoreExpiration,
      audience,
      issuer,
      jwksOptions,
      algorithms,
    }: ConfigType<typeof authConfig>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration,
      audience,
      issuer,
      algorithms: [...algorithms],
      secretOrKeyProvider: passportJwtSecret(jwksOptions),
    });
  }

  validate(payload: KeycloakJwtPayload): AuthorizedUser {
    return {
      clientId: payload.azp || payload.sub,
    };
  }
}
