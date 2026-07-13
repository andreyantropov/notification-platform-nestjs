import { Contact } from '@app/shared';
import { Channel } from '../../types/channel.abstract';

export interface Attempt {
  channel: Channel;
  contact: Contact;
}
