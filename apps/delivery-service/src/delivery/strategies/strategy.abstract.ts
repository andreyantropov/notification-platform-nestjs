import { Contact } from '@app/shared';
import { Channel } from '../channels/channel.abstract';
import { Notification } from '@app/shared';

export interface Attempt {
  channel: Channel;
  contact: Contact;
}

export abstract class Strategy {
  protected getAttempts(
    channels: readonly Channel[],
    contacts: readonly Contact[],
  ): Attempt[] {
    return contacts.flatMap((contact) =>
      channels
        .filter((channel) => channel.isSupports(contact))
        .map((channel) => ({ channel, contact })),
    );
  }

  abstract execute(
    notification: Notification,
    channels: readonly Channel[],
  ): Promise<void>;
}
