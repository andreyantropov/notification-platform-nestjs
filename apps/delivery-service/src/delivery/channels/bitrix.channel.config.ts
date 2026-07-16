import Bottleneck from 'bottleneck';

export class BitrixChannelConfig {
  constructor(
    public readonly url: string,
    public readonly userId: string,
    public readonly authToken: string,
    public readonly timeoutMs: number,
    public readonly throttle?: Bottleneck.ConstructorOptions,
  ) {}
}
