import { Provider } from '../enums/provider.enum';

export interface Contact {
  readonly type: Provider;
  readonly value: string;
}
