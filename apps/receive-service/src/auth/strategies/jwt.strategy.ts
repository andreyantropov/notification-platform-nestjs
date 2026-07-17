/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { JwtStrategyConfig } from './jwt.strategy.config';

interface KeycloakJwtPayload {
  readonly azp?: string;
  readonly sub: string;
}

interface JwtClient {
  readonly clientId: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor({ audience, issuerUrl, jwksUri }: JwtStrategyConfig) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      audience: audience,
      issuer: issuerUrl,
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: jwksUri,
      }),
    });
  }

  validate(payload: KeycloakJwtPayload): JwtClient {
    return {
      clientId: payload.azp || payload.sub,
    };
  }
}
