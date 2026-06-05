import { Channel } from '../../interfaces/channel.interface';
import { Contact } from '../../interfaces/contact.interface';

export interface Attempt {
  channel: Channel;
  contact: Contact;
}
