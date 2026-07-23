import { Mode } from '../enums/mode.enum';
import { Contact } from './contact.interface';

export interface Notification {
  readonly id: string;
  readonly correlationId: string;
  readonly clientId: string;
  readonly createdAt: string;
  readonly contacts: readonly Contact[];
  readonly message: string;
  readonly mode: Mode;
}
