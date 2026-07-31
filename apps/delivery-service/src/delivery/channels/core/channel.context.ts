import { Injectable } from '@nestjs/common';
import { MetricService } from 'nestjs-otel';
import { Logger } from 'nestjs-pino';

@Injectable()
export class ChannelContext {
  constructor(
    public readonly metrics: MetricService,
    public readonly logger: Logger,
  ) {}
}
