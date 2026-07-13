import { Provider, Contact } from '@app/shared';

export abstract class Channel {
  protected abstract readonly type: Provider;

  isSupports(contact: Contact): boolean {
    return contact.type === this.type;
  }

  abstract send(contact: Contact, message: string): Promise<void>;

  checkHealth?(): Promise<void>;
}
