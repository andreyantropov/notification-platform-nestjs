import { Provider, Contact } from '@app/shared';
import Bottleneck from 'bottleneck';
import { ChannelContext } from './channel.context';

export abstract class Channel {
  protected abstract readonly type: Provider;
  protected readonly limiter: Bottleneck;

  constructor(
    protected readonly ctx: ChannelContext,
    config?: Bottleneck.ConstructorOptions,
  ) {
    this.limiter = new Bottleneck(config);
  }

  isSupports(contact: Contact): boolean {
    return contact.type === this.type;
  }

  async send(contact: Contact, message: string): Promise<void> {
    await this.limiter.schedule(async () => {
      const startTime = Date.now();
      const provider = this.type;

      try {
        this.ctx.events.emit('channel.send.initiated', {
          provider,
          contact: contact.value,
        });

        await this.performSend(contact, message);

        this.ctx.events.emit('channel.send.successed', {
          provider,
          contact: contact.value,
          duration: Date.now() - startTime,
        });
      } catch (error) {
        this.ctx.events.emit('channel.send.failed', {
          provider,
          contact: contact.value,
          duration: Date.now() - startTime,
          error,
        });

        throw error;
      }
    });
  }

  async checkHealth(): Promise<void> {
    return Promise.resolve();
  }

  protected abstract performSend(
    contact: Contact,
    message: string,
  ): Promise<void>;
}
