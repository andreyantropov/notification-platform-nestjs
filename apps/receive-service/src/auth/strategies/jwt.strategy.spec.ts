import { Test, TestingModule } from '@nestjs/testing';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { type ConfigType } from '@nestjs/config';
import { authConfig } from '../../config/auth.config';

jest.mock('jwks-rsa', () => ({
  passportJwtSecret: jest.fn().mockReturnValue(() => 'mocked-secret'),
}));

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  const mockConfig: ConfigType<typeof authConfig> = {
    audience: 'test-audience',
    issuerUrl: 'https://keycloak.test',
    jwksUri: 'https://keycloak.test/protocol/openid-connect/certs',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
      providers: [
        JwtStrategy,
        {
          provide: authConfig.KEY,
          useValue: mockConfig,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be successfully initialized with strict configurations', () => {
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
