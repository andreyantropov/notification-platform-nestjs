import { Provider } from './provider.enum';

export interface Contact {
  readonly type: Provider;
  readonly value: string;
}
