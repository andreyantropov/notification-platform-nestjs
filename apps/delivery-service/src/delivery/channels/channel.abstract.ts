import { Provider, Contact } from '@app/shared';
import Bottleneck from 'bottleneck';

export abstract class Channel {
  protected abstract readonly type: Provider;
  protected readonly limiter: Bottleneck;

  constructor(config?: Bottleneck.ConstructorOptions) {
    this.limiter = new Bottleneck(config);
  }

  isSupports(contact: Contact): boolean {
    return contact.type === this.type;
  }

  async send(contact: Contact, message: string): Promise<void> {
    await this.limiter.schedule(() => this.performSend(contact, message));
  }

  async checkHealth(): Promise<void> {
    return Promise.resolve();
  }

  protected abstract performSend(
    contact: Contact,
    message: string,
  ): Promise<void>;
}
