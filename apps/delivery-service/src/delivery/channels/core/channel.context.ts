import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class ChannelContext {
  constructor(public readonly events: EventEmitter2) {}
}
