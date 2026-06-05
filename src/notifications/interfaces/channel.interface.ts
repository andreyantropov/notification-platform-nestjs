import { Provider } from '../enums/provider.enum';
import { Contact } from './contact.interface';

export interface Channel {
  readonly type: Provider;
  readonly isSupports: (contact: Contact) => boolean;
  readonly send: (contact: Contact, message: string) => Promise<void>;
  readonly checkHealth?: () => Promise<void>;
}
