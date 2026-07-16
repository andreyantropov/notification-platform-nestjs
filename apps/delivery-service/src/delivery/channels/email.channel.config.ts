import Bottleneck from 'bottleneck';

export class EmailChannelConfig {
  constructor(
    public readonly from: string,
    public readonly subject: string,
    public readonly timeoutMs: number,
    public readonly throttle?: Bottleneck.ConstructorOptions,
  ) {}
}
