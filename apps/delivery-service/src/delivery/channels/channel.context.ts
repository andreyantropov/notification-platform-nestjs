import { Injectable, Logger } from '@nestjs/common';
import { MetricService } from 'nestjs-otel';

@Injectable()
export class ChannelContext {
  constructor(
    public readonly metrics: MetricService,
    public readonly logger: Logger,
  ) {}
}
