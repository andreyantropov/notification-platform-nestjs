import { Provider } from '@app/shared/enums/provider.enum';
import { Contact } from '@app/shared/interfaces/contact.interface';

export interface Channel {
  readonly type: Provider;
  readonly isSupports: (contact: Contact) => boolean;
  readonly send: (contact: Contact, message: string) => Promise<void>;
  readonly checkHealth?: () => Promise<void>;
}
