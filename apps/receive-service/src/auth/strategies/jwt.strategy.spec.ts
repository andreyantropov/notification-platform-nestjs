jest.mock('jwks-rsa', () => ({
  passportJwtSecret: jest.fn().mockReturnValue(() => 'mocked-secret'),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { JwtStrategyConfig } from './jwt.strategy.config';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  const mockConfig: JwtStrategyConfig = {
    audience: 'test-audience',
    issuerUrl: 'https://keycloak.test',
    jwksUri: 'https://keycloak.test/protocol/openid-connect/certs',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
      providers: [
        {
          provide: JwtStrategy,
          useFactory: () => new JwtStrategy(mockConfig),
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(strategy).toBeDefined();
    });
  });

  describe('validate', () => {
    it('should extract clientId from azp field if it is present', () => {
      const mockPayload = {
        azp: 'service-client-id',
        sub: 'user-sub-id',
      };

      const result = strategy.validate(mockPayload);

      expect(result).toEqual({ clientId: 'service-client-id' });
    });

    it('should fallback to sub field if azp field is missing', () => {
      const mockPayload = {
        sub: 'user-sub-id',
      };

      const result = strategy.validate(mockPayload);

      expect(result).toEqual({ clientId: 'user-sub-id' });
    });
  });
});
