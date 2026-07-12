import { Contact } from '@app/shared';
import { Channel } from '../../abstracts/channel.abstract';

export interface Attempt {
  channel: Channel;
  contact: Contact;
}
