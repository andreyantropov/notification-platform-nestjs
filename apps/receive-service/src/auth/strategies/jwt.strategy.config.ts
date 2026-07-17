export class JwtStrategyConfig {
  constructor(
    public readonly audience: string,
    public readonly issuerUrl: string,
    public readonly jwksUri: string,
  ) {}
}
